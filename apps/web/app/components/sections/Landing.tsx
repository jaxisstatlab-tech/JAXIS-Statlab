import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "@phosphor-icons/react/ssr";
import { SEND_STUDY_URL } from "@/lib/config";
import { PLANS } from "../../content/pricing";
import { DELIVERABLES, HOW_STEPS, type Testimonial } from "../../content/site";
import Reveal from "../ui/Reveal";
import { btnGhost, btnPrimary, cardDesc, cardTitle, container, heading, kicker, pageTitle, subtitle } from "../ui/styles";

// Building blocks for the search landing pages (thesis statistics, Bukidnon): a plain hero that says exactly what
// the page is about, then the same facts as the rest of the site (steps, files, prices, real testimonials).

const band = "border-t border-white/[0.06]";
const card = "rounded-[2px] border border-white/10 bg-[#07071C]";

export function LandingHero({ kicker: k, title, intro, facts }: { kicker: string; title: string; intro: ReactNode; facts: string[] }) {
  return (
    <section className="relative overflow-hidden pb-16 pt-28 lg:pb-20 lg:pt-36">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(40%_70%_at_15%_0%,rgba(204,102,0,0.22),transparent_72%)]"
      />
      <div className={`${container} relative`}>
        <p className={kicker}>{k}</p>
        <h1 className={`${pageTitle} max-w-4xl`}>{title}</h1>
        <p className="mt-5 max-w-3xl font-sans text-base leading-relaxed text-white/70 sm:text-lg">{intro}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={SEND_STUDY_URL} data-cta="landing-send" className={`${btnPrimary} h-11 px-6`}>
            Get Your Price
            <ArrowRight size={15} weight="bold" />
          </a>
          <Link href="/pricing" className={`${btnGhost} h-11 px-6`}>
            See Prices
          </Link>
        </div>
        <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2">
          {facts.map((f) => (
            <li key={f} className="flex items-center gap-2 font-mono text-xs text-white/70">
              <Check size={13} weight="bold" className="text-[#CC6600]" />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** A titled section with a grid of cards. */
export function LandingCards({
  id,
  kicker: k,
  title,
  description,
  items,
}: {
  id?: string;
  kicker: string;
  title: string;
  description?: string;
  items: Array<{ title: string; body: string; meta?: string }>;
}) {
  return (
    <section id={id} className={`${band} py-16 lg:py-24`}>
      <div className={container}>
        <Reveal>
          <p className={kicker}>{k}</p>
          <h2 className={heading}>{title}</h2>
          {description ? <p className={subtitle}>{description}</p> : null}
        </Reveal>
        <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <li key={it.title} className={`${card} flex flex-col gap-2 p-6`}>
              {it.meta ? <span className="font-mono text-[11px] uppercase tracking-wider text-white/45">{it.meta}</span> : null}
              <h3 className={cardTitle}>{it.title}</h3>
              <p className={cardDesc}>{it.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function LandingSteps() {
  return (
    <LandingCards
      kicker="How it works"
      title="From your data to a defense-ready analysis"
      description="Five clear steps. You always know what happens next."
      items={HOW_STEPS.map((s, i) => ({ meta: `${i + 1} · ${s.time}`, title: s.title, body: s.body }))}
    />
  );
}

export function LandingFiles() {
  return (
    <LandingCards
      kicker="What you get"
      title="The files you take to your adviser and panel"
      items={DELIVERABLES.map((d) => ({ meta: d.format, title: d.name, body: d.body }))}
    />
  );
}

export function LandingPrices() {
  return (
    <section className={`${band} py-16 lg:py-24`}>
      <div className={container}>
        <Reveal>
          <p className={kicker}>Prices</p>
          <h2 className={heading}>Thesis statistics from ₱{PLANS[0]!.min.toLocaleString("en-PH")}</h2>
          <p className={subtitle}>
            Typical ranges. Send your study and we reply within 24 hours with a fixed written price for your exact scope. Pay by GCash or bank
            transfer.
          </p>
        </Reveal>
        <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <li key={p.id} className={`${card} flex flex-col gap-2 p-6`}>
              <h3 className={cardTitle}>{p.name}</h3>
              <p className="font-mono text-sm text-white">
                ₱{p.min.toLocaleString("en-PH")}
                {p.max ? `–₱${p.max.toLocaleString("en-PH")}` : " and up"}
              </p>
              <p className={cardDesc}>{p.bestFor}</p>
            </li>
          ))}
        </ul>
        <Link href="/pricing" className="mt-8 inline-flex min-h-10 items-center gap-1.5 font-mono text-xs text-white/70 hover:text-white sm:text-sm">
          See what each package includes
          <ArrowRight size={13} weight="bold" />
        </Link>
      </div>
    </section>
  );
}

export function LandingTestimonials({ title, items }: { title: string; items: Testimonial[] }) {
  if (items.length === 0) return null;
  return (
    <section className={`${band} py-16 lg:py-24`}>
      <div className={container}>
        <Reveal>
          <p className={kicker}>From our clients</p>
          <h2 className={heading}>{title}</h2>
        </Reveal>
        <ul className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {items.map((t, i) => (
            <li key={i} className={`${card} flex flex-col gap-4 p-6`}>
              <blockquote className="font-sans text-[15px] leading-relaxed text-white/80">&ldquo;{t.quote}&rdquo;</blockquote>
              {t.translation ? <p className="font-sans text-sm italic leading-relaxed text-white/55">{t.translation}</p> : null}
              <p className="mt-auto font-mono text-xs text-white/55">
                {[t.name, t.program, t.school].filter(Boolean).join(" · ")}
                {t.defended ? " · Defended" : ""}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Links between the landing pages and the rest of the site (helps visitors and search engines). */
export function LandingLinks({ links }: { links: Array<{ href: string; label: string }> }) {
  return (
    <section className={`${band} py-10`}>
      <div className={`${container} flex flex-wrap items-center gap-x-6 gap-y-2`}>
        <span className="font-mono text-xs uppercase tracking-[0.15em] text-white/45">Also see</span>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="inline-flex min-h-10 items-center gap-1.5 font-sans text-sm text-white/75 hover:text-white">
            {l.label}
            <ArrowRight size={12} weight="bold" />
          </Link>
        ))}
      </div>
    </section>
  );
}
