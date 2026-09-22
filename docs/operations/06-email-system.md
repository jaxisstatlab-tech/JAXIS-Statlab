# JAXIS StatLab — Transactional Email Notification System & Roadmap

This document outlines the architecture, current implementation, operational configuration, and scheduled rollout plan for transactional email dispatches across the JAXIS StatLab platform.

---

## 1. Core Architecture & Provider Integration

| Component | Specification | Description |
|---|---|---|
| **Email Provider** | **Resend** (`https://api.resend.com/emails`) | High-deliverability transactional email API with native HTML & plaintext support. |
| **Abstraction Layer** | `apps/app/src/lib/email/index.ts` | Unified `sendEmail()` interface with automated 3-attempt exponential backoff retry. |
| **Audit Ledger** | `db.notificationLog` | Database-backed audit trail visible in `/dashboard/admin/notifications`. |
| **Template Engine** | `apps/app/src/lib/email/renderer.ts` | Dark Precision HTML layouts (`#010114` canvas, `#01162E` container, `#CC6600` CTA buttons). |
| **Local Dev Fallback** | Automated Simulation | When in local offline development, logs rendered emails and links directly to console without throwing network errors. |

---

## 2. Currently Implemented Email Workflows

### ✅ 1. Self-Service Password Recovery (`PasswordReset`)
- **Status:** **LIVE & FUNCTIONAL** (All Roles: Client, Statistician, QA Lead, Finance Officer, Admin, CEO)
- **Trigger:** User submits their registered email at `/forgot-password`.
- **Recipient:** Target account email.
- **Security Guardrails:**
  - 256-bit cryptographically secure random token (`crypto.randomBytes(32)`).
  - Stored strictly as SHA-256 hash (`tokenHash`) in `db.passwordResetToken`.
  - 60-minute time-to-live (TTL); immediately marked `usedAt` on completion.
  - Timing-safe, anti-enumeration response ("If an account exists, a link has been dispatched").
- **Template Layout:** Dark Precision layout with "SECURITY RECOVERY" badge and `#CC6600` action button linking to `/reset-password?token=...`.
- **Sandbox Testing Detection & Direct Developer Bypass:**
  - When Resend operates in free sandbox mode (`onboarding@resend.dev`), Resend rejects recipients other than the verified account owner (`jaxis.statlab@gmail.com`).
  - The system automatically detects this restriction, logs the attempt safely to `db.notificationLog`, and presents an explanatory alert on the `/forgot-password` confirmation screen along with a direct 1-click bypass button (`Open Password Reset Desk Directly →`) so staging, local development, and manual QA are never blocked.

### ✅ 2. Administrative Notification Audit Ledger
- **Status:** **LIVE** at `/dashboard/admin/notifications`
- **Features:** Delivery search, filter by status (`ALL`, `SENT`, `RETRYING`, `FAILED`), and 1-click administrative retry for failed dispatches.

---

## 3. Email Implementation Roadmap (Upcoming Rollouts)

The following matrix documents all planned transactional emails, their trigger points, recipients, and target modules:

| Milestone / Module | Template Name | Trigger Event | Primary Recipient | Action Required in Email |
|---|---|---|---|---|
| **Module 04: Intake** | `NewIntake` | Client finishes multi-step study intake submission. | Operations Manager (`admin@jaxis.dev`) | "Open Intake Review Desk →" to triage and prepare quotation. |
| **Module 05: Quotations** | `QuotationReady` | Admin finishes price calculation and releases quote. | Lead Researcher (Client) | "Review Quotation →" to accept and generate SOW. |
| **Module 06: SOW** | `SOWReady` | Admin / System compiles formal Scope of Work. | Lead Researcher (Client) | "Review & Sign SOW →" with digital signature. |
| **Module 06: SOW** | `SOWSigned` | Client applies digital signature. | Operations Manager & Client | Confirmation receipt with downloadable SOW PDF. |
| **Module 07: Payments** | `ProofReceived` | Client uploads GCash/Bank transfer screenshot. | Finance Officer & Client | Finance receives review link; Client receives confirmation. |
| **Module 07: Payments** | `PaymentVerified` | Finance approves payment proof. | Lead Researcher (Client) | "Study Activated →" notification confirming kickoff. |
| **Module 07: Payments** | `PaymentRejected` | Finance rejects unreadable or invalid proof. | Lead Researcher (Client) | "Upload New Proof →" with specific reason provided by Finance. |
| **Module 08: Assignments**| `ExpertAssigned` | Admin assigns Lead Statistician & QA Lead. | Assigned Specialists & Client | Specialists receive SLA countdown; Client sees research team intro. |
| **Module 10: Deliverables** | `ProjectDelivered` | QA approves final statistical tables & writeup. | Lead Researcher (Client) | "Download Deliverables →" initiates 7-day review clock. |
| **Module 12: Disputes** | `DisputeOpened` | Client files methodology challenge. | CEO & Operations Manager | "Review Dispute Evidence →" for arbitration. |
| **Module 12: Disputes** | `RefundProcessed` | Finance issues approved dispute refund. | Lead Researcher (Client) | "View Resolution Ruling →" with refund reference details. |
| **Module 14: Finance** | `PayoutReleased` | Finance disburses specialist milestone payout. | Specialist (Statistician/QA) | "View Payslip →" in Staff HR Portal. |
| **Module 18: Attendance** | `MissedPunchAlert` | Specialist forgets to clock out after scheduled shift. | Specialist & HR Officer | "File Attendance Correction →" in HR Desk. |

---

## 4. Production Domain Verification & Sandbox Environment

### Testing Sandbox vs. Production Deliverability

| Mode | Sender (`from`) | Allowed Recipients | Behavior |
|---|---|---|---|
| **Resend Sandbox (Current Dev)** | `onboarding@resend.dev` | `jaxis.statlab@gmail.com` | Only the registered Resend account owner receives real emails. Requests to other emails trigger the UI recovery bypass. |
| **Verified Custom Domain (Production)** | `noreply@jaxis.dev` or `noreply@jaxisstatlab.com` | **Any recipient** (`@gmail.com`, `@yahoo.com`, corporate, academic) | Full public transactional email deliverability across all user accounts. |

### Domain Verification Steps:
1. Navigate to **[resend.com/domains](https://resend.com/domains)**.
2. Click **Add Domain** and enter your production domain (e.g., `jaxis.dev` or `jaxisstatlab.com`).
3. Add the 3 DNS records provided by Resend to your domain's DNS provider (Cloudflare, Vercel, GoDaddy, Namecheap):
   - **DKIM:** `TXT` record for `resend._domainkey`
   - **SPF:** `MX` record for `bounces` (or subdomain)
   - **DMARC:** `TXT` record for `_dmarc` (e.g. `v=DMARC1; p=none;`)
4. Once verified (typically 2–5 minutes), update the environment variable in production (Vercel & `.env`):
   ```bash
   RESEND_FROM_EMAIL="JAXIS StatLab <noreply@yourdomain.com>"
   ```
