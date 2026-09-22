# Section 06 — FAQ Accordion (`FAQ.tsx`)

> **Phase**: Phase 7  
> **Component**: [apps/web/app/components/sections/FAQ.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/sections/FAQ.tsx)  
> **Status**: SPECIFIED / READY FOR REVAMP  
> **Design Standard**: Dashdark Precision Design System (`#010114`, `#01142B`, `rounded-[2px]`)

---

## 1. Overview & Current State
The FAQ section answers key questions about turnaround times, free revision policies, student anonymity, non-significant result handling, thesis defense readiness, and software code deliverables.

### Current Implementation
- **Section ID**: `id="faq"`.
- **Header**: Eyebrow `SECTION // 06 — FREQUENTLY ASKED QUESTIONS`, title `Clear Answers. Zero Ambiguity.`.
- **Accordion Mechanism**:
  - Vertical list of 6 items managed via `openIndex` state.
  - Active item styled with `#011030` background and 3px orange vertical bar on left.
  - Expanding body uses CSS grid height animation (`grid-template-rows: 0fr -> 1fr`).
  - Toggle icon: Unicode `+` rotated 45 degrees into an `×`.

---

## 2. Audit & Identified Anti-Patterns
1. **Banned Double Slashes**: Used in section kicker (`SECTION // 06`) and category tags (`// TIMELINE & TURNAROUND`).
2. **Raw Text Toggle Glyph**: The `+` character is raw monospace text rather than a refined Phosphor fill icon (`<CaretDown weight="fill" />` or `<Plus weight="fill" />`).
3. **Heavy Inline CSS**: Accordion row containers, borders, paddings, and font sizes rely on inline styles.
4. **Color & Focus Styling**: Active cards should use the canonical Dashdark precision border (`border-sky-400/40` or `border-[#CC6600]/40`) without blurry glows.

---

## 3. Key Upgrade Directives

### A. Section Header & Tag
- Header tag:
  ```tsx
  <div className="flex items-center gap-2 font-mono text-xs text-[#CC6600] tracking-widest uppercase font-semibold">
    <span className="w-1.5 h-1.5 bg-[#CC6600] rounded-none" />
    <span>COMMON QUESTIONS · TRANSPARENT ANSWERS</span>
  </div>
  ```
- Headline:
  ```tsx
  <h2 className="font-sans font-light text-3xl sm:text-5xl text-white tracking-tight leading-tight">
    Clear Answers.{" "}
    <span className="text-sky-400 font-normal">Zero Ambiguity.</span>
  </h2>
  ```

### B. Pure CSS Grid Height Interpolation
- Maintain the zero-jank CSS grid interpolation pattern:
  ```tsx
  <div
    className={`grid transition-[grid-template-rows] duration-300 ease-out ${
      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
    }`}
  >
    <div className="overflow-hidden">
      <div className="px-6 pb-6 pt-2 border-t border-white/[0.06]">
        <span className="font-mono text-[10px] text-sky-400 tracking-wider uppercase font-semibold block mb-2">
          {faq.category}
        </span>
        <p className="font-sans text-sm sm:text-base text-white/70 leading-relaxed m-0">
          {faq.answer}
        </p>
      </div>
    </div>
  </div>
  ```

### C. Accordion Item Anatomy & Iconography
- Inactive Card: `bg-[#01142B]/75 border border-white/10 rounded-[2px] hover:border-white/20 transition-all`.
- Active Card: `bg-[#011B38] border border-sky-400/40 rounded-[2px] relative overflow-hidden`.
- Active Left Accent Bar:
  ```tsx
  {isOpen && <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-[#CC6600]" />}
  ```
- Toggle Icon using Phosphor:
  ```tsx
  <CaretDown
    weight="fill"
    size={18}
    className={`transition-transform duration-300 shrink-0 ${
      isOpen ? "rotate-180 text-[#CC6600]" : "text-white/40"
    }`}
  />
  ```

---

## 4. Exact Pre-Approved Copywriting

### Question 01: Turnaround Times
- **Index**: `01` | **Category**: `TIMELINE & TURNAROUND`
- **Question**: *"How fast will I receive my analysis?"*
- **Answer**: *"Standard thesis and survey packages (DataCheck, Start, Core) take 3 to 7 business days. Complex structural equation modeling (SEM) or medical dissertations take 2 to 3 weeks. If you are on a tight deadline, our 24-Hour and 48-Hour Rush delivery upgrades guarantee you submit on time."*

### Question 02: Revision Guarantee
- **Index**: `02` | **Category**: `FREE REVISION GUARANTEE`
- **Question**: *"What if my thesis adviser or panel asks for revisions?"*
- **Answer**: *"Revisions are 100% free. If your panel, adviser, or committee asks for changes, clarifications, or alternate tables within your study's original scope, our senior statisticians will revise your deliverables promptly at zero additional cost."*

### Question 03: Data & Identity Privacy
- **Index**: `03` | **Category**: `PRIVACY & NON-DISCLOSURE`
- **Question**: *"Is my survey data and student identity kept confidential?"*
- **Answer**: *"Yes, completely. We scrub all respondent names, emails, and student ID numbers from your files before our analysts ever see them. Every statistician operates under legally binding NDAs, and your research findings remain 100% your own intellectual property."*

### Question 04: Non-Significant Results ($p > .05$)
- **Index**: `04` | **Category**: `ETHICAL INTEGRITY & P-VALUES`
- **Question**: *"What happens if my results are not statistically significant (p > .05)?"*
- **Answer**: *"Non-significant results are a normal part of real academic research! We never fake data or manipulate numbers. Instead, we provide rigorous theoretical explanations and sample justifications so you can defend your findings to your panel with complete academic credibility."*

### Question 05: Defense Script & Preparedness
- **Index**: `05` | **Category**: `DEFENSE READINESS`
- **Question**: *"I know nothing about statistics. How will I defend my numbers?"*
- **Answer**: *"That is exactly why students choose JAXIS! You don't just get raw numbers — you receive a plain-English speaking script that explains what each table means in simple words, plus the exact answers to the top 20 questions your panel is likely to ask. You can also book our 1-on-1 mock defense session to practice."*

### Question 06: Final Output Files
- **Index**: `06` | **Category**: `DELIVERABLES & CODE`
- **Question**: *"What exact files will I receive upon delivery?"*
- **Answer**: *"You receive: (1) Publication-ready APA 7th Edition tables ready to paste into Chapter 4, (2) A plain-English narrative report explaining your findings, (3) The cleaned dataset file (.sav / .csv), and (4) The full statistical software code (R, Python, or SPSS) so your study is 100% reproducible."*

---

## 5. Verification & Testing Checklist
- [ ] TypeScript check (`npm run check-types`) passes with 0 errors.
- [ ] Zero double slashes (`//`) in headers, tags, and category chips.
- [ ] Phosphor fill icon `<CaretDown weight="fill" />` rotates smoothly on open/close.
- [ ] Pure CSS grid height transition executes smoothly with zero layout jank.
- [ ] Precision `rounded-[2px]` and 3px Enterprise Orange active strip render accurately.
