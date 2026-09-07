"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  PageHeader,
  KpiCard,
  Card,
  Badge,
  LoadingState,
  Peso,
  Pagination,
} from "@repo/ui";
import { getFinancialLedgerAction } from "@/features/finance/actions";
import type { FinancialLedgerDTO } from "@/features/finance/schemas";
import {
  IconReceipt,
  IconSearch,
} from "@tabler/icons-react";

export interface FinanceLedgerClientProps {
  initialData: {
    ledgers: FinancialLedgerDTO[];
    summary: {
      totalGross: number;
      totalPayouts: number;
      totalMargin: number;
      avgMarginPercent: number;
    };
  };
}

export function FinanceLedgerClient({ initialData }: FinanceLedgerClientProps) {
  const [ledgers, setLedgers] = useState<FinancialLedgerDTO[]>(initialData.ledgers);
  const [summary, setSummary] = useState(initialData.summary);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [packageFilter, setPackageFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const isInitialMount = useRef(true);

  const loadLedger = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getFinancialLedgerAction({
        packageName: packageFilter === "ALL" ? undefined : packageFilter,
        search: searchQuery,
      });
      if (res.success && res.data) {
        setLedgers(res.data.ledgers);
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error("Failed to load financial ledger:", err);
    } finally {
      setIsLoading(false);
    }
  }, [packageFilter, searchQuery]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    loadLedger();
  }, [loadLedger]);

  const paginatedLedgers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return ledgers.slice(start, start + pageSize);
  }, [ledgers, currentPage, pageSize]);

  if (isLoading && ledgers.length === 0) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto font-sans">
        <LoadingState
          variant="page"
          label="Loading Financial Ledger..."
          description="Retrieving per-project accounting records."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans">
      {/* Standardized PageHeader */}
      <PageHeader
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "FINANCE", href: "/dashboard/finance" },
          { label: "FINANCIAL LEDGER" },
        ]}
        title="Project Financial Ledger & Margin Analysis"
        description="Per-project itemized revenue ledger tracking gross client receipts, specialist commission disbursements, and net platform margins."
      />

      {/* Canonical KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <KpiCard
          label="GROSS ESCROW REVENUE"
          value={<><Peso />{summary.totalGross.toLocaleString("en-US", { minimumFractionDigits: 2 })}</>}
          description="Total realized study receipts from clients"
        />
        <KpiCard
          label="TOTAL EXPERT PAYOUTS"
          value={<><Peso />{summary.totalPayouts.toLocaleString("en-US", { minimumFractionDigits: 2 })}</>}
          description="Total fees disbursed or allocated to specialists"
        />
        <KpiCard
          label="NET PLATFORM PROFIT"
          value={<><Peso />{summary.totalMargin.toLocaleString("en-US", { minimumFractionDigits: 2 })}</>}
          description="Retained net company margin"
        />
        <KpiCard
          label="AVERAGE MARGIN"
          value={`${summary.avgMarginPercent}%`}
          description="Mean gross profit retention percentage"
        />
      </div>

      {/* Ledger Table Card */}
      <Card className="p-6 sm:p-8 flex flex-col gap-6 bg-[#01142B] border border-white/10 rounded-[4px]">
        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          {/* Package Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#010114] border border-white/10 rounded-[2px]">
            {[
              { id: "ALL", label: "All Packages" },
              { id: "JX_01_DATACHECK", label: "DataCheck" },
              { id: "JX_02_START", label: "Start" },
              { id: "JX_03_CORE", label: "Core" },
              { id: "JX_04_ADVANCED", label: "Advanced" },
              { id: "DEFENSELAB", label: "DefenseLab" },
            ].map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => {
                  setPackageFilter(pkg.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-[2px] transition-colors cursor-pointer ${
                  packageFilter === pkg.id
                    ? "bg-[#CC6600] text-white"
                    : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {pkg.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <IconSearch size={16} stroke={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search by Study ID, title, or client..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3.5 py-2 bg-[#010114] border border-white/15 rounded-[2px] text-xs text-white placeholder:text-white/30 focus:border-[#CC6600] focus:outline-none"
            />
          </div>
        </div>

        {/* Ledger Table */}
        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <LoadingState variant="table" label="Loading Financial Ledger..." description="Retrieving per-project accounting records" />
          </div>
        ) : ledgers.length === 0 ? (
          <div className="py-16 text-center text-xs text-white/40 flex flex-col items-center gap-2">
            <IconReceipt size={28} stroke={1.5} className="text-white/20" />
            <span>No financial records found matching the selected filters.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-black/20 text-white/50 font-mono text-[0.688rem] uppercase tracking-wider">
                  <th className="py-3 px-4">Study / Intake ID</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Package</th>
                  <th className="py-3 px-4 text-right">Gross Revenue</th>
                  <th className="py-3 px-4 text-right">Statistician</th>
                  <th className="py-3 px-4 text-right">QA Lead</th>
                  <th className="py-3 px-4 text-right">Net Margin</th>
                  <th className="py-3 px-4 text-center">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {paginatedLedgers.map((l) => (
                  <tr key={l.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Study ID & Title */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-white/90 font-semibold block">{l.projectIntakeId}</span>
                      <span className="text-[0.688rem] text-white/50 line-clamp-1 max-w-[240px] mt-0.5">
                        {l.projectTitle}
                      </span>
                    </td>

                    {/* Client */}
                    <td className="py-3.5 px-4">
                      <span className="text-white/90 font-medium block">{l.clientName}</span>
                    </td>

                    {/* Package */}
                    <td className="py-3.5 px-4 font-mono">
                      <Badge variant="muted" className="text-[0.625rem]">
                        {l.packageName}
                      </Badge>
                    </td>

                    {/* Gross Revenue */}
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-white/90">
                      <Peso />{l.grossRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>

                    {/* Statistician Share */}
                    <td className="py-3.5 px-4 text-right font-mono text-amber-400/90">
                      <Peso />{l.statisticianShare.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>

                    {/* QA Lead Share */}
                    <td className="py-3.5 px-4 text-right font-mono text-sky-400/90">
                      <Peso />{l.qaLeadShare.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>

                    {/* Net Margin */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                      <Peso />{l.netMargin.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>

                    {/* Margin Percent Badge */}
                    <td className="py-3.5 px-4 text-center font-mono">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-[2px] text-[0.688rem] font-bold ${
                          l.marginPercent >= 35
                            ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30"
                            : l.marginPercent >= 20
                            ? "bg-amber-950/60 text-amber-300 border border-amber-500/30"
                            : "bg-red-950/60 text-red-300 border border-red-500/30"
                        }`}
                      >
                        {l.marginPercent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Component */}
        {!isLoading && ledgers.length > 0 && (
          <div className="border-t border-white/10 pt-4">
            <Pagination
              currentPage={currentPage}
              totalItems={ledgers.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[5, 10, 20, 50]}
              itemLabel="records"
            />
          </div>
        )}
      </Card>
    </div>
  );
}
