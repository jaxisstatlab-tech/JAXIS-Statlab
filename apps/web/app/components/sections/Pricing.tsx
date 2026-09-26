import { Bank, Check, DeviceMobile, Star } from "@phosphor-icons/react/ssr";
import { REGISTER_URL } from "@/lib/config";
import Reveal from "../ui/Reveal";
import {
  btnGhost,
  btnPrimary,
  cardDesc,
  container,
  heading,
  kicker,
  meta,
  subtitle,
} from "../ui/styles";

const PLANS = [
  {
    plan: "Plan 01 · Survey audit",
    name: "DataCheck",
    price: "1,000",
    bestFor: "Checking your data before you run tests",
    description:
      "For students who just need their survey spreadsheet cleaned, checked for errors, and verified before running tests.",
    features: [
      "Survey data formatting and outlier cleanup",
      "Normality and distribution checks",
      "Survey reliability test (Cronbach's alpha)",
      "Data health sheet for your adviser",
    ],
  },
  {
    plan: "Plan 02 · Demographics & profiles",
    name: "Start Package",
    price: "1,500",
    bestFor: "Describing who answered your survey",
    description:
      "Ideal for demographic profiling, respondent frequencies, percentages, and basic cross-tabulation comparisons.",
    features: [
      "Demographic frequencies and percentages",
      "Cross-tabulations and chi-square comparisons",
      "Ready-to-paste APA 7th edition tables",
      "Plain-English findings write-up for Chapter 4",
    ],
  },
  {
    plan: "Plan 03 · Complete hypothesis testing",
    name: "Core Thesis Package",
    price: "2,400",
    featured: true,
    bestFor: "Most college and master's theses",
    description:
      "The standard choice for college, master's, and Ph.D. theses needing hypothesis testing and full narrative write-ups.",
    features: [
      "Hypothesis tests (t-tests, ANOVA, multiple regression)",
      "Assumption checks and effect sizes",
      "Full plain-English Chapter 4 write-up",
      "Double-checked by 2 independent statisticians",
      "Full analysis scripts (.R, .py, .sps) included",
    ],
  },
  {
    plan: "Plan 04 · Complex modeling",
    name: "Advanced Package",
    price: "3,000+",
    bestFor: "Dissertations and complex models",
    description:
      "For graduate studies and doctoral dissertations requiring advanced multivariate modeling, SEM, or clinical trials.",
    features: [
      "SEM, path analysis, HLM, and survival models",
      "Custom method plan for your defense",
      "Checked by a senior methodologist",
      "Full panel defense question guide",
    ],
  },
];

const ADDONS = [
  {
    name: "DefenseLab",
    detail: "Live mock panel defense",
    price: "250",
    unit: "/ hr",
  },
  { name: "JAXIS Rush", detail: "3-day delivery", price: "300" },
  { name: "JAXIS Express", detail: "48-hour delivery", price: "600" },
  { name: "JAXIS Emergency", detail: "24-hour delivery", price: "1,000" },
];

function Peso({ className = "" }: { className?: string }) {
  return (
    <span
      className={`mr-0.5 inline-block select-none font-sans font-normal opacity-85 ${className}`}
    >
      ₱
    </span>
  );
}

export default function Pricing() {
  return (
    <section id="pricing" className="relative scroll-mt-16 py-16 lg:py-24">
      <div className={container}>
        <Reveal>
          <div className={kicker}>Pricing</div>
          <h2 className={heading}>Clear prices, fixed before you pay.</h2>
          <p className={subtitle}>
            Every study gets its own written scope and price first. Prices below
            are starting points. Your written price is final, with no surprise
            fees later.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-[2px] border border-white/10 bg-white/10 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((p, i) => (
            <div
              key={p.name}
              className={`relative flex flex-col ${p.featured ? "star-border bg-[#01142B]" : "bg-[#010114]"}`}
            >
              {p.featured ? (
                <span className="absolute inset-x-0 top-0 h-[2px] bg-[#CC6600]" />
              ) : null}
              <Reveal
                delay={i * 80}
                className="flex flex-1 flex-col p-6 sm:p-7"
              >
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/55">
                  {p.plan}
                </span>
                <h3 className="mt-3 font-sans text-lg font-medium tracking-[-0.02em] text-white">
                  {p.name}
                </h3>
                <div className="mt-3 h-6">
                  {p.featured ? (
                    <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-[#CC6600]/40 bg-[#CC6600]/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#FFA040]">
                      <Star size={11} weight="fill" />
                      Recommended for thesis defense
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="font-mono text-[11px] uppercase text-white/55">
                    From
                  </span>
                  <span className="font-mono text-3xl font-bold text-white">
                    <Peso className="text-2xl" />
                    {p.price}
                  </span>
                </div>

                <p className="mt-4 font-sans text-[13px] text-white/85">
                  <span className="text-white/55">Best for: </span>
                  {p.bestFor}
                </p>
                <p className={`${cardDesc} mt-2 text-[13px]`}>
                  {p.description}
                </p>

                <ul className="mt-6 flex flex-1 flex-col gap-2.5 border-t border-white/[0.08] pt-6">
                  {p.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 font-sans text-[13px] leading-snug text-white/80"
                    >
                      <Check
                        size={14}
                        weight="bold"
                        className={`mt-0.5 shrink-0 ${p.featured ? "text-[#CC6600]" : "text-white/50"}`}
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                <a
                  href={REGISTER_URL}
                  data-cta={`pricing-${p.name.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`${p.featured ? btnPrimary : btnGhost} mt-8 w-full`}
                >
                  Send your study
                </a>
              </Reveal>
            </div>
          ))}
        </div>

        <Reveal className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-[2px] border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {ADDONS.map((a) => (
            <div
              key={a.name}
              className="flex items-center justify-between gap-4 bg-[#010114] px-5 py-4"
            >
              <div>
                <div className="font-sans text-sm font-medium text-white">
                  {a.name}
                </div>
                <div className={meta}>{a.detail}</div>
              </div>
              <div className="whitespace-nowrap font-mono text-base font-bold text-white">
                <span className="mr-1 font-normal text-white/55">+</span>
                <Peso />
                {a.price}
                {a.unit ? (
                  <span className="ml-1 text-[11px] font-normal text-white/55">
                    {a.unit}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </Reveal>

        <Reveal className="mt-6 flex flex-col gap-4 rounded-[2px] border border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className={meta}>Pay with</span>
            <span className="inline-flex items-center gap-2 font-sans text-sm text-white/85">
              <DeviceMobile
                size={16}
                weight="fill"
                className="text-[#CC6600]"
              />
              GCash
            </span>
            <span className="inline-flex items-center gap-2 font-sans text-sm text-white/85">
              <Bank size={16} weight="fill" className="text-[#CC6600]" />
              Bank transfer
            </span>
          </div>
          <p className="font-sans text-[13px] text-white/60">
            DataCheck and Start are paid upfront. Larger plans start with a
            deposit, and the rest is due on delivery.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
