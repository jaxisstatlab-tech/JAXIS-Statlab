# Section 07 — Footer & Final CTA (`FooterCTA.tsx`)

> **Phase**: Phase 8  
> **Components**: [apps/web/app/components/sections/FooterCTA.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/sections/FooterCTA.tsx) & [apps/web/app/components/ui/tailwind-css-background-snippet.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/ui/tailwind-css-background-snippet.tsx)  
> **Status**: SPECIFIED / READY FOR REVAMP  
> **Design Standard**: Dashdark Precision Design System (`#010114`, `#CC6600`, `rounded-[2px]`)

---

## 1. Overview & Current State
The FooterCTA section serves as the final conversion point of the landing page, followed by legal navigation links and operational status grounding.

### Current Implementation
- **Section ID**: `id="contact"`, HTML `<footer>` tag.
- **Background**: Ambient radial spotlight (`.bg-glow` rendered by `tailwind-css-background-snippet.tsx`) that fades in dynamically as the user scrolls into the footer.
- **Conversion Hero**: Centered eyebrow, headline (`Stop worrying about defense. Start feeling confident.`), description offering a free 24-hour SOW quote, and `"Get Free Thesis Review"` CTA button.
- **Bottom Bar**: JAXIS logo lockup and legal links (`Privacy Policy`, `Terms of Service`, etc.).

---

## 2. Audit & Identified Anti-Patterns
1. **Heavy Inline CSS**: All padding, text colors, button borders, and hover states use inline objects.
2. **Missing Operational Grounding**: The Dashdark standard calls for an authoritative operational status footer (`● System Operational`).
3. **Button Hover Mutation**: Button hover styles directly mutate DOM style properties via `onMouseEnter`/`onMouseLeave` rather than Tailwind `:hover` and `:active` utilities.
4. **Link Alignment**: Bottom legal links should have clean hover transitions to Analytical Sky (`#38BDF8`).

---

## 3. Key Upgrade Directives

### A. Ambient Spotlight Atmosphere
- Retain `tailwind-css-background-snippet.tsx` with GSAP ScrollTrigger scrub (`opacity: 0 -> 1` between footer `top 90%` and `top 30%`).
- Master canvas background: `#010114` with soft radial ambient glow (`radial-gradient(125% 125% at 50% 10%, var(--bg-primary) 40%, var(--surface-secondary) 100%)`).

### B. High-Impact Conversion Headline & Copy
- Eyebrow tag:
  ```tsx
  <div className="inline-flex items-center gap-2 font-mono text-xs text-[#CC6600] tracking-widest uppercase font-semibold mb-4">
    <span className="w-1.5 h-1.5 bg-[#CC6600] rounded-none" />
    <span>GET YOUR FREE STATISTICAL CONSULTATION</span>
  </div>
  ```
- Headline:
  ```tsx
  <h2 className="font-sans font-light text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-tight mb-6">
    Stop worrying about defense.{" "}
    <span className="text-sky-400 font-normal block sm:inline">
      Start feeling confident.
    </span>
  </h2>
  ```
- Paragraph: `text-sm sm:text-base text-white/70 max-w-lg mx-auto leading-relaxed mb-10`.

### C. Conversion Action Button
- Button styling:
  ```tsx
  <a
    href={REGISTER_URL}
    id="footer-cta"
    className="inline-flex items-center justify-center px-10 py-4 rounded-[2px] bg-[#CC6600] text-white font-sans text-xs font-semibold uppercase tracking-widest hover:bg-[#E67300] transition-all duration-200 active:scale-[0.97] shadow-lg"
  >
    Get Free Thesis Review
  </a>
  ```

### D. Global Footer Navigation & Live Status Bar
- Container: `mt-24 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6`.
- Left (Brand & Status):
  ```tsx
  <div className="flex items-center gap-4">
    <div className="flex items-center gap-2">
      <Image src="/jaxislogo.png" alt="JAXIS Logo" width={20} height={20} className="opacity-80" />
      <span className="font-sans text-xs font-semibold tracking-wider text-white/70 uppercase">
        JAXIS StatLab
      </span>
    </div>
    <span className="text-white/20">|</span>
    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      System Operational
    </span>
  </div>
  ```
- Right (Legal & Compliance):
  ```tsx
  <div className="flex flex-wrap items-center gap-6 font-sans text-xs text-white/40">
    <a href="#" className="hover:text-sky-400 transition-colors">Privacy Policy</a>
    <a href="#" className="hover:text-sky-400 transition-colors">Terms of Service</a>
    <a href="#" className="hover:text-sky-400 transition-colors">Academic Ethics & Anti-P-Hacking</a>
    <a href="#" className="hover:text-sky-400 transition-colors">Escrow Security</a>
  </div>
  ```

---

## 4. Exact Pre-Approved Copywriting

- **Eyebrow**: `GET YOUR FREE STATISTICAL CONSULTATION`
- **Headline**:
  - Line 1: `Stop worrying about defense.`
  - Line 2 (Sky Blue): `Start feeling confident.`
- **Paragraph**:
  > *"Send us your Chapter 1 or raw survey spreadsheet. Our senior statisticians will review your study and give you an exact, custom Scope of Work quote within 24 hours at zero charge."*
- **Primary CTA**: `Get Free Thesis Review`
- **Branding**: `JAXIS StatLab`
- **System Status**: `● System Operational`
- **Legal Links**:
  1. `Privacy Policy`
  2. `Terms of Service`
  3. `Academic Ethics & Anti-P-Hacking`
  4. `Escrow Security`

---

## 5. Verification & Testing Checklist
- [ ] TypeScript check (`npm run check-types`) passes with 0 errors.
- [ ] Ambient spotlight glow scrubs smoothly on scroll into viewport.
- [ ] CTA button features Emil Kowalski tactile compression (`:active:scale-[0.97]`).
- [ ] Live operational pulse indicator renders in Verification Emerald (`#10B981`).
- [ ] Zero double slashes (`//`) in copy or links.
