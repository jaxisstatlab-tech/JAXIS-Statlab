# Section 02 — Our Approach (`Approach.tsx`)

> **Phase**: Phase 3  
> **Component**: [apps/web/app/components/sections/Approach.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/sections/Approach.tsx)  
> **Status**: SPECIFIED / READY FOR REVAMP  
> **Design Standard**: Dashdark Precision Design System (`#010114`, `#01142B`, `rounded-[2px]`, `gap-6`)

---

## 1. Overview & Current State
The Approach section explains the company's 4-step workflow through a 2x2 architectural bento matrix. Each card features an animated mathematical CAD vector schematic that draws its paths as the card enters the viewport.

### Current Implementation
- **Section ID**: `id="approach"`.
- **Header**: 2-column header with eyebrow `SECTION // 02 — HOW WE WORK` and headline `From Raw Data To Passed Defense.`.
- **Matrix**: 4 cards with elevated dark background (`rgba(2, 11, 34, 0.85)`), corner crosshairs (`+`), CAD vector frame, and 2x2 spec parameters.
- **Visuals**:
  1. `MethodologyLockCAD`: Isometric blueprint box with caliper dimensions.
  2. `GaussianPreFlightLineArt`: Parametric normal bell curve with $\pm 1.96\sigma$ bounds.
  3. `DualPassQALineArt`: Dual harmonic waveform traces matching phase.
  4. `RegressionDefenseLineArt`: Linear regression slope line with empirical scatter points.

---

## 2. Audit & Identified Anti-Patterns
1. **Banned Double Slashes**: Section eyebrow uses `SECTION // 02 — HOW WE WORK` and `SOW BOUNDS: [FROZEN]`. All double slashes must be removed.
2. **Heavy Inline Styles**: Layout, padding, borders, and CSS grids rely entirely on inline objects.
3. **Inconsistent Grid Spacing**: Container uses ad-hoc gaps rather than the unified **24px (`gap-6`)** workspace standard.
4. **Card Padding**: Can be standardized to generous `p-6 sm:p-8` with precision `rounded-[2px]`.
5. **Shouting Bracket Codes**: `[01] STEP_01` can be streamlined into clean high-contrast chips (`STEP 01 OF 04`).

---

## 3. Key Upgrade Directives

### A. Section Header & Spacing Rhythm
- Section wrapper: `py-24 px-6 max-w-7xl mx-auto flex flex-col gap-12`.
- Eyebrow tag:
  ```tsx
  <div className="flex items-center gap-2 font-mono text-xs text-[#CC6600] tracking-widest uppercase font-semibold">
    <span className="w-1.5 h-1.5 bg-[#CC6600] rounded-none" />
    <span>HOW WE WORK · 4-STEP PROCESS</span>
  </div>
  ```
- Headline:
  ```tsx
  <h2 className="font-sans font-light text-3xl sm:text-5xl text-white tracking-tight leading-tight">
    From Raw Survey Data To{" "}
    <span className="text-sky-400 font-normal">Passed Defense.</span>
  </h2>
  ```

### B. Strict 2x2 Bento Matrix (`gap-6`)
- Grid container: `grid grid-cols-1 md:grid-cols-2 gap-6`.
- Card container:
  - Surface: `bg-[#01142B] border border-white/10 rounded-[2px] p-6 sm:p-8 flex flex-col justify-between relative group hover:border-white/20 transition-colors`.
  - Corner crosshairs: 4 corner `+` markers with `text-white/20 font-mono text-[10px] select-none pointer-events-none`.

### C. Animated CAD Vector Blueprints
- Frame: `bg-[#00000a] border border-white/[0.08] p-4 rounded-[2px] my-6 overflow-hidden`.
- Path animation: Maintain `.vector-draw-path` with `strokeDashoffset: 400 -> 0` via ScrollTrigger, ensuring smooth SVG path drawing on scroll entry.

### D. Auditable Spec Matrix (2x2 Base Strip)
- Base strip container: `grid grid-cols-2 gap-2 pt-4 border-t border-white/10 font-mono text-xs`.
- Spec box:
  ```tsx
  <div className="flex flex-col gap-0.5 p-2 bg-white/[0.02] border-l border-sky-400/40">
    <span className="text-[10px] text-white/40 uppercase tracking-wider">{spec.label}</span>
    <span className="text-xs text-white font-medium">{spec.value}</span>
  </div>
  ```

---

## 4. Exact Pre-Approved Copywriting

### Step 01: Send Us Your Chapter 1 & Data
- **Code**: `STEP 01 OF 04`
- **Badge**: `CUSTOM SOW QUOTE IN 24H`
- **Title**: `Send Us Your Chapter 1 & Data`
- **Subtitle**: `EXACT TEST MATCHING & FREE QUOTE`
- **Description**: *"We review your research objectives, statement of the problem, and raw survey data. We determine the exact statistical tests your study actually needs before you spend a single peso."*
- **Specs**:
  - `INITIAL REVIEW`: `100% FREE INTAKE` (Orange highlight)
  - `TEST SELECTION`: `MATCHED TO OBJECTIVES`
  - `QUOTE ACCURACY`: `CUSTOM TO YOUR STUDY`
  - `TURNAROUND`: `QUOTE IN 24 HOURS` (Orange highlight)

### Step 02: We Clean Your Data & Fix Errors
- **Code**: `STEP 02 OF 04`
- **Badge**: `CLEAN DATASET & HEALTH SHEET`
- **Title**: `We Clean Your Data & Fix Errors`
- **Subtitle**: `SURVEY HEALTH & VALIDITY AUDIT`
- **Description**: *"We organize your spreadsheet, clean up missing survey responses, and run normality and outlier tests so your panel and adviser never reject your raw data."*
- **Specs**:
  - `SURVEY CLEANUP`: `OUTLIERS REMOVED` (Orange highlight)
  - `RELIABILITY TEST`: `CRONBACH'S ALPHA CLEARED`
  - `MISSING ENTRIES`: `STATISTICALLY RESOLVED`
  - `DATA HEALTH`: `100% VALIDATED` (Orange highlight)

### Step 03: Two Experts Calculate Your Numbers
- **Code**: `STEP 03 OF 04`
- **Badge**: `DOUBLE-VERIFIED CALCULATIONS`
- **Title**: `Two Experts Calculate Your Numbers`
- **Subtitle**: `ZERO CALCULATION ERROR GUARANTEE`
- **Description**: *"Your data is analyzed by one statistician and recalculated from scratch by a second senior reviewer. If a single decimal differs, we fix it before you receive your results."*
- **Specs**:
  - `PRIMARY RUN`: `EXPERT STATISTICIAN`
  - `SECOND AUDIT`: `SENIOR QA RE-CALCULATION` (Orange highlight)
  - `ERROR TOLERANCE`: `0.00% ZERO ERROR`
  - `TABLE FORMAT`: `APA 7TH EDITION` (Orange highlight)

### Step 04: You Get Tables & Plain Speaking Scripts
- **Code**: `STEP 04 OF 04`
- **Badge**: `APA TABLES & DEFENSE SCRIPT`
- **Title**: `You Get Tables & Plain Speaking Scripts`
- **Subtitle**: `READY TO PASTE INTO CHAPTER 4`
- **Description**: *"You receive clean APA tables ready to paste into your manuscript, plus a word-for-word speaking script explaining what every p-value and percentage means during your defense."*
- **Specs**:
  - `MANUSCRIPT TABLES`: `COPY-PASTE READY (APA 7)`
  - `SPEAKING SCRIPT`: `PLAIN-ENGLISH TRANSLATION` (Orange highlight)
  - `SOURCE CODE`: `R / PYTHON / SPSS INCLUDED`
  - `DEFENSE SUPPORT`: `100% READY FOR PANEL` (Orange highlight)

---

## 5. Verification & Testing Checklist
- [ ] TypeScript check (`npm run check-types`) passes with 0 errors.
- [ ] All double slashes (`//`) eliminated from labels, headers, and CAD annotations.
- [ ] Grid enforces uniform `gap-6` (24px) across both columns and rows.
- [ ] SVG CAD paths draw smoothly as cards enter viewport.
- [ ] Precision `rounded-[2px]` applied across cards and schematic viewports.
