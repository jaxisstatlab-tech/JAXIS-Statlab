import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/ssr";
import {
  ADDONS,
  LOWEST_PRICE,
  PLANS,
  peso,
  rangeParts,
} from "../../content/pricing";
import Reveal from "../ui/Reveal";
import { btnGhost, container, heading, kicker, subtitle } from "../ui/styles";

function Peso() {
  return (
    <span className="mr-0.5 inline-block select-none font-sans font-normal opacity-85">
      ₱
    </span>
  );
}

// Home page summary of the packages as typical price ranges. Clients don't pick one: we recommend
// a package after reading their study. The full breakdown and delivery speeds live on /pricing.
export default function PricingPreview() {
  return (
    <section id="pricing" className="relative scroll-mt-16 py-16 lg:py-24">
      <div className={container}>
        <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className={kicker}>Pricing</div>
            <h2 data-split className={heading}>
              Priced for your study, from <Peso />
              {peso(LOWEST_PRICE)}
            </h2>
            <p className={subtitle}>
              You don&apos;t need to pick a package. Send your study and
              we&apos;ll recommend the one that fits your study and budget, with
              a fixed written price within 24 hours.
            </p>
          </div>
          <Link
            href="/pricing"
            data-cta="home-pricing"
            className={`${btnGhost} shrink-0`}
          >
            See price ranges
            <ArrowUpRight size={14} weight="bold" />
          </Link>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-[2px] border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p, i) => (
            <Link
              key={p.name}
              href={`/pricing#plan-${p.id}`}
              className={`group relative flex flex-col transition-colors duration-200 ${
                p.featured ? "bg-[#0A0A18]" : "bg-[#010114] hover:bg-[#07071C]"
              }`}
            >
              <Reveal delay={i * 70} className="flex flex-1 flex-col p-6">
                {p.featured ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-px bg-[#CC6600]"
                  />
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <span className="font-sans text-[15px] font-semibold text-white">
                    {p.name}
                  </span>
                  {p.featured ? (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#FFA040]">
                      Most common
                    </span>
                  ) : null}
                </div>
                <div className="mt-5 font-mono text-xl font-bold tracking-[-0.02em] text-white">
                  <Peso />
                  {rangeParts(p).from}
                  {rangeParts(p).to ? (
                    <>
                      <span className="font-sans font-normal text-white/40">
                        {" "}
                        –{" "}
                      </span>
                      <Peso />
                      {rangeParts(p).to}
                    </>
                  ) : (
                    <span className="font-sans text-base font-medium text-white/60">
                      {" "}
                      and up
                    </span>
                  )}
                </div>
                <p className="mt-1 font-mono text-[11px] text-white/55">
                  Typical range · Ready in {p.standard}
                </p>
                <p className="mt-5 flex-1 border-t border-white/[0.08] pt-4 font-sans text-sm leading-relaxed text-white/65">
                  {p.bestFor}
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 font-mono text-[11px] text-white/50 transition-colors group-hover:text-white">
                  See what&apos;s included
                  <ArrowUpRight
                    size={12}
                    weight="bold"
                    className="transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </span>
              </Reveal>
            </Link>
          ))}
        </div>

        {/* Optional add-ons, summarised; details live on /pricing#add-ons */}
        <Reveal className="mt-4 flex flex-col gap-3 rounded-[2px] border border-white/[0.08] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[12px] text-white/60">
            <span className="text-white/45">Optional add-ons</span>
            {ADDONS.map((a) => (
              <span key={a.id} className="whitespace-nowrap">
                <span className="text-white/85">{a.name}</span> +<Peso />
                {peso(a.fee)}
                {a.unit ? `/${a.unit.replace("per ", "")}` : ""}
              </span>
            ))}
          </p>
          <Link
            href="/pricing#add-ons"
            className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-white/60 transition-colors hover:text-white"
          >
            See add-ons
            <ArrowUpRight size={12} weight="bold" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
