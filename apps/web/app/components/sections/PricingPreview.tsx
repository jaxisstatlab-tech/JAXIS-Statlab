import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/ssr";
import { PLANS, peso } from "../../content/pricing";
import Reveal from "../ui/Reveal";
import { btnGhost, container, heading, kicker, subtitle } from "../ui/styles";

function Peso() {
  return <span className="mr-0.5 inline-block select-none font-sans font-normal opacity-85">₱</span>;
}

// Home page summary of the plans. The full breakdown and delivery speeds live on /pricing.
export default function PricingPreview() {
  const lowest = Math.min(...PLANS.map((p) => p.base));

  return (
    <section id="pricing" className="relative scroll-mt-16 py-16 lg:py-24">
      <div className={container}>
        <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className={kicker}>Pricing</div>
            <h2 data-split className={heading}>
              Plans from <Peso />
              {peso(lowest)}
            </h2>
            <p className={subtitle}>A fixed written price before you pay anything. No surprise fees later.</p>
          </div>
          <Link href="/pricing" data-cta="home-pricing" className={`${btnGhost} shrink-0`}>
            Compare plans
            <ArrowUpRight size={14} weight="bold" />
          </Link>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-[2px] border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p, i) => (
            <Link
              key={p.name}
              href={`/pricing#plan-${p.id}`}
              className={`group relative flex flex-col transition-colors duration-200 ${
                p.featured ? "bg-[#01142B]" : "bg-[#010114] hover:bg-[#07071C]"
              }`}
            >
              <Reveal delay={i * 70} className="flex flex-1 flex-col p-6">
                {p.featured ? (
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-[#CC6600]" />
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <span className="font-sans text-[15px] font-semibold text-white">{p.name}</span>
                  {p.featured ? (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#FFA040]">Recommended</span>
                  ) : null}
                </div>
                <div className="mt-5 font-mono text-2xl font-bold tracking-[-0.02em] text-white">
                  <Peso />
                  {peso(p.base)}
                  {p.plus ? "+" : ""}
                </div>
                <p className="mt-1 font-mono text-[11px] text-white/55">Ready in {p.standard}</p>
                <p className="mt-5 flex-1 border-t border-white/[0.08] pt-4 font-sans text-sm leading-relaxed text-white/65">
                  {p.bestFor}
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 font-mono text-[11px] text-white/50 transition-colors group-hover:text-white">
                  See what&apos;s included
                  <ArrowUpRight size={12} weight="bold" className="transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </Reveal>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
