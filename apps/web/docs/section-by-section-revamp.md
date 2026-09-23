# JAXIS StatLab — Web Landing Page Section-by-Section Revamp Blueprint

> **Status**: APPROVED ROADMAP & TECHNICAL SPECIFICATION  
> **Target Package**: `apps/web`  
> **Master Design Reference**: [Dashdark Precision Design System](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/.agents/skills/dashdark-precision-ui/SKILL.md) & [AGENTS.md](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/AGENTS.md)  
> **Rule Enforcement**: Frontend-only, zero double slashes (`//`), precision `rounded-[2px]`, Phosphor fill icons, plain English copy, Emil Kowalski tactile motion, 24px consistent grid rhythm (`gap-6`).

---

## 1. Executive Summary & Revamp Strategy

To elevate the JAXIS StatLab landing page to match the **Dashdark X Enterprise Dark Precision** standard, all modifications will be performed **strictly section by section**.

Each section will be upgraded through a structured 4-phase protocol:
1. **Audit & Deprecate**: Remove anti-patterns (heavy inline CSS, double slashes `//`, blurry glows, emojis, un-styled buttons).
2. **Design System Alignment**: Anchor to canonical substrates (`#010114` canvas, `#01142B` / `#011B38` elevated cards, `#CC6600` enterprise orange accent, `rounded-[2px]`).
3. **Motion & Tactile Polish**: Apply Emil Kowalski interaction physics (`0.97` active compression, smooth cubic-bezier transitions, zero layout jank).
4. **Verification**: Run `check-types` and visual checks to ensure zero regressions before touching the next section.

---

## 1.1 Master Section Container Width & Typography Lock Standard (MANDATORY)

To prevent visual jumps, claustrophobic content stacking, or inconsistent typography across landing page sections, all current and future sections in `apps/web` **MUST** adhere to this locked standard:

### 1. Locked Container Width & Margins
- **Standard Container Wrapper**:
  ```tsx
  <div className="w-full max-w-[90rem] mx-auto px-6 lg:px-8">
  ```
  - **Width**: Strictly `max-w-[90rem]` (1,440px). Never use narrow `max-w-5xl` (1024px), `max-w-6xl` (1152px), or legacy `max-w-[73.625rem]` (1178px).
  - **Gutters**: Responsive padding `px-6 lg:px-8` (24px mobile/tablet, 32px desktop).
  - **Section Vertical Rhythm**: `py-12 sm:py-16 lg:py-20` on `<section className="section relative ... bg-[#010114]">`.
  - **Header Bottom Margin**: `mb-8 sm:mb-10`.

### 2. Comprehensive Typography & Font Rules Lock
| Hierarchy Level | Font Family | Size | Weight | Tracking / Leading | Color & Casing | Usage & Rules |
|---|---|---|---|---|---|---|
| **Section Eyebrow / Kicker** | `font-mono` | `text-xs` (12px) | `font-medium` (500) | `tracking-[0.15em]` | `#CC6600`, ALL-CAPS | Category tag (e.g. `RESEARCH METHODOLOGIES`). Zero double slashes (`//`). |
| **Section Primary Headline** | `font-sans` | `text-2xl sm:text-3xl lg:text-[1.875rem]` | `font-medium` (500) | `tracking-[-0.03em] leading-tight` | `text-white`, Title Case | Primary value prop. Clean sans-serif with tight optical tracking. |
| **Section Subtitle (1-Liner)** | `font-mono` | `text-xs sm:text-sm` (12-14px) | `font-normal` (400) | `leading-relaxed` | `text-white/60`, Sentence Case | **1-Liner Standard**: Must use `max-w-3xl lg:max-w-4xl` so it renders on a single line on desktop without orphan word wraps. |
| **Bento / Feature Card Title** | `font-sans` | `text-sm sm:text-[15px]` (aux) / `text-lg sm:text-xl` (hero) | `font-medium` (500) | `tracking-[-0.02em] leading-snug` | `text-white`, Title Case | High scannability, no aggressive bolding. |
| **Bento Card Description** | `font-mono` | `text-xs` (12px) | `font-normal` (400) | `leading-relaxed` | `text-white/60`, Sentence Case | Short, informative technical scope description (2-3 lines max). |
| **Card Telemetry / Stat Footers** | `font-mono` | `text-[11px] sm:text-xs` | Metric: `font-bold` (700)<br>Label: `font-normal` (400) | `tracking-normal` | Metric: `text-white`<br>Label: `text-white/40` | Inline telemetry pair (e.g. `100% Upfront delivery`, `α > .80 Reliability target`). |
| **Table Column Headers** | `font-mono` | `text-[9.5px]` | `font-normal` (400) | `tracking-wider`, uppercase | `text-white/40` | Minimalist border division (`pb-1.5 border-b border-white/10`). |
| **Table Data Cells** | `font-mono` | `text-[10.5px]` | `font-normal` (400) / values `font-semibold` | Tabular figures | `text-white/80` (values `text-white/90`) | Calm monochrome figures. Decision in `text-white/70`. Anti-rainbow mandate: no neon cyan or green. |
| **Table Diagnostic Footer** | `font-mono` | `text-[9.5px]` | `font-normal` (400) | `tracking-normal` | `text-white/50`, dot `#CC6600` | Micro-audit tag (e.g. `● Shapiro-Wilk (p = .240, Normal) • N = 384 Responses`). |
| **Action Buttons / CTAs** | `font-sans` | `text-xs sm:text-sm` (12-14px) | `font-medium` (500) | Normal tracking | `text-white`, Title Case | Precision `rounded-[2px]`, `px-5 py-2.5 bg-[#CC6600] active:scale-[0.97]`. Zero shouting ALL-CAPS. |
| **Document Badges** | `font-mono` | `text-[9px]` | `font-normal` (400) | `tracking-wider`, uppercase | `text-white/60 bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded-[2px]` | Subtle verification tag (e.g. `APA 7TH VERIFIED`). |

### 3. Icon Standard (Single-Color Enterprise Orange)
- **Mandatory Icon Library**: Phosphor Icons (`@phosphor-icons/react`) with `weight="fill"`.
- **Single Brand Color**: Every feature icon in a grid matrix **MUST** strictly use `text-[#CC6600]`.
- **Anti-Rainbow Mandate**: Never assign arbitrary neon blue, green, or yellow hues to adjacent icons.
- **Sizing**: `w-5 h-5` (auxiliary cards) or `w-5 h-5 sm:w-6 sm:h-6` (hero/wide cards) with `mb-2` or `mb-2.5`.

---

## 2. Section-by-Section Roadmap & Specifications

```mermaid
graph TD
  S0[Section 00: Navigation Bar] --> S1[Section 01: Hero & 3D Globe]
  S1 --> S2[Section 02: Our Approach]
  S2 --> S3[Section 03: Solutions & Stacked Cards]
  S3 --> S4[Section 04: Packages & Pricing]
  S4 --> S5[Section 05: Security & Escrow]
  S5 --> S6[Section 06: FAQ Accordion]
  S6 --> S7[Section 07: Footer & Final CTA]
```

---

### Section 00: Navigation Bar (`Navbar.tsx`)

**File**: [apps/web/app/components/layout/Navbar.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/layout/Navbar.tsx)

#### 1. Current State & Anti-Patterns Identified
- Extensive inline styles instead of idiomatic Tailwind classes.
- Raw SVGs for mobile hamburger toggle instead of Phosphor fill icons (`@phosphor-icons/react`).
- Ad-hoc hover style listeners mutating the DOM directly (`(e.target as HTMLAnchorElement).style.color = ...`).
- CTA button lacks tactile active compression (`:active:scale-97`).

#### 2. Revamp Specification
- **Layout & Structure**:
  - Precision height (`h-16`), backdrop blur `blur-md`, flat hairline bottom border (`border-b border-white/10`).
  - Active scroll state shifts background from `bg-[#010114]/40` to `bg-[#010114]/90` via smooth CSS transition.
- **Brand Identity**:
  - Brand lockup: `/jaxislogo.png` (24x24px) paired with sans-serif bold wordmark (`JAXIS` in white, `StatLab` in Enterprise Orange `#CC6600`).
- **Navigation Links**:
  - Title Case or Clean Sentence Case, `font-sans text-xs uppercase tracking-wider text-white/70 hover:text-sky-400 transition-colors`.
  - Active section indicator: Understated orange underline or micro-dot indicator when scrolling into view.
- **Buttons & Actions**:
  - `"Sign In"`: Clean ghost button with `hover:text-white` and subtle background tint.
  - `"Get Started"`: Precision `rounded-[2px]`, `border border-[#CC6600]/60`, `bg-[#CC6600]/10 hover:bg-[#CC6600]/20 hover:border-[#CC6600] text-white font-sans text-xs font-semibold px-4 py-2 transition-all active:scale-[0.97]`.
- **Mobile Menu**:
  - Drawer uses `<List weight="fill" />` and `<X weight="fill" />` from `@phosphor-icons/react`.
  - Smooth vertical slide-down drawer grounded with `#01142B` surface substrate.

#### 3. Copywriting Plan
- Links: `Our Approach`, `Solutions`, `Packages`, `Security`, `FAQ`, `Contact`.
- Action Buttons: `Sign In`, `Get Started`. Zero jargon, zero emojis.

---

### Section 01: Hero & 3D Particle Globe (`Hero.tsx` + `ParticleGlobe.tsx`)

**Files**: [apps/web/app/components/sections/Hero.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/sections/Hero.tsx) & [apps/web/app/components/ui/ParticleGlobe.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/ui/ParticleGlobe.tsx)

#### 1. Current State & Anti-Patterns Identified
- Inline styles for layout positioning, mouse parallax, and text wrappers.
- The 4 floating telemetry HUD blocks use text-based checkmarks (`✓`) rather than Phosphor fill icons.
- Parallax cursor tracking is tied to manual inline transform calculations that can cause micro-stutter.
- Headline lines use inline CSS delays rather than orchestrated Tailwind / GSAP animation classes.

#### 2. Revamp Specification
- **3D Particle Performance**:
  - Preserve the 700-particle Fibonacci sphere (`ParticleGlobe.tsx`) with additive blending and raycasted hover glow.
  - Maintain `globeScrollState` proxy for seamless GSAP ScrollTrigger synchronization without React state re-renders.
- **Layout & Vignette Optimization**:
  - Deepen the optical radial contrast gradient to guarantee 100% text contrast over particles at every screen resolution.
  - Responsive headline scale: `text-4xl sm:text-6xl lg:text-7xl font-sans font-light tracking-tight`.
- **Floating Precision HUD Callouts (4 Corners)**:
  - Frame with Dashdark micro-card style: `bg-[#01142B]/80 backdrop-blur-sm border border-white/10 p-3 rounded-[2px] shadow-sm`.
  - Replace raw text glyphs with `<CheckCircle weight="fill" size={14} className="text-emerald-400" />`.
  - Labeling: High-contrast monospace index (`01`, `02`, `03`, `04`) + sans-serif description.
- **Call-to-Action**:
  - Dual action cluster:
    1. Primary: `"Get Started →"` (`rounded-[2px] bg-[#CC6600] text-white font-sans font-semibold text-xs px-6 py-3.5 hover:bg-[#E67300] active:scale-[0.97] transition-all`).
    2. Secondary: `"Explore Methodology"` (ghost outline button with `border-white/20 hover:border-white/40`).
- **Scroll Sequence**:
  - Keep 3-phase pinned GSAP timeline (fade-out $\rightarrow$ globe scale + word-by-word statement reveal $\rightarrow$ dissolve into Section 02).

#### 3. Copywriting Plan
- **HUD Tags**:
  - `01 · DATA AUDIT`: "Raw survey data validated · Zero missing entries"
  - `02 · TEST SELECTION`: "Matched to research questions · Methodology locked"
  - `03 · APA TABLES`: "APA 7th Edition formatted · Copy-paste ready"
  - `04 · VERIFICATION`: "Double-checked by 2 statisticians · Ready for defense"
- **Headline**: "Defend Your Thesis. With Confidence."
- **Lead Text**: "We analyze your survey data, format publication-ready APA 7th Edition tables, and give you the exact speaking script to defend your results with zero fear."

---

### Section 02: Our Approach (`Approach.tsx`)

**File**: [apps/web/app/components/sections/Approach.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/sections/Approach.tsx)  
**Status**: UPGRADED & LOCKED TO STANDARD (Scale AI Bento Architecture)

#### 1. Architecture & Layout Specification
- **Master Container Wrapper**:
  ```tsx
  <div className="w-full max-w-[90rem] mx-auto px-6 lg:px-8">
  ```
  - Standard locked width: `max-w-[90rem]` (1,440px) with responsive `px-6 lg:px-8` gutters.
- **Section Header**:
  - Eyebrow: `<div className="font-mono text-xs uppercase tracking-[0.15em] text-[#CC6600] mb-2 font-medium">RESEARCH METHODOLOGIES</div>`
  - Headline: `<h2 className="font-sans text-2xl sm:text-3xl lg:text-[1.875rem] font-medium text-white tracking-[-0.03em] leading-tight">Every statistical analysis your study needs</h2>`
  - Subtitle (1-Liner): `<p className="font-mono text-xs sm:text-sm text-white/60 mt-2 max-w-3xl lg:max-w-4xl leading-relaxed">From dataset screening to oral defense — peer-reviewed statistical deliverables in publication-ready formats.</p>` (constrained with `max-w-3xl lg:max-w-4xl` to guarantee 1-line desktop rendering).
  - CTA Button: `<Link className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-[#CC6600] text-white font-sans text-xs sm:text-sm font-medium rounded-[2px] hover:bg-[#b35500] active:scale-[0.97]">Get a quotation <span className="w-1.5 h-1.5 rounded-full bg-white/90" /></Link>`

#### 2. 4-Column Asymmetric Bento Grid
- **Container**: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 bg-[#01142B] border border-white/10 rounded-[2px] overflow-hidden`
- **Single-Color Icon Standard**: Every card strictly uses Phosphor Fill (`weight="fill"`) in **Enterprise Orange (`text-[#CC6600]`)**. Zero rainbow colors (sky blue, emerald, and amber icons are strictly forbidden).
- **Cells Distribution**:
  1. **Card 1 (Top-Left 2x2 Hero)**: `md:col-span-2 lg:col-span-2 lg:row-span-2 border-b lg:border-r border-white/10`
     - Content: `Calculator` icon (`w-5 h-5 sm:w-6 sm:h-6 text-[#CC6600]`), `Multi-Tier Statistical Consultation` title (`text-lg sm:text-xl font-sans`), description.
     - Findings Preview Window: Compact mock findings table (`OUTPUT_CHAPTER_4_FINDINGS.DOCX` + `APA 7TH VERIFIED` badge), 3 data rows in monochrome monospace (`text-[10.5px]`), `Shapiro-Wilk Normality` diagnostic footer.
  2. **Card 2 (Col 3, Row 1)**: `Table` (`text-[#CC6600]`) — `Descriptive Statistics` | `100% Upfront delivery`
  3. **Card 3 (Col 4, Row 1)**: `ChartLineUp` (`text-[#CC6600]`) — `Inferential Testing` | `50/50 Milestone escrow`
  4. **Card 4 (Col 3, Row 2)**: `TreeStructure` (`text-[#CC6600]`) — `Multivariate Modeling` | `Doctoral Scopus/WOS grade`
  5. **Card 5 (Col 4, Row 2)**: `ShieldCheck` (`text-[#CC6600]`) — `Dual-Pass Peer Review` | `r = 1.00 Concordance gate`
  6. **Card 6 (Bottom-Left 2x1 Wide)**: `md:col-span-2 lg:col-span-2 lg:border-r` — `Code` (`text-[#CC6600]`) — `Reproducible Computational Scripts (.R / SPSS / Python)` | `100% Complete script ownership`
  7. **Card 7 (Col 3, Row 3)**: `CheckCircle` (`text-[#CC6600]`) — `Instrument Reliability` | `α > .80 Reliability target`
  8. **Card 8 (Col 4, Row 3)**: `GraduationCap` (`text-[#CC6600]`) — `DefenseLab™ Coaching` | `1-on-1 Simulated oral panel`

---

### Section 03: Solutions & Stacked Deliverables (`Solutions.tsx` + `SolutionCard.tsx`)

**Files**: [apps/web/app/components/sections/Solutions.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/sections/Solutions.tsx) & [apps/web/app/components/ui/SolutionCard.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/ui/SolutionCard.tsx)

#### 1. Current State & Anti-Patterns Identified
- Banned double-slash in badges: `DELIVERABLE 01 // DATA CLEANING`.
- Section kicker uses `SECTION 03 // WHAT YOU RECEIVE`.
- Heavy inline CSS on cards, header tabs, and feature items.
- Checkmarks in pill tags use plain text unicode `✓` rather than Phosphor fill icon `<CheckCircle weight="fill" />`.

#### 2. Revamp Specification
- **Section Header**:
  - Kicker: `DELIVERABLES INCLUDED` (clean uppercase monospace without `//`).
  - Title: `Complete Deliverables. Zero Statistical Anxiety.`
- **Stacked Card Architecture**:
  - Desktop: GSAP pinned deck with 50px header tabs exposed sequentially at `calc(165px + index * 52px)`.
  - Mobile: Clean vertical stack with `gap-6` without awkward sticky clipping.
- **Card Anatomy Upgrades**:
  - Substrate: `#01142B` body with `#011B38` header tab bar.
  - Border: Crisp 1px `border-white/10`, precision `rounded-[2px]`.
  - Tag Pills: Clean rounded-[2px] chips with `<CheckCircle weight="fill" size={12} className="text-[#CC6600]" />`.
  - 4-Column Feature Grid: Replace inline styles with Tailwind grid (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`).
  - Metric Badges: Bold monospace numeral (`font-mono font-bold text-sky-400`) + uppercase label.

#### 3. Copywriting Plan
- Deliverable 01: `Spreadsheet Cleaning & Data Health Checks` (Data cleanup, Outlier checks, Reliability test, Missing data handling).
- Deliverable 02: `Accurate Calculations & Ready APA 7th Tables` (Demographics, Hypothesis testing, Advanced SEM modeling, Ready APA tables).
- Deliverable 03: `Double-Checked by 2 Independent Statisticians` (Double-blind check, Zero p-hacking, Complete R/Python/SPSS code, Senior QA sign-off).
- Deliverable 04: `Plain-English Speaking Scripts & Mock Defense` (1-on-1 mock panel defense, 20+ defense questions script, null-result defense, free revisions).

---

### Section 04: Packages & Custom Pricing (`Pricing.tsx`)

**File**: [apps/web/app/components/sections/Pricing.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/sections/Pricing.tsx)

#### 1. Current State & Anti-Patterns Identified
- Double-slashes across all plan badges (`PLAN 01 // SURVEY AUDIT`, `PHP // BY QUOTE`).
- Double-slashes in system status footer (`SYS // CUSTOM_QUOTED_PER_STUDY // SOW_APPROVAL_REQUIRED`).
- The Philippine Peso symbol (`₱`) must follow the workspace typography standard (Sans-serif optical weight, never heavy monospace fallback glyph).
- Recommendation tag uses bracketed shouting (`[ RECOMMENDED_FOR_THESIS_DEFENSE ]`).

#### 2. Revamp Specification
- **Grid Spacing**:
  - 2x2 grid using strict `gap-6` (`grid grid-cols-1 md:grid-cols-2 gap-6`).
- **Peso Currency Harmonization**:
  - Ensure the `₱` glyph is rendered in clean `font-sans font-normal opacity-85 select-none inline-block mr-0.5` alongside crisp bold monospace numerals.
- **Featured Plan Card Elevation**:
  - `Core Thesis Package` highlighted with an Enterprise Orange hairline border (`border-[#CC6600]/80`), subtle top accent gradient, and an authoritative badge:
    `<span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#CC6600] bg-[#CC6600]/10 px-2 py-0.5 rounded-[2px] border border-[#CC6600]/30">RECOMMENDED FOR DEFENSE</span>`.
- **Offerings Bento Split**:
  - DefenseLab card (`₱250/hr`) and delivery upgrade stack styled with unified `rounded-[2px]` and `#01142B` substrates.
- **Buttons**:
  - Action buttons styled with precision `rounded-[2px]`, Title Case (`"Request Custom Quote"`), and tactile `:active:scale-97`.

#### 3. Copywriting Plan (Zero Double Slashes)
- **Kicker**: `TRANSPARENT RATES & CUSTOM SCOPES`
- **Heading**: `Transparent Rates. Custom-Quoted Scopes.`
- **Plan 01**: `DataCheck` — Starts at ₱1,000 · Survey Audit & Health Report
- **Plan 02**: `Start Package` — Starts at ₱1,500 · Demographics & Respondent Profiles
- **Plan 03 (Featured)**: `Core Thesis Package` — Starts at ₱2,400 · Complete Hypothesis Testing
- **Plan 04**: `Advanced Package` — Starts at ₱3,000+ · Complex Multivariate Modeling
- **DefenseLab**: `DefenseLab Module` — ₱250/hr · Live 1-on-1 Mock Panel Defense
- **Upgrades**: `JAXIS Rush` (3 Days · ₱300), `JAXIS Express` (48 Hours · ₱600), `JAXIS Emergency` (24 Hours · ₱1,000).

---

### Section 05: Security, Ethics & Escrow (`Security.tsx`)

**File**: [apps/web/app/components/sections/Security.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/sections/Security.tsx)

#### 1. Current State & Anti-Patterns Identified
- Double slashes in section tag (`SECTION // 05 — PRIVACY & INTEGRITY`) and pillar codes (`SEC_01 // ANONYMITY`).
- Double slashes in footer certification (`SYS // STRICT_NDA_LOCK // PII_CLEANSED`).
- Inline CSS throughout.

#### 2. Revamp Specification
- **Iconography**:
  - Incorporate Phosphor fill icons (`@phosphor-icons/react` with `weight="fill"`):
    - `SEC 01`: `<ShieldCheck weight="fill" size={20} className="text-sky-400" />`
    - `SEC 02`: `<Scales weight="fill" size={20} className="text-emerald-400" />`
    - `SEC 03`: `<LockKey weight="fill" size={20} className="text-amber-400" />`
    - `SEC 04`: `<Bank weight="fill" size={20} className="text-[#CC6600]" />`
- **Card Anatomy**:
  - Unified `#01142B` substrate, `border border-white/10`, `rounded-[2px]`, `p-6 sm:p-8`.
  - Corner crosshairs (`+`) with subtle `text-white/20`.
  - 2x2 parameter strip at the base of each card.
- **Footer Status**:
  - Clean authoritative audit badge: `● Strict Non-Disclosure Lock · PII Cleaned · Zero Data Manipulation Verified`.

#### 3. Copywriting Plan (Zero Double Slashes)
- Pillar 01: `100% Anonymity & Data Privacy` — Participant names, IDs, and emails scrubbed before analysts start.
- Pillar 02: `We Never Fake or Manipulate Data` — Zero p-hacking policy; non-significant results scientifically defended.
- Pillar 03: `You Own 100% of Your Research & Code` — Legally binding NDAs signed by all staff; complete client ownership.
- Pillar 04: `Safe Escrow Payment Protection` — Payments protected in escrow; released only upon Senior QA decimal verification.

---

### Section 06: Frequently Asked Questions (`FAQ.tsx`)

**File**: [apps/web/app/components/sections/FAQ.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/sections/FAQ.tsx)

#### 1. Current State & Anti-Patterns Identified
- Double slashes in category tags (`// TIMELINE & TURNAROUND`) and section kicker (`SECTION // 06`).
- Expanding toggle uses text `+` character rotated by 45 degrees rather than a dedicated icon.
- Inline styles for accordion item state management.

#### 2. Revamp Specification
- **Accordion Architecture**:
  - Single-item active state (`openIndex`).
  - Pure CSS grid height transition (`grid-template-rows: 0fr -> 1fr`, `300ms cubic-bezier(0.16, 1, 0.3, 1)`) for zero JavaScript layout jank.
- **Visual Elevation**:
  - Inactive card: `bg-[#01142B]/70 border border-white/10 rounded-[2px] hover:border-white/20 transition-all`.
  - Active card: `bg-[#011B38] border border-sky-400/40 rounded-[2px]`.
  - Left indicator: Precision 3px Enterprise Orange vertical strip (`bg-[#CC6600]`) on the active item.
  - Toggle icon: `<CaretDown weight="fill" size={18} className="transition-transform duration-300 ..." />` or `<Plus weight="fill" />`.
- **Category Badge**:
  - Clean monospace micro-badge without double slashes: `<span className="text-[10px] font-mono text-sky-400 tracking-wider uppercase font-semibold">TIMELINE & TURNAROUND</span>`.

#### 3. Copywriting Plan
- 6 Essential Questions:
  1. *How fast will I receive my analysis?*
  2. *What if my thesis adviser or panel asks for revisions?*
  3. *Is my survey data and student identity kept confidential?*
  4. *What happens if my results are not statistically significant (p > .05)?*
  5. *I know nothing about statistics. How will I defend my numbers?*
  6. *What exact files will I receive upon delivery?*

---

### Section 07: Footer & Final CTA (`FooterCTA.tsx`)

**Files**: [apps/web/app/components/sections/FooterCTA.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/sections/FooterCTA.tsx) & [apps/web/app/components/ui/tailwind-css-background-snippet.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/ui/tailwind-css-background-snippet.tsx)

#### 1. Current State & Anti-Patterns Identified
- Inline styles on all footer elements.
- Legal links lack clear hover styling and active states.
- Missing operational status grounding indicator (`● System Operational`).

#### 2. Revamp Specification
- **Conversion Hero Container**:
  - Ambient radial spotlight reveal on scroll (`.bg-glow` via GSAP ScrollTrigger).
  - Centered high-impact typography (`font-sans font-light text-3xl sm:text-5xl tracking-tight`).
  - Action button: `"Get Free Thesis Review"` with Dashdark precision `rounded-[2px]`, `border border-[#CC6600] bg-[#CC6600]/15 hover:bg-[#CC6600] text-white font-semibold text-xs uppercase tracking-widest px-8 py-4 transition-all active:scale-[0.97]`.
- **Global Footer Navigation Bar**:
  - Border: Clean top divider (`border-t border-white/10 pt-8 mt-20`).
  - Left: Brand icon + `JAXIS StatLab` wordmark + Operational status tag:
    `<span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-mono"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> System Operational</span>`.
  - Right: Legal and compliance links (`Privacy Policy`, `Terms of Service`, `Ethics Standard`, `Escrow Security`) with `hover:text-sky-400` transitions.

#### 3. Copywriting Plan
- Eyebrow: `GET YOUR FREE STATISTICAL CONSULTATION`
- Headline: `Stop worrying about defense. Start feeling confident.`
- Paragraph: "Send us your Chapter 1 or raw survey spreadsheet. Our senior statisticians will review your study and give you an exact, custom Scope of Work quote within 24 hours at zero charge."
- CTA Button: `Get Free Thesis Review`
- Links: `Privacy Policy` · `Terms of Service` · `Academic Ethics & Anti-P-Hacking` · `Escrow Security`

---

## 3. Implementation Plan & Sequencing Checklist

| Order | Target Section | Primary Changes | Verification |
|---|---|---|---|
| **Phase 1** | **Section 00: Navbar** | Clean Tailwind, `rounded-[2px]` CTA, Phosphor mobile icons, active scroll styling | `check-types`, mobile drawer test |
| **Phase 2** | **Section 01: Hero & Globe** | Dashdark precision typography, Phosphor HUD callouts, dual CTA, 0 double slashes | `check-types`, GSAP scroll check |
| **Phase 3** | **Section 02: Approach** | Remove `//`, 2x2 `#01142B` bento matrix, SVG path animation, spec matrix | `check-types`, vector draw test |
| **Phase 4** | **Section 03: Solutions** | Clean tabs, Phosphor checkmarks, 4-column feature grids, responsive stacking | `check-types`, scroll pinning test |
| **Phase 5** | **Section 04: Pricing** | Harmonized Peso `₱` typography, featured badge, DefenseLab bento split | `check-types`, responsive layout check |
| **Phase 6** | **Section 05: Security** | Phosphor fill icons per pillar, `#01142B` cards, zero double slashes | `check-types`, grid rhythm check |
| **Phase 7** | **Section 06: FAQ** | Pure CSS grid interpolation, Phosphor toggle, active `#CC6600` accent bar | `check-types`, accordion toggle test |
| **Phase 8** | **Section 07: Footer CTA** | Ambient spotlight glow, tactile conversion button, system operational status | `check-types`, full page smoke test |

---

*(This document serves as the canonical revamp reference. No section code will be touched without following this exact specification.)*
