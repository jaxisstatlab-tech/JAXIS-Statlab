# Section 04 — Packages & Pricing (`Pricing.tsx`)

> **Phase**: Phase 5  
> **Component**: [apps/web/app/components/sections/Pricing.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/sections/Pricing.tsx)  
> **Status**: SPECIFIED / READY FOR REVAMP  
> **Design Standard**: Dashdark Precision Design System (`#010114`, `#01142B`, `rounded-[2px]`, `gap-6`)

---

## 1. Overview & Current State
The Packages & Pricing section displays 4 tiered service packages in a 2x2 grid, followed by an offerings bento split featuring the DefenseLab module and 3 expedited delivery upgrades.

### Current Implementation
- **Section ID**: `id="pricing"`.
- **Header**: Eyebrow `SECTION // 04 — PACKAGES & CUSTOM QUOTES`, heading `Transparent Rates. Custom-Quoted Scopes.`.
- **2x2 Packages Grid**:
  - `DataCheck` (₱1,000)
  - `Start Package` (₱1,500)
  - `Core Thesis Package ★` (₱2,400) — Featured with scanline effect
  - `Advanced Package` (₱3,000+)
- **Secondary Offerings Area**:
  - DefenseLab Module (`₱250/hr`)
  - 3 Turnaround upgrades (`JAXIS Rush` ₱300, `JAXIS Express` ₱600, `JAXIS Emergency` ₱1,000)
- **Footer Bar**: Shows compliance tag `RULE_QUO_01 & RULE_QUO_02 COMPLIANT ✓`.

---

## 2. Audit & Identified Anti-Patterns
1. **Banned Double Slashes**: Used extensively in package catalog tags (`PLAN 01 // SURVEY AUDIT`, `PHP // BY QUOTE`) and system status bars (`SYS // CUSTOM_QUOTED_PER_STUDY`).
2. **Philippine Peso Typography**: Raw `₱` symbols must follow the workspace typography standard: Sans-serif font (`font-sans font-normal opacity-85 select-none inline-block mr-0.5`) alongside bold monospace numerals, never a heavy monospace fallback glyph.
3. **Heavy Inline CSS**: Grid containers, margins, borders, and typography use inline style objects.
4. **Shouting Shorthand**: `[ RECOMMENDED_FOR_THESIS_DEFENSE ]` tag should be a refined Enterprise Orange status badge.

---

## 3. Key Upgrade Directives

### A. Philippine Peso (`₱`) Typography Harmonization
- Use standard typography format:
  ```tsx
  <div className="flex items-baseline gap-1 my-4">
    <span className="text-xs font-mono text-white/40 uppercase">Starts at</span>
    <div className="font-mono font-bold text-3xl sm:text-4xl text-white flex items-baseline">
      <span className="font-sans font-normal opacity-85 select-none text-2xl sm:text-3xl mr-0.5">₱</span>
      <span>{pkg.price}</span>
    </div>
    <span className="text-xs font-mono text-white/50 uppercase ml-1">PHP · By Quote</span>
  </div>
  ```

### B. 2x2 Packages Grid (`gap-6`)
- Grid container: `grid grid-cols-1 md:grid-cols-2 gap-6`.
- Package Card:
  - Standard: `bg-[#01142B] border border-white/10 rounded-[2px] p-6 sm:p-8 flex flex-col justify-between hover:border-white/20 transition-all`.
  - Featured (`Core Thesis Package`): `bg-[#011B38] border border-[#CC6600]/60 shadow-lg relative overflow-hidden`.
  - Active Recommendation Badge:
    ```tsx
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#CC6600]/15 border border-[#CC6600]/40 text-[#CC6600] font-mono text-[10px] font-bold uppercase rounded-[2px]">
      <Star weight="fill" size={11} className="text-[#CC6600]" />
      <span>Recommended For Thesis Defense</span>
    </span>
    ```

### C. Offerings Bento Split (DefenseLab & Delivery Upgrades)
- Grid container: `grid grid-cols-1 lg:grid-cols-12 gap-6 pt-12 border-t border-white/10`.
- Left Card (DefenseLab, 7 cols): `lg:col-span-7 bg-[#01142B] border border-white/10 rounded-[2px] p-6 sm:p-8 flex flex-col justify-between`.
- Right Card (Expedited Delivery Tiers, 5 cols): `lg:col-span-5 flex flex-col gap-4`.
  - 3 rows with `bg-[#01142B] border border-white/10 rounded-[2px] p-4 flex justify-between items-center hover:border-white/20 transition-colors`.

### D. CTA Buttons
- Action button on cards:
  ```tsx
  <a
    href="#contact"
    className="w-full text-center py-3 rounded-[2px] border border-white/20 hover:border-[#CC6600] hover:bg-[#CC6600]/10 text-white font-sans text-xs font-semibold uppercase tracking-wider transition-all active:scale-[0.97] mt-6"
  >
    Request Custom Quote
  </a>
  ```

---

## 4. Exact Pre-Approved Copywriting

### Package 01: DataCheck
- **Catalog**: `PLAN 01 · SURVEY AUDIT`
- **Price**: Starts at `₱1,000` (`PHP · BY QUOTE`)
- **Description**: *"For students who just need their survey spreadsheet cleaned, checked for errors, and verified before running tests."*
- **Features**:
  - Survey Data Formatting & Outlier Cleanup
  - Normality & Distribution Verification
  - Survey Reliability Test (Cronbach's Alpha)
  - Official Data Health Sheet for Your Adviser

### Package 02: Start Package
- **Catalog**: `PLAN 02 · DEMOGRAPHICS & PROFILES`
- **Price**: Starts at `₱1,500` (`PHP · BY QUOTE`)
- **Description**: *"Ideal for demographic profiling, respondent frequencies, percentages, and basic cross-tabulation comparisons."*
- **Features**:
  - Demographic Frequencies & Percentages
  - Cross-tabulations & Chi-Square Comparisons
  - Ready-to-Paste APA 7th Edition Tables
  - Plain-English Findings Writeup for Chapter 4
  - Custom SOW Quote (No Scope Creep)

### Package 03: Core Thesis Package ★ (Featured)
- **Catalog**: `PLAN 03 · COMPLETE HYPOTHESIS TESTING`
- **Badge**: `RECOMMENDED FOR THESIS DEFENSE`
- **Price**: Starts at `₱2,400` (`PHP · BY QUOTE`)
- **Description**: *"The standard choice for College, Master's, and Ph.D. theses needing hypothesis testing and full narrative writeups."*
- **Features**:
  - Hypothesis Tests (T-Tests, ANOVA, Multiple Regression)
  - Assumption Audits & Statistical Effect Sizes
  - Full Plain-English Chapter 4 Narrative Report
  - Double-Checked by 2 Independent Statisticians
  - Full Analysis Scripts (.R / .py / .sps) Included

### Package 04: Advanced Package
- **Catalog**: `PLAN 04 · COMPLEX MODELING`
- **Price**: Starts at `₱3,000+` (`PHP · CUSTOM SCOPE`)
- **Description**: *"For graduate studies and doctoral dissertations requiring advanced multivariate modeling, SEM, or clinical trials."*
- **Features**:
  - Advanced SEM, Path Analysis, HLM & Survival Models
  - Custom Methodological Blueprint for Your Defense
  - Senior Methodologist Lead Verification
  - Comprehensive Panel Defense Question Guide
  - Free Academic Revision Guarantee on Scope

### Add-ons & Delivery Upgrades
- **DefenseLab Module**: `₱250/hr` — Live 1-on-1 simulated panel defense with a Senior JAXIS Statistician.
- **JAXIS Rush**: `₱300` — 3-day guaranteed turnaround upgrade.
- **JAXIS Express**: `₱600` — 48-hour expedited delivery upgrade.
- **JAXIS Emergency**: `₱1,000` — 24-hour urgent overnight delivery.

---

## 5. Verification & Testing Checklist
- [ ] TypeScript check (`npm run check-types`) passes with 0 errors.
- [ ] The `₱` symbol is rendered with Sans-serif optical weight alongside monospace numerals.
- [ ] Zero double slashes (`//`) anywhere in the section.
- [ ] Featured card displays `<Star weight="fill" />` with Enterprise Orange accent.
- [ ] Grid maintains a strict `gap-6` (24px) spacing standard.
