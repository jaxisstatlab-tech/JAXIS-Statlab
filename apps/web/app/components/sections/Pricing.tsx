"use client";

import React from "react";
import Link from "next/link";
import { Check } from "@phosphor-icons/react";

interface PricingTier {
  id: string;
  name: string;
  badge?: string;
  price: string;
  pricePrefix?: string;
  priceSuffix?: string;
  sublabel: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  highlighted: boolean;
}

const TIERS: PricingTier[] = [
  {
    id: "starter",
    name: "STARTER",
    price: "1,000",
    pricePrefix: "₱",
    sublabel: "DATASET HEALTH CHECK",
    features: [
      "Survey formatting & outlier audit",
      "Normality & distribution tests",
      "Cronbach's alpha reliability screening",
      "Adviser-ready data health sheet",
    ],
    ctaLabel: "Get started",
    ctaHref: "/dashboard/client/quotations",
    highlighted: false,
  },
  {
    id: "professional",
    name: "PROFESSIONAL",
    badge: "MOST POPULAR",
    price: "2,400",
    pricePrefix: "₱",
    priceSuffix: "/ study",
    sublabel: "CORE THESIS PACKAGE",
    features: [
      "All parametric & non-parametric tests",
      "Full APA 7th Edition Chapter 4 tables",
      "Double-verified by 2 statisticians",
      "Complete R / SPSS / Python code included",
      "Word-for-word defense speaking script",
    ],
    ctaLabel: "Start generating",
    ctaHref: "/dashboard/client/quotations",
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "ENTERPRISE",
    price: "Custom",
    sublabel: "DOCTORAL & MULTIVARIATE",
    features: [
      "Everything in Professional",
      "Structural Equation Modeling (SEM / PLS)",
      "Senior methodologist lead audit",
      "1-on-1 DefenseLab™ mock defense session",
    ],
    ctaLabel: "Talk to sales",
    ctaHref: "/dashboard/client/quotations",
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="section relative py-16 sm:py-20 lg:py-24 bg-[#010114] text-white">
      <div className="w-full max-w-[90rem] mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-16 items-start">
          
          {/* Left Column: Heading, Value Proposition & Philosophy */}
          <div className="lg:col-span-5 flex flex-col justify-start">
            <div className="font-mono text-xs uppercase tracking-[0.15em] text-[#CC6600] mb-3 font-medium">
              PRICING
            </div>
            
            <h2 className="font-sans text-3xl sm:text-4xl lg:text-[2.5rem] font-medium text-white tracking-[-0.03em] leading-tight mb-6">
              Pay for what you generate.
              <span className="block text-white/50 font-normal">Nothing else</span>
            </h2>

            <p className="font-mono text-xs sm:text-sm text-white/60 leading-relaxed mb-4 max-w-lg">
              Usage based pricing with no platform fees. Review your research objectives and statement of the problem upfront with free statistical test matching, then pay per milestone. Enterprise contracts available for compliance-driven teams.
            </p>

            <p className="font-mono text-xs sm:text-sm text-white/60 leading-relaxed max-w-lg">
              All plans include double-verified calculations by two independent statisticians, quality gates, lineage tracking, and full delivery reports.
            </p>
          </div>

          {/* Right Column: Stacked Tier Container */}
          <div className="lg:col-span-7">
            <div className="border border-white/10 rounded-[2px] bg-[#01142B] overflow-hidden">
              {TIERS.map((tier, idx) => (
                <div
                  key={tier.id}
                  className={[
                    "p-6 sm:p-7 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors duration-150 relative",
                    idx < TIERS.length - 1 ? "border-b border-white/10" : "",
                    tier.highlighted
                      ? "bg-[#011833] border-l-2 border-l-[#CC6600]"
                      : "hover:bg-white/[0.02]",
                  ].join(" ")}
                >
                  {/* Left Sub-column: Tier Name, Price & Sublabel */}
                  <div className="w-full md:w-44 shrink-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={[
                          "font-mono text-xs uppercase tracking-wider",
                          tier.highlighted ? "text-[#FFA040] font-semibold" : "text-white/50 font-medium",
                        ].join(" ")}
                      >
                        {tier.name}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1.5 my-0.5">
                      {tier.pricePrefix && (
                        <span className="font-sans font-normal opacity-85 select-none inline-block mr-0.5 text-xl sm:text-2xl text-white">
                          {tier.pricePrefix}
                        </span>
                      )}
                      <span className="font-mono font-bold text-2xl sm:text-3xl text-white tracking-tight">
                        {tier.price}
                      </span>
                      {tier.priceSuffix && (
                        <span className="font-mono text-xs text-white/40 tracking-wider">
                          {tier.priceSuffix}
                        </span>
                      )}
                    </div>

                    <div className="font-mono text-[10px] text-white/40 tracking-wider uppercase mt-1">
                      {tier.sublabel}
                    </div>
                  </div>

                  {/* Middle Sub-column: Features Checklist */}
                  <ul className="flex-1 space-y-2.5">
                    {tier.features.map((feat, fIdx) => (
                      <li
                        key={fIdx}
                        className="flex items-start gap-2.5 font-mono text-xs sm:text-[13px] text-white/80 leading-snug"
                      >
                        <Check
                          size={14}
                          weight="bold"
                          className={tier.highlighted ? "text-[#CC6600] shrink-0 mt-0.5" : "text-white/40 shrink-0 mt-0.5"}
                        />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Right Sub-column: CTA Action Button */}
                  <div className="shrink-0 flex items-center md:justify-end">
                    <Link
                      href={tier.ctaHref}
                      className={[
                        "inline-flex items-center justify-center px-5 py-2.5 rounded-[2px] font-sans text-xs font-medium transition-all duration-150 active:scale-[0.97] whitespace-nowrap text-center w-full md:w-auto",
                        tier.highlighted
                          ? "bg-[#CC6600] text-white hover:bg-[#b35500] font-semibold shadow-sm"
                          : "border border-white/20 text-white hover:border-white/40 hover:bg-white/[0.05]",
                      ].join(" ")}
                    >
                      {tier.ctaLabel}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
