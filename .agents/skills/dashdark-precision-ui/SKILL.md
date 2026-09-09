---
name: dashdark-precision-ui
description: Master Enterprise Dark Precision Bento Design System for JAXIS StatLab. Creates responsive, SaaS-grade dark interfaces modeled after the Dashdark X reference photos. Enforces deep navy substrates (#010114, #01142B), enterprise orange accents (#CC6600), Phosphor fill icons exclusively, strict rounded-[2px] corners, 2:1 asymmetric bento grid architecture, and full mobile-to-desktop responsiveness across all roles (Client, Statistician, QA Lead, CEO/Admin).
---

# Dashdark Precision UI Skill — Master Enterprise Design System

## Role & Mandate

Act as **Principal Design Systems Architect, Lead UI/UX Engineer, and Visual Design Director** for JAXIS StatLab.

Your objective is to produce **world-class, SaaS-grade dark interfaces** that match the exact level of polish, cleanliness, simplicity, and architectural precision seen in the **Dashdark X dark-mode reference photos**.

This skill is **universal and role-agnostic**. It governs design upgrades across **ALL roles** in the application:
1. **Client Portal** (`/dashboard/client`)
2. **Lead Statistician Desk** (`/dashboard/statistician`)
3. **Senior QA Lead Desk** (`/dashboard/qa`)
4. **Executive / CEO / Admin Portal** (`/dashboard/admin`)

Every page you create or upgrade must embody the reference's:
- **Simplicity**: No decorative junk, no floating widgets, no artificial sci-fi HUD slop.
- **Cleanliness**: Meticulous spacing rhythm, crisp 1px borders, and uncluttered hierarchy.
- **2:1 Asymmetric Bento Layout**: Focal 8-column hero card paired with 4-column auxiliary cards.
- **Precision Border Radius**: Strictly **`rounded-[2px]`** across all cards, containers, buttons, and badges. Zero bubbly `rounded-xl` or `rounded-2xl` corners.
- **Phosphor Fill Icons**: Solid filled glyphs (`weight="fill"`) across cards, navigation, and badges.
- **Responsive Architecture**: Flawless optical scaling from mobile (375px) through widescreen (1920px).
- **Current Theme Grounding**: Built directly on JAXIS StatLab's current deep navy substrates (`#010114`, `#01142B`) and enterprise orange accent (`#CC6600`) without breaking existing design principles or backend code.

---

## 🔒 Hard Constraint: Frontend Presentation Only

This skill is strictly a **FRONTEND PRESENTATION & USER EXPERIENCE UPGRADE STANDARD**.

### Strictly Forbidden (Do NOT Touch):
- Database schemas (`prisma/schema.prisma`), migrations, or database queries.
- Server actions, API endpoints, route handlers, or backend services.
- Authentication, session validation, NextAuth configuration, or role permission logic.
- Business calculations, escrow rules, or backend workflows.

### Allowed & Expected Scope:
- Layout structure, responsive containers, flex/grid alignment, and spacing rhythm.
- Visual hierarchy, typography scales, optical line heights, and font weights.
- Color token applications, surface substrate elevation, and crisp 1px borders.
- Reusable component composition (`@repo/ui`) and component prop harmonization.
- Responsive breakpoints (`< sm`, `sm`, `md`, `lg`, `xl`).
- Micro-interactions, hover/focus/active press states, and tactile motion (<250ms).
- Form presentation, label clarity, placeholder simplification, and validation feedback.
- Empty states, loading skeletons, error states, and toast notifications.
- Plain English UX copywriting and button casing harmonization.

---

## 1. Substrate & Palette System (Current Theme Grounded)

Never introduce foreign palettes or pastel gradients. Strictly anchor to the current canonical dark precision substrate:

| Substrate Layer | Hex / Value | Semantic Role & Visual Function |
|---|---|---|
| **Master Canvas (L0)** | `#010114` | 95% Viewport foundation. Midnight Deep Space Navy. Absorbs visual noise. |
| **Surface Card (L1)** | `rgba(1, 20, 43, 0.85)` / `#01142B` | Standard card and sheet substrates. Deep ocean navy with crisp borders. |
| **Elevated Surface** | `#011B38` / `#01162E` | Hovered rows, selected items, active dialogs, and popovers. |
| **Well / Inset Surface (L2)** | `#010D1F` / `rgba(0, 0, 0, 0.30)` | Recessed controls, date dropdowns, search inputs, nested tables, and code blocks. |
| **Enterprise Orange** | `#CC6600` | Primary accent (**5–10% max rule**). Primary CTAs, active indicators, live counts. |
| **Hover Orange** | `#E67300` / `#FFA040` | Interactive hover state and illuminated active text. |
| **Analytical Sky** | `#38BDF8` | Research data points, secondary badges, telemetry metrics. |
| **Verification Emerald**| `#10B981` | Completed steps, approved milestones, active shifts, success states. |
| **Escrow Amber** | `#F59E0B` | Needs review, pending approvals, deposits due, attention notices. |
| **Danger Crimson** | `#EF4444` | Disputes, failed validations, destructive actions. |
| **Borders** | `border-white/10` to `border-white/15` | Crisp, flat, high-contrast 1px divisions. |

### 1.1. The 3-Level Substrate Elevation Hierarchy
Depth is established purely through flat substrate contrast and 1px borders—zero blurry drop shadows:
1. **L0 Master Canvas (`#010114`)**: Recedes completely; absorbs viewport margins and gutters.
2. **L1 Surface Card (`#01142B`)**: Crisp 1px flat border (`border-white/10`); elevated above the canvas.
3. **L2 Control Insets & Wells (`#010D1F`)**: Date filters, search inputs, and table headers are pressed *into* the card using a darker inset tint with subtle `border-white/10`.

### 1.2. Color Restraint & Anti-Rainbow Mandate
Color is a **scarce cognitive resource**. The Dashdark X reference achieves high-end authority by using **monochrome-first restraint**:

1. **Monochrome-First for Metric Cards (`<KpiCard />`)**:
   - In 90% of cases, `<KpiCard />` numerals must default to **crisp bold white (`text-white`)** using `variant="default"`.
   - **Absolute Ban on Rainbow Metric Rows**: Never render a row of 4 KPI cards where Card 1 is Yellow, Card 2 is Green, Card 3 is Sky Blue, and Card 4 is Orange.
   - **When Accent Colors are Allowed**: Reserve colored metric values (`variant="orange"` or `"amber"`) **strictly for active alerts where user action is required and count > 0** (e.g., `2 Action Needed` or `3 Disputes Open`). Standard informational counts (Total Studies, Approved, In Progress, Hours Purchased) must remain bold white.
   - **Typography-First Standard (No Decorative Icons on Metric Cards)**: Top-level informational KPI cards must NOT render decorative icons (`icon={...}`). High-impact monospace numerals and uppercase labels carry the hierarchy cleanly with executive authority. Reserve the `icon` prop exclusively for active alert states where user intervention is required (e.g., `<Clock weight="fill" className="text-amber-400" />` when `Action Required > 0`).
2. **Monochrome Hierarchy in Data Tables**:
   - Financial totals and quantities must default to `text-white font-mono font-bold`.
   - Never stack multiple neon colors in a single cell (e.g. Cyan total + Green downpayment + Yellow add-ons).
   - Use optical weight and opacity for hierarchy instead of color:
     - Primary value: `text-white font-mono font-bold`
     - Secondary breakdown: `text-white/70 font-mono`
     - Base price / subtext: `text-white/40 font-sans`
3. **The 80 / 15 / 5 Color Budget**:
   - **80% Substrate**: Dark precision canvas (`#010114`) and solid surfaces (`#01142B`).
   - **15% Typographic Contrast**: High-contrast white and calibrated opacity tints (`text-white`, `text-white/70`, `text-white/40`).
   - **5% Maximum Accent**: Enterprise Orange (`#CC6600`) for primary interactive CTAs, with semantic colors (`emerald`, `amber`, `crimson`) used strictly for purposeful state feedback.

### 1.3. Continuous Column Banding Pattern (Pricing & Quotation Matrix)
In comparison tables and quotation breakdowns (e.g. Service packages, SLA tiers):
- The **Featured / Recommended plan** (e.g. Corporate / Comprehensive Analysis) features a continuous vertical background tint (`bg-[#CC6600]/10` or `bg-white/[0.04]` with `border-[#CC6600]/30`) that extends seamlessly from the top plan card down through every row of the comparison table.
- This creates an unbroken visual column that guides user focus without relying on floating banners.

### Absolute Aesthetic Bans:
- **Zero Rainbow Metric Rows**: Default to crisp bold white numerals.
- **Zero Box-Shadow Glows**: Never use blurry glowing box-shadows (`shadow-[0_0_...px]`). Use crisp, flat borders.
- **Zero Awkward Gradients**: Never use multi-stop gradients on action bars, banners, or cards. Use solid substrates (`bg-[#01142B]/85`).
- **Zero Shouting All-Caps Buttons**: All buttons must use Title Case or Sentence Case (`"Review Quote →"`, `"View Details"`, `"Save Changes"`).

---

## 2. Typography & Font Hierarchy

The Dashdark X typography system balances clean modern sans-serif for reading with high-precision tabular monospace for metrics:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TYPOGRAPHIC ROLE MAPPING                                                │
├───────────────────┬───────────────────────────┬─────────────────────────┤
│ Element           │ Font Family & Classes     │ Optical Size & Weight   │
├───────────────────┼───────────────────────────┼─────────────────────────┤
│ Workspace Title   │ font-sans font-bold       │ text-xl sm:text-2xl     │
│ Section Headers   │ font-sans font-bold       │ text-base sm:text-lg    │
│ Card Titles       │ font-sans font-bold       │ text-sm sm:text-base    │
│ Body Prose / Copy │ font-sans font-normal     │ text-xs sm:text-sm      │
│ Helper / Subtext  │ font-sans text-white/50   │ text-[11px] sm:text-xs  │
│ Metric Numerals   │ font-mono font-bold       │ text-2xl sm:text-3xl    │
│ Table Numbers/Sum │ font-mono font-bold       │ text-xs sm:text-sm      │
│ Study / Trans IDs │ font-mono font-semibold   │ text-xs tracking-wider  │
│ Metric Category   │ font-mono uppercase       │ text-xs text-white/50   │
│ Micro Badges/Pill │ font-mono uppercase       │ text-[10px] font-bold   │
└───────────────────┴───────────────────────────┴─────────────────────────┘
```

### 2.1. Philippine Peso (`₱`) Currency Typography
- **Problem**: Monospace font stacks lack custom glyphs for `₱` (U+20B1), causing operating systems to fall back to clunky, disproportionately bolded or double-stroke glyphs.
- **Mandatory Policy**:
  1. Never render a raw `₱` character directly inside a `font-mono font-bold` container.
  2. Always use `<Peso className="..." />` from `@repo/ui` or `formatPeso(amount)` from `@/lib/formatters`.
  3. The `₱` symbol must always be rendered in **Sans-Serif (`font-sans font-normal opacity-85 select-none inline-block mr-0.5`)** to ensure consistent optical weight alongside monospace numerals.

### 2.2. Two-Line Primary Table Cells & Density Hierarchy
In data tables across all roles, primary entity cells (Client, Study Topic, Product) should use a **two-line vertical hierarchy** to optimize horizontal density:
- **Line 1 (Primary Title)**: `font-sans font-semibold text-xs text-white` (e.g. `John Carter`, `Supply Chain Resilience Analysis`, `iPhone 14 Pro Max`).
- **Line 2 (Metadata Subtext)**: `font-sans text-[11px] text-white/40` (e.g. `hello@johncarter.com`, `SPSS Dataset Attached`, `524 in stock`).
- This eliminates the need for sprawling horizontal columns, allowing dense, scannable data layouts.

---

## 3. Strict `rounded-[2px]` Border Radius Standard

To preserve the sharp architectural precision requested by the user (**"ofc still no border radius"**), all components and layouts must strictly adhere to:

```css
/* CANONICAL CORNER RADIUS MATRIX */
--radius-default: 2px; /* rounded-[2px] across 100% of cards, containers, buttons */
--radius-inner: 1px;   /* rounded-[1px] for progress bar tracks and inner wells */
--radius-pill: 9999px; /* rounded-full strictly reserved for circular status dots */
```

### Explicit Rules:
- **Cards & Bento Containers**: Strictly `rounded-[2px]` (never `rounded-xl`, `rounded-2xl`, or `rounded-3xl`).
- **Buttons**: Strictly `rounded-[2px]` across primary, secondary, outline, and ghost variants.
- **Form Inputs & Search**: Strictly `rounded-[2px]` (`border border-white/15 rounded-[2px]`).
- **Status Badges & Count Chips**: Strictly `rounded-[2px]`.
- **Keyboard Shortcut Keycaps (`<kbd>`):** Strictly `rounded-[2px]` (`px-1.5 py-0.5 rounded-[2px] bg-white/[0.08] border border-white/10 text-[10px] font-mono`).
- **Table Wrappers**: Outer container `rounded-[2px]`.
- **Dialogs & Modals**: Outer container `rounded-[2px]`.

---

## 4. Phosphor Fill Icons Exclusively (`@phosphor-icons/react` with `weight="fill"`)

To match the authoritative aesthetic of the Dashdark X reference photos:

1. **Mandatory Icon Library**: Use **Phosphor Icons (`@phosphor-icons/react`) exclusively with `weight="fill"`** across cards, navigation, and badges.
2. **Fill Icons Only (No Line/Outline Icons)**: Never render hollow line or thin outline icons. All primary subject glyphs must be solid filled shapes (`weight="fill"`).
3. **Directional & Utility Icons**: For small glyph strokes where a fill does not exist or makes the icon unreadable (arrows, chevrons, close `X`, and checkmarks), use **`weight="bold"`**:
   - Arrows: `<ArrowRight size={14} weight="bold" />`, `<ArrowLeft size={14} weight="bold" />`
   - Chevrons: `<CaretDown size={14} weight="bold" />`, `<CaretRight size={14} weight="bold" />`
   - Checks: `<Check size={14} weight="bold" />`
   - Close: `<X size={14} weight="bold" />`
   - Search: `<MagnifyingGlass size={14} weight="bold" />`
   - Spinners: `<CircleNotch size={14} weight="bold" className="animate-spin" />`
4. **Zero Emojis Policy**: Emojis are strictly forbidden anywhere in the UI.
5. **No Ad-Hoc Raw SVGs**: Always import components from `@phosphor-icons/react`.

### Standard Sizing Matrix:
- Micro badges & table cell icons: `size={12}` or `size={14}`
- Standard button icons & input decorators: `size={15}` or `size={16}`
- Card header icons: `size={18}` or `size={20}`
- Modal header icons: `size={22}`
- Empty state focal icons: `size={28}` or `size={32}`

---

## 5. The 2:1 Asymmetric Bento Architecture (Dashdark X Standard)

The canonical layout architecture from the reference photos is structured into 5 cohesive tiers:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TIER 1: WORKSPACE GREETING & COMMAND TOOLBAR                                           │
│ "Welcome back, [Name]"       [Subtext / Status]     [Secondary Action ↓] [Primary CTA +] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TIER 2: 4-COLUMN BALANCED KPI METRIC GRID (1-col on mobile, 2-col tablet, 4-col desktop)│
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐    │
│ │ METRIC 1         │ │ METRIC 2         │ │ METRIC 3         │ │ METRIC 4         │    │
│ │ 24.8%  [+2.4% ↗] │ │ 142    [Active]  │ │ 8     [Pending]  │ │ ₱184,500 [Ready] │    │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────┘    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TIER 3: THE 2:1 ASYMMETRIC FOCAL BENTO SECTION (8 cols hero + 4 cols auxiliary stack)   │
│ ┌──────────────────────────────────────────┬─────────────────────────────────────────┐ │
│ │ 8 COLS: PRIMARY FOCAL HERO CARD          │ 4 COLS: AUXILIARY INTELLIGENCE STACK    │ │
│ │                                          │ ┌─────────────────────────────────────┐ │ │
│ │ • Metric Header + Period Filter          │ │ AUXILIARY CARD 1: Micro Distribution│ │ │
│ │ • Interactive Stepper or Spline Chart    │ │ Metric + mini bar / progress visual │ │ │
│ │ • Analytical summary / timeline nodes    │ └─────────────────────────────────────┘ │ │
│ │                                          │ ┌─────────────────────────────────────┐ │ │
│ │                                          │ │ AUXILIARY CARD 2: Live Activity     │ │ │
│ │                                          │ │ Sparkline / ● Live Pulse / Status   │ │ │
│ │                                          │ └─────────────────────────────────────┘ │ │
│ └──────────────────────────────────────────┴─────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TIER 4: SECTION COMMAND RIBBON                                                         │
│ [Section Title]   [Filter Tab: All (12)] [Active (8)] [Completed (4)]   [🔍 Search /]  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TIER 5: LOWER BENTO COMPOSITION                                                        │
│ ┌────────────────────────────────────────┬───────────────────────────────────────────┐ │
│ │ 4 COLS: BREAKDOWN DONUT / PROGRESS     │ 8 COLS: HIGH-PRECISION SPREADSHEET TABLE  │ │
│ │ Gauge / semi-circle donut / category   │ ID | Entity | Metric | Status | Actions   │ │
│ │ breakdown list with percentages        │ Dense rows, 1-click badges, pagination    │ │
│ └────────────────────────────────────────┴───────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.1. Data Visualization & Chart Standards (Dashdark X Benchmarks)
When presenting quantitative charts or visual gauges across roles:
1. **Spline Area Charts**:
   - Primary data series curve with a subtle vertical gradient wash (fading from 20% opacity at peak to 0% at baseline).
   - Ultra-faint horizontal gridlines (`border-white/[0.04]` or `rgba(255, 255, 255, 0.04)`).
   - Interactive Tooltip Pin: Floating pill (`bg-[#010D1F] border border-white/15 rounded-[2px] px-2 py-1 text-xs font-mono`) anchored to active data nodes with a hairline vertical guide.
2. **High-Density Micro-Bar Charts**:
   - Thin vertical bars (4px–6px) with tight 2px gutters.
   - Inactive bars use subtle translucent white (`rgba(255, 255, 255, 0.12)`); active or highlighted bars use `#CC6600` or `#38BDF8`.
3. **Semi-Circle & Multi-Ring Donut Gauges**:
   - Thick stroke circular track with rounded caps (`strokeLinecap="round"`).
   - Centered focal readout: Big bold numeral (`font-mono font-bold text-2xl sm:text-3xl text-white`) with small uppercase category subtext below it.
   - Legend feed underneath: Clean dot indicator (`● Current Clients`) paired with right-aligned tabular count/amount.
4. **Ranked Horizontal Progress Bars**:
   - Category name on left, percentage on right, linked by a slim 3px–4px horizontal track.

---

## 6. Cross-Role Implementation Blueprint

This design system must be applied consistently across all 4 primary roles. Use these exact component mappings:

### Role A: Client Portal (`/dashboard/client`)
- **Tier 1 (Greeting)**: `Welcome back, [First Name]` · Plain English research tracker subtitle · Actions: `How It Works` (outline) + `+ Submit New Study Request` (primary Enterprise Orange `#CC6600`).
- **Tier 2 (KPIs)**: `TOTAL STUDIES` (ALL TIME), `ACTION REQUIRED` (ACTION NEEDED in amber when > 0), `IN PROGRESS / QA` (ACTIVE in sky blue), `DEFENSE READY` (DELIVERED in emerald). Numerals default to bold white.
- **Tier 3 (Hero 8-col)**: Canonical 5-Stage Study Pipeline Stepper (`Proposal & Quote` $\rightarrow$ `Contract (SOW)` $\rightarrow$ `Downpayment` $\rightarrow$ `Analysis & QA` $\rightarrow$ `Final Outputs`) in recessed L2 well (`bg-[#010D1F] border-white/10`) with 1-click copy badge on Study ID, target date, and direct action CTA.
- **Tier 3 (Auxiliary 4-col)**:
  - Top: `Statistical Consultation Desk` (`ChatCenteredText weight="fill"`, `● ACTIVE` green beacon, 2–4 hr SLA, `Message Desk →` button).
  - Bottom: `DefenseLab Practice` (`GraduationCap weight="fill"`, mock question counter, `Launch Simulator →` button).
- **Tier 3 (Footer Actions)**: Quick navigation to dedicated **My Studies Desk** (`/dashboard/client/projects`) when `projects.length > 1` for searching, filter tabs, and data tables. *(The main client dashboard remains an ultra-clean 3-tier cockpit without duplicate administrative table clutter).*

### Role B: Lead Statistician Desk (`/dashboard/statistician`)
- **Tier 1 (Greeting)**: `Statistician Operations Desk` · Active duty badge · Actions: `Duty Clock Widget` (Clock In / Out) + `+ New Analysis Log`.
- **Tier 2 (KPIs)**: `ASSIGNED STUDIES` (active count), `HOURS ON DUTY` (wall-clock total), `PENDING QA REVIEW` (submitted count), `CYCLE PAYOUT` (₱ sum, bold white).
- **Tier 3 (Hero 8-col)**: Active Computation Workbench (Current study intake ID, hypothesis summary, dataset vector download, R/SPSS output upload).
- **Tier 3 (Auxiliary 4-col)**:
  - Top: `Shift Telemetry Card` (Current shift wall-clock elapsed timer with `● Active Shift` live beacon).
  - Bottom: `QA Verification Rate` (First-pass approval % micro gauge).
- **Tier 4 (Ribbon)**: Workload filter tabs (`All Active`, `Chapter 4 Analysis`, `Revisions Pending`) + `/` search.
- **Tier 5 (Lower Bento)**: Assigned Studies Queue (8 cols) + Upcoming Mock Defense Rehearsals (4 cols).

### Role C: Senior QA Lead Desk (`/dashboard/qa`)
- **Tier 1 (Greeting)**: `Statistical Quality Assurance Desk` · Audit standards · Actions: `Audit Guidelines` + `+ New Verification Dossier`.
- **Tier 2 (KPIs)**: `QUEUE FOR REVIEW` (pending evaluations, amber if > 0), `STUDIES CERTIFIED` (total passed), `REVISION RATE` (percentage), `AVG TURNAROUND` (hours).
- **Tier 3 (Hero 8-col)**: Primary QA Inspection Workbench (Methodology verification checklist, p-value audit, APA 7th formatting validation, Release to Client CTA).
- **Tier 3 (Auxiliary 4-col)**:
  - Top: `Verification Gate Status` (`ShieldCheck weight="fill"`, Escrow release gate readiness).
  - Bottom: `Lead Statistician Workload` (Active allocations sparkline).
- **Tier 4 (Ribbon)**: Inspection filter tabs (`Awaiting Audit`, `Under Review`, `Certified`, `Rejected`) + `/` search.
- **Tier 5 (Lower Bento)**: Evaluation Ledger (8 cols) + Rejection & Methodology Notes (4 cols).

### Role D: Executive / CEO / Admin Portal (`/dashboard/admin`)
- **Tier 1 (Greeting)**: `Executive Governance Terminal` · Institutional oversight · Actions: `Export Financials ↓` + `+ Run Payroll Batch`.
- **Tier 2 (KPIs)**: `TOTAL REVENUE` (₱ gross volume), `ACTIVE ESCROW` (₱ securely vaulted), `ACTIVE RESEARCH STUDIES` (total monorepo count), `OPEN DISPUTES` (amber if > 0).
- **Tier 3 (Hero 8-col)**: Financial & Research Throughput Hero Card (Monthly revenue trend, intake velocity, completed deliverables volume).
- **Tier 3 (Auxiliary 4-col)**:
  - Top: `Specialist Duty Clock Status` (Staff currently on duty count with live ping beacon).
  - Bottom: `Dispute Tribunal Queue` (Open client claims awaiting CEO ruling).
- **Tier 4 (Ribbon)**: Institutional ledger filter tabs (`All Operations`, `Escrow Inflows`, `Staff Payroll`, `Disputes`) + `/` search.
- **Tier 5 (Lower Bento)**: System Operations Ledger (8 cols) + Revenue Breakdown Donut (4 cols).

---

## 7. Responsive Architecture & Breakpoint Standard

The interface must scale seamlessly across all modern viewports without layout breaking, horizontal scrollbar leaks, or squished padding:

```
┌────────────────────────────────────────────────────────────────────────┐
│ RESPONSIVE BREAKPOINT MATRIX                                           │
├───────────────┬──────────────┬─────────────────────────────────────────┤
│ Viewport      │ Width        │ Layout Adaptations                      │
├───────────────┼──────────────┼─────────────────────────────────────────┤
│ Mobile        │ < 640px      │ • Single-column stack throughout        │
│               │              │ • KPI cards: 1-col stack                │
│               │              │ • Bento 2:1 collapses to 1-col vertical │
│               │              │ • Actions toolbar stacks vertically     │
│               │              │ • Tables use horizontal touch-scroll    │
│               │              │ • Inner page padding: 1rem (16px)       │
├───────────────┼──────────────┼─────────────────────────────────────────┤
│ Small Tablet  │ 640px–768px  │ • KPI cards: 2-col grid (`sm:grid-cols-2│
│               │              │ • Bento sections stack vertically       │
│               │              │ • Filter tabs scroll horizontally       │
├───────────────┼──────────────┼─────────────────────────────────────────┤
│ Large Tablet  │ 768px–1024px │ • KPI cards: 2-col or 4-col (`md:grid`) │
│ (Laptop Mini) │              │ • Bento sections stack or begin 8:4     │
│               │              │ • Sidebar collapses to icon rail (80px) │
├───────────────┼──────────────┼─────────────────────────────────────────┤
│ Desktop       │ 1024px–1280px│ • Full 2:1 Asymmetric Bento (8:4 split) │
│               │              │ • 4-column balanced KPI row             │
│               │              │ • Expanded sidebar (260px)              │
├───────────────┼──────────────┼─────────────────────────────────────────┤
│ Widescreen    │ 1280px+      │ • Constrained to `max-w-7xl mx-auto`    │
│               │              │ • Consistent grid rhythm (`gap-6` / 24px)│
└───────────────┴──────────────┴─────────────────────────────────────────┘
```

### 7.1. Anti-Double-Padding & Consistent 24px Grid Container Rule
- **The root shell (`DashboardShell.tsx`) already applies viewport gutters**:
  ```tsx
  <main style={{ padding: "clamp(2rem, 4vw, 3.5rem)" }}>
  ```
- **Inner page routes inside `/dashboard` MUST NOT add redundant outer padding** (NO `px-4 sm:px-8 lg:px-12 py-8`).
- Standard inner page container:
  ```tsx
  <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
  ```
- **Consistent Grid Rhythm Standard**: All page sections, multi-column bento desks, status ribbons, metric grids, and column card stacks must strictly use a unified **`gap-6` (24px)** across both X and Y axes to prevent awkward, uneven gutters or canyons. Zero arbitrary mixing of `gap-4` and `gap-8`.

### 7.2. Dashdark X Sidebar-First Shell & Collapsible Rail Standard
- **Zero Desktop Topbar**: Desktop main canvas eliminates the horizontal topbar completely. The workspace starts immediately at $y = 0$, giving the `<PageHeader>` greeting and action buttons top-level prominence. On mobile (`< lg`), a lean `h-14` header bar remains with logo and hamburger button.
- **Collapsible Sidebar Rail**:
  - Toggles between **Expanded (`w-[17.5rem]` / 280px)** and **Collapsed Icon Rail (`w-[5rem]` / 80px)**.
  - Header opposing carets toggle button (`< >`) toggles rail width with smooth CSS transition (`transition-[width,transform] duration-200 ease-in-out`). State is persisted in `localStorage` (`jaxis_sidebar_collapsed`).
  - Integrated search box with `/` keyboard shortcut badge; in collapsed mode, compact `MagnifyingGlass` button expands sidebar.
  - Operational strip embeds `NotificationDrawer` bell and staff `DutyClockWidget`.
  - Footer user profile row with avatar, name, role/account settings, and Radix dropdown menu (Profile, HR & Timeclock, Sign Out). Collapses to centered circular avatar trigger.

---

## 8. Motion, Slow Reveal & Micro-Interactions

### 8.1. Slow Content Reveal Standard
Content entrance animations must feel smooth, deliberate, and premium—never flashing or jarring:
```css
/* apps/app/app/globals.css */
@keyframes contentFade {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-content-fade {
  animation: contentFade 0.68s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.animate-card-reveal {
  animation: cardReveal 0.75s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* Stagger increments: 90ms intervals */
.stagger-1 { animation-delay: 0ms; }
.stagger-2 { animation-delay: 90ms; }
.stagger-3 { animation-delay: 180ms; }
.stagger-4 { animation-delay: 270ms; }
.stagger-5 { animation-delay: 360ms; }
.stagger-6 { animation-delay: 450ms; }
```

### 8.2. Tactile Button Feedback (Emil Kowalski Standard)
- All interactive buttons must compress subtly on press:
  ```tsx
  className="... active:scale-[0.97] transition-transform duration-150"
  ```
- Dropdown items and select rows must use background tinting with zero focus rings:
  ```tsx
  className="outline-none focus:outline-none focus:ring-0 ring-0 hover:bg-white/[0.06]"
  ```

### 8.3. Dual-Cue Live Activity & Notification Badges
- Unread messages or live activity counters must combine an active pulse beacon and a high-contrast Enterprise Orange chip:
  ```tsx
  <div className="flex items-center gap-1.5">
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#CC6600] opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#CC6600]" />
    </span>
    <span className="bg-[#CC6600] text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] shadow-sm">
      {count} NEW
    </span>
  </div>
  ```
- **Quiet-When-Zero Protocol**: When count is `0`, indicators must be **completely quiet and invisible**. Never render gray `0` chips.

---

## 9. Plain English Copywriting & Anti-AI-Slop

All UI text must read like a normal person talking. Never use robotic enterprise buzzwords or double slashes:

| Banned AI-Slop Jargon | Plain Everyday English Alternative |
|---|---|
| Institutional Payroll Net | Total Payroll |
| Treasury Disbursed | Total Paid Out |
| Compensated Duty Hours | Hours Worked |
| Study Deliverables Paid | Studies Completed |
| Settlement Cadence | Pay Schedule |
| Disbursement Grace | Processing Days |
| Prorate Fixed Monthly Base Retainers | Split Monthly Salary in Half |
| Bespoke Override | Custom Rate |
| Specialist Overrides | Staff Overrides |
| Company Payslips Ledger | Payslips |
| Statement Ref | Payslip No. |
| Audit & Preview | Actions |
| Role Compensation Policies | Pay Rates |
| Executive Authority | CEO Access |
| Institutional Payslip Audit Ledger | All Payslips |
| Modify Terms / Set Override | Edit / Customize |
| Run Batch Cycle | Generate Payslips |

- **Zero Double Slashes Policy**: Double slashes (`//`) are strictly forbidden anywhere in copy.
- **Loading States**: Friendly phrases (`"Loading your studies..."`, `"Getting pay rates..."`).
- **Toast Messages**: Concise title (2–4 words) + one plain sentence description.
- **Button Labels**: Action-oriented Title Case (`"Review Quote →"`, `"View Details"`, `"Save Changes"`).

---

## 10. Design Upgrade Verification Checklist

Before considering any page or role upgrade complete, verify each criterion:

- [ ] **Substrate**: Master canvas `#010114`, card `#01142B`, crisp 1px borders `border-white/10` (no blurry glows, no multi-stop gradients).
- [ ] **Border Radius**: Strictly `rounded-[2px]` across all cards, containers, buttons, badges, keycaps, and modals.
- [ ] **Iconography**: Phosphor fill icons (`@phosphor-icons/react` with `weight="fill"`) across cards, navigation, and badges; `weight="bold"` for directional arrows, chevrons, close, and checkmarks. Zero emojis. Zero raw SVGs.
- [ ] **Typography**: `font-sans` for all reading content; `font-mono` strictly for numeric metrics, IDs, and uppercase micro-labels. `<Peso />` for currency.
- [ ] **Color Restraint**: Metric numerals default to bold white (`text-white`). Enterprise Orange (`#CC6600`) within 5–10% budget. Zero rainbow rows.
- [ ] **Bento Architecture**: 2:1 Asymmetric arrangement (8-col hero + 4-col auxiliary cards) with balanced 4-col KPI row and lower bento split.
- [ ] **Responsiveness**: Flawless optical scaling across mobile (<640px), tablet (640-1024px), desktop (1024px+). No horizontal scroll leaks.
- [ ] **Keyboard UX**: Search supports `/` keyboard shortcut with `<kbd>/</kbd>` keycap and `Esc` clear.
- [ ] **Copywriting**: 100% plain everyday English. Zero double slashes (`//`). Zero banned jargon.
- [ ] **Type & Lint Safety**: `npm run check-types` passes with 0 errors across the monorepo.
