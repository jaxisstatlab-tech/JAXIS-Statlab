"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { CheckCircle } from "@phosphor-icons/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const PACKAGES = [
  {
    name: "DataCheck",
    catalog: "PLAN 01 · SURVEY AUDIT",
    pricePrefix: "Starts at",
    price: "1,000",
    priceSuffix: "PHP · BY QUOTE",
    desc: "For students who just need their survey spreadsheet cleaned, checked for errors, and verified before running tests.",
    features: [
      "Survey Data Formatting & Outlier Cleanup",
      "Normality & Distribution Verification",
      "Survey Reliability Test (Cronbach's Alpha)",
      "Official Data Health Sheet for Your Adviser",
    ],
    highlighted: false,
  },
  {
    name: "Start Package",
    catalog: "PLAN 02 · DEMOGRAPHICS & PROFILES",
    pricePrefix: "Starts at",
    price: "1,500",
    priceSuffix: "PHP · BY QUOTE",
    desc: "Ideal for demographic profiling, respondent frequencies, percentages, and basic cross-tabulation comparisons.",
    features: [
      "Demographic Frequencies & Percentages",
      "Cross-tabulations & Chi-Square Comparisons",
      "Ready-to-Paste APA 7th Edition Tables",
      "Plain-English Findings Writeup for Chapter 4",
      "Custom SOW Quote (No Scope Creep)",
    ],
    highlighted: false,
  },
  {
    name: "Core Thesis Package",
    catalog: "PLAN 03 · COMPLETE HYPOTHESIS TESTING",
    pricePrefix: "Starts at",
    price: "2,400",
    priceSuffix: "PHP · BY QUOTE",
    desc: "The standard choice for College, Master's, and Ph.D. theses needing hypothesis testing and full narrative writeups.",
    features: [
      "Hypothesis Tests (T-Tests, ANOVA, Multiple Regression)",
      "Assumption Audits & Statistical Effect Sizes",
      "Full Plain-English Chapter 4 Narrative Report",
      "Double-Checked by 2 Independent Statisticians",
      "Full Analysis Scripts (.R / .py / .sps) Included",
    ],
    highlighted: true,
  },
  {
    name: "Advanced Package",
    catalog: "PLAN 04 · COMPLEX MODELING",
    pricePrefix: "Starts at",
    price: "3,000+",
    priceSuffix: "PHP · CUSTOM SCOPE",
    desc: "For graduate studies and doctoral dissertations requiring advanced multivariate modeling, SEM, or clinical trials.",
    features: [
      "Advanced SEM, Path Analysis, HLM & Survival Models",
      "Custom Methodological Blueprint for Your Defense",
      "Senior Methodologist Lead Verification",
      "Comprehensive Panel Defense Question Guide",
      "Free Academic Revision Guarantee on Scope",
    ],
    highlighted: false,
  },
];

const CONSULTING = {
  name: "DefenseLab Module",
  catalog: "OPTIONAL · 1-ON-1 MOCK DEFENSE",
  desc: "Live 1-on-1 simulated panel defense with a Senior JAXIS Statistician. We grill you on your methodology and test choices so you walk into your real defense with 100% confidence.",
  rate: "250",
  rateSuffix: "/hr",
};

const ADDITIONS = [
  {
    name: "JAXIS Rush",
    desc: "3-day guaranteed turnaround upgrade",
    price: "300",
  },
  {
    name: "JAXIS Express",
    desc: "48-hour expedited delivery upgrade",
    price: "600",
  },
  {
    name: "JAXIS Emergency",
    desc: "24-hour urgent overnight delivery",
    price: "1,000",
  },
];

function padIndex(n: number): string {
  return String(n).padStart(2, "0");
}

export default function Pricing() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Header Timeline
      const headerTl = gsap.timeline({
        scrollTrigger: {
          trigger: ".pricing-title-area",
          start: "top 85%",
          once: true,
        },
      });

      headerTl.fromTo(
        ".pricing-kicker",
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
      );

      headerTl.fromTo(
        ".pricing-heading-line",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: "power3.out" },
        "-=0.3"
      );

      headerTl.fromTo(
        ".pricing-title-area p",
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
        "-=0.4"
      );

      // 2. Pricing Cards reveal
      gsap.fromTo(
        ".pricing-card-box",
        { opacity: 0, y: 35 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".pricing-packages-grid",
            start: "top 85%",
            once: true,
          },
        }
      );

      // 3. Offering Cards reveal
      ScrollTrigger.batch(".pricing-offering-box", {
        onEnter: (elements) => {
          gsap.fromTo(
            elements,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power3.out" }
          );
        },
        start: "top 90%",
        once: true,
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="relative bg-[#010114] text-white py-24 sm:py-32 px-6 z-10"
    >
      <div className="max-w-[1280px] mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="pricing-title-area border-b border-white/10 pb-10 mb-12 grid grid-cols-1 lg:grid-cols-2 gap-6 items-end">
          <div>
            <div className="text-[10px] font-mono text-white/40 tracking-[0.18em] uppercase mb-3">
              JAXIS STATLAB · TRANSPARENT PRICING & SCOPE OF WORK
            </div>
            <div className="pricing-kicker text-xs font-mono text-[#CC6600] tracking-wider uppercase font-semibold flex items-center gap-2 mb-3">
              <span className="inline-block w-1.5 h-1.5 bg-[#CC6600]" />
              SECTION 04 · PACKAGES & CUSTOM QUOTES
            </div>

            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-sans font-light tracking-tight text-white leading-tight">
              <span className="pricing-heading-line block">Transparent Rates.</span>
              <span className="pricing-heading-line block text-[#38bdf8] font-normal">
                Custom-Quoted Scopes.
              </span>
            </h2>
          </div>

          <div>
            <p className="text-sm sm:text-base font-sans text-white/70 leading-relaxed max-w-lg">
              Every study is unique. We review your research questions and dataset first, then provide an exact, custom Scope of Work quote with zero hidden fees.
            </p>
          </div>
        </div>

        {/* Packages 2x2 Bento Grid */}
        <div className="pricing-packages-grid grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {PACKAGES.map((pkg, idx) => (
            <div
              key={idx}
              className={[
                "pricing-card-box p-6 sm:p-8 rounded-[2px] flex flex-col justify-between relative transition-all duration-200",
                pkg.highlighted
                  ? "bg-[#01142B] border-2 border-[#CC6600] shadow-lg shadow-[#CC6600]/10 ring-1 ring-[#CC6600]/20"
                  : "bg-[#01142B] border border-white/10 hover:border-white/20",
              ].join(" ")}
            >
              {/* Corner Index */}
              <span className="absolute top-4 right-5 font-mono text-xs font-bold text-white/30">
                {padIndex(idx + 1)}
              </span>

              <div className="flex-1">
                {/* Header Tag / Badge */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="font-mono text-xs tracking-wider text-[#CC6600] font-semibold uppercase">
                    {pkg.catalog}
                  </span>
                  {pkg.highlighted && (
                    <span className="text-[10px] font-mono font-semibold tracking-wider text-[#FFA040] bg-[#CC6600]/15 border border-[#CC6600]/30 px-2 py-0.5 rounded-[2px] uppercase">
                      RECOMMENDED FOR DEFENSE
                    </span>
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl font-sans font-normal text-white mb-2 tracking-tight">
                  {pkg.name}
                </h3>
                <p className="text-sm font-sans text-white/70 leading-relaxed mb-6">
                  {pkg.desc}
                </p>

                {/* Price Display with Harmonized Peso Symbol */}
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-[2px] mb-6">
                  <div className="font-mono text-[10px] text-white/40 tracking-wider uppercase mb-1">
                    {pkg.pricePrefix}
                  </div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl sm:text-4xl font-mono font-bold text-white flex items-baseline">
                      <span className="font-sans font-normal opacity-85 select-none inline-block mr-0.5 text-2xl sm:text-3xl">
                        ₱
                      </span>
                      {pkg.price}
                    </span>
                    <span className="font-mono text-xs text-white/40 tracking-wider uppercase">
                      {pkg.priceSuffix}
                    </span>
                  </div>
                </div>

                {/* Features List with Phosphor CheckCircle icons */}
                <ul className="space-y-3 mb-6">
                  {pkg.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2.5 text-xs font-sans text-white/80 leading-snug">
                      <CheckCircle
                        size={15}
                        weight="fill"
                        className={pkg.highlighted ? "text-[#CC6600] shrink-0 mt-0.5" : "text-emerald-400 shrink-0 mt-0.5"}
                      />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <a
                href="#contact"
                className={[
                  "w-full text-center py-3 px-6 rounded-[2px] font-sans font-medium text-xs tracking-wider uppercase transition-all duration-150 active:scale-[0.97] block",
                  pkg.highlighted
                    ? "bg-[#CC6600] text-white hover:bg-[#b35900] shadow-sm font-semibold"
                    : "bg-white/[0.05] text-white hover:bg-white/[0.1] border border-white/10 hover:border-white/20",
                ].join(" ")}
              >
                Request Custom Quote →
              </a>
            </div>
          ))}
        </div>

        {/* Offerings Area (Upgrades & DefenseLab) */}
        <div className="border-t border-white/10 pt-12">
          <div className="mb-6">
            <span className="font-mono text-xs text-[#38bdf8] tracking-wider uppercase block mb-1">
              DEFENSE READINESS & EXPEDITED TURNAROUND
            </span>
            <h3 className="text-2xl sm:text-3xl font-sans font-normal text-white">
              DefenseLab & Delivery Upgrades
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* DefenseLab Module Card */}
            <div className="pricing-offering-box p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col justify-between hover:border-white/20 transition-all duration-200">
              <div>
                <span className="font-mono text-xs text-[#CC6600] tracking-wider uppercase block mb-2 font-semibold">
                  {CONSULTING.catalog}
                </span>
                <h4 className="text-xl sm:text-2xl font-sans font-normal text-white mb-2">
                  {CONSULTING.name}
                </h4>
                <p className="text-sm font-sans text-white/70 leading-relaxed mb-6">
                  {CONSULTING.desc}
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-between items-baseline gap-2">
                <span className="font-mono text-2xl sm:text-3xl font-bold text-white flex items-baseline">
                  <span className="font-sans font-normal opacity-85 select-none inline-block mr-0.5 text-xl">
                    ₱
                  </span>
                  {CONSULTING.rate}
                  <span className="text-xs font-mono text-white/40 ml-1">
                    {CONSULTING.rateSuffix}
                  </span>
                </span>
                <span className="font-mono text-xs text-[#38bdf8] tracking-wider uppercase">
                  LIVE 1-ON-1 SESSION
                </span>
              </div>
            </div>

            {/* Turnaround Add-ons List */}
            <div className="flex flex-col gap-3">
              {ADDITIONS.map((add, idx) => (
                <div
                  key={idx}
                  className="pricing-offering-box p-4 sm:p-5 bg-[#01142B] border border-white/10 rounded-[2px] flex justify-between items-center gap-4 hover:border-white/20 transition-all duration-200"
                >
                  <div>
                    <h4 className="font-sans text-base font-normal text-white mb-0.5">
                      {add.name}
                    </h4>
                    <p className="font-sans text-xs text-white/60">
                      {add.desc}
                    </p>
                  </div>
                  <span className="font-mono text-lg font-bold text-[#CC6600] whitespace-nowrap flex items-baseline">
                    <span className="font-sans font-normal opacity-85 select-none inline-block mr-0.5 text-sm">
                      ₱
                    </span>
                    {add.price}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Status Footer */}
        <div className="mt-12 pt-6 border-t border-white/10 flex justify-between items-center flex-wrap gap-4">
          <span className="font-mono text-[10px] text-white/40 tracking-wider uppercase">
            SYS · CUSTOM QUOTE PER STUDY · SOW APPROVAL REQUIRED · JAXIS STATLAB
          </span>

          <span className="font-mono text-[10px] text-[#38bdf8] tracking-wider uppercase flex items-center gap-1.5">
            <CheckCircle size={12} weight="fill" className="text-emerald-400" />
            OFFICIAL QUOTE COMPLIANT [VERIFIED]
          </span>
        </div>

      </div>
    </section>
  );
}
