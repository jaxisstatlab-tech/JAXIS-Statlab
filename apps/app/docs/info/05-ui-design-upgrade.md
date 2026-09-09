# JAXIS StatLab — UI Design Upgrade & Anti-AI-Slop Standard

**Workspace:** `apps/app` & `@repo/ui`  
**Role & Mandate:** Senior Product Designer, Design Systems Architect, UX Engineer, and UI Quality Director  
**Aesthetic Foundation:** Dark Precision Terminal / Enterprise Scientific (`#010114` Midnight Navy, `#01142B` Substrate, `#CC6600` Enterprise Orange)  
**Boundary:** **STRICTLY FRONTEND ONLY** (Zero Backend / Database / API / Auth / Logic Modifications)

---

## 1. Executive Summary & Objective

The goal of this standard is to systematically upgrade the visual quality, readability, spatial rhythm, and interaction polish of JAXIS StatLab interfaces **page by page and role by role**, while eliminating **"AI slop"** and preserving the existing product direction.

Every page must feel:
- **Intentional**: Every border, margin, color token, and type size has an explicit functional reason.
- **Cohesive**: An organic part of one single, authoritative, scientific system—never isolated one-offs.
- **Simple & Restrained**: Stripped of decorative clutter, floating widgets, and meaningless statistics.
- **Trustworthy & Human-Crafted**: Written in plain, everyday English with crisp optical alignment and zero broken text clippings.
- **Tactile & Responsive**: Snappy, sub-250ms feedback inspired by modern design engineering principles.

---

## 🔒 HARD CONSTRAINT — STRICTLY FRONTEND ONLY

This standard governs **FRONTEND PRESENTATION & USER EXPERIENCE ONLY**.

### Absolutely Out of Scope (DO NOT TOUCH):
- Database schemas (`prisma/schema.prisma`), migrations, or database queries.
- Server actions, API endpoints, route handlers, or backend services.
- Authentication logic, NextAuth configuration, session tokens, or RBAC permission gates.
- Business rules, milestone payment logic, escrow calculations, or backend workflows.
- Application architecture, directory structures, or third-party infrastructure.

### Permitted & Expected Scope:
- Layout architecture, container sizing, flex/grid alignment, and spacing rhythm.
- Visual hierarchy, typography scales, optical line heights, and font weights.
- Color token applications, surface substrate elevations, and crisp 1px borders.
- Reusable component composition (`@repo/ui`) and component prop harmonization.
- Responsive breakpoints (`< sm`, `sm`, `md`, `lg`, `xl`).
- Micro-interactions, hover/focus/active press states, and tactile motion (<250ms).
- Form presentation, label clarity, placeholder simplification, and validation feedback.
- Empty states, loading states, error states, and toast notifications.
- Plain English UX copywriting, helper text, and button casing harmonization.

> **Decision Rule**: If a design improvement requires data not provided by existing APIs or props, **stop at the boundary**. Do not invent backend endpoints. Present the existing data with maximum elegance and clarity.

---

## 2. Grounded in the Current Theme (Dark Precision Terminal)

We do not replace the existing aesthetic with generic SaaS tropes or purple AI gradients. We elevate the canonical design tokens:

### 2.1. Canonical Color Palette
| Token | Hex / Value | Semantic Role | Usage Rule |
|---|---|---|---|
| **Master Canvas** | `#010114` | Midnight Deep Space Navy | 95% foundation substrate for viewport, topbar, and main container. |
| **Surface Card** | `rgba(1, 22, 46, 0.75)` / `#01142B` | Elevated panels, cards, tables | Flat substrate with 1px border. Never add multi-stop vertical gradients. |
| **Surface Elevation** | `#011B38` / `#01162E` | Hovered rows, active dialogs | Subtle contrast step for interactive elements. |
| **Enterprise Orange** | `#CC6600` | Primary accent | **5%–10% max rule**. CTAs, active stepper tabs, focus accents, primary highlights. |
| **Analytical Sky** | `#38BDF8` / `#0284C7` | Telemetry metrics, research data | Secondary badges, methodology tags, dataset indicators. |
| **Verification Emerald**| `#10B981` | Verification seals, success states | Completed milestones, active shift indicator, approved QA seals. |
| **Escrow Amber** | `#F59E0B` | Escrow locked, deposits due | Review-required banners, pending quotes, deposit badges. |
| **Danger Crimson** | `#EF4444` | Disputes, errors, destructive | Dispute indicators, validation errors, reject actions. |
| **Border Division** | `rgba(255, 255, 255, 0.08)` / `border-white/10` | 1px perimeter divisions | Crisp, flat hairline boundaries. Never use blurry drop shadows. |

### 2.2. Color Restraint & Anti-Rainbow Mandate (Monochrome-First Standard)
Color is a **scarce cognitive resource**. When every number, badge, pill, and label is painted in a different neon hue, the interface degrades into a chaotic carnival and quintessential AI-slop:

1. **Monochrome-First for Metric Cards (`<KpiCard />`)**:
   - In 90% of cases, `<KpiCard />` values must use **crisp bold white (`text-white`)** via `variant="default"`.
   - **Absolute Ban on Rainbow Metric Rows**: Never render a row of 4 KPI cards where Card 1 is Yellow, Card 2 is Green, Card 3 is Sky Blue, and Card 4 is Orange.
   - **When Accent Colors are Allowed**: Reserve colored metric values (`variant="orange"` or `"amber"`) **strictly for active alerts where user action is required and count > 0** (e.g., `2 Action Needed` or `3 Disputes Open`). Standard informational counts (Total Studies, Approved, In Progress, Hours Purchased) must remain bold white.
   - **Typography-First Standard (No Decorative Icons on Metric Cards)**: Top-level informational KPI cards must NOT render decorative icons (`icon={...}`). High-contrast monospace numerals and uppercase labels carry the hierarchy cleanly with executive authority. Reserve the `icon` prop exclusively for active alert states where user intervention is required (e.g., `<Clock weight="fill" className="text-amber-400" />` when `Action Required > 0`).
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

### 2.3. Currency Typography Standard (Philippine Peso `₱`)
- **The Problem**: Monospace font stacks (`font-mono`) render raw `₱` (U+20B1) with an awkward, heavy, disproportionate fallback glyph.
- **Mandatory Policy**:
  1. Never render a raw `₱` inside `font-mono font-bold`.
  2. Always use the canonical `<Peso />` component from `@repo/ui` or `<MoneyDisplay amount={...} />`.
  3. The `₱` symbol must always be rendered in **Sans-Serif (`font-sans font-normal opacity-85 select-none inline-block mr-0.5`)**.

### 2.4. Telemetry & Area Charts Standard (`<AreaChart />`)
- **Library**: Powered by `recharts`, encapsulated cleanly in `@repo/ui`'s `<AreaChart />`.
- **SSR Hydration Safety**: Includes built-in `isMounted` state and a pulse skeleton matching the chart's exact height to prevent Next.js 16 SSR mismatches.
- **Color Budget**: Strict 2-color maximum — Enterprise Orange (`#CC6600`) and Analytical Sky (`#38BDF8`).
- **Substrate**: Must be encapsulated inside a solid `#01142B` Card with `rounded-[2px]`, `border-white/10`, and a telemetry header with an icon and time range label.

---

## 3. What is "AI Slop" & How We Eradicate It

AI-generated interfaces suffer from predictable clichés that destroy professional credibility. Every page upgrade must actively identify and eliminate these anti-patterns:

### 3.1. Cliché: Awkward Multi-Stop Gradients
- **AI Slop**: Heavy 3-stop vertical gradients on cards and tables (`bg-gradient-to-b from-[#01142B] via-[#010E20] to-[#010A17]`), or gaudy action bar gradients (`bg-gradient-to-r from-orange-500/20 to-transparent`).
- **Human Upgrade**: Crisp, solid substrates (`bg-[#01142B]/85` or `bg-[#01142B]`) with calibrated 1px perimeter borders (`border-white/10`).

### 3.2. Cliché: Blurry Box-Shadow Glows
- **AI Slop**: Diffuse glowing shadows (`shadow-[0_0_25px_rgba(204,102,0,0.35)]`) that look like a 2018 neon gaming HUD.
- **Human Upgrade**: Zero blurry glows. High-contrast, hairline borders (`border-white/10` to `border-white/20`) with calibrated background opacity (`bg-white/[0.04]` or `bg-[#CC6600]/10`).

### 3.3. Cliché: Robotic Jargon & Double Slashes (`//`)
- **AI Slop**: Pseudo-academic sci-fi phrases with robotic double slashes:
  - `"ESTABLISHING SECURE TELEMETRY PROTOCOL // COMMENCE COMPUTATION"`
  - `"Inspect itemized analytical proposals, review methodology deliverables, and approve project quotations to commence statistical computation."`
- **Human Upgrade**: Plain English coworker tone:
  - `"Loading workspace..."`
  - `"Review pricing, package options, and payment terms for your research studies."`
  - Zero double slashes (`//`) anywhere in the application.

### 3.4. Cliché: Text Truncation Disasters & Broken Ellipses
- **AI Slop**: Shoving text into rigid fixed-width flex containers that produce ugly clipped text:
  - `IN FEASIBILITY ..`
  - `(Multivaria...`
  - `JX-04 JX-04 Advanced (Multivaria...`
- **Human Upgrade**: Responsive layout containers with clean line wrapping, sensible abbreviations, and elimination of redundant duplicate codes.

### 3.5. Cliché: Shouting All-Caps Buttons
- **AI Slop**: Aggressive, all-caps button text (`"SUBMIT INTAKE REQUEST NOW"`, `"DOWNLOAD ALL DELIVERABLES"`).
- **Human Upgrade**: Clean Title Case or Sentence Case (`"Submit Intake Request →"`, `"Download All"`, `"Review Quote"`). Precision `rounded-[2px]`.

### 3.6. Cliché: Monospace Overload
- **AI Slop**: Setting whole paragraphs, descriptions, legal terms, or form labels in `font-mono`.
- **Human Upgrade**: **Sans-Serif First (`font-sans`)**. Monospace is strictly reserved for code, system IDs (e.g. `JAXIS-202608-0001`), and bold numerical telemetry metrics.

---

## 4. Frontend Skills Application

We combine proven design engineering methodologies into a unified execution:

### 4.1. Emil Kowalski Design Engineering & Tactile Motion (`emil-design-eng`)
Micro-interactions transform a static page into an interface that feels alive and premium:
1. **Active Button Press Feedback**:
   Every clickable button must have immediate, physical feedback on press:
   ```css
   button:active {
     transform: scale(0.97);
   }
   ```
2. **Never Animate From `scale(0)`**:
   Entrances start from `scale(0.95)` with opacity `0`. Nothing in physical reality expands from an infinitesimal singularity.
3. **Origin-Aware Popovers & Menus**:
   Flyouts and dropdowns scale from their trigger anchor (`transform-origin: top right`). Modals stay optically centered.
4. **Snappy Sub-250ms Timing**:
   Transitions must complete in **150ms–250ms** using snappy ease-out curves (`cubic-bezier(0.23, 1, 0.32, 1)`). Never use sluggish linear or `ease-in` animations on user actions.
5. **Zero Layout Thrashing**:
   Animate only hardware-accelerated properties: `transform` and `opacity`. Never animate `padding`, `margin`, or `height`.
6. **Micro-Staggered Page & Card Intro Transitions (Anti-Instant Mandate)**:
   - **Internal Operational Desks (Statistician, QA, Finance, Admin, CEO)**: Snappy 280ms duration with 35ms stagger intervals for rapid, high-density terminal productivity:
   ```css
   @keyframes cardReveal {
     0% {
       opacity: 0;
       transform: translateY(8px) scale(0.985);
     }
     100% {
       opacity: 1;
       transform: translateY(0) scale(1);
     }
   }
   ```
   - **Client Portal (Reassuring & Calm Reveal Standard)**: Slower, graceful, perceptible reveal over **540ms–620ms** using Apple/Vercel-grade smooth ease-out curves (`cubic-bezier(0.22, 1, 0.36, 1)`), a gentle 14px upward settling trajectory (`translateY(14px) scale(0.985)` to `0`), and 70ms cascading stagger cadence (`.stagger-1` through `.stagger-8`):
   ```css
   @keyframes clientCardReveal {
     0% {
       opacity: 0;
       transform: translateY(14px) scale(0.985);
     }
     100% {
       opacity: 1;
       transform: translateY(0) scale(1);
     }
   }
   ```
   - **Why This Matters**: Clients are students, researchers, and thesis candidates who benefit from a calm, reassuring, and organic entrance. The abrupt 240ms pop felt mechanical and almost instant; a 620ms reveal with 70ms intervals allows the eye to appreciate the progressive waterfall of cards settling effortlessly into the substrate.
   - Container-level only: Never stagger 50 table rows individually; animate the outer table container as a single unit.
   - Accessible reset: Always include `@media (prefers-reduced-motion: reduce)` to disable animations immediately for sensitive users.

### 4.2. Tactile Live Activity & Notification Badging Standard
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

### 4.3. Canonical Modern Portal UX Patterns & Standards
Elevate all customer and administrative portals using these canonical, high-efficiency UX patterns:
1. **Keyboard Navigation Shortcut (`/` to Search & `Esc` to Clear)**:
   - Behavior: Pressing `/` anywhere on a dashboard, search view, or table immediately focuses the search input; pressing `Esc` clears the search text and blurs the input.
   - Visual Cue: Inputs equipped with this shortcut display a subtle, elegant keycap badge `<kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.08] text-white/40 border border-white/10 select-none">/</kbd>` on the right.
   - UX Benefit: Power users, researchers, and clients can filter through studies, staff records, or payslips instantaneously without reaching for their mouse.
2. **Visual 5-Stage Study Pipeline (Progress Stepper)**:
   - Pipeline Stages: `Proposal` $\rightarrow$ `Contract (SOW)` $\rightarrow$ `Deposit` $\rightarrow$ `Analysis` $\rightarrow$ `Deliverables`.
   - Implementation: Used on study cards (`ClientStudyCard.tsx`) and project inspection desks.
   - Stage Styling:
     - Completed Stages: Verification Emerald (`text-emerald-400 bg-emerald-500/15 border-emerald-500/30`) with `<CheckCircle size={12} weight="fill" />`.
     - Active Stage: Enterprise Orange (`text-white bg-[#CC6600] border-[#CC6600] font-bold`) with subtle ping or pulse.
     - Upcoming Stages: Muted white/20 (`text-white/30 bg-white/[0.02] border-white/10`).
   - UX Benefit: Eliminates confusing database status codes; users immediately understand where their study is in the consultation pipeline and what the exact next step is.
3. **Smart 1-Click "Reset Filters" on Empty Search Results**:
   - Anti-Dead-End Rule: When a search query or status filter returns 0 results, never display a barren blank table or generic "No data" text.
   - Implementation: Render a clean empty state card with a 1-click **"Clear Filters"** button that resets search queries and filter tabs with a single click.
4. **Multi-Document Lightbox Navigation**:
   - Keyboard Shortcuts: Keyboard left/right arrow keys or `[` / `]` navigate between documents; `Esc` closes the viewer.
   - Navigation Chrome: Includes a header counter badge (`Document 2 of 5`), quick document tab strip, and zoom/pan controls.
   - UX Benefit: Allows clients and QA leads to inspect multiple datasets, methodology reports, and receipts without repeatedly opening and closing modals.
5. **1-Click Copy Badge (`<CopyButton variant="badge" />`)**:
   - Usage: Study intake IDs (`JAXIS-YYYYMM-XXXX`), transaction reference numbers, and escrow hashes.
   - Feedback: Immediate tactile scale compression, instant clipboard copy, and visual state flip to emerald badge with checkmark (`Copied!`) for 1.8 seconds before reverting.

### 4.4. Impeccable Visual Hierarchy & Layout Geometry (`impeccable`)
1. **The Anti-Double-Padding Mandate**:
   The root layout shell (`DashboardShell.tsx`) already applies `clamp(2rem, 4vw, 3.5rem)` padding.
   Inner page routes inside `/dashboard` **MUST NOT add redundant outer padding** (NO `px-4 sm:px-8 py-8`).
   Standard page container:
   ```tsx
   <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
   ```
   All desk layouts, multi-column bento grids, status ribbons, and card stacks must strictly use a unified **`gap-6` (24px)** across both X and Y axes to prevent awkward, uneven gutters or canyons.
2. **Generous Card Padding**:
   Standard card padding is `p-6 sm:p-8 md:p-10`. Microscopic `p-1` or `p-2` is strictly banned.
3. **Predictable Type Scale**:
   - Page Titles: `text-xl sm:text-2xl font-bold font-sans tracking-tight text-white`
   - Section Headers: `text-base sm:text-lg font-semibold font-sans text-white`
   - Body & Descriptions: `text-sm font-sans text-white/60 leading-relaxed`
   - Micro Badges & Meta: `text-xs font-mono font-medium tracking-wide`
   - Numerical Telemetry: `text-2xl sm:text-3xl font-mono font-bold text-white`

### 4.5. Plain-English Coworker Copywriting (`writing-guidelines`)
Write all labels, descriptions, empty states, and toast notifications as if explaining clearly to a colleague:
| Jargon (Banned) | Human Replacement |
|---|---|
| Institutional Payroll Net | Total Payroll |
| Treasury Disbursed | Total Paid Out |
| Compensated Duty Hours | Hours Worked |
| Study Deliverables Paid | Studies Completed |
| Settlement Cadence | Pay Schedule |
| Disbursement Grace | Processing Days |
| Bespoke Override | Custom Rate |
| Role Compensation Policies | Pay Rates |
| Executive Authority | CEO Access |
| Institutional Payslip Audit Ledger | All Payslips |
| Run Batch Cycle | Generate Payslips |

### 4.6. Industrial-Scientific Precision (`industrial-brutalist-ui`)
- Tabular data precision: clear header alignments, numerical columns right-aligned, monospaced dates and IDs.
- Hairline 1px border divisions (`border-white/10`).
- Strict Phosphor Fill Icons exclusively (`@phosphor-icons/react` with `weight="fill"`). Zero emojis anywhere, zero hollow line icons.

---

## 5. Comprehensive Responsive Architecture & Multi-Device Standards

Responsive design in JAXIS StatLab is **never about merely shrinking desktop cards until text clips or breaks**. It requires intentional layout transformation across viewports, respecting touch targets, viewport heights, and information density.

### 5.1. Viewport Breakpoints & Optical Targets
| Breakpoint | Width (`min-width`) | Target Device Classes | Structural Behavior |
|---|---|---|---|
| **Mobile (`< sm`)** | `< 640px` (tested at `375px`) | Modern Smartphones | Single column, bottom sheets, full-width touch actions, compact progress bars. |
| **Phablet / Small Tablet** | `sm: 640px` | Large Phones, Foldables | 2-column KPI grids, inline filters, relaxed spacing. |
| **Tablet Portrait** | `md: 768px` | iPads, Tablets | Sidebar becomes slide-out drawer, 2 to 3-column form layouts, expanded table views. |
| **Small Laptop** | `lg: 1024px` | 13" MacBooks, Laptops | Persistent fixed sidebar (296px), 4-column KPI cards, full data tables. |
| **Wide Workstation** | `xl: 1280px` / `2xl: 1536px` | Desktop Monitors | Max-w-7xl centered container, generous negative space, optimal line length. |

### 5.2. Component-by-Component Responsive Transformation Rules

#### A. PageHeader & Action Toolbars
- **Desktop (`>= sm`)**: Two-column layout with breadcrumbs and title on the left, right-aligned action buttons (`flex-row items-center justify-between`).
- **Mobile (`< sm`)**: Stacks vertically (`flex-col gap-4 items-stretch`). Action buttons stretch to full width (`w-full`) for effortless thumb tapping with minimum 44px height.

#### B. KPI Telemetry & Metric Cards (`<KpiCard />`)
- **Desktop (`>= lg`)**: Balanced 4-column grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6`).
- **Tablet (`md`)**: 2-column grid (`grid-cols-2`).
- **Mobile (`< sm`)**: 1-column or compact 2-column grid. Ensure metric numbers use responsive typography (`text-2xl sm:text-3xl`) and sublabels wrap cleanly without ugly ellipsis truncations.

#### C. Multi-Step Pipelines & Steppers
- **Desktop (`>= md`)**: Spacious multi-card vertical or horizontal phase breakdown with explanatory text and status tags.
- **Mobile (`< md`)**: Replaced with a compact 50px single-row 3-column progress ribbon (`[1. Plan] [2. Details] [3. Review]`). Reclaims up to 250px of vertical viewport so the primary form content is immediately visible above the fold.

#### D. Tabular Data & Workflows (`<DataTable />`)
- **Desktop (`>= lg`)**: Comprehensive multi-column data grid with monospaced IDs, timestamps, status tags, and action icon buttons.
- **Mobile & Tablet (`< lg`)**:
  - Always wrap tables in `overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0` with minimum content width (`min-w-[640px]`).
  - Keep primary record keys (`Study Title`, `ID`) stacked or left-pinned.
  - Action buttons must maintain a minimum touch target of `36px` to `44px`.

#### E. Modals, Drawers & Action Drawers
- **Desktop (`>= sm`)**: Centered high-contrast modal dialogs (`sm:max-w-lg md:max-w-2xl sm:rounded-[2px]`).
- **Mobile (`< sm`)**: Transform into bottom-anchored sheets (`rounded-t-lg max-h-[90vh] overflow-y-auto`) with a tactile drag handle indicator (`w-10 h-1 bg-white/20 rounded-full mx-auto mb-4`) and clear sticky footer CTA.

#### F. Form Inputs & Touch Targets
- **Minimum Touch Target**: Every interactive element (buttons, inputs, dropdown triggers, checkboxes) must have a touch target of at least `44x44px` on mobile (`h-11` or `p-3`).
- **iOS Font Zoom Prevention**: Form inputs must use `text-base sm:text-sm` (minimum 16px font size on mobile viewports) to prevent mobile Safari from forcibly zooming into the layout on focus.
- **Form Layout**: 2 or 3-column grids on desktop collapse cleanly to `grid-cols-1 gap-5` on mobile.

#### G. Topbar & Navigation Shell
- **Desktop (`>= md`)**: Full topbar with persistent active duty timer, notifications menu, and user identity profile menu.
- **Mobile (`< md`)**: Topbar right-hand icons are strictly capped at **3 targets maximum** (`[🔔] [⏱ Duty Clock] [☰ Menu Trigger]`). User profile, email, role badge, and sign-out controls are cleanly housed inside the mobile drawer.

### 5.3. Mobile-First Verification Checklist
Before approving any UI refactor, verify against these physical touch criteria:
- [ ] **No Horizontal Viewport Leakage**: Does the page scroll horizontally at `375px`? (If yes, fix rigid `w-[...]` or missing `overflow-x-hidden`).
- [ ] **Thumb Reachability**: Are primary actions (Save, Submit, Next) easily reachable without hand gymnastics?
- [ ] **Visual Hierarchy Above the Fold**: Can the user see what the page is about on mobile without scrolling through 400px of decorative cards?
- [ ] **Zero Text Clippings**: Check that badges, table cells, and status indicators wrap or abbreviate cleanly rather than displaying `...`.
- [ ] **Keyboard Stability**: Do inputs remain visible when the mobile on-screen keyboard pops up?

---

---

## 6. Comprehensive Accessibility (WCAG 2.2 AA) & Inclusive Design Standard

A visually striking interface that cannot be navigated by keyboard, read by a screen reader, or seen in high contrast is an engineering failure. All page upgrades must comply with **WCAG 2.2 Level AA**:

### 6.1. Contrast Ratios & Optical Hierarchy (WCAG 1.4.3 / 1.4.11)
- **Primary Body & Titles**: Text on Master Canvas (`#010114`) and Surface Cards (`#01142B`) must use `text-white` or `text-white/90` (14:1+ contrast, vastly exceeding the required 4.5:1).
- **Secondary & Helper Text**: Must use `text-white/60` or `text-white/70` (minimum 4.5:1 contrast).
- **Strictly Banned**: Microscopic, low-contrast gray text (`text-white/20` or `text-white/30` for readable labels).
- **UI Borders & Focus States**: Hairline borders (`border-white/10` to `border-white/20`) and focus indicators must maintain at least 3:1 contrast against adjacent background colors.

### 6.2. Keyboard Navigation & Visible Focus Indicators (WCAG 2.4.7 / 2.4.11)
- **Full Tabability**: Every interactive element (buttons, tabs, links, table actions, inputs) must be reachable and operable via `Tab` / `Shift+Tab` and `Enter` / `Space`.
- **No Invisible Focus**: Never write `outline-none` without immediately pairing it with a high-contrast focus ring:
  ```tsx
  className="outline-none focus-visible:ring-2 focus-visible:ring-[#CC6600] focus-visible:ring-offset-2 focus-visible:ring-offset-[#010114]"
  ```
- **Modal & Drawer Focus Trapping**: Modals and slide-out drawers must trap keyboard focus while open, transfer focus to the primary interactive element upon opening, and restore focus to the trigger upon dismissal with `Escape`.

### 6.3. Screen Reader Support & Semantic HTML (WCAG 1.3.1 / 4.1.2)
- **Single `<h1>` Rule**: Every page must have exactly one authoritative `<h1>` element, provided canonically by `<PageHeader title="..." />`. Sub-sections must follow logical heading levels (`<h2>`, `<h3>`).
- **Icon Buttons Must Have Accessible Names**: Any button or link containing only an icon MUST provide an accessible name via `aria-label` or `<span className="sr-only">`:
  ```tsx
  <button
    type="button"
    aria-label="Download quotation PDF"
    className="h-9 w-9 rounded-[2px] ..."
  >
    <IconDownload size={18} aria-hidden="true" />
  </button>
  ```
- **Decorative Icons**: All visual accompaniment icons must have `aria-hidden="true"`.
- **Disclosure Controls**: Dropdowns, accordions, and mobile navigation toggles must declare `aria-expanded="true|false"` and `aria-controls="content-id"`.

### 6.4. Color Independence & Multi-Cue Status Design (WCAG 1.4.1)
- **Never Rely on Color Alone**: A color shift (e.g. green vs. red) is invisible to color-blind users. Every status indicator and badge must combine **three distinct visual cues**:
  1. **Color Tint Substrate** (e.g. `bg-emerald-500/10 text-emerald-400 border-emerald-500/20`)
  2. **Explicit Text Label** (e.g. `"Active"`, `"Needs Review"`, `"Disputed"`)
  3. **Distinct Phosphor Fill Icon** (e.g. `<CheckCircle weight="fill" />`, `<Clock weight="fill" />`, `<Warning weight="fill" />`)

### 6.5. Motion Sensitivity & Vestibular Safety (WCAG 2.3.3)
- Users with vestibular disorders can experience nausea from sudden motion or scale animations.
- All Emil Kowalski tactile transforms and CSS animations must respect `prefers-reduced-motion: reduce`:
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
- **Explicit Label Associations**: Every input must have an associated `<label htmlFor="id">`. Placeholders must never be used as a substitute for labels.
- **Accessible Error States**: When validation fails:
  - Mark input with `aria-invalid="true"`.
  - Link the error message with `aria-describedby="input-error-id"`.
  - Provide human-readable, specific guidance (e.g. `"Please select a research methodology tier"` instead of `"Validation failed"`).

---

## 7. Standardized 6-Step Page Upgrade Protocol

When assigned to upgrade any page or view, execute this exact sequence:

```
Step 1: Understand
   ↓
Step 2: Audit
   ↓
Step 3: System Alignment
   ↓
Step 4: Design Plan
   ↓
Step 5: Surgical Implementation
   ↓
Step 6: Final Quality Check
```

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
Verify against canonical `@repo/ui` primitives:
- `<PageHeader />` with `{ label: "WORKSPACE", href: "/dashboard" }` breadcrumbs.
- `<KpiCard />` with uppercase mono labels and bold mono metrics.
- `<DataTable />` / `<table className="data-table">` with clean headers.
- `<LoadingState />` with single-track orange arc spinner.
- `<EmptyState />` with relevant Phosphor fill icon (`weight="fill"`) and helpful next step.

### Step 4: Design Improvement Plan
Document specific issues found, planned visual and structural improvements, and what must be **preserved**.

### Step 5: Surgical Implementation
Execute edits using design tokens and reusable components. Ensure zero breaking changes to server communication, API contracts, or prop interfaces.

### Step 6: Final Quality Check
- Run `npm run check-types` in `apps/app` (must exit with code 0).
- Run `npx eslint <target-file>` (must pass with 0 errors and 0 warnings).
- Inspect responsive behavior on desktop (`1280px`), tablet (`768px`), and mobile (`375px`).
- Verify keyboard navigation (`Tab`, `Enter`, `Escape`) and screen reader labels.
- Update `walkthrough.md`.

---

## 8. Role Harmonization Matrix

All user roles share the **same visual substrate, design tokens, typography, and button primitives**. Roles differ only in information density and operational workflows:

| Role | Workspace Focus | Characteristic Density & Layout |
|---|---|---|
| **Client Portal** | Study intake, quotation review, contract signing, milestones, deliverables. | Warm, reassuring, spacious (`max-w-7xl` or `max-w-5xl` for legal/contracts), plain-English explanations. Calm 620ms staggered card reveal. |
| **Lead Statistician & QA** | Active dataset analysis, methodology notes, QA checklists, revision feedback, duty clock. | Focused terminal precision, structured checklists, file inspection ribbons. |
| **Finance Officer** | Escrow deposits, milestone disbursements, refunds, dispute resolution, financial ledger. | Tabular clarity, clear Peso formatting, audit trail timestamps, quick reconciliation actions. |
| **Admin & CEO** | Intake triage, quotation builder drawer, project assignments, organizational overview. | High-density operational consoles, quick status toggles, action drawers. |

---

## 10. Canonical Dashboard Bento Architecture (Dashdark X Precision Standard)

To achieve world-class SaaS simplicity, cleanliness, and spatial elegance, all primary role dashboards across all roles must follow the **Asymmetric Bento Grid Architecture** inspired by top-tier dark dashboards (e.g. *Dashdark X*), codified in the master design skill [.agents/skills/dashdark-precision-ui/SKILL.md](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/.agents/skills/dashdark-precision-ui/SKILL.md), and strictly harmonized with JAXIS StatLab's **Dark Precision Terminal standard (`rounded-[2px]`)**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TIER 1: GREETING & COMMAND TOOLBAR                                                     │
│ Welcome back, [Name]                        [Secondary Action ↓]  [+ Primary Action]  │
│ Plain-English context description                                                     │
├───────────────────┬───────────────────┬───────────────────┬────────────────────────────┤
│ TIER 2: 4-COLUMN BALANCED KPI METRIC BENTO                                             │
│ [👁 Pageviews ...] │ [👤 Monthly users] │ [➕ New sign ups]  │ [⭐ Subscriptions]         │
│  50.8K [28.4% ↗]  │  23.6K [12.6% ↘]  │  756 [3.1% ↗]     │  2.3K [11.3% ↗]            │
│  Subtle subtext   │  Subtle subtext   │  Subtle subtext   │  Subtle subtext            │
├───────────────────┴───────────────────┴───────────────────┴────────────────────────────┤
│ TIER 3: THE 2:1 ASYMMETRIC FOCAL BENTO (8 COLS vs 4 COLS)                              │
│ ┌───────────────────────────────────────────────┐ ┌──────────────────────────────────┐ │
│ │ PRIMARY HERO CARD (8 COLS / ~66% WIDTH)       │ │ AUXILIARY STACK (4 COLS / ~33%)  │ │
│ │ Metric Header: Total Revenue $240.8K [24.6% ↗]│ │ ┌──────────────────────────────┐ │ │
│ │ Controls: ● Series A  ● Series B  [Jan-Dec ⌵] │ │ │ Total Profit $144.6K [28.5% ↗]│ │ │
│ │                                               │ │ │ High-Density Micro Bar Chart │ │ │
│ │ Deep Spline Area Chart / 5-Stage Stepper Desk │ │ │ Last 12 mos     View report →│ │ │
│ │                                               │ │ └──────────────────────────────┘ │ │
│ │ Interactive Tooltip Pin: $125.2k [12.6% ↗]    │ │ ┌──────────────────────────────┐ │ │
│ │ Faint Horizontal Dividers (border-white/[0.04]│ │ │ Total Sessions 400 [16.8% ↗] │ │ │
│ │ Jan Feb Mar Apr May Jun Jul Aug Sep Oct NovDec│ │ │ Sparkline Wave · [● Live]      │ │ │
│ └───────────────────────────────────────────────┘ └──────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TIER 4: SECTION COMMAND RIBBON                                                         │
│ Reports Overview / Active Studies    [All] [In Progress] [Delivered]    [Search... /]  │
├───────────────────────────────────┬────────────────────────────────────────────────────┤
│ TIER 5: LOWER BENTO COMPOSITION   │                                                    │
│ ┌───────────────────────────────┐ │ ┌────────────────────────────────────────────────┐ │
│ │ PROGRESS GAUGE / DONUT METER  │ │ │ HIGH-PRECISION RECENT STUDIES / ORDERS TABLE   │ │
│ │ 23,648 Studies by Stage       │ │ │ ID        Title       Status     Total  Actions│ │
│ │ Centered Arc / Donut Meter    │ │ │ JX-001    Genomics    ● Analysis ₱45K   [View] │ │
│ │ · Desktop: 15,624 (65%)       │ │ │ JX-002    Nursing     ● Quoted   ₱28K   [Sign] │ │
│ │ · Mobile: 5,546 (25%)         │ │ │ JX-003    Business    ● Closed   ₱60K   [File] │ │
│ └───────────────────────────────┘ │ └────────────────────────────────────────────────┘ │
└───────────────────────────────────┴────────────────────────────────────────────────────┘
```

### 10.1. Tier 1: Page Header & Dual-Action Command Toolbar
- **Greeting & Title**: Bold, authoritative title (`text-xl sm:text-2xl font-bold font-sans text-white tracking-tight`) greeting the user warmly (`"Welcome back, [First Name]"` or specific workspace title).
- **Coworker Context Subtitle**: One plain-English sentence explaining the current operational scope (`text-xs sm:text-sm text-white/50 font-sans mt-0.5`).
- **Dual-Action Toolbar**:
  - **Secondary Action Button**: Compact subtle outline button (e.g. `"Export data ↓"` or `"How It Works"`), `border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.08] hover:text-white rounded-[2px] text-xs font-semibold px-3.5 py-2`.
  - **Primary Action Button**: High-contrast Enterprise Orange CTA (`"Create report"` or `"+ Submit New Study"`), `bg-[#CC6600] hover:bg-[#E67300] text-white rounded-[2px] text-xs font-bold px-4 py-2 shadow-sm`.

### 10.2. Tier 2: 4-Column Balanced KPI Metric Grid
The top telemetry row consists of exactly 4 balanced, equal-width cards (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5`):
- **Card Micro-Anatomy**:
  1. **Top Header**: Left-aligned Phosphor fill micro-icon (`size={16}`, `weight="fill"`) with category label (`text-xs font-mono font-semibold uppercase tracking-wider text-white/50`); right-aligned subtle action trigger (`...`) or status beacon.
  2. **Metric Hero & Inline Micro-Pill**: Bold, high-contrast monospace numeral (`text-2xl sm:text-3xl font-mono font-bold text-white`) accompanied directly by an inline status or trend pill:
     - **Positive / Active**: `bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono font-bold inline-flex items-center gap-1`.
     - **Action Needed / Warning**: `bg-amber-500/15 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono font-bold inline-flex items-center gap-1`.
     - **Critical / Disputed**: `bg-rose-500/15 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono font-bold inline-flex items-center gap-1`.
  3. **Context Subtext**: Clean explanation without clutter (`text-xs font-sans text-white/50 select-none truncate mt-1`).
  4. **Substrate & Division**: Solid elevated substrate `bg-[#01142B] border border-white/10 hover:border-white/20 rounded-[2px] p-5 sm:p-6 shadow-xl`.

### 10.3. Tier 3: The 2:1 Asymmetric Focal Bento Grid (Hero Section)
The visual anchor of the dashboard uses a 12-column asymmetric split (`grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6`):
1. **Left Focal Hero Card (`lg:col-span-8`)**:
   - Occupies ~66% of the viewport width.
   - **Header**: Large primary value + micro status pill, series legend dots (`● Revenue`, `● Expenses`), and compact date range selector (`📅 Jan 2024 - Dec 2024 ⌵`).
   - **Body**: Deep spline area chart (`<AreaChart />`) or the Canonical 5-Stage Study Stepper (`Proposal` $\rightarrow$ `Contract` $\rightarrow$ `Deposit` $\rightarrow$ `Analysis` $\rightarrow$ `Deliverables`).
   - Faint, hairline horizontal grid dividers (`border-white/[0.04]`).
   - Generous breathing room (`p-6 sm:p-8`).
2. **Right Auxiliary Column (`lg:col-span-4`)**:
   - Occupies ~33% of the viewport width.
   - Houses **two vertically stacked cards** matching the left hero card's exact optical height:
     - **Top Stacked Card**: E.g. `Total Profit` or `Assigned Lead Statistician & SLA Countdown` with micro bar chart / progress meter and footer link (`View report →`).
     - **Bottom Stacked Card**: E.g. `Total Sessions` or `DefenseLab Rehearsal Hours` with live pulse beacon (`● Live`), sparkline wave, and footer action.

### 10.4. Tier 4: Section Command Ribbon
Dividing the hero analytics from the operational records:
- **Title**: Section header (`text-base sm:text-lg font-bold text-white font-sans`).
- **Filter Tabs**: Standardized pill tabs (`All Studies`, `Action Needed`, `In Progress`, `Completed`) with high-contrast active indicator.
- **Search Box**: Integrated keyboard shortcut `/` keycap badge (`<kbd>/</kbd>`) and instant `Esc` clearance.

### 10.5. Tier 5: Lower Bento Composition
- **For High-Volume Queues (Executive / Admin / Statistician)**:
  - **Progress Gauge / Donut Card (`lg:col-span-4` or `lg:col-span-5`)**: Semi-circular progress arc or circular donut meter (e.g. `Studies by Stage` or `Hours Consumed vs Remaining`) with itemized legend breakdown underneath.
  - **High-Precision Data Table / Feed (`lg:col-span-8` or `lg:col-span-7`)**: Compact spreadsheet-style data table with monospaced IDs, 1-click copy badges (`<CopyButton variant="badge" />`), verified status tags, and action icon buttons.
- **For Individual Client Portals (`/dashboard/client`)**:
  - **Full-Width Focused Studies Desk (`w-full`)**: Individual thesis and dissertation clients typically manage 1–3 active studies. A multi-segment distribution gauge introduces unnecessary cognitive overhead for 1–2 items and squishes the studies feed horizontally. Instead, the Client Portal dedicates the full container width to the studies feed and data table with an instantaneous segmented toggle (`Cards` vs `Table`), maximizing reading room for research titles, 5-stage milestone pipelines, files, and actions.

---

### 10.6. 🔒 Non-Negotiable Directives from the Reference Standard

1. **"Of Course Still No Border Radius" (`rounded-[2px]`)**:
   - *Dashdark X* uses generic Webflow bubbly `rounded-2xl` / `rounded-xl` curves.
   - In JAXIS StatLab, we **strictly preserve `rounded-[2px]`** across all cards, buttons, badges, tables, and modal frames.
   - This translates the spatial balance and cleanliness of modern SaaS into an authoritative, architectural **Dark Precision Terminal**.
2. **Hairline Division Over Blurry Glows**:
   - Zero diffuse box-shadow glows. Crisp, 1px flat perimeter borders (`border-white/10` to `border-white/15`).
3. **The 80 / 15 / 5 Color Restraint Rule**:
   - 80% Dark Substrate (`#010114` canvas, `#01142B` flat card substrate).
   - 15% Typographic Contrast (pure white headers, bold white metrics, muted white/50 descriptions).
   - 5% Maximum Accent (Enterprise Orange `#CC6600` for primary interactive CTAs, Verification Emerald for completed milestones, Escrow Amber for review items).
4. **Phosphor Fill Icons Exclusively (`weight="fill"`)**:
   - All icons across cards, navigation, actions, and badges must use solid filled glyphs from `@phosphor-icons/react` with `weight="fill"` to match the Dashdark X reference. Line/outline icons, stroke SVGs, and emojis are strictly forbidden.
5. **Philippine Peso Typography**:
   - Always use `<Peso />` or `formatPeso()` in sans-serif alongside monospace figures.

---

## 11. Summary Checklist Before Any UI Change

```text
[ ] Is this strictly a frontend presentation/UX change? (No backend/database/API changes)
[ ] Does it use the current theme palette (#010114, #01142B, #CC6600)?
[ ] Are all cards strictly using precision rounded-[2px] (no bubbly rounded-xl/2xl)?
[ ] Does the layout follow the Asymmetric Bento Grid (2:1 hero split: 8-col hero + 4-col stacked cards)?
[ ] Are KPI cards using the micro-anatomy (icon + label, bold metric, inline micro-pill indicator)?
[ ] Are all awkward gradients and box-shadow glows removed?
[ ] Are all double slashes (//) and robotic buzzwords replaced with plain English?
[ ] Are buttons using Title Case, precision rounded-[2px], and active scale(0.97)?
[ ] Is the Philippine Peso symbol rendered via <Peso /> in sans-serif?
[ ] Does the page container follow the anti-double-padding standard?
[ ] Is text truncation eliminated and responsive wrapping verified on mobile (375px)?
[ ] Are touch targets minimum 44x44px and inputs minimum 16px font size on mobile?
[ ] Are all icon-only buttons equipped with aria-label or .sr-only accessible names?
[ ] Is text contrast verified at >= 4.5:1 and are visible focus rings present?
[ ] Are Phosphor Fill icons used exclusively (weight="fill" only, no line icons, no emojis)?
[ ] Are interactive alerts using the tactile live badging standard (pulse beacon + high-contrast chip, quiet-when-zero)?
[ ] Are intro animations using role-calibrated motion profiles (snappy sub-300ms for internal desks; calm, graceful 620ms staggered reveal for Client Portal)?
[ ] Do search bars support the `/` focus and `Esc` clear keyboard shortcut with <kbd>/</kbd>?
[ ] Do empty filter/search results offer a 1-click "Clear Filters" action?
[ ] Are Study IDs and transaction references equipped with 1-click <CopyButton variant="badge" />?
[ ] Do check-types and ESLint pass with 0 errors and 0 warnings?
```

---

## 12. Reference Implementation: Client Portal Dashdark X Upgrade

The Client Portal (`/dashboard/client` and related sub-desks) serves as the canonical 80% visual reference implementation of the Dashdark X dark-mode precision standard:

### 12.1. Structural Mapping to Reference Photos
| Dashdark X Reference | JAXIS StatLab Client Portal Implementation |
|---|---|
| **Authoritative Top Greeting & Action** | `<PageHeader>` with personalized greeting (`Welcome back, [First Name]`), plain-English subtitle, subtle secondary outline button (`How It Works`), and primary Enterprise Orange CTA (`+ Submit New Study Request`). |
| **4-Column Balanced KPI Row** | 4 balanced `<KpiCard />` elements: `TOTAL STUDIES` (ALL TIME), `ACTION REQUIRED` (ACTION NEEDED in amber when > 0), `IN PROGRESS / QA` (ACTIVE in sky blue), and `DEFENSE READY` (DELIVERED in emerald). Numerals default to crisp bold white (`variant="default"`). |
| **2:1 Asymmetric Focal Bento Grid** | **8-Col Hero Card**: Active Research Journey with category micro-label, 1-click study ID copy badge, 5-stage milestone stepper (`Proposal` $\rightarrow$ `Contract` $\rightarrow$ `Deposit` $\rightarrow$ `Analysis` $\rightarrow$ `Deliverables`) in a recessed L2 well (`bg-[#010D1F] border-white/10`), target date, status ribbon, and direct action button.<br/>**4-Col Auxiliary Stack**: (1) Statistical Consultation Desk with active pulse beacon + turnaround subtext, (2) DefenseLab Oral Defense Simulator with mock question counter. |
| **Dedicated Archive Desk** | For multi-study searching, filter tabs, and full pagination, clients navigate seamlessly to **My Studies** (`/dashboard/client/projects`), keeping the main dashboard an ultra-clean, focused 3-tier cockpit without administrative table clutter. |

### 12.2. Semi-Circular SVG Arc Gauge Specification (Dashdark X Lower Bento)
*(Standard specification for high-volume queue desks such as Admin / Statistician / Operations; omitted on Client Portal to dedicate 100% width to research studies and milestone pipelines).*
Modeled directly after Dashdark X Reference Photo 2 (`media_1788807475559.png`) and Photo 5 (`media_1788807974419.png`):
- **Geometry**: SVG `viewBox="0 0 200 115"`, center `(100, 100)`, radius `75px`, arc path `M 25 100 A 75 75 0 0 1 175 100`. Total arc length $L = \pi \times 75 \approx 235.62\text{px}$.
- **Background Track**: `stroke="rgba(255, 255, 255, 0.08)"`, `strokeWidth="12"`, `strokeLinecap="round"`.
- **Segments**: Stacked proportionally using `strokeDasharray` and cumulative `strokeDashoffset`:
  - `Delivered / Defense Ready`: `#10B981` (Verification Emerald)
  - `Analysis & QA`: `#38BDF8` (Analytical Sky)
  - `Action Required`: `#FFA040` (Enterprise Amber/Orange)
  - `Proposal / Intake`: `rgba(255, 255, 255, 0.25)` (Muted Slate)
- **Center Callout**: Large bold monospace numeral (`text-3xl font-mono font-bold text-white`) with uppercase label (`text-[10px] font-sans font-medium text-white/40 uppercase tracking-wider`).
- **Itemized Legend Rows**: Color-coded dot chips, category name, bold white count, and muted percentage share.

### 12.3. Companion Client Desks
1. **Research Studies Desk (`/dashboard/client/projects`)**:
   - 4-column balanced KPI row with Dashdark micro-pills (`ALL TIME`, `ACTION NEEDED`, `UNDER REVIEW`, `ACTIVE`).
   - Integrated `FilterToolbar` with status tabs and `/` search keyboard shortcut.
   - High-precision data table with recessed well header (`bg-[#010D1F] border-b border-white/10`), two-line primary cell hierarchy (Line 1: study title; Line 2: school affiliation / doc count), 1-click copy badges on Study IDs, and `rounded-[2px]` action buttons.
2. **Quotations & Pricing Desk (`/dashboard/client/quotations`)**:
   - Modeled on Dashdark X Reference Photo 6 and 7 (Commercial revenue & pricing matrices).
   - 4-column commercial KPI row (`PENDING REVIEW`, `APPROVED`, `BEING PRICED`, `TOTAL VALUE` with `<MoneyDisplay />`).
   - Commercial proposals table with recessed header, two-line cell hierarchy, package tier badges (`Undergraduate`, `Masteral`, `Doctoral`, `Corporate`), bold white investment figures with `<Peso />`, and direct review action buttons.
3. **Study Card Anatomy (`ClientStudyCard.tsx`)**:
   - Sharp `rounded-[2px]` card substrate with `bg-[#01142B] border-white/10`.
   - 5-stage visual pipeline with emerald checkmarks for completed stages, orange pulse for active stage, and muted numbers for upcoming stages.
   - 1-Click copy badges on Study IDs and direct action toolbar.

### 12.4. Preserved Theme Identity Tokens
- **Master Canvas**: `#010114` (Deep Space Midnight Navy)
- **Surface Cards**: `#01142B` (Solid Flat Substrate with hairline `border-white/10`)
- **Control Insets & Headers**: `#010D1F` (Recessed L2 Wells)
- **Accent**: `#CC6600` (Enterprise Orange, strictly budgeted to 5–10% visual presence)
- **Border Radius**: Precision `rounded-[2px]` across all components (zero bubbly Webflow rounded-xl/2xl curves).
- **Typography**: Clean Sans-Serif first (`font-sans`), monospace reserved strictly for numerals, IDs, and uppercase micro-labels.
- **Philippine Peso**: Always rendered via `<Peso />` or `formatPeso()` in sans-serif alongside monospace figures.

### 12.5. Dashdark X Sidebar-First Shell & Collapsible Rail Specification
Modeled directly after Dashdark X Reference Photos (`media_1788813180736.png`, `media_1788813198030.png`, `media_1788813218500.png`):
1. **Zero Desktop Topbar**:
   - The desktop main viewport eliminates the horizontal topbar entirely. The canvas starts at $y = 0$, giving `<PageHeader>` immediate top-level prominence without wasted vertical space.
   - On mobile (`< lg`), a lean `h-14` header bar is retained with the brand logo and hamburger button to trigger the mobile drawer.
2. **Collapsible Sidebar Rail**:
   - **Expanded Width**: `w-[17.5rem]` (280px).
   - **Collapsed Width**: `w-[5rem]` (80px icon rail).
   - **Opposing Caret Toggle Button (`< >`)**: Positioned at the top right of the sidebar header, toggling smoothly between expanded and collapsed modes. State is persisted in browser `localStorage` (`jaxis_sidebar_collapsed`).
   - **Integrated Sidebar Search**: Dedicated `Search for...` input with `/` shortcut badge in expanded mode; compact `MagnifyingGlass` button in collapsed mode. Pressing `/` expands the sidebar and focuses search.
   - **Nav Items**: Fill icon + Title + count badge + right chevron (`>`) in expanded mode; centered icon with tooltip in collapsed mode.
   - **Operational Strip**: `NotificationDrawer` bell and staff `DutyClockWidget` embedded directly in the sidebar.
   - **Footer Identity Anchor**: UserAvatar + Full Name + Role / "Account settings" + Radix DropdownMenu trigger (Profile, HR & Timeclock, Sign Out).
