# Section 00 — Navigation Bar (`Navbar.tsx`)

> **Phase**: Phase 1  
> **Component**: [apps/web/app/components/layout/Navbar.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/web/app/components/layout/Navbar.tsx)  
> **Status**: SPECIFIED / READY FOR REVAMP  
> **Design Standard**: Dashdark Precision Design System (`#010114`, `#CC6600`, `rounded-[2px]`)

---

## 1. Overview & Current State
The Navigation Bar is a client component (`"use client"`) fixed at the top of the viewport (`z-index: 50`) across all desktop and mobile screen sizes.

### Current Implementation
- **Positioning**: Fixed header (`h-16` equivalent, `padding: 0.85rem 1.5rem`, `max-w-7xl mx-auto`).
- **Brand Lockup**: `/jaxislogo.png` (26px height) with text `JAXIS` in white and `StatLab` in Enterprise Orange (`#CC6600`).
- **Links (6)**: `#approach`, `#solutions`, `#pricing`, `#security`, `#faq`, `#contact`.
- **Action Cluster**: Secondary `"Sign In"` link (`LOGIN_URL`) and primary `"Get Started"` CTA (`REGISTER_URL`).
- **Mobile Menu**: Full-width slide-down drawer toggled via raw SVG hamburger button.

---

## 2. Audit & Identified Anti-Patterns
1. **Heavy Inline CSS**: Almost all layout styling, padding, colors, and transitions use inline `style={{ ... }}` rather than idiomatic Tailwind CSS classes.
2. **Ad-hoc DOM Mutations**: Hover effects mutate element styles directly via `(e.target as HTMLAnchorElement).style.color = ...` rather than Tailwind `:hover` utility classes.
3. **Raw SVG Icons**: Mobile drawer toggle uses ad-hoc inline SVGs with manual path coordinates instead of standard Phosphor fill icons.
4. **Missing Tactile Feedback**: CTA buttons lack Emil Kowalski tactile compression (`:active:scale-[0.97]`).
5. **Border Radius Inconsistency**: Standard calls for crisp `rounded-[2px]` across all buttons, inputs, and interactive surfaces.

---

## 3. Key Upgrade Directives

### A. Tailwind Conversion & Substrate
- Replace all inline styles with Tailwind utility classes.
- Fixed container: `fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-md`.
- Dynamic background:
  - Top state (`scrollY <= 20`): `bg-[#010114]/40 border-b border-white/[0.05]`.
  - Scrolled state (`scrollY > 20`): `bg-[#010114]/90 border-b border-white/10 shadow-sm`.

### B. Brand Identity Lockup
- Precision alignment: Next.js `<Link href="/" className="flex items-center gap-2 select-none group">`.
- Image: `/jaxislogo.png` (`width={24} height={24}`, `priority`).
- Wordmark: `font-sans text-sm font-semibold tracking-wider uppercase text-white group-hover:opacity-95 transition-opacity`.
  - Prefix: `JAXIS ` (`text-white`)
  - Accent: `StatLab` (`text-[#CC6600]`)

### C. Desktop Navigation Links
- Container: `<ul className="hidden md:flex items-center gap-8 list-none m-0 p-0">`.
- Links:
  ```tsx
  <a
    href={link.href}
    className="font-sans text-xs font-medium uppercase tracking-wider text-white/70 hover:text-sky-400 transition-colors duration-200"
  >
    {link.label}
  </a>
  ```

### D. Action Buttons
- **Sign In Link**:
  ```tsx
  <a
    href={LOGIN_URL}
    className="font-sans text-xs font-medium uppercase tracking-wider text-white/70 hover:text-white px-3 py-1.5 transition-colors duration-200"
  >
    Sign In
  </a>
  ```
- **Get Started Primary CTA**:
  ```tsx
  <a
    href={REGISTER_URL}
    className="font-sans text-xs font-semibold uppercase tracking-widest text-white border border-[#CC6600]/60 bg-[#CC6600]/15 hover:bg-[#CC6600] hover:border-[#CC6600] px-5 py-2 rounded-[2px] transition-all duration-200 active:scale-[0.97] shadow-sm"
  >
    Get Started
  </a>
  ```

### E. Mobile Navigation Drawer & Phosphor Icons
- Import Phosphor fill icons: `import { List, X } from "@phosphor-icons/react"`.
- Mobile toggle button:
  ```tsx
  <button
    onClick={() => setMenuOpen((v) => !v)}
    aria-label="Toggle navigation menu"
    className="md:hidden p-2 text-white hover:text-sky-400 transition-colors focus:outline-none"
  >
    {menuOpen ? <X size={24} weight="fill" /> : <List size={24} weight="fill" />}
  </button>
  ```
- Drawer container: Grounded with `#01142B` / `bg-[#010114]/98`, border `border-b border-white/10`, padding `p-6 flex flex-col gap-4`.

---

## 4. Exact Pre-Approved Copywriting

| Element | Text | Destination |
|---|---|---|
| Brand | `JAXIS StatLab` | `/` |
| Nav Link 1 | `Our Approach` | `#approach` |
| Nav Link 2 | `Solutions` | `#solutions` |
| Nav Link 3 | `Packages` | `#pricing` |
| Nav Link 4 | `Security` | `#security` |
| Nav Link 5 | `FAQ` | `#faq` |
| Nav Link 6 | `Contact` | `#contact` |
| Ghost Action | `Sign In` | `LOGIN_URL` (`https://app.jaxis-statlab.com/login`) |
| Primary CTA | `Get Started` | `REGISTER_URL` (`https://app.jaxis-statlab.com/register`) |

---

## 5. Verification & Testing Checklist
- [ ] TypeScript check (`npm run check-types`) passes with 0 errors.
- [ ] Header transitions smoothly between transparent and blurred navy upon scrolling past 20px.
- [ ] Hover states trigger cleanly via Tailwind classes without direct DOM mutation.
- [ ] Mobile hamburger toggle opens/closes drawer with `<List weight="fill" />` and `<X weight="fill" />`.
- [ ] Button radius conforms strictly to `rounded-[2px]`.
