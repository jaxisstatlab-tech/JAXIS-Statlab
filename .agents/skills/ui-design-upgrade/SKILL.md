---
name: ui-design-upgrade
description: Master Frontend UI/UX Design Upgrade Standard for JAXIS StatLab. Enforces system-first, anti-AI-slop interface elevation using current deep navy substrates (#010114, #01142B), enterprise orange accents (#CC6600), Tabler icons, Emil Kowalski tactile motion, and plain English copywriting. Strictly frontend-only with zero backend/data/auth changes.
---

# UI Design Upgrade Skill — JAXIS StatLab Master Standard

## Role & Mandate

Act as **Senior Product Designer, Design Systems Architect, UX Engineer, and UI Quality Director**.

Your responsibility is to systematically upgrade the visual quality, readability, visual rhythm, and interaction polish of JAXIS StatLab interfaces **page by page and role by role**, without breaking existing functionality or modifying backend architecture.

You are NOT a generic UI generator. Every interface you shape must feel:
- **Intentional**: Every line, border, color token, and margin has an explicit functional reason.
- **Cohesive**: Part of one single, authoritative, dark precision scientific application.
- **Simple**: Stripped of decorative clutter, floating widgets, and meaningless statistics.
- **Trustworthy**: Clean typography, balanced optical weight, and zero broken text clippings.
- **Human-Designed**: Written in natural, plain everyday English with zero robotic AI-slop jargon.

---

## 🔒 Hard Constraint: Frontend Presentation Only

This skill is strictly a **FRONTEND PRESENTATION & USER EXPERIENCE UPGRADE STANDARD**.

### Strictly Out of Scope (Do NOT Touch):
- Database schemas (`prisma/schema.prisma`), migrations, or database queries.
- Server actions, API endpoints, route handlers, or backend services.
- Authentication, session validation, NextAuth configuration, or role permission logic.
- Business calculations, escrow rules, or backend workflows.
- Application directory structure, package architecture, or infrastructure config.

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

> **Decision Rule**: If a design improvement requires data not provided by existing APIs/props, **stop at the boundary**. Do not invent backend endpoints. Present the existing data with maximum elegance and clarity.

---

## 1. Grounded in the JAXIS Current Theme (Dark Precision Terminal)

Never introduce foreign palettes, pastel purple gradients, or generic SaaS tropes. Strictly anchor to the current canonical design system:

| Token | Hex / Value | Semantic Role |
|---|---|---|
| **Master Canvas** | `#010114` | 95% Foundation substrate. Midnight Deep Space Navy. |
| **Surface Card** | `rgba(1, 22, 46, 0.75)` / `#01142B` | Standard card and sheet substrates with crisp borders. |
| **Surface Elevation** | `#011B38` / `#01162E` | Hovered rows, active dialogs, and elevated popovers. |
| **Enterprise Orange** | `#CC6600` | Primary accent (**5–10% max rule**). CTAs, active stepper tabs, focus accents. |
| **Analytical Sky** | `#38BDF8` | Telemetry metrics, research data points, secondary badges. |
| **Verification Emerald**| `#10B981` | Completed steps, approved milestones, active shifts, success states. |
| **Escrow Amber** | `#F59E0B` | Needs review, pending approvals, deposits due. |
| **Danger Crimson** | `#EF4444` | Disputes, failed validations, destructive actions. |
| **Borders** | `border-white/10` to `border-white/15` | Crisp, flat, high-contrast 1px divisions. |

### 1.1. Color Restraint & Anti-Rainbow Mandate (Monochrome-First Standard)
Color is a **scarce cognitive resource**. When every number, badge, pill, and label is painted in a different neon hue, the interface degrades into a chaotic carnival and quintessential AI-slop:

1. **Monochrome-First for Metric Cards (`<KpiCard />`)**:
   - In 90% of cases, `<KpiCard />` values must use **crisp bold white (`text-white`)** via `variant="default"`.
   - **Absolute Ban on Rainbow Metric Rows**: Never render a row of 4 KPI cards where Card 1 is Yellow, Card 2 is Green, Card 3 is Sky Blue, and Card 4 is Orange.
   - **When Accent Colors are Allowed**: Reserve colored metric values (`variant="orange"` or `"amber"`) **strictly for active alerts where user action is required and count > 0** (e.g., `2 Action Needed` or `3 Disputes Open`). Standard informational counts (Total Studies, Approved, In Progress, Hours Purchased) must remain bold white.
2. **Monochrome Hierarchy in Data Tables**:
   - Financial totals and quantities must default to `text-white font-mono font-bold`.
   - Never stack multiple neon colors in a single cell (e.g. Cyan total + Green downpayment + Yellow add-ons).
   - Use optical weight and opacity for hierarchy instead of color:
     - Primary value: `text-white font-mono font-bold`
     - Secondary breakdown: `text-white/70 font-mono`
     - Base price / subtext: `text-white/40 font-sans`
     - Add-ons: subtle `text-white/60 font-sans` (not screaming yellow)
3. **Badge & Status Restraint**:
   - Only the primary `<StatusBadge />` carries semantic status color. Do not surround it with 5 other colored chips. Keep ID chips muted (`bg-white/[0.04] text-white/80 border-white/10` or subtle `#CC6600/15 text-[#FF9433]`).
4. **The 80 / 15 / 5 Color Budget**:
   - **80% Substrate**: Dark precision canvas (`#010114`) and solid surfaces (`#01142B`).
   - **15% Typographic Contrast**: High-contrast white and calibrated opacity tints (`text-white`, `text-white/70`, `text-white/40`).
   - **5% Maximum Accent**: Enterprise Orange (`#CC6600`) for primary interactive CTAs, with semantic colors (`emerald`, `amber`, `crimson`) used strictly for purposeful state feedback.

### Absolute Aesthetic Bans:
- **Zero Rainbow Metric Rows**: Never render multi-colored rainbow cards side-by-side. Default to crisp bold white numerals.
- **Zero Gratuitous Color Highlights**: Never paint numbers, prices, or add-ons in rainbow hues (cyan, green, yellow, pink) unless communicating a live status trigger.
- **Zero Box-Shadow Glows**: Never use blurry glowing box-shadows (`shadow-[0_0_...px]`). Use crisp, flat borders.
- **Zero Awkward Gradients**: Never use multi-stop gradients (`bg-gradient-to-b from-[#01142B] via-[#010E20] to-[#010A17]`) on cards or tables. Use solid substrates (`bg-[#01142B]/85`).
- **Zero Shouting All-Caps Buttons**: All buttons must use Title Case or Sentence Case (`"Review Quote →"`, `"View Details"`, `"Save Changes"`). Precision `rounded-[2px]`.
- **Zero Raw Monospace Peso Glyphs**: Never render raw `₱` inside `font-mono font-bold`. Always use `<Peso />` from `@repo/ui` with `font-sans font-normal opacity-85 select-none inline-block mr-0.5`.

---

## 2. Anti-AI-Slop & Human Copywriting Standards

AI-generated interfaces suffer from recognizable patterns that erode trust. Every page upgrade must eliminate these:

### A. Copywriting & Tone (Section 6 of AGENTS.md)
- **Zero Robotic Double Slashes**: Never use `//` in titles, badges, loading states, or alerts.
- **Banned Words**: Eliminate `Institutional`, `Corporate`, `Bespoke`, `Treasury`, `Disbursement`, `Settlement`, `Cadence`, `Matrices`, `Parameters`, `Telemetry`, `Governance`, `Proration`, `Deliverables`.
- **Coworker Standard**: Write labels, descriptions, and helper text as if explaining clearly to a colleague.
  - *AI Slop*: `"Inspect itemized analytical proposals, review methodology deliverables, and approve project quotations to commence statistical computation."`
  - *Human Craft*: `"Review pricing, package options, and payment terms for your research studies."`
  - *AI Slop*: `"Allows our statisticians to evaluate timeline feasibility and calculate SLA delivery tiers."`
  - *Human Craft*: `"Helps our team make sure your statistical analysis is completed on time for your defense."`

### B. Anti-Truncation & Information Density
- **No Broken Ellipses**: Never cram long text into rigid containers that produce ugly `...` clippings (e.g. `IN FEASIBILITY ..` or `(Multivaria...`).
- **Clean Naming**: Strip redundant duplicate IDs from package labels (`JX-04 [DOCTORAL]` with `Advanced Analysis`, not `JX-04 JX-04 Advanced (Multivaria...`).

---

## 3. Emil Kowalski Design Engineering & Tactile Motion

Apply micro-interactions that make software feel alive, responsive, and tactile:

1. **Button Tactile Press Feedback**:
   Every pressable button must have instant feedback:
   ```css
   button:active {
     transform: scale(0.97);
   }
   ```
2. **Never Animate From `scale(0)`**:
   Entrances start from `scale(0.95)` with opacity `0`. Nothing in physical reality pops out of an infinite singularity.
3. **Origin-Aware Popovers & Menus**:
   Popovers scale from their trigger point (`transform-origin: var(--transform-origin)`). Modals remain centered.
4. **Fast, Snappy Durations**:
   UI animations must stay under **250ms**. Use custom cubic-bezier curves (e.g. `cubic-bezier(0.23, 1, 0.32, 1)` for snappy ease-out). Never use `ease-in` on UI elements.
5. **No Layout Thrashing**:
   Only animate `transform` and `opacity`. Never animate `padding`, `margin`, or `height`.
6. **Micro-Staggered Page & Card Intro Transitions**:
   Use `.animate-card-reveal` paired with rapid `.stagger-1` through `.stagger-8` utility classes (30ms step intervals) on top-level cards, KPI blocks, and page containers:
   ```css
   @keyframes cardReveal {
     0% {
       opacity: 0;
       transform: translateY(8px) scale(0.99);
     }
     100% {
       opacity: 1;
       transform: translateY(0) scale(1);
     }
   }
   ```
   - Micro-distance: Only 8px translation and 1% scale difference (`0.99`). Elements feel like they are gently settling into place rather than flying across the screen.
   - Total window: All elements must finish animating within 300ms.
   - Container-level only: Never stagger 50 table rows individually; animate the outer table container as a single unit.
   - Accessible reset: Always include `@media (prefers-reduced-motion: reduce)` to disable animations immediately for sensitive users.

### 3.2. Tactile Live Activity & Notification Badging Standard
Interactive indicators (such as unread message alerts, pending review badges, and live counters) must provide immediate, high-contrast, physical feedback:
1. **Dual-Cue Visual Indicator**:
   - **Live Pulse Beacon**: A glowing Enterprise Orange ping dot (`animate-ping` outer pulse + solid inner core `#CC6600`) signaling real-time activity.
   - **High-Contrast Count Chip**: A crisp, authoritative count badge (`bg-[#CC6600] text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] shadow-sm tracking-tight active:scale-90`) displaying `{count} NEW` (or `9+ NEW` if count exceeds 9).
2. **Icon Illumination & Label Elevation**:
   - When new messages or actionable items exist, illuminate the item icon in warm amber (`text-[#FFA040]`) and elevate the navigation text to bold white (`font-semibold text-white`).
3. **Quiet-When-Zero Protocol (Anti-Distraction)**:
   - When the count is `0`, the indicator must be **completely quiet and invisible**. Never render empty gray `0` badges, muted outlines, or idle ping blobs.
4. **Physical Haptic Compression**:
   - Navigation links and alert triggers compress on click/tap (`active:scale-[0.98]` on containers, `active:scale-90` on badges).
5. **Instantaneous State & 0ms Real-Time Protocol**:
   - Pre-load counts on the server in async RSC (`layout.tsx`) to eliminate first-paint flash or spinner delays.
   - Wire instantaneous local updates with custom window events (`jaxis:unread-count-updated`, `jaxis:message-read`, `jaxis:new-message`).
   - Automatically revalidate on tab focus via `visibilitychange` and lightweight background intervals.

---

## 4. Canonical Modern Portal UX Patterns & Standards

Elevate all customer and administrative portals using these canonical, high-efficiency UX patterns:

### 4.1. Keyboard Navigation Shortcut (`/` to Search & `Esc` to Clear)
- **Behavior**: Pressing `/` anywhere on a dashboard, search view, or table immediately focuses the search input; pressing `Esc` clears the search text and blurs the input.
- **Visual Cue**: Inputs equipped with this shortcut display a subtle, elegant keycap badge `<kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.08] text-white/40 border border-white/10 select-none">/</kbd>` on the right.
- **UX Benefit**: Power users, researchers, and clients can filter through studies, staff records, or payslips instantaneously without reaching for their mouse.

### 4.2. Visual 5-Stage Study Pipeline (Progress Stepper)
- **Pipeline Stages**: `Proposal` $\rightarrow$ `Contract (SOW)` $\rightarrow$ `Deposit` $\rightarrow$ `Analysis` $\rightarrow$ `Deliverables`.
- **Implementation**: Used on study cards (`ClientStudyCard.tsx`) and project inspection desks.
- **Stage Styling**:
  - **Completed Stages**: Verification Emerald (`text-emerald-400 bg-emerald-500/15 border-emerald-500/30`) with `<IconCheck size={12} />`.
  - **Active Stage**: Enterprise Orange (`text-white bg-[#CC6600] border-[#CC6600] font-bold`) with subtle ping or pulse.
  - **Upcoming Stages**: Muted white/20 (`text-white/30 bg-white/[0.02] border-white/10`).
- **UX Benefit**: Eliminates confusing database status codes; users immediately understand where their study is in the consultation pipeline and what the exact next step is.

### 4.3. Smart 1-Click "Reset Filters" on Empty Search Results
- **Anti-Dead-End Rule**: When a search query or status filter returns 0 results, never display a barren blank table or generic "No data" text.
- **Implementation**: Render a clean empty state card with a 1-click **"Clear Filters"** button that resets search queries and filter tabs with a single click.

### 4.4. Multi-Document Lightbox Navigation
- **Keyboard Shortcuts**: Keyboard left/right arrow keys or `[` / `]` navigate between documents; `Esc` closes the viewer.
- **Navigation Chrome**: Includes a header counter badge (`Document 2 of 5`), quick document tab strip, and zoom/pan controls.
- **UX Benefit**: Allows clients and QA leads to inspect multiple datasets, methodology reports, and receipts without repeatedly opening and closing modals.

### 4.5. 1-Click Copy Badge (`<CopyButton variant="badge" />`)
- **Usage**: Study intake IDs (`JAXIS-YYYYMM-XXXX`), transaction reference numbers, and escrow hashes.
- **Feedback**: Immediate tactile scale compression, instant clipboard copy, and visual state flip to emerald badge with checkmark (`Copied!`) for 1.8 seconds before reverting.

---

## 5. Anti-Double-Padding & Comprehensive Responsive Standards

Responsive design in JAXIS StatLab is **never about merely shrinking desktop cards until text clips or breaks**. It requires intentional layout transformation across viewports, respecting touch targets, viewport heights, and information density.

### 5.1. Shell Gutters vs. Page Container (Anti-Double-Padding Rule)
- The root shell (`DashboardShell.tsx`) already applies `clamp(2rem, 4vw, 3.5rem)` padding.
- Inner page routes inside `/dashboard` **MUST NOT add redundant outer padding** (`NO px-4 sm:px-8 py-8`).
- Standard inner wrapper:
  ```tsx
  <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
  ```
- Cards & sheets: `p-6 sm:p-8 md:p-10`. Microscopic `p-1` or `p-2` is strictly banned.

### 4.2. Viewport Breakpoints & Structural Behavior
| Breakpoint | Width (`min-width`) | Target Device Classes | Structural Behavior |
|---|---|---|---|
| **Mobile (`< sm`)** | `< 640px` (tested at `375px`) | Modern Smartphones | Single column, bottom sheets, full-width touch actions, compact progress bars. |
| **Phablet / Small Tablet** | `sm: 640px` | Large Phones, Foldables | 2-column KPI grids, inline filters, relaxed spacing. |
| **Tablet Portrait** | `md: 768px` | iPads, Tablets | Sidebar becomes slide-out drawer, 2 to 3-column form layouts, expanded table views. |
| **Small Laptop** | `lg: 1024px` | 13" MacBooks, Laptops | Persistent fixed sidebar (296px), 4-column KPI cards, full data tables. |
| **Wide Workstation** | `xl: 1280px` / `2xl: 1536px` | Desktop Monitors | Max-w-7xl centered container, generous negative space, optimal line length. |

### 4.3. Component-by-Component Responsive Transformations
1. **PageHeader & Actions**:
   - Desktop (`>= sm`): Two-column layout with breadcrumbs and title on left, right-aligned action buttons (`flex-row items-center justify-between`).
   - Mobile (`< sm`): Stacks vertically (`flex-col gap-4 items-stretch`). Action buttons stretch to full width (`w-full`) for effortless thumb tapping with minimum 44px height.
2. **KPI Telemetry Cards (`<KpiCard />`)**:
   - Desktop (`>= lg`): 4-column grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6`).
   - Tablet (`md`): 2-column grid (`grid-cols-2`).
   - Mobile (`< sm`): 1-column or compact 2-column grid with responsive typography (`text-2xl sm:text-3xl`). Sublabels wrap cleanly without ellipsis truncation.
3. **Multi-Step Workflows & Steppers**:
   - Desktop (`>= md`): Spacious multi-card phase cards with explanatory text and status tags.
   - Mobile (`< md`): Clean 50px single-row 3-column progress ribbon (`[1. Plan] [2. Details] [3. Review]`). Reclaims up to 250px of vertical viewport above the fold.
4. **Data Tables & Lists (`<DataTable />`)**:
   - Always wrap in `overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0` with minimum width (`min-w-[640px]`).
   - Keep primary record keys (`Study Title`, `ID`) left-pinned or prominently stacked.
   - Action icon buttons maintain touch targets of at least 36px to 44px.
5. **Modals & Drawers**:
   - Desktop (`>= sm`): Centered modal dialogs (`sm:max-w-lg md:max-w-2xl sm:rounded-[2px]`).
   - Mobile (`< sm`): Bottom-anchored sliding sheet (`rounded-t-lg max-h-[90vh] overflow-y-auto`) with a tactile drag handle indicator (`w-10 h-1 bg-white/20 rounded-full mx-auto mb-4`).
6. **Form Inputs & Touch Targets**:
   - Minimum 44x44px touch target on interactive elements (`h-11` or `p-3`).
   - Inputs must use `text-base sm:text-sm` (minimum 16px font size on mobile) to prevent mobile Safari auto-zooming.
   - Multi-column form grids collapse cleanly to `grid-cols-1 gap-5` on mobile.
7. **Topbar & Navigation Shell**:
   - Mobile topbar capped at **3 actions maximum** (`[🔔] [⏱ Duty Clock] [☰ Menu Trigger]`).
   - User profile, email, role badge, and sign-out live inside the mobile drawer.

### 5.4. Mobile-First Verification Checklist
- [ ] No horizontal viewport scrolling/leakage at `375px`.
- [ ] Primary actions (Save, Submit, Next) easily reachable with thumbs.
- [ ] Visual hierarchy clear above the fold without 400px of decorative cards.
- [ ] Zero text clippings (`...`) in badges, table cells, or status tags.
- [ ] Inputs remain visible when the on-screen mobile keyboard appears.

---

## 6. Comprehensive Accessibility (WCAG 2.2 AA) & Inclusive Design Standard

All UI upgrades must comply with **WCAG 2.2 Level AA**:

### 6.1. Contrast Ratios & Optical Hierarchy (WCAG 1.4.3 / 1.4.11)
- **Primary Body & Titles**: Text on Master Canvas (`#010114`) and Surface Cards (`#01142B`) must use `text-white` or `text-white/90` (14:1+ contrast, exceeding 4.5:1 requirement).
- **Secondary & Helper Text**: Must use `text-white/60` or `text-white/70` (minimum 4.5:1 contrast).
- **Strictly Banned**: Low-contrast gray text (`text-white/20` or `text-white/30` for readable labels).
- **Borders & Focus States**: Hairline borders (`border-white/10` to `border-white/20`) and focus rings must maintain at least 3:1 contrast against adjacent substrates.

### 6.2. Keyboard Navigation & Visible Focus Rings (WCAG 2.4.7 / 2.4.11)
- **Full Tabability**: Every interactive element must be reachable and operable via `Tab` / `Shift+Tab` and `Enter` / `Space`.
- **Visible Focus Rings**: Never use `outline-none` without pairing with a high-contrast focus ring:
  ```tsx
  className="outline-none focus-visible:ring-2 focus-visible:ring-[#CC6600] focus-visible:ring-offset-2 focus-visible:ring-offset-[#010114]"
  ```
- **Modal & Drawer Focus Trapping**: Modals and drawers must trap focus while open and restore focus to trigger upon dismissal with `Escape`.

### 6.3. Screen Reader Support & Semantic HTML (WCAG 1.3.1 / 4.1.2)
- **Single `<h1>` Rule**: Every page must have exactly one authoritative `<h1>` via `<PageHeader title="..." />`.
- **Icon Buttons Must Have Accessible Names**: Icon-only buttons MUST provide an accessible name via `aria-label` or `<span className="sr-only">`:
  ```tsx
  <button type="button" aria-label="Download quotation PDF" className="h-9 w-9 rounded-[2px] ...">
    <IconDownload size={18} aria-hidden="true" />
  </button>
  ```
- **Decorative Icons**: All visual accompaniment icons must have `aria-hidden="true"`.
- **Disclosure Controls**: Dropdowns and drawers declare `aria-expanded="true|false"` and `aria-controls="id"`.

### 6.4. Color Independence & Multi-Cue Status Design (WCAG 1.4.1)
- **Never Rely on Color Alone**: Every status indicator and badge must combine **three distinct visual cues**:
  1. **Color Tint Substrate** (`bg-emerald-500/10 text-emerald-400 border-emerald-500/20`)
  2. **Explicit Text Label** (`"Active"`, `"Needs Review"`, `"Disputed"`)
  3. **Distinct Tabler Icon** (`<IconCheck />`, `<IconClock />`, `<IconAlertTriangle />`)

### 6.5. Motion Sensitivity & Reduced Motion (WCAG 2.3.3)
- Respect `prefers-reduced-motion: reduce`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```
- In Tailwind: use `motion-reduce:transition-none motion-reduce:transform-none` on critical interactive elements.

### 6.6. Form Usability & Accessible Validation (WCAG 3.3.1 / 3.3.2)
- Explicit `<label htmlFor="id">` on every input (never placeholders alone).
- Accessible error states with `aria-invalid="true"` and `aria-describedby="error-id"`.

---

## 7. Standardized 6-Step Page Upgrade Protocol

When assigned to upgrade any page or view, execute this exact sequence:

### Step 1: Page Understanding
- Identify user role (`CLIENT`, `ADMIN`, `STATISTICIAN`, `QA`, `FINANCE`, `CEO`).
- Identify primary job-to-be-done and secondary workflows.
- Identify the core action hierarchy (what should the user click first?).

### Step 2: Design Audit
- Scan for AI slop: multi-stop gradients, box-shadow glows, robotic buzzwords, double slashes.
- Scan for layout bugs: text truncation (`...`), squished padding, mobile overflows, misaligned columns.
- Scan for typography bugs: raw `₱` in bold mono, all-caps shouting buttons, monospace overload.
- Scan for accessibility bugs: missing `aria-label` on icon buttons, contrast < 4.5:1, missing focus rings.

### Step 3: System Alignment
- Verify against canonical `@repo/ui` primitives:
  - `<PageHeader />` with `{ label: "WORKSPACE", href: "/dashboard" }` breadcrumbs.
  - `<KpiCard />` with uppercase mono labels and bold mono metrics.
  - `<DataTable />` / `<table className="data-table">` with clean headers.
  - `<LoadingState />` with single-track orange arc spinner.
  - `<EmptyState />` with relevant Tabler icon and helpful next step.

### Step 4: Design Improvement Plan
- Document specific issues found.
- Document planned visual, structural, and copy changes.
- Explicitly state what must be **preserved** (data flow, existing handlers, active routes).

### Step 5: Surgical Implementation
- Execute edits using design tokens and reusable components.
- Zero breaking changes to server communication or prop interfaces.

### Step 6: Verification Gate
- Run `npm run check-types` in `apps/app` (must exit with code 0).
- Run `npx eslint <target-file>` (must pass with 0 errors and 0 warnings).
- Inspect responsive behavior on desktop (`1280px`), tablet (`768px`), and mobile (`375px`).
- Verify keyboard navigation (`Tab`, `Enter`, `Escape`) and screen reader labels.
- Update `walkthrough.md`.

---

## 8. Role Harmonization Standard

All roles share the **same visual substrate, design tokens, typography, and button primitives**. Roles differ only in information density and operational workflows:

| Role | Workspace Focus | Characteristic Density |
|---|---|---|
| **Client Portal** | Study intake, quotation review, contract signing, progress milestones, deliverables. | Warm, reassuring, spacious (`max-w-7xl` or `max-w-5xl` for contracts), plain-English explanations. |
| **Lead Statistician & QA**| Active dataset analysis, methodology notes, QA checklists, revision feedback, duty timeclock. | Focused terminal precision, structured checklists, file inspection ribbons. |
| **Finance Officer** | Escrow deposits, milestone disbursements, refunds, dispute resolution, financial ledger. | Financial tabular clarity, clear Peso formatting, audit trail timestamps. |
| **Admin & CEO** | Intake triage, quotation builder drawer, project assignments, organizational overview. | High-density operational consoles, quick status toggles, action drawers. |

---

## 9. Summary Checklist Before Any UI Change

```text
[ ] Is this strictly a frontend presentation/UX change? (No backend/database/API changes)
[ ] Does it use the current theme palette (#010114, #01142B, #CC6600)?
[ ] Are all awkward gradients and box-shadow glows removed?
[ ] Are all double slashes (//) and robotic buzzwords replaced with plain English?
[ ] Are buttons using Title Case, precision rounded-[2px], and active scale(0.97)?
[ ] Is the Philippine Peso symbol rendered via <Peso /> in sans-serif?
[ ] Does the page container follow the anti-double-padding standard?
[ ] Is text truncation eliminated and responsive wrapping verified on mobile (375px)?
[ ] Are touch targets minimum 44x44px and inputs minimum 16px font size on mobile?
[ ] Are all icon-only buttons equipped with aria-label or .sr-only accessible names?
[ ] Is text contrast verified at >= 4.5:1 and are visible focus rings present?
[ ] Are Tabler icons used exclusively (no emojis, no ad-hoc SVGs)?
[ ] Are interactive alerts using the tactile live badging standard (pulse beacon + high-contrast chip, quiet-when-zero)?
[ ] Are intro animations using Emil Kowalski micro-staggering (.animate-card-reveal .stagger-1..6)?
[ ] Do search bars support the `/` focus and `Esc` clear keyboard shortcut with <kbd>/</kbd>?
[ ] Do empty filter/search results offer a 1-click "Clear Filters" action?
[ ] Are Study IDs and transaction references equipped with 1-click <CopyButton variant="badge" />?
[ ] Do check-types and ESLint pass with 0 errors and 0 warnings?
```

