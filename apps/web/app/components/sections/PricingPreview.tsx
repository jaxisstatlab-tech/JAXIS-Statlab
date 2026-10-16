import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react/ssr";
import { ADDONS, LOWEST_PRICE, PLANS, SPEEDS, peso } from "../../content/pricing";
import Reveal from "../ui/Reveal";
import { btnGhost, container, heading, kicker, subtitle } from "../ui/styles";

function Peso() {
  return <span className="mr-0.5 inline-block select-none font-sans font-normal opacity-85">₱</span>;
}

// Price scale for the range chart. The top leaves room for "and up" on the open-ended plan.
const SCALE_MIN = 500;
const SCALE_MAX = 4000;
const TICKS = [500, 1000, 1500, 2000, 2500, 3000, 3500];
const pos = (v: number) => ((v - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;

// Home page summary: typical price ranges drawn as intervals on one peso scale, since clients don't pick a
// package (we recommend one and send a fixed written price). The full breakdown lives on /pricing.
export default function PricingPreview() {
  const speeds = ADDONS.filter((a) => a.group === "Faster delivery");
  const practice = ADDONS.filter((a) => a.group === "Practice");

  return (
    <section id="pricing" className="relative scroll-mt-16 py-16 lg:py-24">
      <div className={container}>
        <Reveal className="reveal-quiet flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="stagger">
            <div className={kicker}>Pricing</div>
            <h2 className={heading}>
              Priced for your study, from <Peso />
              {peso(LOWEST_PRICE)}
            </h2>
            <p className={subtitle}>
              You don&apos;t need to pick a package. Send your study and we&apos;ll recommend the one that fits, with a fixed
              written price within 24 hours.
            </p>
          </div>
          <div className="stagger shrink-0">
            <Link href="/pricing" data-cta="home-pricing" className={btnGhost} style={{ transitionDelay: "270ms" }}>
              See full pricing
              <ArrowUpRight size={14} weight="bold" />
            </Link>
          </div>
        </Reveal>

        {/* Panel intro (.price-intro in globals.css): the empty panel, then the scale, then each package row, then add-ons. */}
        <Reveal className="reveal-quiet price-intro">
        <div className="pi-panel mt-10 overflow-hidden rounded-[2px] border border-white/[0.08] bg-[#0A0A18]">
          {/* Scale header */}
          <div className="hidden grid-cols-[minmax(0,15rem)_minmax(0,1fr)_7rem] items-end gap-8 border-b border-white/[0.08] px-8 pb-3 pt-5 md:grid">
            <span className="pi-fade font-mono text-[10.5px] uppercase tracking-wider text-white/55">Package</span>
            <div className="relative h-4">
              {TICKS.map((t, k) => (
                <span
                  key={t}
                  className="pi-fade absolute -translate-x-1/2 font-mono text-[10.5px] tabular-nums text-white/55"
                  style={{ left: `${pos(t)}%`, ["--k" as string]: k + 1 }}
                >
                  {t === 500 ? "500" : t === 3500 ? "3.5k+" : `${t / 1000}k`}
                </span>
              ))}
            </div>
            <span className="pi-fade text-right font-mono text-[10.5px] uppercase tracking-wider text-white/55" style={{ ["--k" as string]: TICKS.length + 1 }}>
              Ready in
            </span>
          </div>

          <Reveal as="ul" className="price-rows divide-y divide-white/[0.06]">
            {PLANS.map((p, i) => {
              const from = pos(p.min);
              const to = p.max === null ? 100 : pos(p.max);
              return (
                <li key={p.id} style={{ ["--i" as string]: i }}>
                  <Link
                    href={`/pricing#plan-${p.id}`}
                    className={`group grid grid-cols-1 gap-3 px-6 py-5 transition-colors duration-200 sm:px-8 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_7rem] md:items-center md:gap-8 ${
                      p.featured ? "bg-white/[0.025] hover:bg-white/[0.04]" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="pi-in min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span className="font-sans text-[15px] font-medium text-white">{p.name}</span>
                        {p.featured ? (
                          <span className="font-mono text-[10px] uppercase tracking-wider text-[#FFA040]">Most common</span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 font-sans text-[13px] leading-snug text-white/55">{p.bestFor}</p>
                    </div>

                    {/* The interval: whiskered bar on the shared peso scale, with the range written beside it */}
                    <div className="pi-in relative" style={{ ["--j" as string]: 1 }}>
                      <div className="relative h-7">
                        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-white/[0.07]" />
                        {TICKS.map((t) => (
                          <span
                            key={t}
                            aria-hidden="true"
                            className="absolute top-1/2 hidden h-2.5 w-px -translate-y-1/2 bg-white/[0.08] md:block"
                            style={{ left: `${pos(t)}%` }}
                          />
                        ))}
                        <span
                          aria-hidden="true"
                          className="price-bar absolute top-1/2 h-[6px] -translate-y-1/2 origin-left rounded-[1px]"
                          style={{
                            left: `${from}%`,
                            width: `${to - from}%`,
                            // Draws once its row has arrived (see .price-intro).
                            transitionDelay: `${760 + i * 130}ms`,
                            background:
                              p.max === null
                                ? `linear-gradient(90deg, ${p.featured ? "#CC6600" : "rgba(255,255,255,0.55)"}, transparent)`
                                : p.featured
                                  ? "#CC6600"
                                  : "rgba(255,255,255,0.45)",
                            boxShadow: p.featured ? "0 0 18px rgba(204,102,0,0.45)" : undefined,
                          }}
                        >
                          <span className="absolute -top-[5px] left-0 h-4 w-px bg-current" style={{ color: p.featured ? "#FF8A1F" : "rgba(255,255,255,0.7)" }} />
                          {p.max !== null ? (
                            <span className="absolute -top-[5px] right-0 h-4 w-px" style={{ background: p.featured ? "#FF8A1F" : "rgba(255,255,255,0.7)" }} />
                          ) : null}
                        </span>
                      </div>
                      <div
                        className="mt-1 whitespace-nowrap font-mono text-[13px] font-bold tabular-nums text-white md:absolute md:-top-4 md:mt-0"
                        style={from > 60 ? { right: `${100 - to}%` } : { left: `${from}%` }}
                      >
                        <Peso />
                        {peso(p.min)}
                        {p.max !== null ? (
                          <>
                            <span className="font-sans font-normal text-white/40"> – </span>
                            <Peso />
                            {peso(p.max)}
                          </>
                        ) : (
                          <span className="font-sans font-normal text-white/55"> and up</span>
                        )}
                      </div>
                    </div>

                    <div className="pi-in flex items-center justify-between gap-3 md:justify-end" style={{ ["--j" as string]: 2 }}>
                      <span className="font-mono text-xs text-white/70 md:hidden">Ready in</span>
                      <span className="flex items-center gap-2 font-mono text-xs text-white/80">
                        {p.standard.replace("working days", "days")}
                        <ArrowRight
                          size={12}
                          weight="bold"
                          className="text-white/0 transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-white/70"
                        />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </Reveal>

          {/* Add-ons */}
          <div
            className="grid grid-cols-1 gap-4 border-t border-white/[0.08] px-6 py-5 sm:px-8 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_7rem] lg:items-center lg:gap-8"
            style={{ ["--i" as string]: PLANS.length }}
          >
            <div className="pi-in">
              <div className="font-sans text-[15px] font-medium text-white">Optional add-ons</div>
              <p className="mt-0.5 font-sans text-[13px] text-white/55">Picked when you accept your price.</p>
            </div>
            <ul className="flex flex-wrap gap-2">
              {speeds.map((a, j) => (
                <li key={a.id} style={{ ["--j" as string]: 1 + j * 0.5 }} className="pi-in whitespace-nowrap rounded-[2px] border border-white/10 px-3 py-1.5 font-mono text-xs text-white/70">
                  <span className="text-white">{a.name}</span> {SPEEDS.find((s) => s.id === a.id)?.time} ·{" "}
                  <span className="text-white">
                    +<Peso />
                    {peso(a.fee)}
                  </span>
                </li>
              ))}
              {practice.map((a, j) => (
                <li key={a.id} style={{ ["--j" as string]: 1 + (speeds.length + j) * 0.5 }} className="pi-in whitespace-nowrap rounded-[2px] border border-white/10 px-3 py-1.5 font-mono text-xs text-white/70">
                  <span className="text-white">{a.name}</span> ·{" "}
                  <span className="text-white">
                    +<Peso />
                    {peso(a.fee)}
                  </span>
                  {a.unit ? ` ${a.unit}` : ""}
                </li>
              ))}
            </ul>
            <Link
              href="/pricing#add-ons"
              className="pi-in inline-flex min-h-10 items-center gap-1.5 font-mono text-xs text-white/70 transition-colors hover:text-white sm:min-h-0 lg:justify-self-end"
              style={{ ["--j" as string]: 1 + (speeds.length + practice.length) * 0.5 }}
            >
              Details
              <ArrowUpRight size={12} weight="bold" />
            </Link>
          </div>
        </div>
        </Reveal>
      </div>
    </section>
  );
}
