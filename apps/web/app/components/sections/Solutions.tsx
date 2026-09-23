"use client";

import React, { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import SolutionCard, { StackedCardData } from "../ui/SolutionCard";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const STACKED_CARDS: StackedCardData[] = [
  {
    id: "intake-diagnostics",
    step: "01",
    badge: "DELIVERABLE 01 · DATA CLEANING",
    title: "Spreadsheet Cleaning & Data Health Checks",
    subtitle:
      "We organize messy survey spreadsheets, clean up duplicate or invalid entries, and ensure your data is 100% mathematically valid before testing.",
    accent: "#CC6600",
    pills: [
      "Survey Data Cleanup",
      "Missing Response Handling",
      "Outlier & Extreme Value Check",
      "Survey Reliability (Cronbach's Alpha)",
      "Adviser-Ready Clean Sheet",
    ],
    features: [
      {
        tag: "DATA CLEANUP",
        title: "Spreadsheet Formatting",
        desc: "Fixes messy columns, re-encodes survey answers, and eliminates bad or corrupted entries.",
        metric: "CLEANED",
        metricLabel: "100% ACCURATE",
      },
      {
        tag: "OUTLIER CHECK",
        title: "Extreme Response Scan",
        desc: "Identifies abnormal survey responses that could distort your overall findings.",
        metric: "VERIFIED",
        metricLabel: "NO SKEW",
      },
      {
        tag: "RELIABILITY",
        title: "Survey Reliability Test",
        desc: "Computes Cronbach's Alpha to prove your survey questions measured what they were supposed to.",
        metric: "α > .80",
        metricLabel: "HIGH RELIABILITY",
      },
      {
        tag: "MISSING DATA",
        title: "Missing Answer Handling",
        desc: "Properly handles blank survey answers without biasing your study's conclusions.",
        metric: "0.0%",
        metricLabel: "DATA LEAKAGE",
      },
    ],
  },
  {
    id: "inferential-modeling",
    step: "02",
    badge: "DELIVERABLE 02 · STATISTICAL TESTS",
    title: "Accurate Calculations & Ready APA 7th Tables",
    subtitle:
      "We compute every demographic profile, hypothesis test, and regression model, then format them into ready-to-paste APA 7th Edition tables.",
    accent: "#CC6600",
    pills: [
      "Demographic Profiles & Frequencies",
      "T-Tests & ANOVA Group Comparisons",
      "Correlation & Multiple Regression",
      "Advanced SEM & Path Analysis",
      "APA 7th Edition Formatted Tables",
    ],
    features: [
      {
        tag: "DEMOGRAPHICS",
        title: "Profile & Frequency Tables",
        desc: "Clear summary tables for age, gender, occupation, and all baseline study variables.",
        metric: "100%",
        metricLabel: "TABULATED",
      },
      {
        tag: "HYPOTHESES",
        title: "Hypothesis Testing",
        desc: "T-Tests, ANOVA, Chi-Square, and Regressions with exact p-values and effect sizes.",
        metric: "p < .05",
        metricLabel: "CONFIRMED",
      },
      {
        tag: "COMPLEX MODELS",
        title: "Advanced Modeling (SEM)",
        desc: "Path analysis and structural equation modeling for complex graduate dissertations.",
        metric: "CFI = .98",
        metricLabel: "EXCELLENT FIT",
      },
      {
        tag: "APA FORMAT",
        title: "Ready-to-Paste APA Tables",
        desc: "Formatted strictly to APA 7th Edition rules so your manuscript looks completely professional.",
        metric: "APA 7.0",
        metricLabel: "CAMPUS COMPLIANT",
      },
    ],
  },
  {
    id: "qa-verification",
    step: "03",
    badge: "DELIVERABLE 03 · QUALITY ASSURANCE",
    title: "Double-Checked by 2 Independent Statisticians",
    subtitle:
      "No guesswork or solo errors. Your analysis is independently calculated by two separate statisticians to ensure 100% accuracy before you receive it.",
    accent: "#CC6600",
    pills: [
      "Double-Blind Recalculation",
      "Zero Data Fabrication Policy",
      "Full R / Python / SPSS Code Scripts",
      "Senior Quality Assurance Stamp",
    ],
    features: [
      {
        tag: "DOUBLE CHECK",
        title: "Independent Recalculation",
        desc: "A second senior statistician recalculates every figure from scratch to catch any possible error.",
        metric: "100%",
        metricLabel: "REPRODUCIBLE",
      },
      {
        tag: "INTEGRITY",
        title: "Zero P-Hacking Policy",
        desc: "We never manipulate survey numbers to fake significance. We provide legitimate academic defenses.",
        metric: "0.00",
        metricLabel: "FRAUD TOLERANCE",
      },
      {
        tag: "SOURCE CODE",
        title: "Full Software Scripts",
        desc: "You get the exact R, Python, or SPSS source code used to generate your tables and charts.",
        metric: ".R / .SPS",
        metricLabel: "INCLUDED",
      },
      {
        tag: "APPROVAL",
        title: "Senior Lead Sign-Off",
        desc: "Deliverables are only approved after passing our strict quality control checklist.",
        metric: "PASSED",
        metricLabel: "QA VERIFIED",
      },
    ],
  },
  {
    id: "defense-synthesis",
    step: "04",
    badge: "DELIVERABLE 04 · DEFENSE READINESS",
    title: "Plain-English Speaking Scripts & Mock Defense",
    subtitle:
      "We translate statistical jargon into simple words you can read aloud, and coach you on how to answer tough panel questions with confidence.",
    accent: "#CC6600",
    pills: [
      "Live 1-on-1 Mock Panel Defense",
      "Top 20 Defense Questions Script",
      "Explaining Non-Significant Results",
      "Free Academic Revision Guarantee",
    ],
    features: [
      {
        tag: "COACHING",
        title: "1-on-1 Mock Panel Defense",
        desc: "Practice answering tough methodology questions with a senior statistician before your real defense.",
        metric: "1-ON-1",
        metricLabel: "LIVE SIMULATION",
      },
      {
        tag: "SCRIPTS",
        title: "Defense Speaking Script",
        desc: "Word-for-word explanations of why each test was chosen and what your findings actually mean.",
        metric: "20+",
        metricLabel: "SCRIPTED ANSWERS",
      },
      {
        tag: "EXPLANATION",
        title: "Null-Result Defense",
        desc: "Clear explanations for when results are not significant, turning potential criticisms into strengths.",
        metric: "BACKED",
        metricLabel: "THEORY JUSTIFIED",
      },
      {
        tag: "WARRANTY",
        title: "Free Revision Guarantee",
        desc: "Fast turnaround on any methodology revisions requested by your panel at no extra cost.",
        metric: "100%",
        metricLabel: "FREE REVISIONS",
      },
    ],
  },
];

export default function Solutions() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardWrapperRefs = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(
    () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile) return;

      const wrappers = cardWrapperRefs.current.filter(Boolean) as HTMLDivElement[];
      if (wrappers.length === 0) return;

      const pinnedTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "+=220%",
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });

      wrappers.forEach((wrapper, idx) => {
        if (idx === 0) return;
        pinnedTimeline.fromTo(
          wrapper,
          { y: () => window.innerHeight * 0.75, opacity: 0.95 },
          { y: 0, opacity: 1, ease: "power2.out" },
          (idx - 1) * 0.35,
        );
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      id="solutions"
      ref={sectionRef}
      className="relative bg-[#010114] text-white min-h-screen py-16 sm:py-20 lg:py-24 flex flex-col justify-center"
    >
      <div className="w-full max-w-[90rem] mx-auto px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 sm:mb-12">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.15em] text-[#CC6600] mb-2 font-medium">
              COMPLETE RESEARCH DELIVERABLES
            </div>
            <h2 className="font-sans text-2xl sm:text-3xl lg:text-[2rem] font-medium text-white tracking-[-0.03em] leading-tight">
              Complete Deliverables. <span className="text-white/50 font-normal">Zero Statistical Anxiety.</span>
            </h2>
            <p className="font-mono text-xs sm:text-sm text-white/60 mt-2 max-w-3xl lg:max-w-4xl leading-relaxed">
              Explore the 4 core deliverables included in your JAXIS package — from cleaned data spreadsheets to your personal thesis defense script.
            </p>
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

        {/* ── Cards Stacking Deck ── */}
        <div className="stacked-cards-deck relative w-full min-h-[560px] pb-12">
          {STACKED_CARDS.map((card, idx) => (
            <div
              key={card.id}
              ref={(el) => {
                cardWrapperRefs.current[idx] = el;
              }}
              className={[
                "w-full will-change-transform",
                idx === 0 ? "relative" : "absolute left-0 right-0",
              ].join(" ")}
              style={{
                top: idx === 0 ? 0 : `${idx * 52}px`,
                zIndex: idx + 1,
                transform: "translate3d(0, 0, 0)",
              }}
            >
              <SolutionCard card={card} index={idx} isStaticLayout={true} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
