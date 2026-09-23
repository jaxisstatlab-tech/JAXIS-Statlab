"use client";

import React from "react";
import Link from "next/link";

interface SecurityRow {
  id: string;
  tag: string;
  title: string;
  description: string;
  stat1: {
    value: string;
    label: string;
  };
  stat2: {
    value: string;
    label: string;
  };
}

const SECURITY_ROWS: SecurityRow[] = [
  {
    id: "nda-ownership",
    tag: "DATA PRIVACY · STRICT NDA",
    title: "100% Client Ownership — legally binding non-disclosure",
    description:
      "Every JAXIS statistician signs a legally binding Non-Disclosure Agreement before touching client data. Your research questions, dataset, and findings belong 100% to you. We never publish or claim co-authorship.",
    stat1: {
      value: "100%",
      label: "Client data ownership",
    },
    stat2: {
      value: "0",
      label: "Data leaks or shared sets",
    },
  },
  {
    id: "honest-math",
    tag: "RESEARCH ETHICS · ZERO P-HACKING",
    title: "Zero Data Manipulation — honest scientific mathematics",
    description:
      "We never fabricate numbers or alter raw survey data to force statistical significance. If your results show no significant difference, we provide legitimate academic explanations so your panel respects your research integrity.",
    stat1: {
      value: "0.00",
      label: "Tolerance for p-hacking",
    },
    stat2: {
      value: "100%",
      label: "Methodology defended",
    },
  },
  {
    id: "escrow-qa",
    tag: "ESCROW PROTECTION · DUAL-AUDITOR QA",
    title: "Milestone Escrow & Dual-Pass Peer Review",
    description:
      "Your payment is held safely in escrow upon project agreement. Deliverables are only released once an independent Senior QA Lead validates 100% calculation decimal accuracy and APA 7th formatting.",
    stat1: {
      value: "r = 1.00",
      label: "Concordance gate",
    },
    stat2: {
      value: "50/50",
      label: "Milestone escrow split",
    },
  },
];

export default function Security() {
  return (
    <section id="security" className="section relative py-16 sm:py-20 lg:py-24 bg-[#010114] text-white">
      <div className="w-full max-w-[90rem] mx-auto px-6 lg:px-8">
        
        {/* Section Header Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 lg:mb-16">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.15em] text-[#CC6600] mb-2 font-medium">
              SECURITY & ETHICS
            </div>
            <h2 className="font-sans text-2xl sm:text-3xl lg:text-[2rem] font-medium text-white tracking-[-0.03em] leading-tight">
              The standards behind every thesis defense
            </h2>
          </div>
          <div className="shrink-0">
            <Link
              href="/dashboard/client/quotations"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#CC6600] hover:bg-[#b35500] text-white font-sans text-xs sm:text-sm font-semibold rounded-[2px] active:scale-[0.97] transition-all"
            >
              <span>Get a quotation</span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
            </Link>
          </div>
        </div>

        {/* 3-Row Horizontal Stacked Container */}
        <div className="w-full border border-white/10 rounded-[2px] bg-[#01142B] overflow-hidden">
          {SECURITY_ROWS.map((row, idx) => (
            <div
              key={row.id}
              className={[
                "p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 sm:gap-10 transition-colors duration-150 hover:bg-white/[0.015]",
                idx < SECURITY_ROWS.length - 1 ? "border-b border-white/10" : "",
              ].join(" ")}
            >
              {/* Left Column: Category Kicker, Title & Scope Description */}
              <div className="lg:max-w-2xl xl:max-w-3xl flex flex-col justify-center">
                <div className="font-mono text-xs uppercase tracking-[0.15em] text-[#CC6600] mb-1.5 font-medium">
                  {row.tag}
                </div>

                <h3 className="font-sans text-lg sm:text-xl font-medium text-white mb-2 tracking-[-0.02em] leading-snug">
                  {row.title}
                </h3>

                <p className="font-mono text-xs sm:text-sm text-white/60 leading-relaxed">
                  {row.description}
                </p>
              </div>

              {/* Right Column: Dual High-Contrast Telemetry Stats */}
              <div className="shrink-0 grid grid-cols-2 gap-8 sm:gap-12 lg:gap-14 min-w-[260px] sm:min-w-[320px]">
                {/* Stat 1 */}
                <div className="flex flex-col">
                  <span className="font-mono font-bold text-3xl sm:text-4xl text-white tracking-tight">
                    {row.stat1.value}
                  </span>
                  <span className="font-mono text-[11px] sm:text-xs text-white/50 uppercase tracking-wider mt-1">
                    {row.stat1.label}
                  </span>
                </div>

                {/* Stat 2 */}
                <div className="flex flex-col">
                  <span className="font-mono font-bold text-3xl sm:text-4xl text-white tracking-tight">
                    {row.stat2.value}
                  </span>
                  <span className="font-mono text-[11px] sm:text-xs text-white/50 uppercase tracking-wider mt-1">
                    {row.stat2.label}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
