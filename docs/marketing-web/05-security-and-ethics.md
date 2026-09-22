# Section 05 — Security, Ethics & Escrow (`Security.tsx`)

> **Phase**: Phase 6  
> **Component**: [apps/web/app/components/sections/Security.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/sections/Security.tsx)  
> **Status**: SPECIFIED / READY FOR REVAMP  
> **Design Standard**: Dashdark Precision Design System (`#010114`, `#01142B`, `rounded-[2px]`, `gap-6`)

---

## 1. Overview & Current State
The Security section reassures students and graduate researchers that their survey data, intellectual property, and personal identity remain 100% confidential and mathematically untampered.

### Current Implementation
- **Section ID**: `id="security"`.
- **Header**: Eyebrow `SECTION // 05 — PRIVACY & INTEGRITY`, title `Your Research Data Is Safe. Guaranteed 100%.`.
- **2x2 Security Grid**: 4 cards (`SEC_01 // ANONYMITY`, `SEC_02 // HONEST MATH`, `SEC_03 // OWNERSHIP`, `SEC_04 // ESCROW`).
- **Footer Status**: Shows compliance line `SYS // STRICT_NDA_LOCK // PII_CLEANSED`.

---

## 2. Audit & Identified Anti-Patterns
1. **Banned Double Slashes**: Used throughout the section kicker (`SECTION // 05`), card codes (`SEC_01 // ANONYMITY`), and footer line (`SYS // STRICT_NDA_LOCK`).
2. **Missing Authoritative Icons**: Each of the 4 security pillars deserves a dedicated Phosphor fill icon (`@phosphor-icons/react` with `weight="fill"`).
3. **Heavy Inline CSS**: Cards, crosshairs, and spec boxes rely on inline styles rather than Tailwind classes.
4. **Color Restraint**: Ensure status chips follow canonical palette accents (Sky Blue, Emerald, Amber, Enterprise Orange) without turning into an uncalibrated rainbow.

---

## 3. Key Upgrade Directives

### A. Iconography per Security Pillar
- Add authoritative Phosphor fill icons (`weight="fill"`, `size={20}`):
  - **Pillar 01 (Anonymity)**: `<ShieldCheck weight="fill" size={20} className="text-sky-400" />`
  - **Pillar 02 (Honest Math)**: `<Scales weight="fill" size={20} className="text-emerald-400" />`
  - **Pillar 03 (Ownership)**: `<LockKey weight="fill" size={20} className="text-amber-400" />`
  - **Pillar 04 (Escrow)**: `<Bank weight="fill" size={20} className="text-[#CC6600]" />`

### B. 2x2 Bento Grid Architecture (`gap-6`)
- Grid container: `grid grid-cols-1 md:grid-cols-2 gap-6`.
- Card container:
  - Substrate: `bg-[#01142B] border border-white/10 rounded-[2px] p-6 sm:p-8 flex flex-col justify-between relative hover:border-white/20 transition-all`.
  - Corner crosshairs: 4 corner `+` markers with `text-white/20 font-mono text-[10px] select-none pointer-events-none`.
- Header bar inside card:
  - Left: Pillar icon + Monospace code (`01 · ANONYMITY`).
  - Right: Clean status chip (`CONFIDENTIAL & PRIVATE`).

### C. Auditable Spec Matrix
- Bottom 2x2 parameter strip:
  ```tsx
  <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/10 font-mono text-xs">
    {item.specs.map((spec, sIdx) => (
      <div key={sIdx} className="flex flex-col gap-0.5 p-2 bg-white/[0.02] border-l border-sky-400/40">
        <span className="text-[10px] text-white/40 uppercase tracking-wider">{spec.label}</span>
        <span className="text-xs text-white font-medium">{spec.value}</span>
      </div>
    ))}
  </div>
  ```

### D. Clean Certification Footer
- Replace robotic double slashes with clean dot dividers:
  ```tsx
  <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/10 mt-12 font-mono text-xs text-white/40">
    <span className="tracking-wider uppercase">
      STRICT NDA PROTECTION · PII CLEANSED · ZERO DATA FABRICATION POLICY
    </span>
    <span className="text-sky-400 font-semibold tracking-wider uppercase">
      ACADEMIC ETHICS VERIFIED ✓
    </span>
  </div>
  ```

---

## 4. Exact Pre-Approved Copywriting

### Pillar 01: 100% Anonymity & Data Privacy
- **Code**: `01 · ANONYMITY` | **Badge**: `CONFIDENTIAL & PRIVATE`
- **Title**: `100% Anonymity & Data Privacy`
- **Subtitle**: `ZERO IDENTITY LEAKAGE`
- **Description**: *"We remove all participant names, student IDs, emails, and school identifiers from your raw data before our analysts begin work. Your participants stay 100% anonymous."*
- **Specs**:
  - `IDENTITY PROTECTION`: `NAMES & IDS REMOVED`
  - `STORAGE SECURITY`: `ENCRYPTED AT REST`

### Pillar 02: We Never Fake or Manipulate Data
- **Code**: `02 · HONEST MATH` | **Badge**: `ACADEMIC HONESTY`
- **Title**: `We Never Fake or Manipulate Data`
- **Subtitle**: `ZERO P-HACKING POLICY`
- **Description**: *"We never fabricate numbers or alter survey data to force statistical significance. If your results show no significant difference, we provide legitimate academic explanations so your panel respects your research integrity."*
- **Specs**:
  - `DATA MANIPULATION`: `0.00 ZERO TOLERANCE`
  - `NULL FINDINGS`: `SCIENTIFICALLY DEFENDED`

### Pillar 03: You Own 100% of Your Research & Code
- **Code**: `03 · OWNERSHIP` | **Badge**: `100% YOUR PROPERTY`
- **Title**: `You Own 100% of Your Research & Code`
- **Subtitle**: `STRICT NON-DISCLOSURE AGREEMENTS`
- **Description**: *"Every JAXIS statistician signs a legally binding Non-Disclosure Agreement (NDA). Your data, analysis scripts, and findings belong 100% to you. We never publish or claim co-authorship."*
- **Specs**:
  - `NDA SIGNED`: `ALL STAFF LEGALLY BOUND`
  - `AUTHORSHIP`: `100% RETAINED BY YOU`

### Pillar 04: Safe Escrow Payment Protection
- **Code**: `04 · ESCROW` | **Badge**: `PAYMENT PROTECTED`
- **Title**: `Safe Escrow Payment Protection`
- **Subtitle**: `VERIFIED BEFORE FINAL RELEASE`
- **Description**: *"Your payment is held safely in escrow upon project agreement. Deliverables are only released once an independent Senior QA Lead validates 100% decimal accuracy."*
- **Specs**:
  - `QUALITY CHECK`: `SENIOR QA STAMP REQUIRED`
  - `PAYMENT GATING`: `ESCROW SECURITY VERIFIED`

---

## 5. Verification & Testing Checklist
- [ ] TypeScript check (`npm run check-types`) passes with 0 errors.
- [ ] Phosphor fill icons (`ShieldCheck`, `Scales`, `LockKey`, `Bank`) rendered on each card.
- [ ] Zero double slashes (`//`) anywhere in the section.
- [ ] Grid rhythm strictly enforces `gap-6` (24px).
- [ ] Precision `rounded-[2px]` applied across cards and chips.
