# Homepage audit: task list

Audit of the homepage (`apps/web/app/page.tsx`) only, done 2026-09-30 from desktop (1440px) and phone (390px)
screenshots of the dev server plus a read of the section code.

**Scores:** visual craft 8.5/10 · conversion and trust 5–6/10 · overall about 7/10.

Tick each box when it ships. Tasks marked **Needs content** can't be finished in code alone; they need real
information from the team first.

---

## Critical: costing sign-ups

### 1. Main button sends new visitors to Log in
- [x] Point every "Send your study" button to sign-up (`REGISTER_URL`) instead of `LOGIN_URL`, or to one app route
      that handles both new and returning users. *(Done 2026-09-30 via `SEND_STUDY_URL` in `lib/config.ts`.)*
  - Hero: `app/components/sections/Hero.tsx`
  - Services header: `app/components/sections/Services.tsx`
  - How it works closing buttons: `app/components/ui/HowItWorksStory.tsx`
  - Phone sticky bar: `app/components/layout/MobileCTA.tsx`
  - Final CTA: `app/components/sections/FinalCTA.tsx`
- [x] Use one label for the main action everywhere. Today there are four labels for two destinations: "Send your
      study", "Register", "Create a free account", "Create an account". *(Now "Send your study" everywhere; the final
      CTA's second link is "Ask us a question" to `/contact`.)*
- [x] Keep "Log in" only in the navbar.
- [ ] Follow-up outside the homepage: About, Contact, Pricing, the start band, and the 404 page still send "Send your
      study" to `LOGIN_URL`. Switch them to `SEND_STUDY_URL`.

**Done when:** a first-time visitor clicking any main button lands on a sign-up form, and the main action has one
name across the page.

### 2. No proof anywhere on the homepage (**Needs content**)
- [x] Add a sample deliverable to the homepage. `app/components/sections/SampleOutput.tsx` already exists but isn't
      used in `page.tsx`. *(Done 2026-09-30: redesigned and placed after the orange band. A fanned paper stack with a
      plain-English findings summary in front, the five files from the FAQ, and "Who checks your numbers".)*
- [x] Show one or two analysts with name, photo, and credentials (content already on the About page). *(Jobelle
      S. Sorino-Simblante and Jerome P. Gallego featured, plus the five expert-team headshots linking to /about.
      Change the names in `FEATURED` in `SampleOutput.tsx` to feature someone else.)*
- [ ] Set `NEXT_PUBLIC_SAMPLE_OUTPUT_URL` to show a "Download a full sample" button (hidden while empty).
- [x] Add real testimonials to `TESTIMONIALS` in `app/content/site.ts` (8 messages added 2026-09-30; section
      redesigned with a featured quote, English notes for Cebuano quotes, and a "Defended" mark).
- [ ] Confirm every named student agreed to have their name shown publicly (Data Privacy Act). Blank the `name`
      field for anyone who didn't; the card then shows "Anonymous thesis group".
- [ ] Optional: a small proof strip under the hero (studies delivered, schools served). Only with real numbers.

**Done when:** a visitor sees at least one concrete piece of evidence (sample output, real people, or real quotes)
before the pricing section.

### 3. Academic integrity question not answered on the page
- [x] Add a short FAQ block (3–4 items) just before the final CTA, reusing entries from `FAQS` in
      `app/content/site.ts`: *(Done 2026-09-30 in `page.tsx` with the existing `FAQ` component, split layout,
      "Questions students ask first", school question open by default.)*
  - "Is working with JAXIS allowed by my school?"
  - "Do you write Chapter 4 for me?"
  - "What if my results are not significant?"
  - "Is my data kept private?"
- [x] Link "See all questions" to `/contact#faq`. *(New `moreHref` prop on `FAQ.tsx`; the "Email us" link stays.)*

**Done when:** the top objections are answered on the homepage without leaving it.

---

## High priority

### 4. Cookie banner covers the page
- [x] Replace the large centered card with a compact card in the bottom-left on desktop and a slim bar on phones
      (`app/components/layout/ConsentBanner.tsx`). *(Done 2026-09-30: 75px bar on a 390px phone, 8.8% of the
      screen; 352px card on desktop. Copy now says what Accept really turns on: analytics only.)*
- [x] Make sure it never hides the phone sticky CTA (`MobileCTA.tsx`); stack them or hide the CTA until consent is
      answered. *(The sticky CTA steps aside while the bar is up and slides back after a choice.)*

**Done when:** on a 390px phone the banner takes no more than about 12% of the screen.

### 5. First-visit intro delays the hero by 1.25 seconds
- [x] Remove the intro splash (`app/components/layout/Intro.tsx`), or cut it to 400ms or less. *(Redesigned
      2026-09-30 instead: the mark assembles from square points, then dissolves at 720ms while the hero is already
      rising underneath. About 1.1s in all, down from about 1.7s.)*
- [x] Remove the `+ 1250ms` hero delay in `globals.css` (`html:not([data-intro="skip"]) .hero-in`). *(Now
      `+ 600ms`, overlapping the intro's fade-out. Consent prompt now waits 2s instead of 2.8s.)*
- [ ] Re-measure LCP on a production build (`next build && next start`). Dev-server LCP was 4.0–4.8s.

**Done when:** hero text is visible within 1s on a production build.

### 6. How it works takes about half the page
- [x] Shorten the pinned scroll (`VH_PER_UNIT` in `HowItWorksStory.tsx`, 70 → 42; closing hold 0.8 → 0.6).
      *(Done 2026-09-30: pinned scroll 4.06 → 2.35 screens; section 4,554px → 3,017px at 900px tall.)*
- [x] Remove the empty gap above the section before it pins. *(Pinned layout now top-aligned; the entry gap is
      the normal section spacing, about 200px, down from about 280px.)*
- [x] Consider a "Skip to pricing" link inside the pinned area. *(Added "Skip steps ↓" beside the progress bar; it
      scrolls to the next section.)*

*Superseded 2026-09-30: How it works was rebuilt as an unpinned pipeline in the Services grid style
(`HowItWorksFlow.tsx`); the particle canvas and pinned scroll were removed, so it is now a normal-height section.*

**Done when:** the section is no more than about 30% of total page scroll (was 4,554px of 8,945px, about 51%).
*Now 3,017px of 8,791px, 34% of page height, or 27% of the scrollable distance once the pinned viewport itself is
left out. Close enough to call done; lowering `VH_PER_UNIT` to 35 would reach about 32% if it still feels long.*

### 7. Hypothesis diagram unreadable on phones
- [x] Give the Hypothesis testing art a phone layout (stacked tests or larger scale) in
      `app/components/ui/ServiceArt.tsx` (`TestingArt`). Labels shrink to about 6px today. *(Done 2026-09-30: when
      the card is under 680px wide (phones and the 4-column grid on 1024–1280px screens) it shows the same flow as
      real text in a 2×2 grid; wider cards keep the diagram. Smallest label now 11px at 390, 768, 1024, 1280 and
      1440px.)*
- [ ] Spotted while testing at 1024px: the Data cleaning footer ("Normality passed / Reliability α = .87") wraps
      awkwardly in the narrow card.

**Done when:** every label in the diagram is at least 11px on a 390px screen.

---

## Medium priority

### 8. Small text fails contrast
- [ ] Raise all text under 14px to at least `text-white/55` (WCAG AA). Known offenders:
  - "Numbers shown are examples." (`Services.tsx`)
  - Card index numbers `01`–`07` (`Services.tsx`)
  - How it works progress labels and canvas caption (`HowItWorksStory.tsx`)
  - "Scroll to follow a study" hint (`HowItWorksStory.tsx`)
  - Pricing card footnotes and add-on labels (`PricingPreview.tsx`)
  - Footer small print (`Footer.tsx`)

### 9. Too much monospace body text
- [ ] Decide whether to override the `AGENTS.md` rule (bento card descriptions in `font-mono`). If yes, switch
      service card descriptions, section subtitles, and the pricing intro to `font-sans`; keep mono for data,
      labels, and IDs.

### 10. Repeated copy
- [x] "defense-ready" is used as the headline of two sections (How it works and the orange band). Rewrite one.
      *(Band is now "Always know where your study is", 2026-09-30.)*
- [ ] "Checked twice" / "two analysts" appears about seven times. Keep it in the hero and the Services card; cut
      the rest.
- [x] The orange band (`PipelineBand.tsx`) repeats the tracker idea from How it works. Give it one new job
      (for example: what you see inside your account). *(Now "Your account": tracker, chat, price and payments,
      files.)*

### 11. Navbar doesn't help on the homepage
- [ ] Change nav links to Services, How it works, Pricing, FAQ (anchors on the homepage), with About and Contact
      kept in the footer (`app/components/layout/Navbar.tsx`).
- [ ] Drop the "Home" pill that shows as active while already on the homepage.

### 12. No quick way to ask a question (**Needs content**)
- [ ] Set `NEXT_PUBLIC_MESSENGER_URL` and `NEXT_PUBLIC_FACEBOOK_URL` (both empty today) so chat links appear.
- [ ] Consider a small "Ask us on Messenger" link near the final CTA.

---

## Design system, visuals, and motion

The page already has a signature: **data as small square points on deep navy, lit by one orange light** (the hero
pixel grid, the How it works particles, the dot field over the final horizon). Generic sites feel generic because
every section invents its own style and everything fades up the same way. The rules for this page:

- **Three loud moments, everything else quiet.** The set pieces are the hero grid, the How it works particles, and
  the final horizon. Sections between them get no ambient motion.
- **One orange, used as light.** It marks what matters in a view, never decoration.
- **Square points are the illustration language.** New visuals should be built from them or sit quietly beside them.
- **Motion explains, it doesn't decorate.** Something moves because a step happens, a result forms, or the user did
  something.

Counts below come from a grep of the homepage components and `globals.css` on 2026-09-30.

### 13. Five illustration styles on one page
Hero pixel grid, Services SVG line diagrams, How it works particle dot-matrix, the tracker UI mock with a heavy drop
shadow (orange band), and the glowing horizon arc. Square points already appear in three of them.
- [ ] Write the motif into `apps/app/docs/design-system.md` (or a web design note) so new sections follow it.
- [ ] Services art: build the chart marks (histogram bars, donut ring, diagram nodes) from square points or a
      square-point texture, so the grid reads as part of the same family as the hero and How it works.
- [ ] Tracker mock (`TrackerFeed.tsx`): drop the heavy shadow; sit it on navy with the same hairline border as other
      cards.

**Done when:** a screenshot of any section could only belong to this site.

### 14. The same chart appears twice
The Data cleaning card (`ServiceArt.tsx`, `CleaningArt`) shows a histogram with a bell curve, and How it works step
04 forms a histogram with a bell curve.
- [ ] Give Data cleaning its own picture: something only cleaning shows, like a grid of survey answers where
      outliers and inconsistent answers get **flagged** (never changed; see the FAQ promise about not altering data).

### 15. Colours are hard-coded, not tokens
Five oranges (`#CC6600` ×16, `#FF8A1F` ×5, `#FFA040` ×3, `#FFA75A` ×1, `#E67300` ×1) and seven navy surfaces
(`#010114` ×24, `#0A0A18` ×5, `#0D0D20`, `#0D0D1B`, `#0C0C1E`, `#07071C`, `#050513`), plus more as `rgb()` literals
in the canvas code (`particleStage.ts`, `CtaField.tsx`, `HorizonTracker.tsx`).
- [ ] Add tokens to `@theme` in `globals.css`: `ink` (page), `surface-1`, `surface-2`, `line`, `brand`
      (`#CC6600`), `brand-bright` (`#FF8A1F`), `brand-soft` (`#FFA75A`).
- [ ] Replace literals in the homepage sections with the tokens; read the same values from CSS variables in the
      canvas code.

**Done when:** a grep for `#[0-9A-F]{6}` in `app/components/sections` returns nothing.

### 16. Four different card treatments
Joined hairline grid (Services, Pricing), separate bordered cards (Testimonials), a floating shadowed panel
(tracker), and a full-bleed orange band. Radius also mixes `rounded-[2px]` (×15) and `rounded-[1px]` (×3).
- [ ] Make the joined hairline grid the one card system; move Testimonials onto it (keep the featured quote larger).
- [ ] One radius: `rounded-[2px]`.

### 17. Boxed icon tiles in the orange band break the house rule
`PipelineBand.tsx` wraps each feature icon in a `h-8 w-8` tinted box. `AGENTS.md` rule 21 bans boxed icon tiles.
- [x] Use inline fill icons beside the text, like the rest of the site. *(Done in the band redesign.)*

### 18. No type scale
Big headings use five sizes: hero `5rem`, final CTA `2.75rem`, How it works title and step titles `2.5rem`, other
sections `2rem`. The hero kicker has side rules; every other kicker doesn't.
- [ ] Define three display sizes (hero, section, step) and use only those.
- [ ] One kicker style everywhere.

### 19. Motion has no vocabulary, and everything fades up
Eight easing curves are in use (`cubic-bezier(0.23,1,0.32,1)` ×26, `cubic-bezier(0.77,0,0.175,1)` ×8, `ease-out` ×5,
`var(--ease-out)` ×4, `ease-in-out` ×2, `cubic-bezier(0.65,0,0.35,1)`, `cubic-bezier(0.16,1,0.3,1)`, GSAP
`expo.out`). Durations run from 300ms to 900ms ad hoc. 15 elements use `<Reveal>` (fade up 18px) and 6 headings use
the SplitText line reveal, so every block enters the same way. That uniform fade-up is the most template-looking
thing on the page.
- [ ] Define motion tokens in `globals.css`: `--ease-enter` (0.23, 1, 0.32, 1), `--ease-move` (0.77, 0, 0.175, 1),
      and three durations (fast 150ms, base 400ms, slow 700ms). Replace ad hoc values.
- [ ] Use `<Reveal>` for section headers and the one key visual per section only, not every card.
- [ ] Keep the SplitText heading reveal for the hero and final CTA only, so it feels like an event.

**Done when:** scrolling the page, no two consecutive sections enter the same way, and nothing enters just to
enter.

### 20. Four different cursor effects
`HeroPixels` (cell trail), `SpotlightGrid` (hairline glow), `CtaField` (dot bloom), and `HorizonTracker` (rim glint)
all react to the cursor, each differently.
- [ ] Keep it to the two set pieces: hero and final CTA. Make them the same idea (orange light follows the
      cursor), sharing one implementation.
- [ ] Remove the Services hairline glow, or keep it only if it matches that same light.

### 21. Three different scroll feels
Native wheel steps everywhere, an eased canvas in How it works, and GSAP scrub for the single parallax element (the
tracker card, `data-parallax="0.2"`).
- [x] One scroll clock: Lenis drives `ScrollTrigger` (`ScrollFx.tsx`), off for reduced motion. **Mouse and trackpad
      only (2026-10-10):** on touch screens it used to take over the fling (`syncTouch`), which made phone scrolling feel
      heavy; phones now keep native scrolling.
- [x] **Phones scroll freely (2026-10-10):** no pinned sections on phones. The Services and Testimonials rows are
      plain swipe rows (CSS snap, next card peeking in) with a dot indicator (`SwipeDots`: "2 / 7 · Swipe for more",
      tap a dot to jump); "How it works" stacks its five steps below 1024px, each scene playing as it scrolls into view
      (the pin is desktop only). The home page went from about 16,900px to 13,000px tall on a 390px phone. Links that
      were 16–17px tall (footer, "See all questions", "Email us", "Ask us a question", "Details", "Cookie settings")
      are 40px tall on phones.
- [x] Either give parallax a system (all hero-grade visuals drift at the same depth) or remove the lone parallax.
      *(Removed from the tracker card.)*
- [ ] `<Reveal>` fires at `rootMargin: -8%`, so on a fast scroll cards show up blank (seen in the Services bottom
      row in the audit screenshots). Trigger earlier, or don't hide cards at all.

### 22. Section transitions are hard cuts
The page cuts from navy into the full orange band and back; there's an empty gap before How it works pins; the
final CTA has `pb-72` of mostly empty space.
- [ ] One section rhythm (for example `py-24 lg:py-32`) with a consistent divider or surface change between
      sections.
- [x] Hand off into the pinned How it works: the particle stage should already be visible as the section enters.
      *(No longer pinned; not applicable.)*

### 23. Blur overlay repaints on every scroll frame
`GradualBlur` stacks four fixed `backdrop-filter` layers (1px, 2px, 4px, 8px) over the bottom 80px of every screen.
It repaints on every scroll frame over the canvas and pixel grid, and dims whatever sits at the bottom of the view.
- [ ] Remove it, or limit it to the hero.

### 24. Logo is a 291 KB image
`public/jaxislogo.png` is a 1920px PNG (291 KB). `Intro.tsx` loads it with a plain `<img>`, so there's no
optimization on the first paint.
- [ ] Make an SVG logo (the shape is already traced in `particleStage.ts`, `drawMark`) and use it in the navbar,
      footer, and intro.

---

## Low priority / polish

- [ ] Meta description in `app/layout.tsx` says "thesis assistance", which conflicts with the "not a
      thesis-writing service" stance in the FAQ. Reword.
- [ ] The Core Thesis package on the pricing data says "Full plain-English Chapter 4 write-up"
      (`app/content/pricing.ts`), which also conflicts with the FAQ. Reword to "plain-English write-up of your
      findings".
- [x] Orange band is the only full-bleed saturated block and breaks the page's calm. Try a dark treatment with
      orange accents. *(Now a lifted navy panel `#06061A` with hairline edges, faint grid, and a soft orange glow.)*
- [ ] Final CTA repeats the hero's promises line word for word. Replace with a reassurance (reply time, a contact
      option).
- [ ] Check JavaScript size on a production build. Dev server loaded about 1.4 MB across 33 scripts (not
      representative of production).
- [ ] Remove unused code: `app/components/ui/DecryptedText.tsx`, `BELL_SHAPES`, `STEP_*`, and `FILE_*` exports in
      `app/components/ui/Iso.tsx` (check `SpotlightGrid.tsx` is still used by Services before deleting anything
      else).

---

## Suggested order

1. Task 1: every main button to sign-up, one label. *(code only)*
2. Tasks 4 and 5: compact cookie banner, remove intro delay. *(code only)*
3. Tasks 6 and 7: shorten How it works, fix the diagram on phones. *(code only)*
4. Task 3: integrity FAQ on the homepage. *(code only, content exists)*
5. Task 2: proof section. *(needs real content)*
6. Tasks 15 and 19: colour and motion tokens. Do these before any more visual work so everything after uses them.
7. Tasks 20–23: one cursor idea, one scroll clock, section rhythm, remove the blur overlay.
8. Tasks 13, 14, 16–18: illustration family, card system, type scale.
9. Tasks 8–12 and 24, then polish.
