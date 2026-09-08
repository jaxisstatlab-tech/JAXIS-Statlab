"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  PageHeader,
  KpiCard,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  CopyButton,
  Peso,
  Badge,
  EmptyState,
} from "@repo/ui";
import {
  TrendUp,
  FolderOpen,
  Clock,
  ShieldCheck,
  CheckCircle,
  MagnifyingGlass,
  ArrowRight,
  Sparkle,
  SlidersHorizontal,
  DownloadSimple,
  Eye,
  Plus,
} from "@phosphor-icons/react";

/**
 * Dashdark Precision Bento Dashboard Template
 *
 * This template demonstrates the 5-Tier Asymmetric Bento Layout:
 * - Tier 1: PageHeader + Dual Actions (Title Case, active:scale-[0.97])
 * - Tier 2: 4-Column Balanced KPI Row (KpiCard, monochrome-first bold white numbers)
 * - Tier 3: 2:1 Asymmetric Bento Grid (8-col Hero + 4-col Auxiliary Stack)
 * - Tier 4: Section Command Ribbon (Filter tabs + keyboard search shortcut '/')
 * - Tier 5: Lower Bento Composition (4-col Breakdown Gauge + 8-col Precision Table)
 *
 * Applicable to: Client, Statistician, QA Lead, CEO/Admin
 */
export function BentoDashboardTemplate() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: '/' to focus search, 'Esc' to clear & blur
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    // ANTI-DOUBLE-PADDING WRAPPER: Inner pages inside /dashboard do NOT add outer padding!
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      {/* ─────────────────────────────────────────────────────────────
          TIER 1: WORKSPACE GREETING & COMMAND TOOLBAR
      ───────────────────────────────────────────────────────────── */}
      <PageHeader
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "OPERATIONS DESK" },
        ]}
        title="Operations & Research Terminal"
        description="Monitor ongoing studies, track verified deliverables, and manage operational milestones."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-[2px] border-white/15 text-white/80 hover:text-white hover:bg-white/[0.06] active:scale-[0.97] transition-transform"
            >
              <DownloadSimple weight="fill" size={15} className="mr-1.5" />
              Download Report
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="rounded-[2px] bg-[#CC6600] hover:bg-[#E67300] text-white active:scale-[0.97] transition-transform font-medium"
            >
              <Plus weight="bold" size={15} className="mr-1.5" />
              New Study Intake
            </Button>
          </div>
        }
      />

      {/* ─────────────────────────────────────────────────────────────
          TIER 2: 4-COLUMN BALANCED KPI METRIC GRID
          - 1-col mobile (<640px), 2-col tablet (sm), 4-col desktop (lg)
          - Monochrome-first: default numerals to crisp bold white
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <KpiCard
          label="ACTIVE STUDIES"
          value="12"
          description="In statistical analysis pipeline"
          variant="default"
          badge={
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-[2px] border border-emerald-400/20">
              <TrendUp weight="bold" size={11} />
              +2.4%
            </span>
          }
        />
        <KpiCard
          label="AWAITING REVIEW"
          value="3"
          description="Pending QA checklist sign-off"
          // Reserve accent color strictly for items needing attention
          variant="amber"
          badge={
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-[2px] border border-amber-400/20">
              <Clock weight="fill" size={11} />
              ACTION NEEDED
            </span>
          }
        />
        <KpiCard
          label="COMPLETED STUDIES"
          value="48"
          description="Delivered & accepted by clients"
          variant="default"
          badge={
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-white/50 bg-white/[0.06] px-1.5 py-0.5 rounded-[2px] border border-white/10">
              <CheckCircle weight="fill" size={11} />
              ALL TIME
            </span>
          }
        />
        <KpiCard
          label="ESCROW PROTECTED"
          value="₱ 184,500"
          description="100% safeguarded in escrow vault"
          variant="default"
          badge={
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-[2px] border border-emerald-400/20">
              <ShieldCheck weight="fill" size={11} />
              VERIFIED
            </span>
          }
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TIER 3: THE 2:1 ASYMMETRIC FOCAL BENTO SECTION
          - 8 Columns: Primary Focal Hero Card
          - 4 Columns: Auxiliary Intelligence Stack (Double-stacked cards)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 8 COLS: PRIMARY FOCAL HERO CARD */}
        <div className="lg:col-span-8 bg-[#01142B]/85 border border-white/10 rounded-[2px] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#FFA040] uppercase tracking-wider block mb-1">
                  Active Intake Stage
                </span>
                <h3 className="text-base sm:text-lg font-sans font-bold text-white">
                  Study Pipeline & Progression
                </h3>
              </div>
              {/* Period / Filter Selector */}
              <div className="flex items-center gap-1 bg-[#010D1F] p-1 border border-white/10 rounded-[2px] self-start sm:self-auto">
                {["1W", "1M", "1Q", "ALL"].map((period, idx) => (
                  <button
                    key={period}
                    className={`px-2.5 py-1 text-xs font-mono rounded-[2px] transition-colors ${
                      idx === 1
                        ? "bg-[#CC6600] text-white font-bold"
                        : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual 5-Stage Stepper */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 my-6">
              {[
                { stage: "01", name: "Proposal", status: "completed" },
                { stage: "02", name: "Contract", status: "completed" },
                { stage: "03", name: "Deposit", status: "active" },
                { stage: "04", name: "Analysis", status: "upcoming" },
                { stage: "05", name: "Deliverables", status: "upcoming" },
              ].map((step) => {
                const isActive = step.status === "active";
                const isCompleted = step.status === "completed";
                return (
                  <div
                    key={step.stage}
                    className={`p-3 rounded-[2px] border transition-colors ${
                      isActive
                        ? "bg-[#CC6600]/10 border-[#CC6600]/50"
                        : isCompleted
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-[#010D1F]/60 border-white/5 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono font-bold text-white/50">
                        STAGE {step.stage}
                      </span>
                      {isCompleted ? (
                        <CheckCircle weight="fill" size={13} className="text-emerald-400" />
                      ) : isActive ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#CC6600] animate-ping" />
                      ) : null}
                    </div>
                    <p className="text-xs font-sans font-bold text-white truncate">
                      {step.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
            <p className="text-xs font-sans text-white/60">
              Current study: <span className="font-mono font-semibold text-white">JAXIS-202609-0012</span> — Waiting for escrow deposit verification.
            </p>
            <Button
              variant="primary"
              size="sm"
              className="rounded-[2px] bg-[#CC6600] hover:bg-[#E67300] text-white active:scale-[0.97] transition-transform self-start sm:self-auto"
            >
              Verify Deposit →
            </Button>
          </div>
        </div>

        {/* 4 COLS: AUXILIARY INTELLIGENCE STACK */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* AUXILIARY CARD 1: Micro Progress Distribution */}
          <div className="bg-[#01142B]/85 border border-white/10 rounded-[2px] p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-semibold text-white/60 uppercase tracking-wider">
                DefenseLab Hours
              </span>
              <span className="text-xs font-mono font-bold text-[#FFA040]">
                8 / 10 Hours
              </span>
            </div>
            <div className="h-2 w-full bg-[#010D1F] rounded-[1px] overflow-hidden mb-3 border border-white/5">
              <div
                className="h-full bg-[#CC6600] rounded-[1px]"
                style={{ width: "80%" }}
              />
            </div>
            <p className="text-xs font-sans text-white/50">
              2 mock defense rehearsal sessions remaining for this billing cycle.
            </p>
          </div>

          {/* AUXILIARY CARD 2: Live Activity / Shift Status */}
          <div className="bg-[#01142B]/85 border border-white/10 rounded-[2px] p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-semibold text-white/60 uppercase tracking-wider">
                Duty Roster Status
              </span>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-400">
                  ONLINE
                </span>
              </div>
            </div>
            <p className="text-sm font-sans font-bold text-white mb-1">
              Lead Statistician Active
            </p>
            <p className="text-xs font-sans text-white/50">
              Shift elapsed: <span className="font-mono text-white/80">03h 42m 15s</span>
            </p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TIER 4: SECTION COMMAND RIBBON
          - Filter tabs (All, Pending, Completed)
          - Keyboard search shortcut with <kbd>/</kbd>
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All Studies", count: 12 },
            { id: "active", label: "In Analysis", count: 8 },
            { id: "review", label: "Pending QA", count: 3 },
            { id: "delivered", label: "Delivered", count: 1 },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-sans rounded-[2px] transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? "bg-[#CC6600] text-white font-semibold"
                    : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1 py-0.2 rounded-[2px] ${
                    isActive ? "bg-black/20 text-white" : "bg-white/[0.08] text-white/50"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar with Keyboard Shortcut */}
        <div className="relative w-full sm:w-72">
          <MagnifyingGlass
            weight="bold"
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search studies by title or ID..."
            className="w-full bg-[#010D1F] border border-white/15 rounded-[2px] pl-9 pr-14 py-1.5 text-xs text-white placeholder:text-white/40 outline-none focus:border-[#CC6600] transition-colors"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <kbd className="px-1.5 py-0.5 rounded-[2px] bg-white/[0.08] border border-white/10 text-[10px] font-mono text-white/40">
              /
            </kbd>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TIER 5: LOWER BENTO COMPOSITION
          - 4 Columns: Breakdown Donut / Summary Card
          - 8 Columns: High-Precision Data Table
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 4 COLS: BREAKDOWN DONUT / SUMMARY */}
        <div className="lg:col-span-4 bg-[#01142B]/85 border border-white/10 rounded-[2px] p-6">
          <h4 className="text-sm font-sans font-bold text-white mb-1">
            Deliverable Acceptance
          </h4>
          <p className="text-xs font-sans text-white/50 mb-4">
            First-pass statistical validation rate
          </p>

          <div className="flex items-center justify-center my-6">
            {/* Visual Circular Gauge Placeholder */}
            <div className="relative w-36 h-36 flex items-center justify-center rounded-full border-4 border-emerald-500/20 border-t-emerald-500">
              <div className="text-center">
                <span className="font-mono font-bold text-2xl text-white block">
                  96.4%
                </span>
                <span className="text-[10px] font-mono text-white/40 uppercase">
                  QA Passed
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60 font-sans">Statistical Models</span>
              <span className="font-mono text-white font-semibold">24 / 25</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60 font-sans">APA Format Compliance</span>
              <span className="font-mono text-white font-semibold">100%</span>
            </div>
          </div>
        </div>

        {/* 8 COLS: HIGH-PRECISION DATA TABLE */}
        <div className="lg:col-span-8 bg-[#01142B]/85 border border-white/10 rounded-[2px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-[#010D1F]/50">
                  <th className="py-3 px-4 font-mono font-semibold text-white/50 uppercase tracking-wider text-[11px]">
                    Study ID
                  </th>
                  <th className="py-3 px-4 font-sans font-semibold text-white/50 uppercase tracking-wider text-[11px]">
                    Research Topic
                  </th>
                  <th className="py-3 px-4 font-mono font-semibold text-white/50 uppercase tracking-wider text-[11px]">
                    Value
                  </th>
                  <th className="py-3 px-4 font-mono font-semibold text-white/50 uppercase tracking-wider text-[11px]">
                    Status
                  </th>
                  <th className="py-3 px-4 font-sans font-semibold text-white/50 uppercase tracking-wider text-[11px] text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  {
                    id: "JAXIS-202609-0012",
                    topic: "Supply Chain Resilience Analysis",
                    amount: 14500,
                    status: "In Progress",
                    statusColor: "emerald",
                  },
                  {
                    id: "JAXIS-202609-0011",
                    topic: "Financial Market Volatility Modeling",
                    amount: 22000,
                    status: "Pending QA",
                    statusColor: "amber",
                  },
                  {
                    id: "JAXIS-202608-0098",
                    topic: "Healthcare Treatment Outcomes",
                    amount: 18500,
                    status: "Delivered",
                    statusColor: "default",
                  },
                ].map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono text-white font-semibold">
                      <CopyButton
                        text={row.id}
                        variant="badge"
                        label={row.id}
                      />
                    </td>
                    <td className="py-3.5 px-4 font-sans text-white/80 font-medium">
                      {row.topic}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-white font-bold">
                      <Peso />
                      {row.amount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-[2px] ${
                          row.statusColor === "emerald"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : row.statusColor === "amber"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-white/[0.06] text-white/60 border border-white/10"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        className="inline-flex items-center gap-1 text-xs font-sans text-[#FFA040] hover:text-[#CC6600] font-semibold transition-colors"
                      >
                        <Eye weight="fill" size={13} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 1-Click Reset Filters on Empty State (Reference Pattern) */}
          {searchQuery && (
            <div className="p-8 text-center border-t border-white/10">
              <EmptyState
                icon={MagnifyingGlass}
                title="No studies match your query"
                description={`No active studies found matching "${searchQuery}". Clear your search query to view all records.`}
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="rounded-[2px] border-white/15 text-white hover:bg-white/[0.06] mt-2"
                  >
                    Clear Filters
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
