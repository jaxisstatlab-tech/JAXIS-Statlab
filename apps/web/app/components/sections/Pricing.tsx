"use client";

import { useState } from "react";
import { Bank, Check, ChalkboardTeacher, DeviceMobile, Star } from "@phosphor-icons/react";
import { LOGIN_URL } from "@/lib/config";
import Reveal from "../ui/Reveal";
import { btnGhost, btnPrimary, container, heading, kicker, subtitle } from "../ui/styles";

type Plan = {
  name: string;
  base: number;
  plus?: boolean;
  standard: string;
  bestFor: string;
  features: string[];
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "DataCheck",
    base: 1000,
    standard: "3–7 working days",
    bestFor: "Checking your data before you run tests",
    features: [
      "Survey data formatting and outlier cleanup",
      "Normality and distribution checks",
      "Reliability test (Cronbach's alpha)",
      "Data health sheet for your adviser",
    ],
  },
  {
    name: "Start Package",
    base: 1500,
    standard: "3–7 working days",
    bestFor: "Describing who answered your survey",
    features: [
      "Demographic frequencies and percentages",
      "Cross-tabulations and chi-square",
      "Ready-to-paste APA 7th edition tables",
      "Plain-English findings for Chapter 4",
    ],
  },
  {
    name: "Core Thesis Package",
    base: 2400,
    standard: "3–7 working days",
    bestFor: "Most college and master's theses",
    featured: true,
    features: [
      "Hypothesis tests (t-tests, ANOVA, regression)",
      "Assumption checks and effect sizes",
      "Full plain-English Chapter 4 write-up",
      "Analysis scripts (.R, .py, .sps) included",
    ],
  },
  {
    name: "Advanced Package",
    base: 3000,
    plus: true,
    standard: "2–3 weeks",
    bestFor: "Dissertations and complex models",
    features: [
      "SEM, path analysis, HLM, and survival models",
      "Custom method plan for your defense",
      "Checked by a senior methodologist",
      "Full panel defense question guide",
    ],
  },
];

const SPEEDS = [
  { id: "standard", label: "Standard", fee: 0, time: null },
  { id: "rush", label: "Rush", fee: 300, time: "3 days" },
  { id: "express", label: "Express", fee: 600, time: "48 hours" },
  { id: "emergency", label: "Emergency", fee: 1000, time: "24 hours" },
] as const;

const INCLUDED = [
  "Checked by 2 statisticians",
  "Fixed written price first",
  "Free fixes within scope",
  "Files your adviser can open",
];

const peso = (n: number) => n.toLocaleString("en-PH");

function Peso({ className = "" }: { className?: string }) {
  return <span className={`mr-0.5 inline-block select-none font-sans font-normal opacity-85 ${className}`}>₱</span>;
}

export default function Pricing() {
  const [speedId, setSpeedId] = useState<(typeof SPEEDS)[number]["id"]>("standard");
  const speed = SPEEDS.find((s) => s.id === speedId)!;

  return (
    <section id="pricing" className="relative scroll-mt-16 py-16 lg:py-24">
      <div className={container}>
        <Reveal className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className={kicker}>Pricing</div>
            <h2 data-split className={heading}>
              Clear prices, fixed before you pay.
            </h2>
            <p className={subtitle}>
              Prices below are starting points. Your written price is final, with no surprise fees later.
            </p>
          </div>

          <div className="shrink-0">
            <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-white/55">Delivery speed</div>
            <div role="radiogroup" aria-label="Delivery speed" className="inline-flex flex-wrap rounded-[2px] border border-white/10 bg-[#010D1F] p-1">
              {SPEEDS.map((s) => {
                const active = s.id === speedId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSpeedId(s.id)}
                    className={`rounded-[2px] px-3 py-2 font-sans text-[13px] transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] sm:px-4 ${
                      active ? "bg-white/[0.1] font-medium text-white" : "text-white/55 hover:text-white"
                    }`}
                  >
                    {s.label}
                    {s.fee ? <span className="ml-1.5 font-mono text-[10px] text-white/45">+{peso(s.fee)}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((p, i) => {
            const price = p.base + speed.fee;
            return (
              <Reveal
                key={p.name}
                delay={i * 80}
                className={`relative flex flex-col rounded-[2px] border p-6 sm:p-7 ${
                  p.featured ? "star-border border-[#CC6600]/40 bg-[#01142B] xl:-my-4 xl:py-11" : "border-white/10 bg-[#010114]"
                }`}
              >
                {p.featured ? (
                  <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-[2px] bg-[#CC6600] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                    <Star size={11} weight="fill" />
                    Recommended for thesis defense
                  </span>
                ) : null}

                <h3 className="font-sans text-lg font-semibold tracking-[-0.02em] text-white">{p.name}</h3>

                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="font-mono text-[11px] uppercase text-white/55">From</span>
                  <span key={`${p.name}-${price}`} className="price-swap font-mono text-[2.25rem] font-bold leading-none tracking-[-0.02em] text-white">
                    <Peso className="text-[1.75rem]" />
                    {peso(price)}
                    {p.plus ? "+" : ""}
                  </span>
                </div>
                <p className="mt-2 font-mono text-[11px] text-white/55">
                  Ready in <span className="text-white/85">{speed.time ?? p.standard}</span>
                </p>

                <p className="mt-5 border-t border-white/[0.08] pt-5 font-sans text-sm text-white/85">
                  <span className="text-white/55">Best for </span>
                  {p.bestFor.charAt(0).toLowerCase() + p.bestFor.slice(1)}
                </p>

                <ul className="mt-4 flex flex-1 flex-col gap-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 font-sans text-[13px] leading-snug text-white/75">
                      <Check size={14} weight="bold" className={`mt-0.5 shrink-0 ${p.featured ? "text-[#CC6600]" : "text-white/45"}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <a
                  href={LOGIN_URL}
                  data-cta={`pricing-${p.name.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`${p.featured ? btnPrimary : btnGhost} mt-8 w-full`}
                >
                  Send your study
                </a>
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-10 flex flex-col gap-4 border-y border-white/10 py-5 lg:flex-row lg:items-center lg:justify-between">
          <span className="font-mono text-[11px] uppercase tracking-wider text-white/55">Every plan includes</span>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-center gap-2 font-sans text-[13px] text-white/80">
                <Check size={13} weight="bold" className="text-[#CC6600]" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="mt-5 flex flex-col gap-4 font-sans text-[13px] text-white/60 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-2 text-white/80">
              <DeviceMobile size={15} weight="fill" className="text-white/55" />
              GCash
            </span>
            <span className="inline-flex items-center gap-2 text-white/80">
              <Bank size={15} weight="fill" className="text-white/55" />
              Bank transfer
            </span>
            <span className="text-white/50">DataCheck and Start are paid upfront. Larger plans pay a deposit, then the rest on delivery.</span>
          </div>
          <span className="inline-flex items-center gap-2 text-white/80">
            <ChalkboardTeacher size={15} weight="fill" className="text-[#CC6600]" />
            Add a DefenseLab mock panel for
            <span className="font-mono font-bold text-white">
              <Peso />
              250
            </span>
            <span className="text-white/50">/ hr</span>
          </span>
        </Reveal>

        {speed.fee ? (
          <p className="mt-4 font-mono text-[11px] text-white/45">
            Faster delivery depends on your study&apos;s scope and is confirmed in your written price.
          </p>
        ) : null}
      </div>
    </section>
  );
}
