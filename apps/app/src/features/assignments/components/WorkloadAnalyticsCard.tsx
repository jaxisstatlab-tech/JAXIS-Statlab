"use client";

import React, { useState } from "react";
import { Card, Badge } from "@repo/ui";
import {
  IconChartBar,
  IconScale,
  IconAlertTriangle,
  IconCheck,
  IconActivity,
  IconUserCheck,
  IconShieldCheck,
} from "@tabler/icons-react";
import type { StaffCapacityItem } from "../schemas";

interface WorkloadAnalyticsCardProps {
  statisticians: StaffCapacityItem[];
  qaLeads: StaffCapacityItem[];
}

export function WorkloadAnalyticsCard({
  statisticians,
  qaLeads,
}: WorkloadAnalyticsCardProps) {
  const [activeTab, setActiveTab] = useState<"STATISTICIAN" | "QA">("STATISTICIAN");

  const allStaff = [...statisticians, ...qaLeads];
  const currentStaffList = activeTab === "STATISTICIAN" ? statisticians : qaLeads;

  // 1. Calculate Balance & Fairness Index
  const totalAssigned = currentStaffList.reduce((acc, s) => acc + s.activeAssignmentCount, 0);
  const avgLoad = currentStaffList.length > 0 ? totalAssigned / currentStaffList.length : 0;
  
  const variance =
    currentStaffList.length > 0
      ? currentStaffList.reduce((acc, s) => acc + Math.pow(s.activeAssignmentCount - avgLoad, 2), 0) /
        currentStaffList.length
      : 0;
  const stdDev = Math.sqrt(variance);
  // Lower stdDev means more even distribution; 0 stdDev = 100% balanced
  const balanceIndex = currentStaffList.length > 0 ? Math.max(60, Math.min(100, Math.round(100 - stdDev * 18))) : 100;

  // 2. Burnout Risk Count
  const atRiskStaff = allStaff.filter((s) => s.burnoutRisk?.isAtRisk);
  const deadlineCollisions = allStaff.filter((s) =>
    s.burnoutRisk?.reasons.some((r) => r.toLowerCase().includes("collision"))
  );

  // 3. Domain Distribution Analysis
  const domainCounts: Record<string, number> = {};
  for (const s of statisticians) {
    for (const study of s.assignedStudies) {
      const field = study.title.toLowerCase().includes("health") || study.title.toLowerCase().includes("pharma")
        ? "Biostatistics & Public Health"
        : study.title.toLowerCase().includes("finance") || study.title.toLowerCase().includes("microfinance")
        ? "Econometrics & Finance"
        : study.title.toLowerCase().includes("learning") || study.title.toLowerCase().includes("predictive")
        ? "Machine Learning & AI"
        : "Quantitative Social Sciences";
      domainCounts[field] = (domainCounts[field] || 0) + 1;
    }
  }

  const domainTotal = Object.values(domainCounts).reduce((a, b) => a + b, 0);
  const domainColors = [
    "bg-[#38BDF8]",
    "bg-[#CC6600]",
    "bg-[#10B981]",
    "bg-[#A855F7]",
  ];

  return (
    <Card className="p-0 overflow-hidden border border-white/10 bg-[#0A0A18]/90 rounded-[2px] font-sans">
      {/* Card Header */}
      <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#CC6600]/10 border border-[#CC6600]/30 rounded-[2px] text-[#CC6600]">
              <IconChartBar size={18} stroke={2} />
            </div>
            <h2 className="text-base font-semibold text-white tracking-normal font-sans">
              Workload Distribution &amp; Burnout Analytics
            </h2>
          </div>
          <p className="text-xs text-white/60 mt-1 font-sans">
            Real-time capacity tracking, task balance metrics, and burnout prevention telemetry
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-black/40 p-1 border border-white/10 rounded-[2px] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("STATISTICIAN")}
            className={`px-3 py-1 text-xs font-sans font-semibold rounded-[2px] transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === "STATISTICIAN"
                ? "bg-[#CC6600] text-white"
                : "text-white/60 hover:text-white"
            }`}
          >
            <IconUserCheck size={14} stroke={2} />
            <span>Statisticians ({statisticians.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("QA")}
            className={`px-3 py-1 text-xs font-sans font-semibold rounded-[2px] transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === "QA"
                ? "bg-[#CC6600] text-white"
                : "text-white/60 hover:text-white"
            }`}
          >
            <IconShieldCheck size={14} stroke={2} />
            <span>QA Leads ({qaLeads.length})</span>
          </button>
        </div>
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
        {/* Left Column: Visual Capacity Bar Chart (7 Cols) */}
        <div className="lg:col-span-7 p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-white/50 tracking-wider font-semibold">
              Specialist Capacity Spectrum (Max Threshold: 3 Active Studies)
            </span>
            <div className="flex items-center gap-3 text-[0.688rem] font-mono text-white/40">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#10B981]" /> Light (0-1)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#38BDF8]" /> Optimal (2)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#F59E0B]" /> Full (3)
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {currentStaffList.length === 0 ? (
              <div className="py-8 text-center text-xs text-white/40 italic">
                No specialists registered in this directory.
              </div>
            ) : (
              currentStaffList.map((specialist) => {
                const count = specialist.activeAssignmentCount;
                // Max representation is 4 for scale
                const percentage = Math.min(100, Math.round((count / 4) * 100));
                const isAtRisk = specialist.burnoutRisk?.isAtRisk;

                const barColor =
                  count === 0
                    ? "bg-slate-700"
                    : count === 1
                    ? "bg-[#10B981]"
                    : count === 2
                    ? "bg-[#38BDF8]"
                    : count === 3
                    ? "bg-[#F59E0B]"
                    : "bg-[#EF4444]";

                return (
                  <div key={specialist.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-white truncate">
                          {specialist.fullName}
                        </span>
                        {isAtRisk && (
                          <Badge variant="amber" className="text-[0.625rem] py-0 px-1 font-mono flex items-center gap-0.5">
                            <IconAlertTriangle size={10} stroke={2} />
                            <span>Burnout Risk</span>
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs text-white font-semibold">
                          {count} {count === 1 ? "study" : "studies"}
                        </span>
                        <span className="text-[0.688rem] text-white/40 font-mono">
                          ({percentage}% cap)
                        </span>
                      </div>
                    </div>

                    {/* Progress Track with Reference Threshold Line at 75% (3 studies) */}
                    <div className="relative h-2.5 w-full bg-black/50 rounded-[2px] overflow-hidden border border-white/5">
                      {/* 75% threshold guide marker */}
                      <div
                        className="absolute top-0 bottom-0 left-[75%] w-0.5 bg-white/20 z-10"
                        title="Burnout Warning Threshold: 3 studies"
                      />
                      <div
                        className={`h-full ${barColor} transition-all duration-500 rounded-[2px]`}
                        style={{ width: `${Math.max(percentage, count > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2 flex items-center justify-between text-[0.688rem] text-white/40 font-mono border-t border-white/5">
            <span>Guide: White line marks the 3-study burnout warning threshold</span>
            <span>Avg: {avgLoad.toFixed(1)} studies / specialist</span>
          </div>
        </div>

        {/* Right Column: Balance Index & Domain Allocation (5 Cols) */}
        <div className="lg:col-span-5 p-6 flex flex-col gap-6 bg-black/20">
          {/* Fairness & Balance Metric */}
          <div className="p-4 bg-[#0A0A18] border border-white/10 rounded-[2px] flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[0.688rem] uppercase font-mono text-white/50 font-semibold flex items-center gap-1.5">
                <IconScale size={14} stroke={2} className="text-[#38BDF8]" />
                <span>Task Distribution Index</span>
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-white">
                  {balanceIndex}%
                </span>
                <span className="text-xs text-emerald-400 font-sans font-medium">
                  {balanceIndex >= 85 ? "Evenly Balanced" : "Moderate Variance"}
                </span>
              </div>
              <span className="text-[0.688rem] text-white/40">
                Tasks distributed across available specialists
              </span>
            </div>

            <div className="h-12 w-12 rounded-full border-2 border-[#10B981] flex items-center justify-center text-[#10B981] bg-[#10B981]/10">
              <IconCheck size={22} stroke={2.5} />
            </div>
          </div>

          {/* Burnout Risk Telemetry Card */}
          <div className="p-4 bg-[#0A0A18] border border-white/10 rounded-[2px] flex flex-col gap-2.5">
            <span className="text-[0.688rem] uppercase font-mono text-white/50 font-semibold flex items-center gap-1.5">
              <IconActivity size={14} stroke={2} className="text-[#F59E0B]" />
              <span>Burnout Guard Health</span>
            </span>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 bg-black/40 border border-white/5 rounded-[2px]">
                <span className="text-[0.688rem] text-white/40 block font-mono">Overload Risk</span>
                <span
                  className={`text-base font-bold font-mono ${
                    atRiskStaff.length > 0 ? "text-amber-400" : "text-emerald-400"
                  }`}
                >
                  {atRiskStaff.length} {atRiskStaff.length === 1 ? "Specialist" : "Specialists"}
                </span>
              </div>
              <div className="p-2.5 bg-black/40 border border-white/5 rounded-[2px]">
                <span className="text-[0.688rem] text-white/40 block font-mono">SLA Collisions</span>
                <span
                  className={`text-base font-bold font-mono ${
                    deadlineCollisions.length > 0 ? "text-amber-400" : "text-emerald-400"
                  }`}
                >
                  {deadlineCollisions.length} Active
                </span>
              </div>
            </div>
          </div>

          {/* Domain Breakdown */}
          {domainTotal > 0 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[0.688rem] uppercase font-mono text-white/50 font-semibold">
                  Domain Workload Allocation
                </span>
                <span className="text-[0.688rem] text-white/40 font-mono">{domainTotal} Studies Active</span>
              </div>

              {/* Segmented Bar */}
              <div className="h-2 w-full bg-black/40 rounded-[2px] overflow-hidden flex">
                {Object.entries(domainCounts).map(([domain, count], idx) => {
                  const pct = Math.round((count / domainTotal) * 100);
                  const color = domainColors[idx % domainColors.length];
                  return (
                    <div
                      key={domain}
                      className={`h-full ${color}`}
                      style={{ width: `${pct}%` }}
                      title={`${domain}: ${count} studies (${pct}%)`}
                    />
                  );
                })}
              </div>

              {/* Legend */}
              <div className="grid grid-cols-1 gap-1.5 pt-1 text-[0.688rem]">
                {Object.entries(domainCounts).map(([domain, count], idx) => {
                  const pct = Math.round((count / domainTotal) * 100);
                  const color = domainColors[idx % domainColors.length];
                  return (
                    <div key={domain} className="flex items-center justify-between text-white/70">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`h-1.5 w-1.5 rounded-full ${color} shrink-0`} />
                        <span className="truncate">{domain}</span>
                      </div>
                      <span className="font-mono text-white/50 shrink-0">
                        {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
