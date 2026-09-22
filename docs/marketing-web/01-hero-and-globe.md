# Section 01 — Hero & 3D Globe (`Hero.tsx` & `ParticleGlobe.tsx`)

> **Phase**: Phase 2  
> **Components**: [apps/web/app/components/sections/Hero.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/sections/Hero.tsx) & [apps/web/app/components/ui/ParticleGlobe.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/ui/ParticleGlobe.tsx)  
> **Status**: SPECIFIED / READY FOR REVAMP  
> **Design Standard**: Dashdark Precision Design System (`#010114`, `#CC6600`, `#38BDF8`, `rounded-[2px]`)

---

## 1. Overview & Current State
The Hero Section is the primary visual centerpiece of the website. It combines an interactive WebGL Three.js particle globe, 4 floating telemetry HUD callouts, a high-impact headline, and a 3-phase pinned GSAP ScrollTrigger sequence.

### Current Implementation
- **Container**: `100dvh` pinned container with dark substrate `#010114`.
- **Background**: `<ParticleGlobe />` rendering 700 particles on a Fibonacci sphere with pointer-reactive raycasting lighting.
- **HUD Telemetry**: 4 absolute-positioned blocks (`[01] DATA_AUDIT`, `[02] TEST_SELECTION`, `[03] APA_TABLES`, `[04] QA_VERIFIED`) with text-based checkmarks.
- **Center Content**: Headline (`h1`, `clamp(2.6rem, 7vw, 5.5rem)`), subtitle (`0.82rem`), and `"Get Started →"` CTA.
- **Scroll Reveal**: Centered paragraph overlay de-blurring word-by-word as the globe scales up during scroll.

---

## 2. Audit & Identified Anti-Patterns
1. **Heavy Inline CSS**: All coordinate layouts, font styles, and container dimensions use inline style objects.
2. **Text-based Glyphs**: Checkmarks in HUD snippets use raw unicode `✓` rather than standard Phosphor fill icons (`<CheckCircle weight="fill" />`).
3. **Cursor Parallax DOM Mutation**: The mousemove event sets `headline.style.transform` directly, causing possible subpixel jitter.
4. **Shouting Bracket Notation**: Annotations like `[01] DATA_AUDIT` can be elevated into clean Dashdark terminal status chips.
5. **Double Slashes in Code & Comments**: Banned double slash (`//`) syntax in user-facing HUD lines must be eliminated.

---

## 3. Key Upgrade Directives

### A. Three.js Particle Globe Preservation
- Retain the high-performance 700-particle Fibonacci sphere (`POINT_COUNT = 700`, `SPHERE_RADIUS = 2.4`).
- Maintain the double-texture canvas rendering (core dot texture + wide halo texture with `THREE.AdditiveBlending`).
- Keep `globeScrollState` proxy for seamless zero-rerender state exchange with GSAP ScrollTrigger.

### B. Dashdark Precision Floating HUD Callouts
- Transform the 4 telemetry blocks into architectural terminal chips:
  - Surface: `bg-[#01142B]/85 backdrop-blur-md border border-white/10 p-3 rounded-[2px] shadow-sm`.
  - Iconography: Phosphor fill icons (`<CheckCircle weight="fill" size={13} className="text-emerald-400" />`).
  - Index: Monospace uppercase label (`01 · DATA AUDIT`, `02 · TEST SELECTION`, etc.).
  - Hairline border indicators on left or right matching card alignment.

### C. Main Headline & Content Hierarchy
- Headline styling:
  ```tsx
  <h1 className="font-sans font-light text-4xl sm:text-6xl lg:text-7xl leading-[1.08] tracking-tight text-white text-center">
    Defend Your Thesis.{" "}
    <span className="text-[#CC6600] font-normal block sm:inline">
      With Confidence.
    </span>
  </h1>
  ```
- Subtitle: Clean `font-sans text-sm sm:text-base text-white/70 max-w-lg mx-auto mt-6 leading-relaxed`.

### D. Dual CTA Cluster
- Replace single CTA with an authoritative dual-action group:
  1. **Primary Action**:
     ```tsx
     <a
       href={REGISTER_URL}
       className="inline-flex items-center gap-2 px-7 py-3.5 rounded-[2px] bg-[#CC6600] text-white font-sans text-xs font-semibold uppercase tracking-widest hover:bg-[#E67300] transition-all active:scale-[0.97] shadow-sm"
     >
       <span>Get Started</span>
       <span>→</span>
     </a>
     ```
  2. **Secondary Ghost Action**:
     ```tsx
     <a
       href="#approach"
       className="inline-flex items-center gap-2 px-7 py-3.5 rounded-[2px] border border-white/20 hover:border-white/40 text-white/80 hover:text-white font-sans text-xs font-semibold uppercase tracking-widest transition-all active:scale-[0.97]"
     >
       Explore Methodology
     </a>
     ```

### E. GSAP 3-Phase Choreography
- **Phase 1 (0% to 25%)**: Smooth fade-out of hero text and HUD chips (`y: -35`, `opacity: 0`).
- **Phase 2 (15% to 75%)**: Globe scales to `1.6`, rotates `Math.PI * 1.2`, and lifts vertically while statement words de-blur (`blur(3px) -> blur(0px)`).
- **Phase 3 (75% to 100%)**: Overlay statement dissolves upward into Section 02 (`Approach.tsx`).

---

## 4. Exact Pre-Approved Copywriting

### Floating HUD Callouts
1. **Top-Left (`01 · DATA AUDIT`)**:
   - Line 1: `Raw survey data validated`
   - Line 2: `Zero missing entries · Clean ✓`
2. **Top-Right (`02 · TEST SELECTION`)**:
   - Line 1: `Correct statistical tests chosen`
   - Line 2: `Matched to research objectives ✓`
3. **Bottom-Left (`03 · APA TABLES`)**:
   - Line 1: `APA 7th Edition formatted`
   - Line 2: `Copy-paste ready for Chapter 4 ✓`
4. **Bottom-Right (`04 · VERIFICATION`)**:
   - Line 1: `Double-checked by 2 statisticians`
   - Line 2: `100% ready for panel defense ✓`

### Main Content & Scroll Overlay
- **Headline**: `Defend Your Thesis. With Confidence.`
- **Caption**: `"We analyze your survey data, format your APA 7th Edition tables, and give you the exact speaking script to defend your results with zero fear."`
- **Primary CTA**: `Get Started →`
- **Secondary CTA**: `Explore Methodology`
- **Scroll Phase 2 Statement**:
  > *"JAXIS helps students and researchers pass their thesis defense. We clean your survey data, calculate your statistical tests, format your APA tables, and double-check every number with two independent statisticians — so you walk into your panel defense with zero fear."*

---

## 5. Verification & Testing Checklist
- [ ] TypeScript check (`npm run check-types`) passes with 0 errors.
- [ ] Three.js canvas initializes cleanly with WebGL fallback guard.
- [ ] ScrollTrigger pins smoothly without viewport jump or layout drag.
- [ ] 4 HUD callouts render with `<CheckCircle weight="fill" />` and precision `rounded-[2px]`.
- [ ] Headline renders without monospace double slashes or awkward wrapping.
