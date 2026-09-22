"use client";

import React from "react";
import Link from "next/link";
import {
  Calculator,
  Table,
  ChartLineUp,
  TreeStructure,
  ShieldCheck,
  Code,
  CheckCircle,
  GraduationCap,
} from "@phosphor-icons/react";

export default function Approach() {
  return (
    <section id="approach" className="section relative py-20 lg:py-24 bg-[#010114]">
      <div className="w-full max-w-[73.625rem] mx-auto px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.15em] text-[#CC6600] mb-2 font-medium">
              RESEARCH METHODOLOGIES
            </div>
            <h2 className="font-sans text-2xl sm:text-3xl lg:text-[1.875rem] font-medium text-white tracking-[-0.03em] leading-tight">
              Every statistical analysis your study needs
            </h2>
            <p className="font-mono text-xs sm:text-sm text-white/60 mt-3 max-w-xl leading-relaxed">
              From dataset screening to oral defense — peer-reviewed statistical deliverables in publication-ready formats.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Link
              href="/dashboard/client/quotations"
              className="inline-flex items-center justify-center gap-2.5 px-5 py-2.5 bg-[#CC6600] text-white font-sans text-xs sm:text-sm font-medium rounded-[2px] hover:bg-[#b35500] transition-colors active:scale-[0.97]"
            >
              <span>Get a quotation</span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
            </Link>
          </div>
        </div>

        {/* 4-Column Asymmetric Bento Grid matching Syntethic Section 2 layout */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 bg-[#01142B] border border-white/10 rounded-[2px] overflow-hidden">
          
          {/* Card 1: 2x2 Hero Card (Top-Left, Spans 2 Cols and 2 Rows on Desktop) */}
          <div className="md:col-span-2 lg:col-span-2 lg:row-span-2 flex flex-col justify-between border-b md:border-b lg:border-r border-white/10 relative">
            <div className="p-6 sm:p-8 lg:p-10 font-mono">
              <Calculator weight="fill" className="w-8 h-8 text-[#CC6600] mb-4" />
              <h3 className="font-sans text-xl sm:text-2xl font-medium text-white mb-2 tracking-[-0.02em]">
                Multi-Tier Statistical Consultation
              </h3>
              <p className="font-mono text-xs sm:text-sm text-white/60 leading-relaxed max-w-lg">
                Complete parametric, non-parametric, and multivariate quantitative models calibrated to your Statement of the Problem. Every calculation is validated for methodology compliance and defense readiness.
              </p>
            </div>

            {/* Visual Deliverable Image Placeholder */}
            <div className="p-6 pt-0 sm:p-8 sm:pt-0 lg:p-10 lg:pt-0">
              <div className="w-full rounded-[2px] border border-white/10 bg-[#010B18] overflow-hidden">
                {/* Mock Terminal/Document Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#CC6600]" />
                    <span className="font-mono text-[11px] text-white/70">
                      OUTPUT_CHAPTER_4_FINDINGS.DOCX
                    </span>
                  </div>
                  <span className="font-mono text-[10px] uppercase text-[#38BDF8] px-2 py-0.5 rounded-[2px] bg-[#38BDF8]/10 border border-[#38BDF8]/20">
                    APA 7TH VERIFIED
                  </span>
                </div>

                {/* Mock Table / Findings Preview */}
                <div className="p-4 sm:p-5 font-mono text-xs space-y-3">
                  <div className="grid grid-cols-5 text-white/40 text-[10px] uppercase tracking-wider pb-2 border-b border-white/10">
                    <span>Variable</span>
                    <span className="text-center">Mean (SD)</span>
                    <span className="text-center">Test Stat</span>
                    <span className="text-center">p-value</span>
                    <span className="text-right">Decision</span>
                  </div>
                  <div className="grid grid-cols-5 text-white/80 text-[11px] items-center py-1">
                    <span className="truncate font-sans font-medium text-white">Student Engagement</span>
                    <span className="text-center font-mono text-white/70">4.24 (0.58)</span>
                    <span className="text-center font-mono text-white/70">t = 4.18</span>
                    <span className="text-center font-mono text-emerald-400 font-semibold">&lt; .001</span>
                    <span className="text-right font-mono text-sky-400">Significant</span>
                  </div>
                  <div className="grid grid-cols-5 text-white/80 text-[11px] items-center py-1">
                    <span className="truncate font-sans font-medium text-white">Academic Efficacy</span>
                    <span className="text-center font-mono text-white/70">3.91 (0.71)</span>
                    <span className="text-center font-mono text-white/70">F = 9.42</span>
                    <span className="text-center font-mono text-emerald-400 font-semibold">.002</span>
                    <span className="text-right font-mono text-sky-400">Significant</span>
                  </div>
                  <div className="grid grid-cols-5 text-white/80 text-[11px] items-center py-1">
                    <span className="truncate font-sans font-medium text-white">Institutional Support</span>
                    <span className="text-center font-mono text-white/70">4.08 (0.62)</span>
                    <span className="text-center font-mono text-white/70">r = 0.64</span>
                    <span className="text-center font-mono text-emerald-400 font-semibold">&lt; .001</span>
                    <span className="text-right font-mono text-sky-400">Significant</span>
                  </div>

                  {/* Diagnostic Footer */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/50">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Shapiro-Wilk Normality (p = .240, Normal)
                    </span>
                    <span className="text-white/40 font-mono">N = 384 Responses</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 (Top Right - Col 3, Row 1): Descriptive Statistics */}
          <div className="p-6 flex flex-col justify-between border-b md:border-r border-white/10 relative">
            <div>
              <Table weight="fill" className="w-6 h-6 text-sky-400 mb-3" />
              <h3 className="font-sans text-base font-medium text-white mb-1.5">
                Descriptive Statistics
              </h3>
              <p className="font-mono text-xs text-white/60 leading-relaxed mb-6">
                Univariate distributions, demographic profiling, frequency distributions, and publication-ready demographic tables.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-white font-bold">100%</span>
              <span className="text-white/40">Upfront delivery</span>
            </div>
          </div>

          {/* Card 3 (Top Right - Col 4, Row 1): Inferential Testing */}
          <div className="p-6 flex flex-col justify-between border-b border-white/10 relative">
            <div>
              <ChartLineUp weight="fill" className="w-6 h-6 text-[#CC6600] mb-3" />
              <h3 className="font-sans text-base font-medium text-white mb-1.5">
                Inferential Testing
              </h3>
              <p className="font-mono text-xs text-white/60 leading-relaxed mb-6">
                Parametric & non-parametric testing: t-Tests, ANOVA, ANCOVA, Pearson r, and Multiple Linear Regression models.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-white font-bold">50/50</span>
              <span className="text-white/40">Milestone escrow</span>
            </div>
          </div>

          {/* Card 4 (Middle Right - Col 3, Row 2): Multivariate SEM & PLS */}
          <div className="p-6 flex flex-col justify-between border-b md:border-r border-white/10 relative">
            <div>
              <TreeStructure weight="fill" className="w-6 h-6 text-emerald-400 mb-3" />
              <h3 className="font-sans text-base font-medium text-white mb-1.5">
                Multivariate Modeling
              </h3>
              <p className="font-mono text-xs text-white/60 leading-relaxed mb-6">
                Structural Equation Modeling (SEM/PLS), Confirmatory Factor Analysis (CFA/EFA), path diagrams, and fit indices.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-white font-bold">Doctoral</span>
              <span className="text-white/40">Scopus/WOS grade</span>
            </div>
          </div>

          {/* Card 5 (Middle Right - Col 4, Row 2): Dual-Auditor QA */}
          <div className="p-6 flex flex-col justify-between border-b border-white/10 relative">
            <div>
              <ShieldCheck weight="fill" className="w-6 h-6 text-[#CC6600] mb-3" />
              <h3 className="font-sans text-base font-medium text-white mb-1.5">
                Dual-Pass Peer Review
              </h3>
              <p className="font-mono text-xs text-white/60 leading-relaxed mb-6">
                100% calculation concordance check by a secondary Senior QA Lead before client release. Zero computation errors.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-white font-bold">r = 1.00</span>
              <span className="text-white/40">Concordance gate</span>
            </div>
          </div>

          {/* Card 6: 2x1 Wide Card (Bottom Left - Spans 2 Cols, 1 Row): Reproducible Scripts */}
          <div className="md:col-span-2 lg:col-span-2 p-6 sm:p-8 flex flex-col justify-between border-b md:border-b lg:border-b-0 lg:border-r border-white/10 relative">
            <div>
              <Code weight="fill" className="w-7 h-7 text-[#CC6600] mb-3" />
              <h3 className="font-sans text-base sm:text-lg font-medium text-white mb-1.5">
                Reproducible Computational Scripts (.R / SPSS / Python)
              </h3>
              <p className="font-mono text-xs sm:text-sm text-white/60 leading-relaxed mb-6 max-w-xl">
                Every study includes clean, documented, reproducible statistical scripts. Full audit trails, codebooks, and transformation logs ensure complete methodological transparency for your defense panel.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-white font-bold">100%</span>
              <span className="text-white/40">Complete script ownership</span>
            </div>
          </div>

          {/* Card 7 (Bottom Right - Col 3, Row 3): Instrument Reliability */}
          <div className="p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/10 relative">
            <div>
              <CheckCircle weight="fill" className="w-6 h-6 text-sky-400 mb-3" />
              <h3 className="font-sans text-base font-medium text-white mb-1.5">
                Instrument Reliability
              </h3>
              <p className="font-mono text-xs text-white/60 leading-relaxed mb-6">
                Cronbach’s alpha, McDonald’s omega, item-total correlation, and construct validity screening.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-white font-bold">α &gt; .80</span>
              <span className="text-white/40">Reliability target</span>
            </div>
          </div>

          {/* Card 8 (Bottom Right - Col 4, Row 3): DefenseLab Coaching */}
          <div className="p-6 flex flex-col justify-between relative">
            <div>
              <GraduationCap weight="fill" className="w-6 h-6 text-amber-400 mb-3" />
              <h3 className="font-sans text-base font-medium text-white mb-1.5">
                DefenseLab™ Coaching
              </h3>
              <p className="font-mono text-xs text-white/60 leading-relaxed mb-6">
                1-on-1 simulated oral defense coaching with a senior statistician. Scripted talking points and panel Q&A preparation.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-white font-bold">1-on-1</span>
              <span className="text-white/40">Simulated oral panel</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
