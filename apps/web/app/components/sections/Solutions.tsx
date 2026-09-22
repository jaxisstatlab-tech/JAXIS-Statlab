"use client";

import React, { useRef } from "react";
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
          anticipatePin: 1,
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
      className="relative bg-[#010114] text-white min-h-screen py-24 sm:py-32 px-6 flex flex-col justify-center"
    >
      <div className="max-w-[1280px] mx-auto relative z-10 w-full">
        {/* Section Header */}
        <div className="text-center mb-10">
          <div className="text-[10px] font-mono text-white/40 tracking-[0.18em] uppercase mb-3">
            JAXIS STATLAB · COMPLETE RESEARCH DELIVERABLES
          </div>

          <div className="inline-flex items-center gap-2 bg-[#CC6600]/10 border border-[#CC6600]/30 px-3 py-1 rounded-[2px] mb-3">
            <span className="w-1.5 h-1.5 bg-[#CC6600] inline-block" />
            <span className="font-mono text-xs tracking-wider text-[#CC6600] uppercase font-semibold">
              SECTION 03 · WHAT YOU RECEIVE
            </span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-sans font-light tracking-tight text-white leading-tight max-w-4xl mx-auto">
            Complete Deliverables.{" "}
            <span className="text-white/60 font-normal">
              Zero Statistical Anxiety.
            </span>
          </h2>

          <p className="text-sm sm:text-base font-sans text-white/70 leading-relaxed max-w-2xl mx-auto mt-3">
            Explore the 4 core deliverables included in your JAXIS package — from cleaned data spreadsheets to your personal thesis defense script.
          </p>
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
