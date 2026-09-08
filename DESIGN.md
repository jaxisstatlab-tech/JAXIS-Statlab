# JAXIS StatLab — Enterprise Design System & Interface Architecture

This document specifies the reverse-engineered enterprise visual design system, color tokens, visual hierarchy, and layout architectures for **JAXIS StatLab**.

---

## 1. Visual Personality & Brand Positioning

The **JAXIS StatLab** design system projects an **Enterprise, High-Trust, Mission-Critical SaaS** visual personality. It is built for academic institutions, research leads, QA auditors, finance officers, and enterprise clients.

- **Personality:** Trustworthy, Corporate, Cyber/Government-grade Technology, Premium SaaS, Mission-Critical.
- **Vibe:** Deep ocean space, precise data analytics, high security, non-distracting contrast.

---

## 2. Reverse-Engineered Color System

```css
:root {
  /* 1. Primary Background — 95% Foundation */
  --bg-primary: #010114;           /* Midnight Navy */
  
  /* 2. Surface & Glassmorphism — Content Separation */
  --surface-secondary: #012E57;    /* Deep Ocean Blue */
  --surface-glass: rgba(1, 46, 87, 0.55);
  --border-glass: rgba(255, 255, 255, 0.12);
  --border-glass-hover: rgba(255, 255, 255, 0.25);

  /* 3. Brand Accent — 5-10% Max Usage Rule */
  --accent-orange: #CC6600;        /* Enterprise Orange */
  --accent-orange-hover: #E67300;
  --accent-orange-glow: rgba(204, 102, 0, 0.35);

  /* 4. Primary Content — High Legibility */
  --text-primary: #FFFFFF;         /* Pure White */
  --text-secondary: rgba(255, 255, 255, 0.72);
  --text-muted: rgba(255, 255, 255, 0.45);

  /* 5. Semantic Status Overlays */
  --status-emerald: #10B981;       /* Fully Paid, Approved, Released */
  --status-amber: #F59E0B;         /* Awaiting Payment, In Review */
  --status-crimson: #EF4444;       /* Blocked, QA Rejected, Ethical Risk */
}
```

---

## 3. Color Usage Rules & Visual Hierarchy

```
Background (#010114)
   │
   └── Surface (#012E57)
         │
         └── Accent (#CC6600)  ─── 5-10% Max Usage Rule
               │
               └── Content (#FFFFFF)
```

### 1. Midnight Navy (`#010114`) — Primary Foundation (95%)
- **Purpose:** Primary backdrop for the entire application.
- **Used For:** Entire page background, hero section, navbar, footer, modal backdrops, dark cards, and main dashboard shells.

### 2. Deep Ocean Blue (`#012E57`) — Surface Color
- **Purpose:** Content separation without relying on generic gray backgrounds.
- **Used For:** Secondary cards, feature sections, hover states, glassmorphism panels, active navigation items, code snippets, and pricing highlight cards.

### 3. Enterprise Orange (`#CC6600`) — Brand Accent
- **Purpose:** Draw high-intent visual focus to key interactions.
- **Strict Rule:** **5–10% of the UI maximum.** Never use orange as a large background container.
- **Used For:** Primary CTAs, main action buttons, active navigation indicator tabs, key icons, notification badges, statistical key metric highlights, and subtle progress bars.

### 4. Pure White (`#FFFFFF`) — Content Legibility
- **Used For:** Headlines, primary body typography, crisp icons, logos, form labels, and subtle card borders (`rgba(255, 255, 255, 0.12)`).

---

## 4. Status Badges & Semantic Tokens

All project and operational statuses across the 9 workflow stages utilize the enterprise palette:

| Status Key | Display Name | Background / Border Token | Text Color |
| :--- | :--- | :--- | :--- |
| `DRAFT_QUOTE` | Draft Quote | Surface (`#012E57`) + Border (`rgba(255,255,255,0.2)`) | White (`#FFFFFF`) |
| `QUOTE_SENT` | Quote Issued | Accent Glow (`rgba(204,102,0,0.2)`) | Enterprise Orange (`#CC6600`) |
| `AWAITING_PAYMENT`| Awaiting Payment | Amber Muted (`rgba(245,158,11,0.2)`) | Warning Amber (`#F59E0B`) |
| `PAYMENT_SUBMITTED`| Proof Under Review | Amber Muted (`rgba(245,158,11,0.2)`) | Warning Amber (`#F59E0B`) |
| `FULLY_PAID` | Fully Paid | Emerald Muted (`rgba(16,185,129,0.2)`) | Success Emerald (`#10B981`) |
| `IN_ANALYSIS` | Analysis Active | Surface Accent (`#012E57`) | White (`#FFFFFF`) |
| `FOR_QA` | Pending QA Review | Surface Accent (`#012E57`) | White (`#FFFFFF`) |
| `QA_APPROVED` | QA Approved | Emerald Muted (`rgba(16,185,129,0.2)`) | Success Emerald (`#10B981`) |
| `RELEASED` | Deliverables Released | Emerald Muted (`rgba(16,185,129,0.2)`) | Success Emerald (`#10B981`) |
| `BLOCKED_UNPAID` | Release Blocked | Crimson Muted (`rgba(239,68,68,0.2)`) | Crimson Alert (`#EF4444`) |
| `ETHICAL_BREACH` | Ethical Risk Escalated | Crimson Solid (`#EF4444`) | White (`#FFFFFF`) |

---

## 5. Role Interface Architectures (6 Desks)

All 6 interface desks are built upon the Midnight Navy foundation with Deep Ocean Blue surface layering:

1. **Client Portal:**
   - Background: Midnight Navy (`#010114`)
   - Project Cards: Deep Ocean Blue (`#012E57`) with White text
   - Action Buttons: Enterprise Orange (`#CC6600`)

2. **Admin Executive Desk:**
   - High-density data grids framed in Deep Ocean Blue (`#012E57`)
   - Triage action triggers highlighted in Enterprise Orange (`#CC6600`)

3. **Statistician Workspace:**
   - Focused analytical workbench with dark navy backdrop to reduce eye strain
   - Upload action buttons styled in Enterprise Orange (`#CC6600`)

4. **Senior QA Studio:**
   - Audit scorecard checklists in Deep Ocean Blue (`#012E57`)
   - Risk escalation badges styled in Crimson (`#EF4444`) or Enterprise Orange (`#CC6600`)

5. **Finance Officer Console:**
   - Financial breakdown cards using Deep Ocean Blue (`#012E57`) with Emerald indicators for cleared funds

6. **CEO Risk Dashboard:**
   - Executive overview desk with high-level KPI cards and instant action overrides

---

## 6. Shared Component Library Specifications (`packages/ui`)

Shared components inside `packages/ui` must follow these styling tokens:

- **Button Primary:** `background: #CC6600; color: #FFFFFF; hover: #E67300; border-radius: 2px;`
- **Button Secondary:** `background: #012E57; color: #FFFFFF; border: 1px solid rgba(255,255,255,0.15); border-radius: 2px;`
- **Card Container:** `background: #012E57; border: 1px solid rgba(255,255,255,0.1); border-radius: 2px;`
- **Page Wrapper:** `background: #010114; min-height: 100vh; color: #FFFFFF;`

---

## 7. Official Typography Rules & Type Scale

The **JAXIS StatLab** interface enforces a clean, high-precision 2-tier typographic system paired with an 8-step proportional type scale:

### A. Font Families & Roles
- **Primary Font (`--font-primary` / `--font-sans` / `--font-heading`):** **sans-serif (Inter / System)** — Clean, high-legibility sans-serif used across all major headlines, section titles, card headers, navigation links, editorial body copy, captions, and interactive CTAs.
- **Secondary Font (`--font-secondary` / `--font-mono`):** **Disket Mono Regular** — Grid-based geometric monospace font used for statistical calculations, forensic data tags, package codes (`JX-01`), timestamps, metric counters, diagnostic stamps, and technical data annotations.

### B. Exact Type Scale Hierarchy
| Scale Token | Size (rem) | Size (px) | Line Height | Application |
| :--- | :--- | :--- | :--- | :--- |
| `xs` | `0.563rem` | ~9px | `1.4` | Micro-badges, timestamps, forensic tags |
| `sm` | `0.75rem` | 12px | `1.4` | Secondary metadata, captions, kicker labels |
| `base` | `1.000rem` | 16px | `1.5` | Standard body copy, navigation links, feed text |
| `lg` | `1.188rem` | 19px | `1.4` | Subheadings, card titles, featured descriptions |
| `xl` | `1.625rem` | 26px | `1.3` | Section headings, panel headers, medium callouts |
| `2xl` | `2.000rem` | 32px | `1.25` | Major titles, module headers, modal titles |
| `3xl` | `2.625rem` | 42px | `1.2` | Hero headers, level clear banners, big score displays |
| `4xl` | `3.25rem` | 52px | `1.15` | Giant display titles, victory screen numbers |

---

## 8. Landing Page & Visual Presentation Paradigms

The public-facing marketing and landing pages (like the Hero section) employ a specialized cinematic aesthetic designed to project enterprise scale and scientific rigor. All new landing page sections must adhere to these exact paradigms:

### A. Data-Driven Visualization (No Generic Assets)
- Never use generic stock photography, flat vector illustrations, or simple isometric SVGs.
- Backgrounds and visual anchors must be highly technical, utilizing WebGL/Three.js data visualizations (like the `ParticleGlobe`), code-styled data arrays, or hardware-accelerated particle systems.
- Visuals should live *behind* or frame the typography, heavily masked by radial gradients (`bg-radial-glow`) and vignettes to preserve pure readability.

### B. Typography Scale & Framing
- **Primary Headlines:** Must be massive, lightweight, and tightly tracked in clean **sans-serif** (`--font-primary` / `--font-sans`). Use `letter-spacing: -0.02em` and fluid `clamp()` sizing (e.g., `clamp(2.6rem, 7vw, 5.5rem)`).
- **Secondary Accents:** Frame large typography with small technical data annotations in **Disket Mono Regular** (`--font-secondary` / `--font-mono`, `0.75rem`, highly transparent) positioned at the absolute edges of the container to create structural texture.
- **Microcopy:** Body text max-width should rarely exceed `400px` for captions in clean **sans-serif** (`--font-primary` / `--font-sans`), keeping line lengths editorial and short.

### C. Motion & Animation Standards
- **Easing:** Standardize all CSS reveals on a cinematic ease-out curve: `cubic-bezier(0.22, 1, 0.36, 1)` with durations between `1.0s` and `1.3s`.
- **Staggering:** Elements must never appear simultaneously. Use strict, delayed cascading (e.g., Hero headline lines staggering in, followed by background data snippets, followed by the CTA) utilizing CSS `animationDelay` inline offsets (e.g. `0.15s`, `0.30s`).
- **Scroll Reveals:** For content below the fold, use lightweight native CSS animations (e.g. `.scroll-fade-up` using `translateY(50px)`) triggered via native `IntersectionObserver`. Avoid importing heavy JS layout libraries (GSAP ScrollTrigger) for simple fade/slide-up sequences.
- **Reduced Motion:** ALL animations (CSS and WebGL) must be rigorously gated behind `@media (prefers-reduced-motion: reduce)`. WebGL loops must freeze, and CSS elements must instantly resolve to their final `opacity: 1` state.

### D. Layout & Interaction Mechanics (The Anti-Generic Rules)
- **Sharp Brutalism:** Avoid soft, generic SaaS styling. No heavy drop shadows. Use strict `0px` or `2px` maximum border radii for hard, technical edges that feel like command terminals or data dashboards.
- **Hover Reveals:** Use "invisible" layouts where grids, tabs, and layout sections rely on `transparent` borders/backgrounds that only reveal themselves on hover (e.g., `border: 1px solid var(--border-glass-hover)`). This creates a responsive, highly interactive terminal-like feel without visual clutter.
- **Flush Grids:** Continuous vertical or horizontal elements (like feature grids) should snap flush (`gap: 0` on specific axes) to form tight, continuous data bands rather than floating distinct islands.
- **Console Text:** Use Disket Mono for technical data badges and status stamps with wide tracking to reinforce a highly readable, uniform scientific lab feel. Always orchestrate typewriter effects carefully to prevent layout shifts (e.g. lock container `max-width` and `overflow: hidden`).

---

## 9. Global Toast Notification Architecture & Usage Rules

JAXIS StatLab incorporates a mission-critical, portaled toast alert system (`@repo/ui/Toast` rendered to `document.body` at `z-[9999]`) with ambient gradients, colored Phosphor fill icons (`weight="fill"`), hardware-accelerated countdown timers, and pause-on-hover mechanics.

### A. The 4 Semantic Toast Variants

| Variant | Accent Color | Border & Gradient Surface | Icon (`@phosphor-icons/react`) | Primary Use Cases |
| :--- | :--- | :--- | :--- | :--- |
| `info` | Analytical Sky (`#38BDF8`) | `bg-gradient-to-r from-sky-950/90 to-[#010D1F] border-sky-500/35` | `<Info size={18} weight="fill" />` | Clipboard copies, download starts, non-destructive notifications, session events. |
| `success` | Verification Emerald (`#10B981`) | `bg-gradient-to-r from-emerald-950/90 to-[#010D1F] border-emerald-500/35` | `<CheckCircle size={18} weight="fill" />` | Form saves, project creation, profile updates, file attachments, QA approvals, status advancements. |
| `warning` | Enterprise Amber (`#CC6600` / `#FBBF24`) | `bg-gradient-to-r from-amber-950/90 to-[#010D1F] border-amber-500/35` | `<Warning size={18} weight="fill" />` | Missing information requests sent, staff suspensions, revision requests returned to statistician. |
| `danger` | Crimson Alert (`#EF4444` / `#F87171`) | `bg-gradient-to-r from-rose-950/90 to-[#010D1F] border-rose-500/35` | `<WarningOctagon size={18} weight="fill" />` | Action failures, network errors, file size >15MB limit exceeded, invalid file formats, account termination. |

### B. Mandatory Rules for When & Where to Trigger Toasts

When building new features, expanding desks, or adding buttons, apply these mandatory rules:

1. **Rule 1: Asynchronous Mutation Rule (Save / Submit / Delete)**
   - Every user-initiated Server Action (`create*`, `update*`, `delete*`, `resolve*`, `transition*`) MUST trigger a Toast upon completion.
   - On `res.success === true` → Fire `success` or `warning` (if request/hold) Toast.
   - On `res.success === false` → Fire `danger` Toast with `res.error.message`.

2. **Rule 2: 1-Click Clipboard Copy Rule**
   - Every copy button across tables, headers, and modals (e.g. Study ID, Credentials, Tokens) MUST trigger an `info` Toast (`"Copied to Clipboard"`).

3. **Rule 3: File System & Deliverables Rule**
   - **Upload Finished:** Fire `success` Toast (`"File Uploaded Successfully"`).
   - **Upload Rejected (Size / Format):** Fire `danger` Toast (`"File Limit Exceeded"` or `"Unsupported File Format"`).
   - **File Removed:** Fire `info` Toast (`"File Removed"`).
   - **Download Initiated:** Fire `info` Toast (`"Download Started"`).

4. **Rule 4: Zero Emojis Policy**
   - Never use emojis in `message` or `description`. Icons are handled automatically by the `Toast` component using `@phosphor-icons/react` with `weight="fill"`.

5. **Rule 5: Concise & Meaningful Copy**
   - `message`: 2 to 4 words, Title Case (e.g. `Profile Saved Successfully`, `Information Request Sent`).
   - `description`: 1 concise sentence explaining what changed and what happens next.

### C. Standard Component Implementation Example

```tsx
import { Toast } from "@repo/ui";

const [toastMessage, setToastMessage] = useState<{
  message: string;
  description?: string;
  variant: "info" | "success" | "warning" | "danger";
} | null>(null);

// Triggering Toast:
setToastMessage({
  message: "Study Submitted for Review",
  description: `Assigned Study ID: ${assignedId}. Your project is now queued for feasibility triage.`,
  variant: "success",
});

// Rendering in JSX:
{toastMessage && (
  <Toast
    message={toastMessage.message}
    description={toastMessage.description}
    variant={toastMessage.variant}
    onClose={() => setToastMessage(null)}
  />
)}
```

---

## 10. Modern Minimalist Loading & Anti-Double-Loading Architecture

### A. Minimalist Single-Ring Loader Standard (`LoadingState.tsx`)
- **Geometry:** Single calibrated geometric circular track in subtle `rgba(255, 255, 255, 0.08)`.
- **Active Arc:** 100° active arc in Enterprise Orange (`#CC6600`) with smooth rounded caps (`strokeLinecap="round"`), rotating at `0.85s linear infinite`.
- **Zero HUD Slop:** No sci-fi crosshairs, target ticks, concentric rings, or bouncing blobs.
- **Typography:** Sans-Serif font-semibold title with human copy (e.g. *"Loading research studies..."*, *"Preparing Statement of Work..."*), with zero robotic double slashes (`//`).

### B. Anti-Double-Loading Policy
- A page or view must only ever render **ONE** unified loader at a time.
- Sub-components (such as `<PendingLeaveQueue />`, secondary card summaries, or table skeletons) must never render independent loaders while a parent page-level loader is active.
- Return `null` from nested widgets while loading to prevent jitter and CLS.

### C. Server Component (RSC) Pre-loading
- Core operational desks (`admin/assignments`, `finance/attendance`, `finance/payroll`) must prefetch initial data in async Server Components (`page.tsx`) and pass `initialData` into client components.
- Initial HTML delivers with data already populated, giving users an instant 0ms perceived load time.

