# JAXIS StatLab — Landing Page (`apps/web`) Comprehensive Documentation

This document provides an exhaustive, section-by-section breakdown of the landing page in `apps/web` (`apps/web/app/page.tsx`). For every section, it details the **layout structure**, **interactive behavior & animation mechanics**, **exact copywriting**, and **supporting component dependencies**.

---

## Table of Contents

1. [Architectural Overview & Global Foundations](#1-architectural-overview--global-foundations)
2. [Global Tokens & Theme Palette](#2-global-tokens--theme-palette)
3. [Section 00: Navigation Bar (`Navbar.tsx`)](#3-section-00-navigation-bar-navbarttsx)
4. [Section 01: Hero & Particle Globe (`Hero.tsx`)](#4-section-01-hero--particle-globe-herotsx)
5. [Section 02: Our Approach (`Approach.tsx`)](#5-section-02-our-approach-approachtsx)
6. [Section 03: Solutions & Stacked Deliverables (`Solutions.tsx`)](#6-section-03-solutions--stacked-deliverables-solutionstsx)
7. [Section 04: Packages & Custom Pricing (`Pricing.tsx`)](#7-section-04-packages--custom-pricing-pricingtsx)
8. [Section 05: Security, Ethics & Escrow (`Security.tsx`)](#8-section-05-security-ethics--escrow-securitytsx)
9. [Section 06: Frequently Asked Questions (`FAQ.tsx`)](#9-section-06-frequently-asked-questions-faqtsx)
10. [Section 07: Footer & Final CTA (`FooterCTA.tsx`)](#10-section-07-footer--final-cta-footerctatsx)
11. [Cross-Cutting Systems (Scroll, Config, SEO)](#11-cross-cutting-systems-scroll-config-seo)

---

## 1. Architectural Overview & Global Foundations

The marketing web client (`apps/web`) is built with:
- **Framework**: Next.js 16 (App Router, Turbopack, React 19).
- **Styling**: Vanilla CSS variables defined in [globals.css](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/globals.css) with strict dark terminal precision aesthetics.
- **Motion & Physics**: 
  - [Lenis](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/layout/SmoothScroll.tsx) (`@studio-freight/lenis` / `lenis`) for inertial smooth scrolling.
  - [GSAP](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/sections/Hero.tsx) (GreenSock) + `ScrollTrigger` + `@gsap/react` for pinned viewport transitions, SVG vector drawing, and staggered timeline choreography.
  - [Three.js](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/ui/ParticleGlobe.tsx) (`three`) for the real-time 3D interactive Fibonacci particle globe.
- **Page Assembly**: Located in [app/page.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/page.tsx):
  ```tsx
  <div className="site-root" style={{ backgroundColor: "#010114", minHeight: "100vh" }}>
    <Navbar />
    <main>
      <Hero />
      <Approach />
      <Solutions />
      <Pricing />
      <Security />
      <FAQ />
      <FooterCTA />
    </main>
  </div>
  ```

---

## 2. Global Tokens & Theme Palette

From [globals.css](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/globals.css):

| Token Name | Value | Purpose |
|---|---|---|
| `--bg-primary` | `#010114` | Deep obsidian midnight master canvas substrate |
| `--surface-secondary` | `#012E57` / `#01162E` | Elevated card substrate |
| `--surface-glass` | `rgba(1, 46, 87, 0.55)` | Translucent glass surface tint |
| `--border-glass` | `rgba(255, 255, 255, 0.12)` | Crisp 1px hairline border |
| `--accent-orange` | `#CC6600` | Enterprise Orange primary brand accent |
| `--accent-orange-hover` | `#E67300` | Active/hover orange state |
| Analytical Sky Blue | `#38BDF8` | Verification / data health accent |
| Verification Emerald | `#10B981` | Success / checkmark accents |
| `--font-sans` | `'Inter', sans-serif` | Clean, high-legibility body & headings |
| `--font-mono` | `'Disket Mono', monospace` | Technical labels, counters, IDs, code |

---

## 3. Section 00: Navigation Bar (`Navbar.tsx`)

- **File**: [apps/web/app/components/layout/Navbar.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/layout/Navbar.tsx)
- **Type**: Client Component (`"use client"`)

### 3.1 Layout & DOM Structure
- **Fixed Position Container**: Positioned at `top: 0, left: 0, right: 0`, `z-index: 50`.
- **Desktop Navigation**:
  - **Left Brand**: Next.js `<Link href="/">` containing `/jaxislogo.png` (26px height) and uppercase wordmark `JAXIS` in `#FFFFFF` + `StatLab` in `#CC6600`.
  - **Center Nav Links**: Unordered list with 6 anchor links (`#approach`, `#solutions`, `#pricing`, `#security`, `#faq`, `#contact`).
  - **Right Action Cluster**: 
    - Secondary Link: `"Sign In"` (points to `LOGIN_URL` from `config.ts`).
    - Primary CTA Button: `"Get Started"` (points to `REGISTER_URL` from `config.ts`), rectangular with `border: 1px solid rgba(255, 255, 255, 0.40)`.
- **Mobile Navigation Drawer**:
  - Hamburger button (`#mobile-menu-toggle`) toggles SVG cross/bars.
  - Collapsible drawer overlay (`#mobile-drawer`) with full-width links and stacked `"Sign In"` and `"Get Started"` buttons.

### 3.2 Behavior & Micro-Interactions
- **Scroll Detection**: Listens to window scroll (`window.scrollY > 20`).
  - `scrolled = false`: `backgroundColor: rgba(1, 1, 20, 0.40)`, border: `rgba(255, 255, 255, 0.05)`, blur `12px`.
  - `scrolled = true`: `backgroundColor: rgba(1, 1, 20, 0.88)`, border: `rgba(255, 255, 255, 0.10)`, blur `12px`.
- **Hover Transitions**:
  - Nav links smoothly change color from `rgba(255, 255, 255, 0.70)` to Sky Blue `#38bdf8`.
  - "Get Started" CTA button switches border to `#CC6600`, text to `#CC6600`, and background to `rgba(204, 102, 0, 0.12)`.
  - Mobile drawer closes on link click (`onClick={() => setMenuOpen(false)}`).

### 3.3 Exact Copy
- **Logo**: `JAXIS StatLab`
- **Navigation Items**:
  1. `Our Approach` (`#approach`)
  2. `Solutions` (`#solutions`)
  3. `Packages` (`#pricing`)
  4. `Security` (`#security`)
  5. `FAQ` (`#faq`)
  6. `Contact` (`#contact`)
- **Action Buttons**:
  - `Sign In` $\rightarrow$ `https://app.jaxis-statlab.com/login`
  - `Get Started` $\rightarrow$ `https://app.jaxis-statlab.com/register`

---

## 4. Section 01: Hero & Particle Globe (`Hero.tsx`)

- **File**: [apps/web/app/components/sections/Hero.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/sections/Hero.tsx)
- **Sub-Component**: [ParticleGlobe.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/ui/ParticleGlobe.tsx)
- **State Store**: [globeState.ts](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/lib/globeState.ts)
- **Type**: Client Component (`"use client"`)

### 4.1 Layout & DOM Structure
- **Viewport Height Container**: `100dvh`, pinned during ScrollTrigger scrub.
- **Layer 1: 3D Background**:
  - `<ParticleGlobe />` rendered dynamically with `ssr: false`.
  - Three optical gradient vignettes (radial ellipse at bottom, vertical linear gradient top-to-bottom, and central radial contrast vignette) to guarantee razor-sharp contrast over 3D particles.
- **Layer 2: Telemetry Annotations (4 HUD Callouts)**:
  - Absolute positioned around the perimeter at 20% offsets.
  - Dot indicator, bracketed index + tag (`[01] DATA_AUDIT`), and two monospace status lines.
- **Layer 3: Hero Core Content**:
  - Centered `h1` (`clamp(2.6rem, 7vw, 5.5rem)`) with normal text and accent text.
  - Subtitle caption (`max-w-[460px]`, `0.82rem`).
  - Primary CTA button `"Get Started →"` with subtle orange glass fill.
- **Layer 4: Scroll Reveal Statement Overlay**:
  - Hidden initially at `top: 50%, left: 50%`, revealed word-by-word during scroll.

### 4.2 Behavior & Complex Animations
1. **Three.js Particle Globe (`ParticleGlobe.tsx`)**:
   - 700 particles distributed uniformly using Fibonacci Sphere algorithm (`POINT_COUNT = 700`, `SPHERE_RADIUS = 2.4`).
   - Double-layered rendering: sharp core dot texture (128x128) + wide feathered halo texture (256x256) with additive blending (`THREE.AdditiveBlending`).
   - Interactive Raycasting: Tracks pointer hover, illuminating a cone of 36 hotspot particles from crisp ice-blue (`#7dd3fc`) to brilliant cyan-white (`#f0f9ff`).
   - Auto-rotation: Slowly rotates along Y-axis; reads dynamic coordinates from `globeScrollState` (`yOffset`, `scale`, `offset`, `interactiveWeight`).
2. **Interactive Parallax**:
   - Subtle mouse move tracking shifts `#hero-headline` by up to $\pm 12\text{px}$ horizontally and $\pm 8\text{px}$ vertically on pointer-capable devices (`hover: hover and pointer: fine`).
3. **GSAP ScrollTrigger Timeline (3-Phase Sequence)**:
   - **Trigger**: `start: "top top"`, `end: "+=130%"`, `scrub: 1`, `pin: true`.
   - **Phase 1 (0% to 25% Scroll)**:
     - Headline, caption, CTA, and floating telemetry callouts slide up `y: -35px` and fade to `opacity: 0`.
   - **Phase 2 (15% to 75% Scroll)**:
     - Globe scales up from `1.0` to `1.6`, shifts upward (`yOffset: -1.8`), rotates `Math.PI * 1.2`, and disables pointer hover (`interactiveWeight: 0`).
     - Words of the comprehensive value proposition (`INTRO_TEXT`) fade in and de-blur individually (`stagger: 0.35`, `y: 15 -> 0`, `filter: blur(3px) -> blur(0px)`).
   - **Phase 3 (75% to 100% Scroll)**:
     - The overlay message dissolves upward (`y: -30px`, `opacity: 0`, `filter: blur(4px)`), cleanly transitioning the viewport into the Approach section.

### 4.3 Exact Copy
- **Floating Monospace Telemetry Snippets**:
  - `[01] DATA_AUDIT`:
    - Line 1: `Raw survey data checked`
    - Line 2: `No missing entries | Clean ✓`
  - `[02] TEST_SELECTION`:
    - Line 1: `Correct tests selected`
    - Line 2: `Matched to research questions ✓`
  - `[03] APA_TABLES`:
    - Line 1: `APA 7th Edition tables`
    - Line 2: `Ready to paste into Chapter 4 ✓`
  - `[04] QA_VERIFIED`:
    - Line 1: `Double-checked by 2 experts`
    - Line 2: `Ready for Thesis Defense ✓`
- **Main Headline**:
  - Line 1: `Defend Your Thesis.`
  - Line 2 (Accent `#CC6600`): `With Confidence.`
- **Caption**:
  - `"We analyze your survey data, format your APA 7th Edition tables, and give you the exact speaking script to defend your results — with 100% accuracy."`
- **CTA Button**:
  - `Get Started →` (links to `REGISTER_URL`)
- **Phase 2 Scroll Statement (`INTRO_TEXT`)**:
  - `"JAXIS helps students and researchers pass their thesis defense. We clean your survey data, calculate your statistical tests, format your APA tables, and double-check every number with two independent statisticians — so you walk into your panel defense with zero fear."`

---

## 5. Section 02: Our Approach (`Approach.tsx`)

- **File**: [apps/web/app/components/sections/Approach.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/sections/Approach.tsx)
- **Type**: Client Component (`"use client"`)

### 5.1 Layout & DOM Structure
- **Section ID**: `id="approach"`, dark background `#010114`, padded `6rem 2rem 8rem`.
- **Section Header Grid**:
  - Left column: Orange section kicker tag (`SECTION // 02 — HOW WE WORK`) + large headline (`From Raw Data To Passed Defense.`).
  - Right column: Descriptive paragraph explaining the 4-step workflow.
- **Architectural Bento Matrix (2x2 Grid)**:
  - Four cards styled with elevated substrate `rgba(2, 11, 34, 0.85)`, crisp `border-white/12`, and tactile corner crosshairs (`+`).
  - Each card anatomy:
    1. Top Bar: Monospace step index (`[01] STEP_01`) + Right-aligned deliverable badge.
    2. Title (`h3`) & Plain-English Description.
    3. Mathematical Vector Line Art CAD Box (`#00000a` background).
    4. Auditable Spec Matrix: 2x2 grid of key service parameters with cyan and orange accent indicators.

### 5.2 Behavior & SVG Vector Drawing Mechanics
- **ScrollTrigger Entrance**:
  - Header fades and rises `y: 25 -> 0`.
  - Cards reveal individually on scroll (`y: 35 -> 0`, `duration: 0.65s`).
- **Dynamic CAD Vector Animation**:
  - Each CAD illustration contains paths with `.vector-draw-path` and initial `strokeDasharray="400"`, `strokeDashoffset="400"`.
  - Upon card trigger, GSAP animates `strokeDashoffset` from `400` to `0` over `1.1s` with `stagger: 0.08`, visually "drawing" the blueprints as the user scrolls.

### 5.3 Vector Schematics & Content Details
1. **`STEP_01`: Send Us Your Chapter 1 & Data**
   - **Vector Art**: Isometric Blueprint Box with caliper dimensions (`Δ=0.00`) and node coordinate markers (`MethodologyLockCAD`).
   - **Badge**: `DELIVERABLE: CUSTOM SOW QUOTE IN 24H`
   - **Subtitle**: `EXACT TEST MATCHING & FREE QUOTE`
   - **Description**: *"We review your research objectives, statement of the problem, and raw survey data. We determine the exact statistical tests your study actually needs before you spend a single peso."*
   - **Specs**:
     - `INITIAL REVIEW`: `100% FREE INTAKE` (Orange highlight)
     - `TEST SELECTION`: `MATCHED TO OBJECTIVES`
     - `QUOTE ACCURACY`: `CUSTOM TO YOUR STUDY`
     - `TURNAROUND`: `QUOTE IN 24 HOURS` (Orange highlight)

2. **`STEP_02`: We Clean Your Data & Fix Errors**
   - **Vector Art**: Parametric Gaussian Bell Curve with $\pm 1.96\sigma$ caliper lines and normality indicators (`GaussianPreFlightLineArt`).
   - **Badge**: `DELIVERABLE: CLEANED DATASET & HEALTH SHEET`
   - **Subtitle**: `SURVEY HEALTH & VALIDITY AUDIT`
   - **Description**: *"We organize your spreadsheet, clean up missing survey responses, and run normality and outlier tests so your panel and adviser never reject your raw data."*
   - **Specs**:
     - `SURVEY CLEANUP`: `OUTLIERS REMOVED` (Orange highlight)
     - `RELIABILITY TEST`: `CRONBACH'S ALPHA CLEARED`
     - `MISSING ENTRIES`: `STATISTICALLY RESOLVED`
     - `DATA HEALTH`: `100% VALIDATED` (Orange highlight)

3. **`STEP_03`: Two Experts Calculate Your Numbers**
   - **Vector Art**: Dual Harmonic Waveform Traces showing primary methodologist trace overlaid with senior QA auditor trace matching phase (`DualPassQALineArt`).
   - **Badge**: `DELIVERABLE: DOUBLE-VERIFIED CALCULATIONS`
   - **Subtitle**: `ZERO CALCULATION ERROR GUARANTEE`
   - **Description**: *"Your data is analyzed by one statistician and recalculated from scratch by a second senior reviewer. If a single decimal differs, we fix it before you receive your results."*
   - **Specs**:
     - `PRIMARY RUN`: `EXPERT STATISTICIAN`
     - `SECOND AUDIT`: `SENIOR QA RE-CALCULATION` (Orange highlight)
     - `ERROR TOLERANCE`: `0.00% ZERO ERROR`
     - `TABLE FORMAT`: `APA 7TH EDITION` (Orange highlight)

4. **`STEP_04`: You Get Tables & Plain Speaking Scripts**
   - **Vector Art**: Linear Regression Scatter Plot with slope line, empirical data points, and residual drop lines (`RegressionDefenseLineArt`).
   - **Badge**: `DELIVERABLE: APA TABLES & DEFENSE SCRIPT`
   - **Subtitle**: `READY TO PASTE INTO CHAPTER 4`
   - **Description**: *"You receive clean APA tables ready to paste into your manuscript, plus a word-for-word speaking script explaining what every p-value and percentage means during your defense."*
   - **Specs**:
     - `MANUSCRIPT TABLES`: `COPY-PASTE READY (APA 7)`
     - `SPEAKING SCRIPT`: `PLAIN-ENGLISH TRANSLATION` (Orange highlight)
     - `SOURCE CODE`: `R / PYTHON / SPSS INCLUDED`
     - `DEFENSE SUPPORT`: `100% READY FOR PANEL` (Orange highlight)

---

## 6. Section 03: Solutions & Stacked Deliverables (`Solutions.tsx`)

- **File**: [apps/web/app/components/sections/Solutions.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/sections/Solutions.tsx)
- **Sub-Component**: [SolutionCard.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/ui/SolutionCard.tsx)
- **Type**: Client Component (`"use client"`)

### 6.1 Layout & Stacking Deck Mechanism
- **Section ID**: `id="solutions"`, padded `6rem 2rem 8rem`.
- **Header**: Centered eyebrow badge (`SECTION 03 // WHAT YOU RECEIVE`), authoritative headline (`Complete Deliverables. Zero Statistical Anxiety.`), and subtext.
- **Stacked Cards Deck**:
  - Container `.stacked-cards-deck` with relative positioning and minimum height `560px`.
  - 4 cards layered on top of each other.
  - **Persistent Tab Bar**: Each card features an upper 50px header bar with an accent square, uppercase monospace deliverable badge, and large numeral (`01`, `02`, `03`, `04`).
  - **Card Body Content**:
    - Title & Subtitle.
    - Tag Pills Bar: Horizontal flex list of deliverable checkmarks (`✓`).
    - 4-Column Feature Grid: Individual cards with sub-tags, titles, descriptions, and monospace metric badges (`CLEANED 100% ACCURATE`, `α > .80`, `p < .05`, etc.).

### 6.2 Behavior & Animations
- **Desktop ScrollTrigger Pinning**:
  - If `window.innerWidth > 768px`, pins the section for `+=220%` scroll distance (`scrub: 0.6`).
  - Cards 2, 3, and 4 animate sequentially from below (`y: window.innerHeight * 0.75 -> 0`), sliding directly over the previous card while leaving the earlier cards' 50px header tabs exposed at the top in an indexed stack.
- **Mobile Responsive Degradation**:
  - On screens $\le 768\text{px}$, ScrollTrigger pinning is bypassed to avoid mobile viewport jitter; cards render naturally in document flow.

### 6.3 Exact Deliverable Card Data
1. **Deliverable 01: Spreadsheet Cleaning & Data Health Checks**
   - **ID**: `intake-diagnostics`, Step: `01`, Badge: `DELIVERABLE 01 // DATA CLEANING`
   - **Subtitle**: *"We organize messy survey spreadsheets, clean up duplicate or invalid entries, and ensure your data is 100% mathematically valid before testing."*
   - **Pills**: `Survey Data Cleanup`, `Missing Response Handling`, `Outlier & Extreme Value Check`, `Survey Reliability (Cronbach's Alpha)`, `Adviser-Ready Clean Sheet`.
   - **4 Features**:
     - `DATA CLEANUP`: Spreadsheet Formatting (`CLEANED` / `100% ACCURATE`)
     - `OUTLIER CHECK`: Extreme Response Scan (`VERIFIED` / `NO SKEW`)
     - `RELIABILITY`: Survey Reliability Test (`α > .80` / `HIGH RELIABILITY`)
     - `MISSING DATA`: Missing Answer Handling (`0.0%` / `DATA LEAKAGE`)

2. **Deliverable 02: Accurate Calculations & Ready APA 7th Tables**
   - **ID**: `inferential-modeling`, Step: `02`, Badge: `DELIVERABLE 02 // STATISTICAL TESTS`
   - **Subtitle**: *"We compute every demographic profile, hypothesis test, and regression model, then format them into ready-to-paste APA 7th Edition tables."*
   - **Pills**: `Demographic Profiles & Frequencies`, `T-Tests & ANOVA Group Comparisons`, `Correlation & Multiple Regression`, `Advanced SEM & Path Analysis`, `APA 7th Edition Formatted Tables`.
   - **4 Features**:
     - `DEMOGRAPHICS`: Profile & Frequency Tables (`100%` / `TABULATED`)
     - `HYPOTHESES`: Hypothesis Testing (`p < .05` / `CONFIRMED`)
     - `COMPLEX MODELS`: Advanced Modeling (SEM) (`CFI = .98` / `EXCELLENT FIT`)
     - `APA FORMAT`: Ready-to-Paste APA Tables (`APA 7.0` / `CAMPUS COMPLIANT`)

3. **Deliverable 03: Double-Checked by 2 Independent Statisticians**
   - **ID**: `qa-verification`, Step: `03`, Badge: `DELIVERABLE 03 // QUALITY ASSURANCE`
   - **Subtitle**: *"No guesswork or solo errors. Your analysis is independently calculated by two separate statisticians to ensure 100% accuracy before you receive it."*
   - **Pills**: `Double-Blind Recalculation`, `Zero Data Fabrication Policy`, `Full R / Python / SPSS Code Scripts`, `Senior Quality Assurance Stamp`.
   - **4 Features**:
     - `DOUBLE CHECK`: Independent Recalculation (`100%` / `REPRODUCIBLE`)
     - `INTEGRITY`: Zero P-Hacking Policy (`0.00` / `FRAUD TOLERANCE`)
     - `SOURCE CODE`: Full Software Scripts (`.R / .SPS` / `INCLUDED`)
     - `APPROVAL`: Senior Lead Sign-Off (`PASSED` / `QA VERIFIED`)

4. **Deliverable 04: Plain-English Speaking Scripts & Mock Defense**
   - **ID**: `defense-synthesis`, Step: `04`, Badge: `DELIVERABLE 04 // DEFENSE READINESS`
   - **Subtitle**: *"We translate statistical jargon into simple words you can read aloud, and coach you on how to answer tough panel questions with confidence."*
   - **Pills**: `Live 1-on-1 Mock Panel Defense`, `Top 20 Defense Questions Script`, `Explaining Non-Significant Results`, `Free Academic Revision Guarantee`.
   - **4 Features**:
     - `COACHING`: 1-on-1 Mock Panel Defense (`1-ON-1` / `LIVE SIMULATION`)
     - `SCRIPTS`: Defense Speaking Script (`20+` / `SCRIPTED ANSWERS`)
     - `EXPLANATION`: Null-Result Defense (`BACKED` / `THEORY JUSTIFIED`)
     - `WARRANTY`: Free Revision Guarantee (`100%` / `FREE REVISIONS`)

---

## 7. Section 04: Packages & Custom Pricing (`Pricing.tsx`)

- **File**: [apps/web/app/components/sections/Pricing.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/sections/Pricing.tsx)
- **Type**: Client Component (`"use client"`)

### 7.1 Layout & DOM Structure
- **Section ID**: `id="pricing"`, background `#010114`.
- **Header**: Eyebrow `SECTION // 04 — PACKAGES & CUSTOM QUOTES`, dual-line heading (`Transparent Rates. Custom-Quoted Scopes.`), and narrative intro.
- **2x2 Packages Grid (`.packages-grid`)**:
  - 4 cards with pad index (`01`, `02`, `03`, `04`).
  - Card 3 (`Core Thesis Package ★`) is `featured` with an active scanline beam (`.pricing-card-scanline`) and `[ RECOMMENDED_FOR_THESIS_DEFENSE ]` tag.
  - Monospace currency symbol `₱`, large price number, suffix `PHP // BY QUOTE`.
  - Feature checklist with `[✓]` monospace bullets.
  - Bottom button `"Request Custom Quote"` linking to `#contact`.
- **Secondary Offerings Area**:
  - Sub-heading: `DEFENSE READINESS & EXPEDITED TURNAROUND` / `DefenseLab & Delivery Upgrades`.
  - Left Card: **DefenseLab Module** (live 1-on-1 mock panel defense session at `₱250/hr`).
  - Right Column: Stack of 3 expedited delivery upgrades (`JAXIS Rush`, `JAXIS Express`, `JAXIS Emergency`).
- **Footer System Bar**:
  - Monospace compliance indicators: `SYS // CUSTOM_QUOTED_PER_STUDY // SOW_APPROVAL_REQUIRED` and `RULE_QUO_01 & RULE_QUO_02 COMPLIANT ✓`.

### 7.2 Behavior & Animations
- **GSAP Timelines**:
  - Header lines stagger entrance (`duration: 0.7s`, `stagger: 0.1s`).
  - 4 package cards trigger in sequence (`stagger: 0.1s`, `y: 35 -> 0`).
  - Offering cards enter via `ScrollTrigger.batch` on view entry.

### 7.3 Exact Packages & Pricing Table

| Plan | Catalog Tag | Price Prefix | Base Rate | Suffix | Best For / Summary | Key Included Features |
|---|---|---|---|---|---|---|
| **DataCheck** | `PLAN 01 // SURVEY AUDIT` | Starts at | **₱1,000** | PHP // BY QUOTE | Survey spreadsheet cleanup & error checking | Survey data formatting, Normality check, Cronbach's Alpha, Adviser health sheet |
| **Start Package** | `PLAN 02 // DEMOGRAPHICS & PROFILES` | Starts at | **₱1,500** | PHP // BY QUOTE | Demographic profiling & respondent cross-tabs | Frequencies, Percentages, Chi-Square, APA 7 tables, Chapter 4 writeup, SOW quote |
| **Core Thesis Package ★** *(Featured)* | `PLAN 03 // COMPLETE HYPOTHESIS TESTING` | Starts at | **₱2,400** | PHP // BY QUOTE | Standard choice for College, Master's & Ph.D. theses | T-Tests, ANOVA, Regression, Effect sizes, 2-statistician check, .R/.py/.sps code |
| **Advanced Package** | `PLAN 04 // COMPLEX MODELING` | Starts at | **₱3,000+** | PHP // CUSTOM SCOPE | Graduate dissertations & multivariate models | SEM, Path Analysis, HLM, Lead Methodologist verification, Question guide, Free revisions |

#### Upgrades & Add-ons
- **DefenseLab Module**: `₱250/hr` — Live 1-on-1 mock panel defense with a Senior JAXIS Statistician.
- **JAXIS Rush**: `₱300` — 3-day guaranteed turnaround upgrade.
- **JAXIS Express**: `₱600` — 48-hour expedited delivery upgrade.
- **JAXIS Emergency**: `₱1,000` — 24-hour urgent overnight delivery.

---

## 8. Section 05: Security, Ethics & Escrow (`Security.tsx`)

- **File**: [apps/web/app/components/sections/Security.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/sections/Security.tsx)
- **Type**: Client Component (`"use client"`)

### 8.1 Layout & DOM Structure
- **Section ID**: `id="security"`, background `#010114`.
- **Header**: Eyebrow `SECTION // 05 — PRIVACY & INTEGRITY`, Title `Your Research Data Is Safe. Guaranteed 100%.`.
- **2x2 Security Grid**:
  - 4 cards matching the Approach bento aesthetic (`rgba(2, 11, 34, 0.85)` surface, corner `+` crosshairs).
  - Upper bar: Code identifier (`SEC_01 // ANONYMITY`) + High-contrast status pill (`CONFIDENTIAL & PRIVATE`).
  - Title & detailed plain-English guarantee.
  - Bottom 2x2 auditable spec grid with cyan vertical accent border indicators.
- **Footer System Bar**:
  - Monospace audit line: `SYS // STRICT_NDA_LOCK // PII_CLEANSED // ZERO_P_HACKING_POLICY // JAXIS_SEC` and `RULE_ETH_01 & RULE_REL_01 VERIFIED ✓`.

### 8.2 Behavior & Animations
- Header and grid cards trigger with GSAP ScrollTrigger stagger (`y: 35 -> 0`, `duration: 0.7s`).
- Subtle card background and border-color transitions on hover.

### 8.3 Exact Pillars & Commitments
1. **`SEC_01 // ANONYMITY`: 100% Anonymity & Data Privacy**
   - **Subtitle**: `ZERO IDENTITY LEAKAGE` | **Badge**: `CONFIDENTIAL & PRIVATE`
   - **Description**: *"We remove all participant names, student IDs, emails, and school identifiers from your raw data before our analysts begin work. Your participants stay 100% anonymous."*
   - **Specs**: `IDENTITY PROTECTION`: `NAMES & IDS REMOVED` | `STORAGE SECURITY`: `ENCRYPTED AT REST`.

2. **`SEC_02 // HONEST MATH`: We Never Fake or Manipulate Data**
   - **Subtitle**: `ZERO P-HACKING POLICY` | **Badge**: `ACADEMIC HONESTY`
   - **Description**: *"We never fabricate numbers or alter survey data to force statistical significance. If your results show no significant difference, we provide legitimate academic explanations so your panel respects your research integrity."*
   - **Specs**: `DATA MANIPULATION`: `0.00 ZERO TOLERANCE` | `NULL FINDINGS`: `SCIENTIFICALLY DEFENDED`.

3. **`SEC_03 // OWNERSHIP`: You Own 100% of Your Research & Code**
   - **Subtitle**: `STRICT NON-DISCLOSURE AGREEMENTS` | **Badge**: `100% YOUR PROPERTY`
   - **Description**: *"Every JAXIS statistician signs a legally binding Non-Disclosure Agreement (NDA). Your data, analysis scripts, and findings belong 100% to you. We never publish or claim co-authorship."*
   - **Specs**: `NDA SIGNED`: `ALL STAFF LEGALLY BOUND` | `AUTHORSHIP`: `100% RETAINED BY YOU`.

4. **`SEC_04 // ESCROW`: Safe Escrow Payment Protection**
   - **Subtitle**: `VERIFIED BEFORE FINAL RELEASE` | **Badge**: `PAYMENT PROTECTED`
   - **Description**: *"Your payment is held safely in escrow upon project agreement. Deliverables are only released once an independent Senior QA Lead validates 100% decimal accuracy."*
   - **Specs**: `QUALITY CHECK`: `SENIOR QA STAMP REQUIRED` | `PAYMENT GATING`: `ESCROW SECURITY VERIFIED`.

---

## 9. Section 06: Frequently Asked Questions (`FAQ.tsx`)

- **File**: [apps/web/app/components/sections/FAQ.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/sections/FAQ.tsx)
- **Type**: Client Component (`"use client"`)

### 9.1 Layout & DOM Structure
- **Section ID**: `id="faq"`, background `#010114`.
- **Header**: Eyebrow `SECTION // 06 — FREQUENTLY ASKED QUESTIONS`, Title `Clear Answers. Zero Ambiguity.`.
- **FAQ Accordion Container**:
  - Vertical list of 6 card rows.
  - Active item features:
    - Vertical left accent bar (`width: 3px`, `#CC6600`).
    - Active border `rgba(56, 189, 248, 0.55)` and elevated background `rgba(2, 16, 48, 0.95)`.
    - Rotating toggle glyph (`+` rotates 45° to form an `×`).
  - Collapsible Content Body:
    - Uppercase category tag (e.g. `// TIMELINE & TURNAROUND`).
    - Plain-English detailed answer.

### 9.2 Behavior & Expansion Mechanics
- **Accordion State**: Managed via `const [openIndex, setOpenIndex] = useState<number | null>(0)`. Defaults to first question open.
- **CSS Grid Height Transition**: Smoothly interpolates `grid-template-rows: 0fr -> 1fr` over `0.35s cubic-bezier(0.16, 1, 0.3, 1)` to eliminate JavaScript layout calculations.
- **GSAP ScrollTrigger**: Header and individual accordion rows stagger in smoothly on viewport entry.

### 9.3 Complete Questions & Answers
1. **How fast will I receive my analysis?**
   - **Category**: `TIMELINE & TURNAROUND`
   - **Answer**: *"Standard thesis and survey packages (DataCheck, Start, Core) take 3 to 7 business days. Complex structural equation modeling (SEM) or medical dissertations take 2 to 3 weeks. If you are on a tight deadline, our 24-Hour and 48-Hour Rush delivery upgrades guarantee you submit on time."*
2. **What if my thesis adviser or panel asks for revisions?**
   - **Category**: `FREE REVISION GUARANTEE`
   - **Answer**: *"Revisions are 100% free. If your panel, adviser, or committee asks for changes, clarifications, or alternate tables within your study's original scope, our senior statisticians will revise your deliverables promptly at zero additional cost."*
3. **Is my survey data and student identity kept confidential?**
   - **Category**: `PRIVACY & NDAS`
   - **Answer**: *"Yes, completely. We scrub all respondent names, emails, and student ID numbers from your files before our analysts ever see them. Every statistician operates under legally binding NDAs, and your research findings remain 100% your own intellectual property."*
4. **What happens if my results are not statistically significant (p > .05)?**
   - **Category**: `ETHICAL INTEGRITY & P-VALUES`
   - **Answer**: *"Non-significant results are a normal part of real academic research! We never fake data or manipulate numbers. Instead, we provide rigorous theoretical explanations and sample justifications so you can defend your findings to your panel with complete academic credibility."*
5. **I know nothing about statistics. How will I defend my numbers?**
   - **Category**: `DEFENSE READINESS`
   - **Answer**: *"That is exactly why students choose JAXIS! You don't just get raw numbers — you receive a plain-English speaking script that explains what each table means in simple words, plus the exact answers to the top 20 questions your panel is likely to ask. You can also book our 1-on-1 mock defense session to practice."*
6. **What exact files will I receive upon delivery?**
   - **Category**: `DELIVERABLES & CODE`
   - **Answer**: *"You receive: (1) Publication-ready APA 7th Edition tables ready to paste into Chapter 4, (2) A plain-English narrative report explaining your findings, (3) The cleaned dataset file (.sav / .csv), and (4) The full statistical software code (R, Python, or SPSS) so your study is 100% reproducible."*

---

## 10. Section 07: Footer & Final CTA (`FooterCTA.tsx`)

- **File**: [apps/web/app/components/sections/FooterCTA.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/sections/FooterCTA.tsx)
- **Background Snippet**: [tailwind-css-background-snippet.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/ui/tailwind-css-background-snippet.tsx)
- **Type**: Client Component (`"use client"`)

### 10.1 Layout & DOM Structure
- **Section ID**: `id="contact"`, HTML `<footer>` tag, padded `10rem 2rem 6rem`.
- **Background Atmosphere**:
  - `Hero as FooterBackground` renders a dynamic radial gradient (`radial-gradient(125% 125% at 50% 10%, var(--bg-primary) 40%, var(--surface-secondary) 100%)`).
- **Conversion Hero**:
  - Eyebrow: `GET YOUR FREE STATISTICAL CONSULTATION`.
  - Main H2: `Stop worrying about defense. Start feeling confident.` (with Sky Blue `#38bdf8` accent).
  - Subtitle: Clear call to submit Chapter 1 or raw survey data for a free 24-hour custom SOW quote.
  - Large Primary Action Button: `"Get Free Thesis Review"` linking to `REGISTER_URL`.
- **Global Footer Navigation Bar**:
  - Left: JAXIS Logo (`/jaxislogo.png`) + `JAXIS StatLab` wordmark.
  - Right: Legal and ethical links (`Privacy Policy`, `Terms of Service`, `RULE_ETH_01 Anti-P-Hacking`, `Escrow & QA Gate`).

### 10.2 Behavior & Hover Mechanics
- **Spotlight Scroll Reveal**:
  - The background gradient (`.bg-glow`) fades in smoothly on scroll scrub as `#contact` enters viewport (from `top 90%` to `top 30%`).
- **Tactile Button Hover**:
  - On mouse enter: Border changes to `var(--accent-orange)`, background gains `rgba(204, 102, 0, 0.12)` tint, and shifts `translateY(-2px)`.
- **Footer Links Hover**:
  - Subtle transition from `rgba(255, 255, 255, 0.45)` to `#38bdf8`.

### 10.3 Exact Copy
- **Eyebrow**: `GET YOUR FREE STATISTICAL CONSULTATION`
- **Headline**:
  - Line 1: `Stop worrying about defense.`
  - Line 2 (Sky Blue): `Start feeling confident.`
- **Paragraph**:
  - *"Send us your Chapter 1 or raw survey spreadsheet. Our senior statisticians will review your study and give you an exact, custom Scope of Work quote within 24 hours at zero charge."*
- **Button Text**: `Get Free Thesis Review`
- **Legal Links**:
  - `Privacy Policy`
  - `Terms of Service`
  - `RULE_ETH_01 Anti-P-Hacking`
  - `Escrow & QA Gate`

---

## 11. Cross-Cutting Systems (Scroll, Config, SEO)

### 11.1 Smooth Scrolling Synchronization (`SmoothScroll.tsx`)
- **File**: [apps/web/app/components/layout/SmoothScroll.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/layout/SmoothScroll.tsx)
- Instantiates `Lenis` with `lerp: 0.08`, `duration: 1.2`, exponential easing (`1.001 - Math.pow(2, -10 * t)`).
- Hooks into GSAP via `lenis.on("scroll", ScrollTrigger.update)` and `gsap.ticker.add((time) => lenis.raf(time * 1000))`.
- Sets `gsap.ticker.lagSmoothing(0)` to prevent frame stuttering with ScrollTrigger pins.
- Suppresses external browser extension errors (e.g. MetaMask injection crashes) from triggering Next.js dev overlay.

### 11.2 Environment & Routing Config (`config.ts`)
- **File**: [apps/web/lib/config.ts](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/lib/config.ts)
- Base URL: `APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.jaxis-statlab.com"`.
- Shared constants:
  - `REGISTER_URL = ${APP_URL}/register`
  - `LOGIN_URL = ${APP_URL}/login`

### 11.3 Shared Globe State Proxy (`globeState.ts`)
- **File**: [apps/web/lib/globeState.ts](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/lib/globeState.ts)
- Mutable bridge object allowing GSAP ScrollTrigger in `Hero.tsx` to directly manipulate Three.js camera/particle properties inside `ParticleGlobe.tsx` without triggering React re-renders.

### 11.4 SEO & Schema.org JSON-LD (`layout.tsx`)
- **File**: [apps/web/app/layout.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/layout.tsx)
- Fonts: Inter (Google Font) + Disket Mono (Local TTF).
- Canonical URL: `https://jaxis-statlab.com`.
- Structured Data: Generates `schema.org` graph including `Organization` (JAXIS StatLab, Maramag, Bukidnon, PH) and `WebSite`.
