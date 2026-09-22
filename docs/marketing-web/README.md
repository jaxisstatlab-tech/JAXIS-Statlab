# JAXIS StatLab — Marketing Web Documentation Hub

> **Target Package**: `apps/web` (`https://jaxis-statlab.com`)  
> **Master Design System**: [Dashdark Precision UI](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/.agents/skills/dashdark-precision-ui/SKILL.md) & [AGENTS.md](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/AGENTS.md)  
> **Status**: SECTION-BY-SECTION REVAMP SPECIFICATIONS COMPLETE

This directory contains the authoritative technical documentation and section-by-section revamp specifications for the public marketing website (`apps/web`).

---

## 📑 Section-by-Section Documentation Index

| Phase | Section Document | Component | Key Upgrade Directives |
| :--- | :--- | :--- | :--- |
| **Phase 1** | [**00-navigation-bar.md**](./00-navigation-bar.md) | `Navbar.tsx` | Tailwind conversion, `rounded-[2px]` CTA, Phosphor fill icons (`List`, `X`) for mobile drawer, scroll-reactive blur backdrop. |
| **Phase 2** | [**01-hero-and-globe.md**](./01-hero-and-globe.md) | `Hero.tsx` | Keep 700-particle Fibonacci sphere, upgrade 4 floating HUD callouts with Phosphor icons, dual CTA cluster, zero double slashes. |
| **Phase 3** | [**02-our-approach.md**](./02-our-approach.md) | `Approach.tsx` | 2x2 `#01142B` bento matrix with `gap-6`, animated SVG CAD vector paths, auditable spec matrix, clean step badges (`STEP 01 OF 04`). |
| **Phase 4** | [**03-solutions.md**](./03-solutions.md) | `Solutions.tsx` | Pinned 50px header tabs, Phosphor checkmarks on tags, 4-column feature grid with high-contrast metrics. |
| **Phase 5** | [**04-packages-and-pricing.md**](./04-packages-and-pricing.md) | `Pricing.tsx` | Harmonized `₱` typography, featured plan scanline, DefenseLab module bento split, delivery upgrades stack. |
| **Phase 6** | [**05-security-and-ethics.md**](./05-security-and-ethics.md) | `Security.tsx` | Phosphor fill icons (`ShieldCheck`, `Scales`, `LockKey`, `Bank`), NDA & escrow specs, zero double slashes. |
| **Phase 7** | [**06-faq-accordion.md**](./06-faq-accordion.md) | `FAQ.tsx` | Zero-jank pure CSS grid height interpolation (`grid-template-rows: 0fr -> 1fr`), 3px Enterprise Orange active bar, Phosphor toggle icon. |
| **Phase 8** | [**07-footer-and-cta.md**](./07-footer-and-cta.md) | `FooterCTA.tsx` | Ambient spotlight glow scrub, conversion action button, and live status badge (`● System Operational`). |

---

## 🏛️ Architectural Core & Performance Foundations
- **Framework**: Next.js 16 (App Router, Turbopack, React 19).
- **Physics & Motion**: Lenis smooth scrolling (`lerp: 0.08`, `duration: 1.2`) synced directly to GSAP's ticker, paired with GSAP ScrollTrigger for pinned 3D transitions and card decks.
- **3D Graphics**: Three.js Fibonacci particle sphere (`POINT_COUNT = 700`, `SPHERE_RADIUS = 2.4`) with additive blending and raycasted hover lighting.
- **Substrates & Colors**:
  - Canvas: `#010114`
  - Elevated Cards: `#01142B` & `#011B38`
  - Accent: `#CC6600` (Enterprise Orange)
  - Secondary Accents: `#38BDF8` (Sky Blue), `#10B981` (Verification Emerald)
- **Typography Standard**:
  - Sans-Serif First (`Inter` / `font-sans`) for headings, body copy, and navigation.
  - Monospace (`Disket Mono` / `font-mono`) reserved strictly for IDs, technical counters, and telemetry metrics.
  - Philippine Peso symbol (`₱`): Rendered in Sans-serif weight (`font-sans font-normal opacity-85 select-none inline-block mr-0.5`).
- **Corner Precision**: Strict `rounded-[2px]` across all cards, containers, buttons, and micro-chips.
