"use client";

import React from "react";
import { Button, Badge, MoneyDisplay } from "@repo/ui";
import {
  Printer,
  Clock,
  Check,
} from "@phosphor-icons/react";
import type { SOWDetailItem } from "../schemas";

export interface SowDocumentProps {
  sow: SOWDetailItem;
  className?: string;
  showPrintAction?: boolean;
}

export function SowDocument({
  sow,
  className = "",
  showPrintAction = true,
}: SowDocumentProps) {
  const { contentSnapshot } = sow;
  const { client, project, commercial, delivery, terms } = contentSnapshot;

  const handlePrint = () => {
    window.print();
  };

  const contractRef = `JAXIS-SOW-${sow.id.slice(-8).toUpperCase()}`;

  return (
    <div className={`flex flex-col gap-6 w-full max-w-5xl mx-auto print:max-w-none print:w-full print:m-0 print:p-0 ${className}`}>
      {/* ── Document Control Toolbar (hidden in print) ── */}
      {showPrintAction && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-sans text-white/50 tracking-wider">
                Document Ref:
              </span>
              <code className="text-xs font-mono font-semibold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-[2px] border border-sky-500/30">
                {contractRef}
              </code>
            </div>

            {sow.isLocked ? (
              <Badge variant="emerald" className="font-mono text-xs px-2.5 py-1">
                <Check size={13} weight="bold" className="mr-1.5" />
                SIGNED &amp; LEGALLY LOCKED
              </Badge>
            ) : (
              <Badge variant="amber" className="font-mono text-xs px-2.5 py-1">
                <Clock size={13} weight="fill" className="mr-1.5" />
                AWAITING SIGNATURE
              </Badge>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handlePrint}
            className="text-xs font-sans font-semibold tracking-wider flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.10] px-4 py-2 rounded-[2px]"
          >
            <Printer size={16} weight="fill" />
            <span>Print / Save PDF</span>
          </Button>
        </div>
      )}

      {/* ── Pure Document Sheet ── */}
      <div className="sow-print-container bg-[#011126] border border-white/[0.12] rounded-[2px] p-8 sm:p-12 lg:p-16 text-white shadow-2xl relative print:bg-white print:text-black print:border-none print:p-0 print:shadow-none font-sans">
        
        {/* ── Document Header ── */}
        <div className="border-b-2 border-white/20 print:border-black/30 pb-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-[0.688rem] font-mono font-bold tracking-[0.2em] text-[#FFA040] print:text-amber-800 uppercase block mb-1">
                Academic Statistical Consulting Agreement
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white print:text-black uppercase">
                Statement of Work
              </h1>
              <p className="text-xs font-mono text-white/60 print:text-black/60 mt-1">
                Contract Reference: <strong className="text-white print:text-black">{contractRef}</strong> · Intake ID: <strong className="text-white print:text-black">{project.intakeId}</strong>
              </p>
            </div>

            <div className="text-left sm:text-right font-sans text-xs text-white/70 print:text-black/70 space-y-1">
              <div><span className="text-white/40 print:text-black/50">Execution Date:</span> <strong className="text-white print:text-black font-mono">{new Date(sow.generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong></div>
              <div><span className="text-white/40 print:text-black/50">Contract Type:</span> <strong className="text-white print:text-black">{sow.sowType === "PRIMARY" ? "Primary Research SOW" : "Supplemental SOW"}</strong></div>
              <div><span className="text-white/40 print:text-black/50">Turnaround SLA:</span> <strong className="text-white print:text-black font-mono">{delivery.turnaroundDays} Business Days</strong></div>
            </div>
          </div>
        </div>

        {/* ── Section 1: Parties to the Agreement ── */}
        <div className="mb-8 sow-print-section print-avoid-break">
          <h2 className="text-xs font-mono font-bold tracking-wider text-[#FFA040] print:text-amber-800 uppercase border-b border-white/10 print:border-black/20 pb-1.5 mb-4">
            1. Parties to the Agreement
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-8 text-xs sm:text-sm leading-relaxed">
            <div className="space-y-1">
              <span className="font-mono text-[0.688rem] uppercase tracking-wider text-sky-400 print:text-sky-700 font-semibold block">
                Client / Lead Researcher
              </span>
              <p className="font-bold text-white print:text-black text-sm sm:text-base">
                {client.fullName}
              </p>
              <p className="text-white/70 print:text-black/70">
                {client.academicProgram || "Academic Degree Program"}
              </p>
              <p className="text-white/70 print:text-black/70">
                {client.institution || "Institutional Affiliate"}
              </p>
              <p className="font-mono text-white/50 print:text-black/50 text-xs pt-1">
                {client.email} · {client.contactNumber || "On File"}
              </p>
            </div>

            <div className="space-y-1">
              <span className="font-mono text-[0.688rem] uppercase tracking-wider text-[#FFA040] print:text-amber-800 font-semibold block">
                Service Provider
              </span>
              <p className="font-bold text-white print:text-black text-sm sm:text-base">
                JAXIS STATLAB CONSULTANCY
              </p>
              <p className="text-white/70 print:text-black/70">
                Division of Advanced Statistical Computing
              </p>
              <p className="text-white/70 print:text-black/70">
                Academic Research &amp; Psychometrics Division
              </p>
              <p className="font-mono text-white/50 print:text-black/50 text-xs pt-1">
                ops@jaxis.dev · Manila, Philippines
              </p>
            </div>
          </div>
        </div>

        {/* ── Section 2: Research Study Objectives & Empirical Scope ── */}
        <div className="mb-8 sow-print-section print-avoid-break">
          <h2 className="text-xs font-mono font-bold tracking-wider text-[#FFA040] print:text-amber-800 uppercase border-b border-white/10 print:border-black/20 pb-1.5 mb-4">
            2. Research Study Objectives &amp; Empirical Scope
          </h2>

          <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-white/90 print:text-black/90">
            <div>
              <span className="font-mono text-[0.688rem] uppercase tracking-wider text-white/50 print:text-black/50 block mb-0.5">
                Research Study Title
              </span>
              <p className="font-semibold text-white print:text-black text-sm sm:text-base">
                {project.researchTitle}
              </p>
            </div>

            <div>
              <span className="font-mono text-[0.688rem] uppercase tracking-wider text-white/50 print:text-black/50 block mb-0.5">
                Statement of Research Objectives
              </span>
              <p className="text-white/80 print:text-black/80 whitespace-pre-line leading-relaxed">
                {project.researchObjectives}
              </p>
            </div>

            {project.researchQuestions && (
              <div>
                <span className="font-mono text-[0.688rem] uppercase tracking-wider text-white/50 print:text-black/50 block mb-0.5">
                  Primary Research Questions / Hypotheses
                </span>
                <p className="text-white/80 print:text-black/80 whitespace-pre-line leading-relaxed">
                  {project.researchQuestions}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Section 3: Commercial Terms & Payment Schedule ── */}
        <div className="mb-8 sow-print-section print-avoid-break">
          <h2 className="text-xs font-mono font-bold tracking-wider text-[#FFA040] print:text-amber-800 uppercase border-b border-white/10 print:border-black/20 pb-1.5 mb-4">
            3. Commercial Terms &amp; Milestone Payment Schedule
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/15 print:border-black/20 text-white/50 print:text-black/50 font-mono text-[0.688rem] uppercase">
                  <th className="py-2.5 pr-4">Milestone Item</th>
                  <th className="py-2.5 px-4">Description / Conditions</th>
                  <th className="py-2.5 pl-4 text-right">Amount (PHP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 print:divide-black/10 text-white/90 print:text-black/90">
                <tr>
                  <td className="py-3 pr-4 font-semibold text-white print:text-black">
                    Agreed Package: {commercial.packageLabel}
                  </td>
                  <td className="py-3 px-4 text-white/70 print:text-black/70 text-xs">
                    Comprehensive statistical analysis, methodology verification, and summary report.
                  </td>
                  <td className="py-3 pl-4 text-right font-mono font-semibold text-white print:text-black">
                    <MoneyDisplay amount={commercial.basePrice} />
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-semibold text-[#FFA040] print:text-amber-800">
                    Downpayment (To Start)
                  </td>
                  <td className="py-3 px-4 text-white/70 print:text-black/70 text-xs">
                    Required prior to commencing analytical computation and statistician assignment.
                  </td>
                  <td className="py-3 pl-4 text-right font-mono font-bold text-[#FFA040] print:text-amber-800">
                    <MoneyDisplay amount={commercial.downpaymentRequired} />
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-semibold text-emerald-400 print:text-emerald-700">
                    Final Release Balance
                  </td>
                  <td className="py-3 px-4 text-white/70 print:text-black/70 text-xs">
                    Payable prior to final handoff of analytical scripts and raw dataset models.
                  </td>
                  <td className="py-3 pl-4 text-right font-mono font-bold text-emerald-400 print:text-emerald-700">
                    <MoneyDisplay amount={commercial.balanceDue} />
                  </td>
                </tr>
                <tr className="border-t-2 border-white/20 print:border-black/30 font-bold">
                  <td className="py-3 pr-4 text-white print:text-black uppercase font-mono text-xs">
                    Total Contract Consideration
                  </td>
                  <td className="py-3 px-4"></td>
                  <td className="py-3 pl-4 text-right font-mono text-base text-white print:text-black">
                    <MoneyDisplay amount={commercial.basePrice} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Section 4: Terms of Service & Legal Boundaries ── */}
        <div className="mb-10 sow-print-section print-avoid-break">
          <h2 className="text-xs font-mono font-bold tracking-wider text-[#FFA040] print:text-amber-800 uppercase border-b border-white/10 print:border-black/20 pb-1.5 mb-4">
            4. Terms of Service &amp; Legal Boundaries
          </h2>

          <div className="space-y-3.5 text-xs sm:text-sm text-white/80 print:text-black/80 leading-relaxed font-sans">
            <div>
              <strong className="text-white print:text-black font-semibold">4.1 Turnaround &amp; Service Level Agreement: </strong>
              <span>
                Standard turnaround for the execution of this analysis is{" "}
                <strong className="text-white print:text-black font-mono font-bold">{delivery.turnaroundDays} business days</strong>. {delivery.slaStartTrigger}
              </span>
            </div>

            <div>
              <strong className="text-white print:text-black font-semibold">4.2 Revisions Policy: </strong>
              <span>{terms.revisionPolicy}</span>
            </div>

            <div>
              <strong className="text-white print:text-black font-semibold">4.3 Communication Firewall: </strong>
              <span>{terms.communicationPolicy}</span>
            </div>

            <div>
              <strong className="text-white print:text-black font-semibold">4.4 Authorship &amp; Academic Responsibility: </strong>
              <span>{terms.liabilityBoundary}</span>
            </div>

            {terms.customTerms && (
              <div className="pt-2">
                <strong className="text-[#FFA040] print:text-amber-800 font-semibold block text-xs font-mono uppercase tracking-wider mb-1">
                  4.5 Special Project Clauses:
                </strong>
                <p className="text-white/90 print:text-black/90 whitespace-pre-line">{terms.customTerms}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Section 5: Contract Execution & Signatures ── */}
        <div className="pt-6 border-t-2 border-white/20 print:border-black/30 sow-print-section print-avoid-break">
          <h2 className="text-xs font-mono font-bold tracking-wider text-[#FFA040] print:text-amber-800 uppercase mb-8">
            5. Contract Execution &amp; Certified Signatures
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-12 sm:gap-16">
            {/* Client Signature Block */}
            <div className="flex flex-col justify-end space-y-2">
              <span className="text-[0.688rem] font-mono uppercase tracking-wider text-white/50 print:text-black/50 block mb-1">
                Lead Researcher (Client)
              </span>

              {sow.isLocked && sow.signedByName ? (
                <div className="min-h-[64px] flex flex-col justify-end">
                  <p className="font-signature text-4xl sm:text-5xl text-emerald-400 print:text-emerald-900 leading-none select-none tracking-normal py-1">
                    {sow.signedByName}
                  </p>
                </div>
              ) : (
                <div className="min-h-[64px] flex items-center">
                  <p className="text-xs text-amber-400/90 print:text-amber-700 font-mono italic">
                    [Awaiting Client Digital Signature]
                  </p>
                </div>
              )}

              {/* Ruled Signature Line */}
              <div className="border-b border-white/40 print:border-black/50 w-full" />

              <div className="text-xs font-sans space-y-0.5 pt-1 text-white/70 print:text-black/70">
                <p className="font-semibold text-white print:text-black">{client.fullName}</p>
                <p className="font-mono text-[0.688rem] text-white/50 print:text-black/50">
                  Date: {sow.signedAt ? new Date(sow.signedAt).toLocaleString("en-US") : "Pending Execution"}
                </p>
                <p className="font-mono text-[0.688rem] text-white/50 print:text-black/50">
                  Digital Verification ID: {sow.signedByUserId?.slice(-8).toUpperCase() || "PENDING"}
                </p>
              </div>
            </div>

            {/* Provider Signature Block */}
            <div className="flex flex-col justify-end space-y-2">
              <span className="text-[0.688rem] font-mono uppercase tracking-wider text-white/50 print:text-black/50 block mb-1">
                For JAXIS StatLab Consultancy
              </span>

              <div className="min-h-[64px] flex flex-col justify-end">
                <p className="font-signature text-3xl sm:text-4xl text-sky-400 print:text-sky-900 leading-none select-none tracking-normal py-1">
                  Jaxis StatLab Governance
                </p>
              </div>

              {/* Ruled Signature Line */}
              <div className="border-b border-white/40 print:border-black/50 w-full" />

              <div className="text-xs font-sans space-y-0.5 pt-1 text-white/70 print:text-black/70">
                <p className="font-semibold text-white print:text-black">Authorized Commercial Officer</p>
                <p className="font-mono text-[0.688rem] text-white/50 print:text-black/50">
                  Date Generated: {new Date(sow.generatedAt).toLocaleDateString("en-US")}
                </p>
                <p className="font-mono text-[0.688rem] text-white/50 print:text-black/50">
                  Status: {sow.isLocked ? "EXECUTION_COMPLETE" : "GENERATED_PENDING_CLIENT"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
