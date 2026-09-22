# JAXIS StatLab — Master Documentation Hub

Welcome to the central documentation hub for **JAXIS StatLab**. This directory compiles all architecture blueprints, design specifications, business operations playbooks, module specifications, verification test suites, task backlogs, and marketing documentation into a structured repository.

---

## 📑 Table of Contents

1. [📐 Architecture & Engineering Standards](#1-architecture--engineering-standards)
2. [🎨 Design System & UI Standards](#2-design-system--ui-standards)
3. [💼 Business Playbooks & Operational Guides](#3-business-playbooks--operational-guides)
4. [📦 Module Specifications (00–21)](#4-module-specifications-0021)
5. [✅ Module Verifications (00–21)](#5-module-verifications-0021)
6. [📋 Tasks & Roadmaps](#6-tasks--roadmaps)
7. [⚙️ Operations, Notifications & Email](#7-operations-notifications--email)
8. [🌐 Marketing Web & Public Site](#8-marketing-web--public-site)

---

## 1. Architecture & Engineering Standards
Blueprints covering system topology, data storage, database models, security, and scalability guardrails.

| Document | Description |
| :--- | :--- |
| [ARCHITECTURE.md](./architecture/ARCHITECTURE.md) | High-level system architecture, monorepo layout, and technical stack. |
| [01-scope.md](./architecture/01-scope.md) | Core project scope, functional boundaries, and domain models. |
| [02-architecture.md](./architecture/02-architecture.md) | Detailed architectural patterns, state flow, and RSC boundaries. |
| [03-data-storage.md](./architecture/03-data-storage.md) | PostgreSQL schema design, Neon integration, and Cloudflare R2 object storage. |
| [07-roadmap.md](./architecture/07-roadmap.md) | Long-term technical roadmap and milestones. |
| [08-engineering-standards.md](./architecture/08-engineering-standards.md) | Scalability, indexing, rate limiting, and defensive coding rules. |
| [SECURITY.md](./architecture/SECURITY.md) | Security protocols, RBAC matrices, session handling, and vulnerability reporting. |
| [CONTRIBUTING.md](./architecture/CONTRIBUTING.md) | Developer guidelines and contribution workflow. |

---

## 2. Design System & UI Standards
The authoritative dark precision terminal aesthetic, spacing standards, color palette, and micro-motion specifications.

| Document | Description |
| :--- | :--- |
| [design-system.md](./design/design-system.md) | Canonical Dashdark X Precision design system specifications and tokens. |
| [ui-design-upgrade.md](./design/ui-design-upgrade.md) | System-first UI elevation guide, anti-AI-slop rules, and bento layout patterns. |
| [DESIGN.md](./design/DESIGN.md) | Workspace visual guidelines and token usage. |
| [04-design-system-overview.md](./design/04-design-system-overview.md) | Executive summary of design tokens and core UI foundations. |
| [05-ui-design-upgrade-overview.md](./design/05-ui-design-upgrade-overview.md) | Step-by-step implementation standards for dark precision views. |

---

## 3. Business Playbooks & Operational Guides
Role-by-role workflows explaining how JAXIS StatLab operates end-to-end.

| Document | Description |
| :--- | :--- |
| [BUSINESS_OPERATIONS_MANUAL.md](./business-playbooks/BUSINESS_OPERATIONS_MANUAL.md) | Master end-to-end operational manual covering all company operations. |
| [01-how-the-business-works.md](./business-playbooks/01-how-the-business-works.md) | High-level overview of the statistical consultation business model. |
| [02-ceo-guide.md](./business-playbooks/02-ceo-guide.md) | Chief Executive Officer dashboard, telemetry, oversight, and approvals guide. |
| [03-finance-hr-guide.md](./business-playbooks/03-finance-hr-guide.md) | Finance & HR guide for payroll, timecards, escrow releases, and refunds. |
| [04-specialist-statistician-guide.md](./business-playbooks/04-specialist-statistician-guide.md) | Statistician & Data Analyst guide for duty clock, datasets, and deliverables. |
| [05-client-journey-guide.md](./business-playbooks/05-client-journey-guide.md) | Lead Researcher (client) journey from intake to final research defense prep. |

---

## 4. Module Specifications (00–21)
Complete architectural specifications for all 22 system modules.

| Module | Title & Document |
| :--- | :--- |
| `M-00` | [00-foundation.md](./module-specs/00-foundation.md) — Core Platform Foundation & Shell |
| `M-01` | [01-auth.md](./module-specs/01-auth.md) — Authentication, Sessions & RBAC |
| `M-02` | [02-staff.md](./module-specs/02-staff.md) — Staff Provisioning & Role Management |
| `M-03` | [03-client-profile.md](./module-specs/03-client-profile.md) — Client Profile & Researcher Verification |
| `M-04` | [04-intake.md](./module-specs/04-intake.md) — Research Intake & Study Onboarding |
| `M-05` | [05-quotation.md](./module-specs/05-quotation.md) — Service Scoping & Quotation Engine |
| `M-06` | [06-sow.md](./module-specs/06-sow.md) — Statement of Work (SOW) & Digital Contracts |
| `M-07` | [07-payments.md](./module-specs/07-payments.md) — Escrow, Maya / GCash Payments & Billing |
| `M-08` | [08-assignment.md](./module-specs/08-assignment.md) — Workload Distribution & Specialist Matching |
| `M-09` | [09-messaging.md](./module-specs/09-messaging.md) — Consultation Channels & Study Messaging |
| `M-10` | [10-analysis.md](./module-specs/10-analysis.md) — Statistical Analysis & Dataset Processing |
| `M-11` | [11-qa.md](./module-specs/11-qa.md) — Quality Assurance Inspection & Review Gates |
| `M-12` | [12-deliverables.md](./module-specs/12-deliverables.md) — Deliverable Handover & Release Vault |
| `M-13` | [13-defenselab.md](./module-specs/13-defenselab.md) — DefenseLab™ Mock Defense Simulation |
| `M-14` | [14-finance.md](./module-specs/14-finance.md) — Financial Ledger, Escrow & Revenue Operations |
| `M-15` | [15-disputes.md](./module-specs/15-disputes.md) — Dispute Resolution & Refund Handling |
| `M-16` | [16-notifications.md](./module-specs/16-notifications.md) — Real-Time Notification & Alert Center |
| `M-17` | [17-reporting.md](./module-specs/17-reporting.md) — Business Intelligence & Telemetry Reporting |
| `M-18` | [18-attendance.md](./module-specs/18-attendance.md) — Duty Clock, Shifts & Leave Management |
| `M-19` | [19-payroll.md](./module-specs/19-payroll.md) — Automated Payroll Calculation & Payslips |
| `M-20` | [20-performance.md](./module-specs/20-performance.md) — Specialist Performance & Quality Metrics |
| `M-21` | [21-production-hardening.md](./module-specs/21-production-hardening.md) — Production Hardening, Caching & Resilience |

---

## 5. Module Verifications (00–21)
Verification test suites and acceptance criteria for all 22 system modules.

| Module | Verification Document |
| :--- | :--- |
| `M-00` | [00-foundation-verification.md](./module-verifications/00-foundation-verification.md) |
| `M-01` | [01-auth-verification.md](./module-verifications/01-auth-verification.md) |
| `M-02` | [02-staff-verification.md](./module-verifications/02-staff-verification.md) |
| `M-03` | [03-client-profile-verification.md](./module-verifications/03-client-profile-verification.md) |
| `M-04` | [04-intake-verification.md](./module-verifications/04-intake-verification.md) |
| `M-05` | [05-quotation-verification.md](./module-verifications/05-quotation-verification.md) |
| `M-06` | [06-sow-verification.md](./module-verifications/06-sow-verification.md) |
| `M-07` | [07-payments-verification.md](./module-verifications/07-payments-verification.md) |
| `M-08` | [08-assignment-verification.md](./module-verifications/08-assignment-verification.md) |
| `M-09` | [09-messaging-verification.md](./module-verifications/09-messaging-verification.md) |
| `M-10` | [10-analysis-verification.md](./module-verifications/10-analysis-verification.md) |
| `M-11` | [11-qa-verification.md](./module-verifications/11-qa-verification.md) |
| `M-12` | [12-deliverables-verification.md](./module-verifications/12-deliverables-verification.md) |
| `M-13` | [13-defenselab-verification.md](./module-verifications/13-defenselab-verification.md) |
| `M-14` | [14-finance-verification.md](./module-verifications/14-finance-verification.md) |
| `M-15` | [15-disputes-verification.md](./module-verifications/15-disputes-verification.md) |
| `M-16` | [16-notifications-verification.md](./module-verifications/16-notifications-verification.md) |
| `M-17` | [17-reporting-verification.md](./module-verifications/17-reporting-verification.md) |
| `M-18` | [18-attendance-verification.md](./module-verifications/18-attendance-verification.md) |
| `M-19` | [19-payroll-verification.md](./module-verifications/19-payroll-verification.md) |
| `M-20` | [20-performance-verification.md](./module-verifications/20-performance-verification.md) |
| `M-21` | [21-production-hardening-verification.md](./module-verifications/21-production-hardening-verification.md) |

---

## 6. Tasks & Roadmaps
Implementation checklists, backlog logs, and migration trackers.

| Document | Description |
| :--- | :--- |
| [01-master-tasks.md](./tasks/01-master-tasks.md) | Master development tracker across all phases. |
| [02-shadcn-migration.md](./tasks/02-shadcn-migration.md) | Shadcn component migration roadmap. |
| [SHADCN_MIGRATION_TASKS.md](./tasks/SHADCN_MIGRATION_TASKS.md) | Granular component replacement checklist. |
| [PERFORMANCE_TASKS.md](./tasks/PERFORMANCE_TASKS.md) | Database indexing and caching optimization tasks. |
| [TASKS.md](./tasks/TASKS.md) | Feature and operational task tracking. |

---

## 7. Operations, Notifications & Email
System operational parameters, email notification matrices, and delivery triggers.

| Document | Description |
| :--- | :--- |
| [06-email-system.md](./operations/06-email-system.md) | Resend transactional email templates and delivery pipelines. |
| [09-notification-triggers.md](./operations/09-notification-triggers.md) | In-app and email event trigger catalogue. |

---

## 8. Marketing Web & Public Site
Public website assets, landing page specs, and section-by-section revamp blueprints.

| Document | Description |
| :--- | :--- |
| [README.md](./marketing-web/README.md) | Marketing web documentation hub and revamp roadmap. |
| [00-navigation-bar.md](./marketing-web/00-navigation-bar.md) | Section 00: Navigation Bar (`Navbar.tsx`) specifications. |
| [01-hero-and-globe.md](./marketing-web/01-hero-and-globe.md) | Section 01: Hero & 3D Globe (`Hero.tsx`) specifications. |
| [02-our-approach.md](./marketing-web/02-our-approach.md) | Section 02: Our Approach (`Approach.tsx`) specifications. |
| [03-solutions.md](./marketing-web/03-solutions.md) | Section 03: Solutions & Deliverables (`Solutions.tsx`) specifications. |
| [04-packages-and-pricing.md](./marketing-web/04-packages-and-pricing.md) | Section 04: Packages & Pricing (`Pricing.tsx`) specifications. |
| [05-security-and-ethics.md](./marketing-web/05-security-and-ethics.md) | Section 05: Security & Ethics (`Security.tsx`) specifications. |
| [06-faq-accordion.md](./marketing-web/06-faq-accordion.md) | Section 06: FAQ Accordion (`FAQ.tsx`) specifications. |
| [07-footer-and-cta.md](./marketing-web/07-footer-and-cta.md) | Section 07: Footer & CTA (`FooterCTA.tsx`) specifications. |
