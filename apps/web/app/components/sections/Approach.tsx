"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { ShieldCheck, CheckCircle } from "@phosphor-icons/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// ─── Mathematical Vector Line Art Components ───

function MethodologyLockCAD() {
  return (
    <svg viewBox="0 0 360 140" className="w-full h-36 block" fill="none">
      <line x1="20" y1="70" x2="340" y2="70" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />
      <line x1="180" y1="10" x2="180" y2="130" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />

      {/* Isometric Blueprint Box */}
      <polygon
        className="vector-draw-path"
        points="180,24 250,56 180,88 110,56"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="1.2"
        strokeDasharray="400"
        strokeDashoffset="400"
      />
      <polygon
        className="vector-draw-path"
        points="110,56 180,88 180,122 110,90"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="1"
        strokeDasharray="400"
        strokeDashoffset="400"
      />
      <polygon
        className="vector-draw-path"
        points="250,56 180,88 180,122 250,90"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="1"
        strokeDasharray="400"
        strokeDashoffset="400"
      />

      {/* Precision Dimension Caliper Lines */}
      <line x1="92" y1="56" x2="92" y2="90" stroke="#CC6600" strokeWidth="1" strokeDasharray="2 2" />
      <line x1="88" y1="56" x2="96" y2="56" stroke="#CC6600" strokeWidth="1" />
      <line x1="88" y1="90" x2="96" y2="90" stroke="#CC6600" strokeWidth="1" />
      <text x="52" y="76" fill="#CC6600" fontSize="8.5" fontFamily="monospace" letterSpacing="0.8">Δ=0.00</text>

      {/* Nodes */}
      <circle cx="180" cy="24" r="2.5" fill="#38bdf8" />
      <circle cx="250" cy="56" r="2.5" fill="#38bdf8" />
      <circle cx="180" cy="88" r="2.5" fill="#38bdf8" />
      <circle cx="110" cy="56" r="2.5" fill="#38bdf8" />

      <text x="20" y="130" fill="rgba(255,255,255,0.50)" fontSize="8" fontFamily="monospace" letterSpacing="0.6">
        SOW BOUNDS: [FROZEN]
      </text>
      <text x="220" y="130" fill="rgba(255,255,255,0.50)" fontSize="8" fontFamily="monospace" letterSpacing="0.6">
        POWER: 1-β = .80 [PASS]
      </text>
    </svg>
  );
}

function GaussianPreFlightLineArt() {
  return (
    <svg viewBox="0 0 360 140" className="w-full h-36 block" fill="none">
      <line x1="20" y1="108" x2="340" y2="108" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      <line x1="180" y1="15" x2="180" y2="108" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="3 3" />

      {/* Parametric Gaussian Normal Curve */}
      <path
        className="vector-draw-path"
        d="M 28,108 Q 108,108 144,60 T 180,22 T 216,60 Q 252,108 332,108"
        stroke="#38bdf8"
        strokeWidth="1.8"
        strokeDasharray="400"
        strokeDashoffset="400"
      />

      {/* ±1.96 Sigma Calipers */}
      <line x1="125" y1="45" x2="125" y2="108" stroke="rgba(204, 102, 0, 0.85)" strokeWidth="1" strokeDasharray="2 2" />
      <line x1="235" y1="45" x2="235" y2="108" stroke="rgba(204, 102, 0, 0.85)" strokeWidth="1" strokeDasharray="2 2" />

      <circle cx="180" cy="22" r="3" fill="#CC6600" />
      <circle cx="125" cy="75" r="2.5" fill="#38bdf8" />
      <circle cx="235" cy="75" r="2.5" fill="#38bdf8" />

      <text x="112" y="128" fill="#CC6600" fontSize="8" fontFamily="monospace" letterSpacing="0.6">
        -1.96σ
      </text>
      <text x="174" y="128" fill="rgba(255,255,255,0.55)" fontSize="8" fontFamily="monospace" letterSpacing="0.6">
        μ=0
      </text>
      <text x="226" y="128" fill="#CC6600" fontSize="8" fontFamily="monospace" letterSpacing="0.6">
        +1.96σ
      </text>
      <text x="20" y="26" fill="#38bdf8" fontSize="8" fontFamily="monospace" letterSpacing="0.6">
        SHAPIRO-WILK: P=.240 [NORMAL] [PASS]
      </text>
    </svg>
  );
}

function DualPassQALineArt() {
  return (
    <svg viewBox="0 0 360 140" className="w-full h-36 block" fill="none">
      <line x1="20" y1="70" x2="340" y2="70" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <line x1="90" y1="15" x2="90" y2="125" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="2 2" />
      <line x1="180" y1="15" x2="180" y2="125" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="2 2" />
      <line x1="270" y1="15" x2="270" y2="125" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="2 2" />

      {/* Waveform Trace 01 (Primary Methodologist) */}
      <path
        className="vector-draw-path"
        d="M 22,70 Q 62,25 102,70 T 182,70 T 262,70 T 338,70"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.2"
        strokeDasharray="400"
        strokeDashoffset="400"
      />

      {/* Waveform Trace 02 (Senior QA Auditor - 100% Phase Match Overlay) */}
      <path
        className="vector-draw-path"
        d="M 22,70 Q 62,25 102,70 T 182,70 T 262,70 T 338,70"
        stroke="#CC6600"
        strokeWidth="1.2"
        strokeDasharray="4 4"
        strokeDashoffset="400"
      />

      <circle cx="102" cy="70" r="2.5" fill="#38bdf8" />
      <circle cx="182" cy="70" r="2.5" fill="#38bdf8" />
      <circle cx="262" cy="70" r="2.5" fill="#38bdf8" />

      <text x="20" y="26" fill="rgba(255,255,255,0.50)" fontSize="8" fontFamily="monospace" letterSpacing="0.6">
        TRACE_01: METHODOLOGIST
      </text>
      <text x="195" y="26" fill="#CC6600" fontSize="8" fontFamily="monospace" letterSpacing="0.6">
        TRACE_02: SENIOR QA (REPLICATED)
      </text>
      <text x="20" y="128" fill="#38bdf8" fontSize="8" fontFamily="monospace" letterSpacing="0.6">
        CONCORDANCE: r=0.998 [100% MATCH] [PASS]
      </text>
    </svg>
  );
}

function RegressionDefenseLineArt() {
  return (
    <svg viewBox="0 0 360 140" className="w-full h-36 block" fill="none">
      <line x1="35" y1="20" x2="35" y2="115" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
      <line x1="35" y1="115" x2="335" y2="115" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />

      {/* Regression Slope Line */}
      <line
        className="vector-draw-path"
        x1="48"
        y1="105"
        x2="318"
        y2="35"
        stroke="#38bdf8"
        strokeWidth="1.6"
        strokeDasharray="400"
        strokeDashoffset="400"
      />

      {/* Empirical Scatter Points & Residual Vertical Drop Lines */}
      {[
        { x: 70, y: 96, py: 99 },
        { x: 105, y: 84, py: 90 },
        { x: 145, y: 82, py: 79 },
        { x: 185, y: 66, py: 70 },
        { x: 220, y: 59, py: 61 },
        { x: 260, y: 48, py: 50 },
        { x: 298, y: 38, py: 41 },
      ].map((pt, i) => (
        <g key={i}>
          <line x1={pt.x} y1={pt.y} x2={pt.x} y2={pt.py} stroke="rgba(204, 102, 0, 0.45)" strokeWidth="0.8" strokeDasharray="1 1" />
          <circle cx={pt.x} cy={pt.y} r="2" fill="rgba(255,255,255,0.85)" />
        </g>
      ))}

      <text x="48" y="26" fill="#38bdf8" fontSize="8" fontFamily="monospace" letterSpacing="0.6">
        FIT: R²=0.942 | P&lt;.001 [PASS]
      </text>
      <text x="195" y="128" fill="#CC6600" fontSize="8" fontFamily="monospace" letterSpacing="0.6">
        RESIDUALS: GAUSSIAN NORMAL [PASS]
      </text>
    </svg>
  );
}

// ─── Gate Data ───

interface GateData {
  code: string;
  index: string;
  stepSummary: string;
  tag: string;
  title: string;
  subtitle: string;
  desc: string;
  deliverableBadge: string;
  illustration: React.ReactNode;
  specs: { label: string; value: string; isHighlight?: boolean }[];
}

const GATES: GateData[] = [
  {
    code: "STEP_01",
    index: "01",
    stepSummary: "Send Data & Free Review",
    tag: "FREE INITIAL REVIEW",
    title: "Send Us Your Chapter 1 & Data",
    subtitle: "EXACT TEST MATCHING & FREE QUOTE",
    desc: "We review your research objectives, statement of the problem, and raw survey data. We determine the exact statistical tests your study actually needs before you spend a single peso.",
    deliverableBadge: "DELIVERABLE: CUSTOM SOW QUOTE IN 24H",
    illustration: <MethodologyLockCAD />,
    specs: [
      { label: "INITIAL REVIEW", value: "100% FREE INTAKE", isHighlight: true },
      { label: "TEST SELECTION", value: "MATCHED TO OBJECTIVES" },
      { label: "QUOTE ACCURACY", value: "CUSTOM TO YOUR STUDY" },
      { label: "TURNAROUND", value: "QUOTE IN 24 HOURS", isHighlight: true },
    ],
  },
  {
    code: "STEP_02",
    index: "02",
    stepSummary: "We Clean Your Data",
    tag: "DATA CLEANING & CHECKS",
    title: "We Clean Your Data & Fix Errors",
    subtitle: "SURVEY HEALTH & VALIDITY AUDIT",
    desc: "We organize your spreadsheet, clean up missing survey responses, and run normality and outlier tests so your panel and adviser never reject your raw data.",
    deliverableBadge: "DELIVERABLE: CLEANED DATASET & HEALTH SHEET",
    illustration: <GaussianPreFlightLineArt />,
    specs: [
      { label: "SURVEY CLEANUP", value: "OUTLIERS REMOVED", isHighlight: true },
      { label: "RELIABILITY TEST", value: "CRONBACH'S ALPHA CLEARED" },
      { label: "MISSING ENTRIES", value: "STATISTICALLY RESOLVED" },
      { label: "DATA HEALTH", value: "100% VALIDATED", isHighlight: true },
    ],
  },
  {
    code: "STEP_03",
    index: "03",
    stepSummary: "Two Experts Calculate",
    tag: "2-STATISTICIAN CHECK",
    title: "Two Experts Calculate Your Numbers",
    subtitle: "ZERO CALCULATION ERROR GUARANTEE",
    desc: "Your data is analyzed by one statistician and recalculated from scratch by a second senior reviewer. If a single decimal differs, we fix it before you receive your results.",
    deliverableBadge: "DELIVERABLE: DOUBLE-VERIFIED CALCULATIONS",
    illustration: <DualPassQALineArt />,
    specs: [
      { label: "PRIMARY RUN", value: "EXPERT STATISTICIAN" },
      { label: "SECOND AUDIT", value: "SENIOR QA RE-CALCULATION", isHighlight: true },
      { label: "ERROR TOLERANCE", value: "0.00% ZERO ERROR" },
      { label: "TABLE FORMAT", value: "APA 7TH EDITION", isHighlight: true },
    ],
  },
  {
    code: "STEP_04",
    index: "04",
    stepSummary: "Tables & Defense Script",
    tag: "DEFENSE SCRIPT & TABLES",
    title: "You Get Tables & Plain Speaking Scripts",
    subtitle: "READY TO PASTE INTO CHAPTER 4",
    desc: "You receive clean APA tables ready to paste into your manuscript, plus a word-for-word speaking script explaining what every p-value and percentage means during your defense.",
    deliverableBadge: "DELIVERABLE: APA TABLES & DEFENSE SCRIPT",
    illustration: <RegressionDefenseLineArt />,
    specs: [
      { label: "MANUSCRIPT TABLES", value: "COPY-PASTE READY (APA 7)" },
      { label: "SPEAKING SCRIPT", value: "PLAIN-ENGLISH TRANSLATION", isHighlight: true },
      { label: "SOURCE CODE", value: "R / PYTHON / SPSS INCLUDED" },
      { label: "DEFENSE SUPPORT", value: "100% READY FOR PANEL", isHighlight: true },
    ],
  },
];

const QUALITY_STANDARDS = [
  {
    metric: "99.8%",
    label: "Calculation Precision",
    desc: "Replication tolerance strictly at 0.00% across dual runs",
    status: "PASS",
  },
  {
    metric: "100%",
    label: "Data Health Audit",
    desc: "Outliers isolated, normality tested, Cronbach cleared",
    status: "PASS",
  },
  {
    metric: "APA 7th",
    label: "Manuscript Compliance",
    desc: "Formatted directly to paste into Chapter 4 with notes",
    status: "PASS",
  },
  {
    metric: "2-Tier",
    label: "Independent QA",
    desc: "Primary statistician + senior reviewer sign-off",
    status: "PASS",
  },
];

export default function Approach() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Section Header Animation
      gsap.fromTo(
        ".approach-header",
        { opacity: 0, y: 25 },
        {
          opacity: 1,
          y: 0,
          duration: 0.75,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".approach-header",
            start: "top 85%",
          },
        }
      );

      // 2. Bento Cards Reveal
      const cards = gsap.utils.toArray<HTMLElement>(".approach-bento-card");
      cards.forEach((card) => {
        const cardTl = gsap.timeline({
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
          },
        });

        cardTl.fromTo(
          card,
          { opacity: 0, y: 35 },
          { opacity: 1, y: 0, duration: 0.65, ease: "power3.out" }
        );

        const paths = card.querySelectorAll(".vector-draw-path");
        if (paths.length > 0) {
          cardTl.fromTo(
            paths,
            { strokeDashoffset: 400 },
            { strokeDashoffset: 0, duration: 1.1, stagger: 0.08, ease: "power2.out" },
            "-=0.4"
          );
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="approach"
      ref={sectionRef}
      className="bg-[#010114] text-white py-24 sm:py-32 px-6 relative z-10"
    >
      <div className="max-w-[1280px] mx-auto relative z-10">
        
        {/* ── Section Header ── */}
        <div className="approach-header border-b border-white/10 pb-10 mb-10 grid grid-cols-1 lg:grid-cols-2 gap-6 items-end">
          <div>
            <div className="text-[10px] font-mono text-white/40 tracking-[0.18em] uppercase mb-3">
              JAXIS STATLAB · VERIFICATION WORKFLOW
            </div>
            <div className="text-xs font-mono text-[#CC6600] tracking-wider uppercase font-semibold flex items-center gap-2 mb-3">
              <span className="inline-block w-1.5 h-1.5 bg-[#CC6600]" />
              SECTION 02 · HOW WE WORK
            </div>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-sans font-light tracking-tight text-white leading-tight">
              From Raw Data To
              <br />
              <span className="text-[#38bdf8] font-normal">Passed Defense.</span>
            </h2>
          </div>

          <div>
            <p className="text-sm sm:text-base text-white/70 leading-relaxed max-w-lg font-sans">
              Never walk into a panel defense unsure of what your numbers mean. Here is our 4-step process to ensure your research data is 100% accurate, error-free, and easy for you to explain.
            </p>
          </div>
        </div>

        {/* ── Syntethic-style Horizontal Step Ribbon ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {GATES.map((gate) => (
            <div
              key={`step-${gate.code}`}
              className="p-4 bg-[#01142B] border border-white/10 rounded-[2px] flex items-center gap-3.5 hover:border-white/20 transition-colors"
            >
              <span className="text-xs font-mono font-bold text-[#CC6600] bg-[#CC6600]/10 border border-[#CC6600]/20 px-2 py-1 rounded-[2px] shrink-0">
                {gate.index}
              </span>
              <div className="min-w-0">
                <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider">{gate.code}</div>
                <div className="text-xs font-sans font-medium text-white truncate">{gate.stepSummary}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Strict 2x2 Architectural Bento Matrix ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {GATES.map((gate) => (
            <div
              key={gate.code}
              className="approach-bento-card bg-[#01142B] border border-white/10 rounded-[2px] p-6 sm:p-8 flex flex-col justify-between relative hover:border-white/20 transition-all duration-200"
            >
              {/* Corner crosshairs */}
              <span className="absolute top-1.5 left-2 font-mono text-[9px] text-white/20 select-none">+</span>
              <span className="absolute top-1.5 right-2 font-mono text-[9px] text-white/20 select-none">+</span>
              <span className="absolute bottom-1.5 left-2 font-mono text-[9px] text-white/20 select-none">+</span>
              <span className="absolute bottom-1.5 right-2 font-mono text-[9px] text-white/20 select-none">+</span>

              <div>
                {/* Top Bar: Gate Index & Deliverable Tag */}
                <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-5 gap-2">
                  <span className="font-mono text-xs text-[#CC6600] tracking-wider font-semibold">
                    [{gate.index}] {gate.code}
                  </span>
                  <span className="font-mono text-[10px] text-white/50 tracking-wider uppercase truncate">
                    {gate.deliverableBadge}
                  </span>
                </div>

                {/* Gate Title */}
                <h3 className="text-xl sm:text-2xl font-sans font-normal text-white mb-2 tracking-tight">
                  {gate.title}
                </h3>

                {/* Gate Description */}
                <p className="text-sm font-sans text-white/70 leading-relaxed mb-6">
                  {gate.desc}
                </p>

                {/* CAD Vector Schematic Box */}
                <div className="bg-[#00000a] border border-white/10 p-3 mb-6 rounded-[2px]">
                  {gate.illustration}
                </div>
              </div>

              {/* Auditable Spec Matrix (2x2 Grid) */}
              <div className="border-t border-white/10 pt-4 grid grid-cols-2 gap-2">
                {gate.specs.map((spec, sIdx) => (
                  <div
                    key={sIdx}
                    className={[
                      "flex flex-col gap-0.5 font-mono p-2 bg-white/[0.02] border-l",
                      spec.isHighlight
                        ? "border-[#CC6600]"
                        : "border-sky-400/40",
                    ].join(" ")}
                  >
                    <span className="text-white/45 tracking-wider text-[9px] uppercase">
                      {spec.label}
                    </span>
                    <span
                      className={[
                        "text-xs font-medium tracking-wide",
                        spec.isHighlight ? "text-[#38bdf8]" : "text-white",
                      ].join(" ")}
                    >
                      {spec.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Quality Spec Matrix Panel (Syntethic-style Quality Standards) ── */}
        <div className="mt-6 p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[2px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6">
            <div>
              <div className="text-[10px] font-mono text-[#CC6600] tracking-wider uppercase font-semibold flex items-center gap-2 mb-1">
                <ShieldCheck size={16} weight="fill" className="text-[#CC6600]" />
                QUALITY ASSURANCE SPECIFICATION
              </div>
              <h4 className="text-lg sm:text-xl font-sans font-normal text-white">
                Statistical Accuracy & Defense Verification Standards
              </h4>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-[2px] border border-emerald-500/20 w-fit shrink-0">
              <CheckCircle size={14} weight="fill" className="text-emerald-400" />
              100% AUDIT REPRODUCIBILITY
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {QUALITY_STANDARDS.map((spec) => (
              <div
                key={spec.label}
                className="p-4 bg-white/[0.02] border border-white/5 rounded-[2px] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-baseline justify-between gap-2 mb-2">
                    <span className="text-2xl sm:text-3xl font-mono font-bold text-white">
                      {spec.metric}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-[2px]">
                      {spec.status}
                    </span>
                  </div>
                  <div className="text-xs font-sans font-medium text-white mb-1">
                    {spec.label}
                  </div>
                  <div className="text-xs font-sans text-white/50 leading-relaxed">
                    {spec.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
