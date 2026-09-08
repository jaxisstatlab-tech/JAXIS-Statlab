# JAXIS StatLab — Agent & Developer Rules

This workspace configuration is anchored to the canonical design specification defined in [apps/app/docs/design-system.md](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/app/docs/design-system.md) and the master Dashdark precision design skill in [.agents/skills/dashdark-precision-ui/SKILL.md](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/.agents/skills/dashdark-precision-ui/SKILL.md).

All AI coding assistants and developers MUST strictly follow the design system, the dashdark-precision-ui skill, and the mandatory guardrails below.

---

## 1. Master Design System Reference (MANDATORY)
- **Primary Source of Truth**: Always inspect and follow [apps/app/docs/design-system.md](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/app/docs/design-system.md) when generating, styling, or refactoring any page, component, modal, table, or toast.
- **Aesthetic**: Dark Precision Terminal / Enterprise Scientific. Clean, modern, authoritative, and spacious.
- **Palette**: Master Canvas (`#010114`), Surface Card (`rgba(1, 22, 46, 0.75)` / `#01142B` / `#011B38`), Enterprise Orange Accent (`#CC6600`), Analytical Sky (`#38BDF8`), Verification Emerald (`#10B981`), Escrow Amber (`#F59E0B`), Border Division (`rgba(255, 255, 255, 0.08)` / `border-white/10`).
- **Zero Glow Policy**: Never use blurry box-shadow glows (`shadow-[0_0_...px]`). Use crisp, high-contrast flat borders (`border-white/10` to `border-white/20`) and calibrated opacity tints.
- **No Awkward Gradients**: Do not use heavy gradient fills (`bg-gradient-to-r`) on action bars, banners, or modal headers. Rely on solid substrates (`#01142B` / `#011B38`) with calibrated borders.
- **Color Restraint & Anti-Rainbow Mandate**: Reduce the use of colors unless strictly necessary. Color is a scarce cognitive resource. In 90% of cases, `<KpiCard />` metric numbers must default to crisp bold white (`variant="default"`). Never render rainbow rows where 4 adjacent cards each have a different neon hue (Amber, Green, Sky, Orange). In data tables, financial figures must default to bold white; never stack cyan, green, and yellow within a single table cell.
- **Typography-First KPI Standard (No Decorative Icons on Metric Cards)**: Top-level informational KPI cards must NOT render decorative icons (`icon={...}`). High-contrast monospace numerals and uppercase labels carry the hierarchy cleanly with executive authority. Reserve the `icon` prop exclusively for active alert states where user intervention is required (e.g., `<Clock weight="fill" className="text-amber-400" />` when `Action Required > 0`).

---

## 2. Spacing, Margins & Padding Standard (ANTI-DOUBLE-PADDING & ANTI-CRAMPED MANDATE)
- **Zero Squished/Cramped Layouts Policy**: Never generate components or pages with zero margin or microscopic padding.
- **Root Layout vs. Inner Page Containers (Anti-Double-Padding Rule)**:
  - The root layout shell (`DashboardShell.tsx`) already applies `padding: clamp(2rem, 4vw, 3.5rem)` on `<main>`.
  - Inner page routes inside `/dashboard` **MUST NOT add redundant outer padding** (NO `px-4 sm:px-8 lg:px-12 py-8`).
  - Standard page wrapper format:
    ```tsx
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
    ```
    *(or `max-w-5xl mx-auto` for focused legal contract / SOW document desks).*
- **Cards & Document Sheets**:
  - Standard cards: `p-6 sm:p-8 md:p-10`, never `p-1` or `p-2`.
  - Document/Contract sheets: `p-8 sm:p-12 lg:p-16` with generous vertical rhythm (`mb-10` to `mb-12`, `space-y-6`).
- **Typography & Readability**:
  - **Sans-Serif First**: All readable content, prose, summaries, research objectives, legal terms, form labels, and table cells must use clean **Sans-Serif (`font-sans`)**.
  - **No Monospace Overkill**: `font-mono` is strictly reserved for actual code, IDs (e.g. `JAXIS-202608-0001`), financial sums, and telemetry metrics. Never set whole paragraphs or descriptions in monospace.
  - **Font Sizing**: Body text must be `text-sm` (14px) or `text-base` (16px) with comfortable line height (`leading-relaxed`). Microscopic `text-[0.688rem]` is only permitted for micro-badges, NEVER for general reading content.

---

## 3. Button, Dropdown & Interaction Standards
- **Button Corner Radius**: Precision `rounded-[2px]` across all primary and secondary buttons.
- **Button Casing**: Use Title Case or Clean Sentence Case (e.g. `"Review & Sign Contract →"`, `"Download All"`, `"+ Configure Services"`), never aggressive all-caps shouting.
- **Button Loading States**: Use `<IconLoader2 size={16} stroke={2.5} className="animate-spin text-white/90" />` centered directly in the main flex container with high contrast.
- **Dropdown & Interactive Lists**: Zero orange outline/rings on focus or hover. Use `outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 border-0 ring-0` with subtle background tinting (`hover:bg-white/[0.06]`).
- **Tabs & Segmented Controls**: Use `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>` from `@repo/ui`. Precision `rounded-[2px]`, Title Case Sans-Serif labels, and `#CC6600` Enterprise Orange active indicator (`data-[state=active]:bg-[#CC6600]`). Never write ad-hoc unstyled button rows.
- **File Row Actions**: Compact `h-9 w-9 rounded-[2px]` icon action buttons.

---

## 4. Modern Loading & Data Retrieval Standards (NO CLUNKY BOXES / NO HUD SLOP / NO DOUBLE LOADERS)
- **Standard Component**: All data retrieval and async states must use `<LoadingState variant="page" | "table" | "card" | "inline" />` from `@repo/ui`.
- **Modern Minimalist Spinner Standard**: Single calibrated circular track in `rgba(255, 255, 255, 0.08)` with a clean 100° active Enterprise Orange arc (`#CC6600`) with rounded caps (`strokeLinecap="round"`), rotating smoothly at `0.85s linear infinite`. Zero sci-fi crosshairs, concentric dotted rings, counter-rotating multi-color arcs, or AI-slop HUD clutter.
- **Anti-Double-Loading Policy**: A page must only ever show ONE unified loader at a time. Sub-components (such as `<PendingLeaveQueue />` or secondary widgets) must never show independent spinners or skeletons while a page-level or parent container loader is active.
- **High-Speed Database Retrieval & Server Component Pre-loading**: Inner operational desks must prefetch data on the server in async Server Components (`page.tsx`) and pass `initialData` into client components, eliminating initial client-side spinner flashes entirely. Read-heavy database operations must use in-memory server caching (`unstable_cache` with canonical `CACHE_TAGS` in `@/lib/cache-tags`) with immediate mutation invalidation (`invalidateCacheTags`).
- **Standardized KPI Metric Cards (`<KpiCard />`)**: All telemetry, financial, and operational metric cards across all roles and pages **MUST** use `<KpiCard />` from `@repo/ui`. Ad-hoc raw cards or custom div layouts for KPIs are strictly forbidden. Header labels are uppercase monospace (`font-mono text-xs text-white/50 tracking-wider font-semibold`), metric values are bold monospace (`font-mono font-bold text-2xl sm:text-3xl`), unit labels are `text-xs text-white/40 font-mono`, and descriptions are `text-xs font-sans text-white/50`.
- **Typography**: Clean Sans-Serif title and subtitle with zero robotic double slashes.

---

## 5. Iconography & Visual Standard (PHOSPHOR FILL ICONS EXCLUSIVELY — CRITICAL)
- **Mandatory Icon Library**: Use **Phosphor Icons (`@phosphor-icons/react`) exclusively with `weight="fill"`** across `@repo/ui` and `apps/app`.
- **Fill Icons Only (No Line/Outline Icons)**: To achieve the high-end, authoritative aesthetic of the Dashdark X dark-mode reference, all icons must be solid filled glyphs (e.g. `<House weight="fill" />`, `<Users weight="fill" />`, `<Eye weight="fill" />`, `<Star weight="fill" />`, `<Gear weight="fill" />`, `<Clock weight="fill" />`, `<CheckCircle weight="fill" />`, `<WarningCircle weight="fill" />`, `<FileText weight="fill" />`, `<CurrencyDollar weight="fill" />`, `<TrendUp weight="fill" />`). Never render hollow line or thin outline icons.
- **Zero Emojis Policy**: Emojis (e.g. 🔍, ⏸, ⛔, 📋, 🚀, 💡, 📁, 📄, 🔒) are **strictly forbidden** anywhere in the UI, labels, menus, tables, buttons, or toasts.
- **No Ad-Hoc Raw SVGs**: When an icon is needed, always import the appropriate component from `@phosphor-icons/react` with `weight="fill"`.
- **Styling & Sizing**: Always set `weight="fill"`, specify `size={16|18|20|24}`, and use Tailwind classes for colors (`text-white/70`, `text-[#CC6600]`, `text-emerald-400`, `text-sky-400`).

---

## 6. Copywriting & Tone Standard (CRITICAL)
- **Zero Double Slashes Policy**: Double slashes (`//`) are **strictly forbidden** anywhere in UI copy, loading states, badges, alert headers, and toasts.
- **Plain English First**: All UI text must read like a normal person talking. Write for someone who has never used enterprise software before. If a 5th grader can't understand the label, rewrite it.
- **Banned Jargon & Words** (never use these in UI copy):
  - `Institutional`, `Corporate`, `Executive`, `Bespoke`, `Treasury`, `Disbursement`, `Settlement`, `Cadence`, `Matrices`, `Parameters`, `Telemetry`, `Calibrated`, `Governance`, `Sprint`, `Retainer`, `Consolidated`, `Proration`, `Computational`, `Multivariate`, `Methodological`, `Reproducibility`, `Baseline`, `Deliverables`
  - `"Syncing Telemetry"`, `"Establishing Secure Protocol"`, `"Calculating Compute State"`, `"Institutional Escrow Release Gates"`
- **Use Instead**:
  | Jargon | Simple Alternative |
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
- **Loading States**: Use short, friendly phrases like `"Loading payroll settings..."`, `"Getting pay rates..."`, `"Loading workspace..."`. Never `"Retrieving institutional compensation matrices"`.
- **Toast Messages**: Keep toast titles to 2–4 words (`"Payslips Generated"`, `"Custom Rates Saved"`, `"Schedule Updated"`). Descriptions should be one plain sentence.
- **Descriptions & Helper Text**: Write like you're explaining to a coworker. Example: `"Choose how often staff get paid and when payments go out."` — not `"Configure institutional compensation disbursement cadence parameters."`
- **Button Labels**: Short and action-oriented. `"Save"`, `"Edit"`, `"Customize"`, `"Generate Payslips"`, `"View"` — not `"Apply Schedule Policy"`, `"Modify Terms"`, `"Run Selected Cycle"`.
- **Terminology**: Never use "Principal Investigator" / "Investigator" — use **"Lead Researcher"** and **"Research Study"**.

---

## 7. Toast Notification Protocol (DESIGN-SYSTEM.MD Section 6.1)
- Always trigger a Toast on: (1) Server Action mutations, (2) 1-Click Clipboard Copies, (3) File Uploads / Limits / Downloads.
- Strictly use the 4 standard variants: `info` (Sky Blue), `success` (Emerald), `warning` (Amber), `danger` (Crimson).
- Zero emojis in toast messages or descriptions.
- Render portaled via `<Toast message="..." description="..." variant="..." onClose={...} />`.

---

## 8. Monorepo Architecture & Verification
- Shared UI components belong in `packages/ui` and must be exported from `packages/ui/src/index.ts`.
- `apps/app` uses Next.js 16 (Turbopack, Tailwind CSS v4, React 19).
- After any edits, run `npm run check-types` and `npm run lint` across the monorepo to ensure zero errors and zero warnings.

---

## 9. Philippine Peso (`₱`) Currency Typography & Harmonization Standard (CRITICAL)
- **Problem**: Monospace font stacks (`font-mono` / `Disket Mono`) lack custom glyphs for `₱` (U+20B1), causing operating systems to fall back to clunky, disproportionately bolded or double-stroke glyphs.
- **Mandatory Policy**:
  1. Never render a raw `₱` character directly inside a `font-mono font-bold` container.
  2. Always use the canonical `<Peso className="..." />` component from `@repo/ui` or `<MoneyDisplay amount={...} />`.
  3. The `₱` symbol must always be rendered in **Sans-Serif (`font-sans font-normal opacity-85 select-none inline-block mr-0.5`)** to ensure consistent, balanced optical weight alongside monospace numerals.
  4. In numeric formatters, use `formatPeso(amount)` from `@/lib/formatters`.

---

## 10. Standardized PageHeader & Navigation Breadcrumbs (CRITICAL)
- **Mandatory Policy**:
  1. All pages across `apps/app` **MUST** exclusively use the canonical `<PageHeader />` from `@repo/ui`. Raw `<h1>` tags or ad-hoc unstyled headers are strictly forbidden.
  2. **Breadcrumb Hierarchy**: The root breadcrumb must always be `{ label: "WORKSPACE", href: "/dashboard" }`.
  3. **Fast Client-Side Routing**: Breadcrumbs must use Next.js `<Link>` for instantaneous SPA navigation.
  4. **Order of Elements**: (1) Breadcrumbs, (2) Title & optional Status Badge, (3) Informative Description, and (4) Responsive Action Toolbar.

---

## 11. Dashdark X Sidebar-First Identity Anchor & Zero Desktop Topbar Standard (CRITICAL)
- **Mandatory Policy**:
  1. **Zero Desktop Topbar**: Desktop main canvas operates with zero horizontal topbar. Workspace starts at $y = 0$, giving `<PageHeader>` immediate top prominence without wasted vertical space. On mobile viewports (`< lg`), a lean `h-14` header bar remains for the drawer trigger and mobile controls.
  2. **Sidebar-First Identity Anchor**: All session identity, role display tags, role-specific profile routing, and sign-out controls **live directly in the Sidebar footer profile card** (`Sidebar.tsx`).
  3. **Collapsible Rail Identity Support**: In expanded mode (`w-[17.5rem]`), user avatar, name, role/account settings, and dropdown caret are displayed. In collapsed mode (`w-[5rem]`), the circular avatar operates as the Radix dropdown trigger.
  4. **Footer Grounding**: Below the identity card, a subtle operational status footer (`● System Operational v2.4.0` in expanded mode; `●` dot in collapsed mode) provides clean visual grounding.

---

## 12. Instantaneous State & 0ms Optimistic Shift Protocol (CRITICAL)
- **Mandatory Policy**:
  1. **Server Component Pre-loading**: Persistent shell widgets (such as `DutyClockWidget`) must pre-fetch `initialActiveShift` on the server in async RSC (`app/dashboard/layout.tsx`) and drill it through `DashboardShell` to eliminate flash-of-wrong-state or spinner delays on first paint.
  2. **0ms Optimistic Transitions**: Interactive duty changes (Clock In, Clock Out) update local state, local cache (`jaxis_active_shift`), and global event dispatchers (`shift-status-updated`) **immediately (0ms)** before server mutations complete. On validation or network failure, state reverts gracefully with an error toast.
  3. **Wall-Clock High-Precision Timers**: Active shift timers must compute elapsed seconds via wall-clock math (`Date.now() - clockInMs`) rather than naive interval incrementation. This prevents time drift caused by background tab throttling, minimized windows, or laptop sleep.

---

## 13. System-First UI Upgrade & Anti-AI-Slop Standard (CRITICAL)
- **Mandatory Policy**:
  1. All page and view upgrades must strictly follow [apps/app/docs/ui-design-upgrade.md](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/app/docs/ui-design-upgrade.md), [.agents/skills/ui-design-upgrade/SKILL.md](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/.agents/skills/ui-design-upgrade/SKILL.md), and [.agents/skills/dashdark-precision-ui/SKILL.md](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/.agents/skills/dashdark-precision-ui/SKILL.md).
  2. **Hard Constraint — Frontend Only**: Zero modifications to backend schemas, database queries, server actions, API routes, authentication logic, or business workflows. Present existing data with peak elegance and clarity.
  3. **Current Theme Grounding**: Anchor strictly to Master Canvas (`#010114`), Surface Cards (`rgba(1, 22, 46, 0.75)` / `#01142B`), Enterprise Orange (`#CC6600`, 5–10% max visual weight), and crisp 1px borders (`border-white/10`).
  4. **Anti-AI-Slop Mandate**: Zero awkward multi-stop gradients, zero blurry box-shadow glows, zero robotic buzzwords, zero double slashes (`//`), zero broken text truncations (`...`), and zero ALL-CAPS shouting buttons.
  5. **Tactile Motion (Emil Kowalski)**: Buttons scale to `0.97` on `:active`, entrances start from `scale(0.95)` with opacity `0`, fast durations under `250ms`, and custom cubic-bezier easing.

---

## 17. Tactile Live Activity & Notification Badging Standard (CRITICAL)
- **Mandatory Policy**:
  1. **Dual-Cue Alert Architecture**: All live activity counters and unread alerts (e.g. unread consultation messages) must combine an active live pulse beacon (`animate-ping` outer beacon + solid `#CC6600` core) and a high-contrast Enterprise Orange count chip (`bg-[#CC6600] text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] shadow-sm active:scale-90`).
  2. **Icon & Text Illumination**: When actionable items or unread messages exist, illuminate the item icon in warm amber (`text-[#FFA040]`) and elevate link text to bold white (`font-semibold text-white`).
  3. **Quiet-When-Zero Protocol**: When the count is `0`, the indicator must be **completely quiet and invisible**. Never render gray `0` chips, muted outlines, or idle ping blobs.
  4. **Instantaneous State & 0ms Real-Time Protocol**: Pre-load unread counts on the server in async RSC (`layout.tsx`) via dedicated count queries (`getUnreadMessagesCount`), dispatch window events (`jaxis:unread-count-updated`) on receipt clearance, and revalidate on tab focus (`visibilitychange`).

---

## 18. Canonical Modern Portal UX Standards (CRITICAL)
- **Mandatory Policy**:
  1. **Keyboard Search Shortcut (`/`)**: Dashboards and data tables must support pressing `/` anywhere to focus the search bar, with `Esc` to clear search text and blur input. Display an elegant `<kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.08] text-white/40 border border-white/10 select-none">/</kbd>` keycap in the search box.
  2. **Visual 5-Stage Study Pipeline Stepper**: All study cards and inspection desks must display the canonical 5-stage progress stepper: `Proposal` $\rightarrow$ `Contract (SOW)` $\rightarrow$ `Deposit` $\rightarrow$ `Analysis` $\rightarrow$ `Deliverables`. Never expose raw database status codes to clients.
  3. **Smart 1-Click "Reset Filters"**: Search queries or filter tabs that return 0 results must display a helpful empty state card with a 1-click **"Clear Filters"** button. Never leave users stranded in empty views.
  4. **Multi-Document Lightbox Navigation**: Document viewers must support left/right arrows or `[` / `]`, document counter badges, and instant `Esc` dismissal.
  5. **1-Click Copy Badges (`<CopyButton variant="badge" />`)**: Study IDs (`JAXIS-...`) and transaction reference numbers must provide instant 1-click copy with tactile scale compression and emerald checkmark (`Copied!`) confirmation.

---

## 19. Canonical Dashboard Bento Architecture (Dashdark X Precision Standard) (CRITICAL)
- **Mandatory Policy**:
  1. **Asymmetric 2:1 Bento Arrangement**: All primary role dashboards across all roles (Client, Statistician, QA Lead, CEO/Admin) must adopt the 2:1 Asymmetric Bento Grid codified in [apps/app/docs/ui-design-upgrade.md](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/app/docs/ui-design-upgrade.md) Section 10 and [.agents/skills/dashdark-precision-ui/SKILL.md](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/.agents/skills/dashdark-precision-ui/SKILL.md): (1) Greeting + dual-action toolbar, (2) 4-column balanced KPI row with inline micro status pills, (3) 2:1 Asymmetric Focal Hero Section (8 cols hero card + 4 cols double-stacked auxiliary intelligence cards), (4) Section command ribbon with filter tabs and `/` search, and (5) Lower bento composition (progress gauge / donut meter + high-precision data table/feed).
  2. **Strictly No Rounded Bubbly Corners (`rounded-[2px]`)**: Never use Webflow `rounded-xl` or `rounded-2xl`. Maintain the crisp architectural precision of `rounded-[2px]` across all cards, containers, tables, and buttons.
  3. **Dark Precision Substrates**: Anchor strictly to `#010114` master canvas, `#01142B` flat card substrates, and hairline flat 1px `border-white/10` divisions (zero blurry box-shadow glows).

