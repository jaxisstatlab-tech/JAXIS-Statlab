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
    <section id="approach" className="section relative py-12 sm:py-16 lg:py-20 bg-[#010114]">
      <div className="w-full max-w-[90rem] mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 sm:mb-10">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.15em] text-[#CC6600] mb-2 font-medium">
              RESEARCH METHODOLOGIES
            </div>
            <h2 className="font-sans text-2xl sm:text-3xl lg:text-[1.875rem] font-medium text-white tracking-[-0.03em] leading-tight">
              Every statistical analysis your study needs
            </h2>
            <p className="font-mono text-xs sm:text-sm text-white/60 mt-2 max-w-3xl lg:max-w-4xl leading-relaxed">
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

        {/* 4-Column Asymmetric Bento Grid matching inspiration layout */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 bg-[#01142B] border border-white/10 rounded-[2px] overflow-hidden">
          
          {/* Card 1: 2x2 Hero Card (Top-Left, Spans 2 Cols and 2 Rows on Desktop) */}
          <div className="md:col-span-2 lg:col-span-2 lg:row-span-2 flex flex-col justify-between border-b lg:border-r border-white/10 relative">
            <div className="p-5 sm:p-6 lg:p-7 pb-3 font-mono">
              <Calculator weight="fill" className="w-5 h-5 sm:w-6 sm:h-6 text-[#CC6600] mb-2.5" />
              <h3 className="font-sans text-lg sm:text-xl font-medium text-white mb-1.5 tracking-[-0.02em]">
                Multi-Tier Statistical Consultation
              </h3>
              <p className="font-mono text-xs text-white/60 leading-relaxed max-w-lg mb-3">
                Complete parametric, non-parametric, and multivariate quantitative models calibrated to your Statement of the Problem. Every calculation is validated for methodology compliance and defense readiness.
              </p>
            </div>

            {/* Visual Deliverable Findings Preview */}
            <div className="p-5 pt-0 sm:p-6 sm:pt-0 lg:p-7 lg:pt-0">
              <div className="w-full rounded-[2px] border border-white/10 bg-[#010B18] overflow-hidden">
                {/* Mock Terminal/Document Header */}
                <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/10 bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#CC6600]" />
                    <span className="font-mono text-[11px] text-white/70">
                      OUTPUT_CHAPTER_4_FINDINGS.DOCX
                    </span>
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-white/60 px-2 py-0.5 rounded-[2px] bg-white/[0.06] border border-white/10">
                    APA 7TH VERIFIED
                  </span>
                </div>

                {/* Mock Table / Findings Preview */}
                <div className="p-3 sm:p-4 font-mono text-xs space-y-2">
                  <div className="grid grid-cols-5 text-white/40 text-[9.5px] uppercase tracking-wider pb-1.5 border-b border-white/10">
                    <span>Variable</span>
                    <span className="text-center">Mean (SD)</span>
                    <span className="text-center">Test Stat</span>
                    <span className="text-center">p-value</span>
                    <span className="text-right">Decision</span>
                  </div>
                  <div className="grid grid-cols-5 text-white/80 text-[10.5px] items-center py-0.5">
                    <span className="truncate font-sans font-medium text-white">Student Engagement</span>
                    <span className="text-center font-mono text-white/70">4.24 (0.58)</span>
                    <span className="text-center font-mono text-white/70">t = 4.18</span>
                    <span className="text-center font-mono text-white/90 font-semibold">&lt; .001</span>
                    <span className="text-right font-mono text-white/70">Significant</span>
                  </div>
                  <div className="grid grid-cols-5 text-white/80 text-[10.5px] items-center py-0.5">
                    <span className="truncate font-sans font-medium text-white">Academic Efficacy</span>
                    <span className="text-center font-mono text-white/70">3.91 (0.71)</span>
                    <span className="text-center font-mono text-white/70">F = 9.42</span>
                    <span className="text-center font-mono text-white/90 font-semibold">.002</span>
                    <span className="text-right font-mono text-white/70">Significant</span>
                  </div>
                  <div className="grid grid-cols-5 text-white/80 text-[10.5px] items-center py-0.5">
                    <span className="truncate font-sans font-medium text-white">Institutional Support</span>
                    <span className="text-center font-mono text-white/70">4.08 (0.62)</span>
                    <span className="text-center font-mono text-white/70">r = 0.64</span>
                    <span className="text-center font-mono text-white/90 font-semibold">&lt; .001</span>
                    <span className="text-right font-mono text-white/70">Significant</span>
                  </div>

                  {/* Diagnostic Footer */}
                  <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[9.5px] text-white/50">
                    <span className="flex items-center gap-1.5 text-white/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#CC6600]" />
                      Shapiro-Wilk Normality (p = .240, Normal)
                    </span>
                    <span className="text-white/40 font-mono">N = 384 Responses</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 (Top Right - Col 3, Row 1): Descriptive Statistics */}
          <div className="p-4 sm:p-5 flex flex-col justify-between border-b md:border-r border-white/10 relative">
            <div>
              <Table weight="fill" className="w-5 h-5 text-[#CC6600] mb-2" />
              <h3 className="font-sans text-sm sm:text-[15px] font-medium text-white mb-1">
                Descriptive Statistics
              </h3>
              <p className="font-mono text-xs text-white/60 leading-relaxed mb-3">
                Univariate distributions, demographic profiling, frequency distributions, and publication-ready demographic tables.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono">
              <span className="text-white font-bold">100%</span>
              <span className="text-white/40">Upfront delivery</span>
            </div>
          </div>

          {/* Card 3 (Top Right - Col 4, Row 1): Inferential Testing */}
          <div className="p-4 sm:p-5 flex flex-col justify-between border-b border-white/10 relative">
            <div>
              <ChartLineUp weight="fill" className="w-5 h-5 text-[#CC6600] mb-2" />
              <h3 className="font-sans text-sm sm:text-[15px] font-medium text-white mb-1">
                Inferential Testing
              </h3>
              <p className="font-mono text-xs text-white/60 leading-relaxed mb-3">
                Parametric & non-parametric testing: t-Tests, ANOVA, ANCOVA, Pearson r, and Multiple Linear Regression models.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono">
              <span className="text-white font-bold">50/50</span>
              <span className="text-white/40">Milestone escrow</span>
            </div>
          </div>

          {/* Card 4 (Middle Right - Col 3, Row 2): Multivariate SEM & PLS */}
          <div className="p-4 sm:p-5 flex flex-col justify-between border-b md:border-r border-white/10 relative">
            <div>
              <TreeStructure weight="fill" className="w-5 h-5 text-[#CC6600] mb-2" />
              <h3 className="font-sans text-sm sm:text-[15px] font-medium text-white mb-1">
                Multivariate Modeling
              </h3>
              <p className="font-mono text-xs text-white/60 leading-relaxed mb-3">
                Structural Equation Modeling (SEM/PLS), Confirmatory Factor Analysis (CFA/EFA), path diagrams, and fit indices.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono">
              <span className="text-white font-bold">Doctoral</span>
              <span className="text-white/40">Scopus/WOS grade</span>
            </div>
          </div>

          {/* Card 5 (Middle Right - Col 4, Row 2): Dual-Auditor QA */}
          <div className="p-4 sm:p-5 flex flex-col justify-between border-b border-white/10 relative">
            <div>
              <ShieldCheck weight="fill" className="w-5 h-5 text-[#CC6600] mb-2" />
              <h3 className="font-sans text-sm sm:text-[15px] font-medium text-white mb-1">
                Dual-Pass Peer Review
              </h3>
              <p className="font-mono text-xs text-white/60 leading-relaxed mb-3">
                100% calculation concordance check by a secondary Senior QA Lead before client release. Zero computation errors.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono">
              <span className="text-white font-bold">r = 1.00</span>
              <span className="text-white/40">Concordance gate</span>
            </div>
          </div>

          {/* Card 6: 2x1 Wide Card (Bottom Left - Spans 2 Cols, 1 Row): Reproducible Scripts */}
          <div className="md:col-span-2 lg:col-span-2 p-4 sm:p-5 lg:p-6 flex flex-col justify-between border-b md:border-b-0 lg:border-r border-white/10 relative">
            <div>
              <Code weight="fill" className="w-5 h-5 sm:w-6 sm:h-6 text-[#CC6600] mb-2" />
              <h3 className="font-sans text-sm sm:text-base font-medium text-white mb-1">
                Reproducible Computational Scripts (.R / SPSS / Python)
              </h3>
              <p className="font-mono text-xs text-white/60 leading-relaxed mb-3 max-w-xl">
                Every study includes clean, documented, reproducible statistical scripts. Full audit trails, codebooks, and transformation logs ensure complete methodological transparency for your defense panel.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono">
              <span className="text-white font-bold">100%</span>
              <span className="text-white/40">Complete script ownership</span>
            </div>
          </div>

          {/* Card 7 (Bottom Right - Col 3, Row 3): Instrument Reliability */}
          <div className="p-4 sm:p-5 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/10 relative">
            <div>
              <CheckCircle weight="fill" className="w-5 h-5 text-[#CC6600] mb-2" />
              <h3 className="font-sans text-sm sm:text-[15px] font-medium text-white mb-1">
                Instrument Reliability
              </h3>
              <p className="font-mono text-xs text-white/60 leading-relaxed mb-3">
                Cronbach’s alpha, McDonald’s omega, item-total correlation, and construct validity screening.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono">
              <span className="text-white font-bold">α &gt; .80</span>
              <span className="text-white/40">Reliability target</span>
            </div>
          </div>

          {/* Card 8 (Bottom Right - Col 4, Row 3): DefenseLab Coaching */}
          <div className="p-4 sm:p-5 flex flex-col justify-between relative">
            <div>
              <GraduationCap weight="fill" className="w-5 h-5 text-[#CC6600] mb-2" />
              <h3 className="font-sans text-sm sm:text-[15px] font-medium text-white mb-1">
                DefenseLab™ Coaching
              </h3>
              <p className="font-mono text-xs text-white/60 leading-relaxed mb-3">
                1-on-1 simulated oral defense coaching with a senior statistician. Scripted talking points and panel Q&A preparation.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono">
              <span className="text-white font-bold">1-on-1</span>
              <span className="text-white/40">Simulated oral panel</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
