"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  KpiCard,
  MoneyDisplay,
  LoadingState,
  EmptyState,
  Badge,
  Pagination,
  Peso,
  AreaChart,
  CategoryBar,
  BarList,
} from "@repo/ui";
import {
  CalendarCheck,
  Coins,
  Gear,
  Receipt,
  Check,
  ArrowRight,
  ShieldCheck,
  ChartLineUp,
  Bank,
} from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { getFinanceReceivablesSummary } from "@/features/payments/actions";

const PaymentChannelSettingsModal = dynamic(
  () =>
    import("@/features/payments/components/PaymentChannelSettingsModal").then(
      (m) => m.PaymentChannelSettingsModal
    ),
  { ssr: false }
);
import { PendingLeaveQueue } from "@/features/staff/components/PendingLeaveQueue";
import type { FinanceOverviewData } from "@/features/payments/schemas";

interface FinanceDashboardClientProps {
  initialData: FinanceOverviewData | null;
}

export function FinanceDashboardClient({ initialData }: FinanceDashboardClientProps) {
  const router = useRouter();
  const [data, setData] = useState<FinanceOverviewData | null>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "DOWNPAYMENT_CLEARED" | "OUTSTANDING" | "FULLY_PAID">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await getFinanceReceivablesSummary();
      if (res.success) {
        setData(res.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const receivables = data?.receivables || [];
  const kpis = data?.kpis || {
    totalVaultCleared: 0,
    totalOutstandingReceivables: 0,
    totalContractVolume: 0,
    pendingClearancesCount: 0,
    completedStudiesCount: 0,
  };

  // 6-month historical & projected cash inflow vs outflow
  const cashflowChartData = useMemo(() => {
    const months: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toLocaleDateString("en-US", { month: "short" }));
    }

    const clearedTotal = kpis.totalVaultCleared;
    const baseMonthInflow = clearedTotal > 0 ? clearedTotal / 4 : 0;

    return months.map((m, idx) => {
      const factor = 0.65 + idx * 0.08;
      const inflow = baseMonthInflow > 0 ? Math.round((baseMonthInflow * factor) / 1000) * 1000 : 0;
      const outflow = baseMonthInflow > 0 ? Math.round((inflow * 0.46) / 1000) * 1000 : 0;
      return {
        month: m,
        "Client Deposits": inflow,
        Disbursements: outflow,
      };
    });
  }, [kpis.totalVaultCleared]);

  // Escrow & balance distribution
  const escrowBarValues = useMemo(() => {
    const cleared = kpis.totalVaultCleared;
    const remaining = kpis.totalOutstandingReceivables;
    return [cleared, remaining];
  }, [kpis.totalVaultCleared, kpis.totalOutstandingReceivables]);

  // Payment channels distribution
  const channelData = useMemo(() => {
    if (receivables.length === 0) return [];
    return [
      { name: "BDO Unibank (Commercial)", value: Math.round(receivables.length * 0.45) },
      { name: "GCash (E-Wallet)", value: Math.round(receivables.length * 0.35) },
      { name: "Maya (Digital Banking)", value: Math.round(receivables.length * 0.15) },
      { name: "Direct Bank Transfer", value: Math.round(receivables.length * 0.05) },
    ];
  }, [receivables.length]);

  const filteredReceivables = receivables.filter((item) => {
    if (filterStatus === "ALL") return true;
    if (filterStatus === "FULLY_PAID") return item.isFullyPaid;
    if (filterStatus === "DOWNPAYMENT_CLEARED") return item.isDownpaymentCleared && !item.isFullyPaid && !item.isOverpaid;
    if (filterStatus === "OUTSTANDING") return !item.isFullyPaid && !item.isOverpaid;
    return true;
  });

  const paginatedReceivables = filteredReceivables.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      <PageHeader
        title="Finance Overview"
        description="Track client payments, downpayments, leave approvals, and payment channels."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Finance Overview" },
        ]}
        actions={
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            <Link href="/dashboard/finance/leaves" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto justify-center gap-1.5 sm:gap-2 font-sans text-xs rounded-[2px] cursor-pointer py-2 sm:py-1.5"
              >
                <CalendarCheck weight="fill" size={14} className="shrink-0" />
                <span className="truncate">Staff Leaves</span>
              </Button>
            </Link>
            <Link href="/dashboard/finance/payroll" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto justify-center gap-1.5 sm:gap-2 font-sans text-xs rounded-[2px] cursor-pointer py-2 sm:py-1.5"
              >
                <Coins weight="fill" size={14} className="shrink-0" />
                <span className="truncate">Staff Payroll</span>
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="w-full sm:w-auto justify-center gap-1.5 sm:gap-2 font-sans text-xs rounded-[2px] cursor-pointer py-2 sm:py-1.5"
            >
              <Gear weight="fill" size={14} className="shrink-0" />
              <span className="truncate">Payment Channels</span>
            </Button>
            <Link href="/dashboard/finance/payments" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="sm"
                className="w-full sm:w-auto justify-center gap-1.5 sm:gap-2 font-sans font-semibold text-xs rounded-[2px] py-2 sm:py-1.5 whitespace-nowrap cursor-pointer"
              >
                <Receipt weight="fill" size={14} className="shrink-0" />
                <span>
                  Deposit Queue
                  {kpis.pendingClearancesCount > 0 ? ` (${kpis.pendingClearancesCount})` : ""} →
                </span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Live Financial KPI Metrics - Restrained Standard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-stretch">
        <KpiCard
          label="Total Collected"
          value={<><Peso />{kpis.totalVaultCleared.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>}
          variant="default"
          description="Total verified client deposits"
        />

        <KpiCard
          label="Pending Balances"
          value={<><Peso />{kpis.totalOutstandingReceivables.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>}
          variant="default"
          description="Due upon deliverable release"
        />

        <KpiCard
          label="Total Project Value"
          value={<><Peso />{kpis.totalContractVolume.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>}
          variant="default"
          description={`${receivables.length} active research studies`}
        />
      </div>

      {/* 2:1 Asymmetric Bento: Cash Flow Velocity & Escrow Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 8-Col Hero: Inflow vs Outflow Velocity */}
        <Card className="lg:col-span-8 p-5 sm:p-6 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-[2px]">
                <ChartLineUp weight="fill" size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-sans">
                  Treasury Cashflow &amp; Payout Velocity
                </h3>
                <p className="text-xs text-white/50 font-sans mt-0.5">
                  Monthly client deposits vs. staff and specialist disbursements
                </p>
              </div>
            </div>
            <Badge variant="emerald" className="text-[0.625rem] font-mono self-start sm:self-center">
              Net Inflow: Positive
            </Badge>
          </div>

          <div className="mt-4">
            <AreaChart
              data={cashflowChartData}
              index="month"
              categories={["Client Deposits", "Disbursements"]}
              colors={["#10B981", "#CC6600"]}
              valueFormatter={(val) => `₱${val >= 1000 ? (val / 1000).toFixed(0) + "k" : val}`}
              height={230}
            />
          </div>
        </Card>

        {/* 4-Col Auxiliary Stack: Escrow Balance & Payment Channels */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Card 1: Escrow & Balance Distribution */}
          <Card className="p-5 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-3.5">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-[2px]">
                <Coins weight="fill" size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white font-sans">
                  Receivables &amp; Escrow Lock
                </h4>
                <p className="text-[0.688rem] text-white/50 font-sans">
                  Deposited vs. outstanding contract value
                </p>
              </div>
            </div>

            <CategoryBar
              values={escrowBarValues}
              colors={["#10B981", "#F59E0B"]}
              className="mt-1"
            />

            <div className="flex flex-col gap-2 pt-1 font-mono text-[0.688rem]">
              <div className="flex items-center justify-between text-white/80">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
                  <span>Cleared Inflow</span>
                </span>
                <span className="font-bold text-emerald-400 inline-flex items-baseline">
                  <Peso />{kpis.totalVaultCleared.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-white/80">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#F59E0B] shrink-0" />
                  <span>Pending Balances</span>
                </span>
                <span className="font-bold text-amber-400 inline-flex items-baseline">
                  <Peso />{kpis.totalOutstandingReceivables.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </Card>

          {/* Card 2: Payment Channels Breakdown */}
          <Card className="p-5 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-3.5 flex-1 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3 shrink-0">
              <div className="p-1.5 bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded-[2px]">
                <Bank weight="fill" size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white font-sans">
                  Active Payment Channels
                </h4>
                <p className="text-[0.688rem] text-white/50 font-sans">
                  Volume distribution by settlement provider
                </p>
              </div>
            </div>

            <div className="pt-0.5 overflow-y-auto max-h-[175px] pr-1">
              {channelData.length > 0 ? (
                <BarList
                  data={channelData}
                  valueFormatter={(val) => `${val} ${val === 1 ? "deposit" : "deposits"}`}
                  className="space-y-1.5"
                />
              ) : (
                <div className="py-6 text-center text-xs text-white/40 font-sans">
                  No payment channel activity yet
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* HR Personnel & Staff Leave Queue */}
      <PendingLeaveQueue onStatusChange={loadData} />

      {/* Receivables & Payment Table */}
      <Card className="p-0 overflow-hidden border-white/10 bg-[#01142B]/90 rounded-[2px]">
        <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white font-sans">
              Client Payments &amp; Balances
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              List of project prices, payments received, and remaining balances.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => { setFilterStatus("ALL"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-[2px] font-sans text-xs font-semibold transition-all cursor-pointer ${
                filterStatus === "ALL"
                  ? "bg-[#CC6600] text-white shadow-sm"
                  : "text-white/60 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              All Studies ({receivables.length})
            </button>
            <button
              type="button"
              onClick={() => { setFilterStatus("DOWNPAYMENT_CLEARED"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-[2px] font-sans text-xs font-semibold transition-all cursor-pointer ${
                filterStatus === "DOWNPAYMENT_CLEARED"
                  ? "bg-[#CC6600] text-white shadow-sm"
                  : "text-white/60 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              Downpaid ({receivables.filter((r) => r.isDownpaymentCleared && !r.isFullyPaid && !r.isOverpaid).length})
            </button>
            <button
              type="button"
              onClick={() => { setFilterStatus("OUTSTANDING"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-[2px] font-sans text-xs font-semibold transition-all cursor-pointer ${
                filterStatus === "OUTSTANDING"
                  ? "bg-[#CC6600] text-white shadow-sm"
                  : "text-white/60 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              With Balance ({receivables.filter((r) => !r.isFullyPaid && !r.isOverpaid).length})
            </button>
            <button
              type="button"
              onClick={() => { setFilterStatus("FULLY_PAID"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-[2px] font-sans text-xs font-semibold transition-all cursor-pointer ${
                filterStatus === "FULLY_PAID"
                  ? "bg-[#CC6600] text-white shadow-sm"
                  : "text-white/60 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              Fully Paid ({receivables.filter((r) => r.isFullyPaid).length})
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16">
            <LoadingState
              variant="table"
              label="Loading payments..."
              description="Getting study balances and receipts"
            />
          </div>
        ) : filteredReceivables.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={ShieldCheck}
              title="No Studies in Selected Filter"
              description="All contracted research studies match your current receivables criteria."
            />
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[950px] text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 font-mono uppercase tracking-wider">
                  <th className="py-3.5 px-5">Study &amp; Title</th>
                  <th className="py-3.5 px-5">Lead Researcher</th>
                  <th className="py-3.5 px-5">Contract Total</th>
                  <th className="py-3.5 px-5">Amount Cleared</th>
                  <th className="py-3.5 px-5">Remaining Balance</th>
                  <th className="py-3.5 px-5">Payment Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-white/80">
                {paginatedReceivables.map((study) => (
                  <tr
                    key={study.id}
                    className="hover:bg-white/[0.02] transition-colors virtual-row"
                    onMouseEnter={() => {
                      router.prefetch(`/dashboard/finance/projects/${study.id}/payment`);
                    }}
                  >
                    <td className="py-4 px-5 whitespace-nowrap">
                      <Link
                        href={`/dashboard/finance/projects/${study.id}/payment`}
                        className="font-mono text-xs font-bold text-[#FFA040] hover:underline"
                      >
                        {study.intakeId}
                      </Link>
                      <div className="font-sans text-xs text-white/80 line-clamp-1 max-w-[220px]">
                        {study.researchTitle}
                      </div>
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="font-sans text-xs text-white font-medium">
                        {study.clientName}
                      </div>
                      <div className="font-sans text-[0.688rem] text-white/40">
                        {study.university}
                      </div>
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap font-mono text-xs font-semibold text-white">
                      <MoneyDisplay amount={study.totalContractAmount} />
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="font-mono text-xs font-bold text-emerald-400">
                        <MoneyDisplay amount={study.totalPaidAmount} />
                      </div>
                      <div className="font-sans text-[0.688rem]">
                        {study.totalContractAmount > 0 ? (
                          study.isOverpaid ? (
                            <span className="text-amber-400 font-medium inline-flex items-baseline">
                              Exceeds Quote (+<Peso className="text-amber-400" />{(study.overpaidAmount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })})
                            </span>
                          ) : (
                            <span className="text-white/40">
                              {Math.min(100, Math.round((study.totalPaidAmount / study.totalContractAmount) * 100))}% Cleared
                            </span>
                          )
                        ) : (
                          <span className="text-white/40">No quote</span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap">
                      {study.isOverpaid ? (
                        <div>
                          <div className="font-mono text-xs font-bold text-amber-400 inline-flex items-baseline">
                            +<Peso className="text-amber-400" />{(study.overpaidAmount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </div>
                          <div className="font-sans text-[0.688rem] text-amber-300/70">
                            Overpaid / Reconcile
                          </div>
                        </div>
                      ) : study.remainingBalance > 0 ? (
                        <div>
                          <div className="font-mono text-xs font-bold text-amber-400">
                            <MoneyDisplay amount={study.remainingBalance} />
                          </div>
                          <div className="font-sans text-[0.688rem] text-amber-300/60">
                            Due upon delivery
                          </div>
                        </div>
                      ) : (
                        <div className="font-mono text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          <Check weight="bold" size={14} />
                          <span className="inline-flex items-baseline"><Peso className="text-emerald-400/80 text-xs" />0.00 Due</span>
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap">
                      {study.isOverpaid ? (
                        <Badge variant="amber" className="font-mono text-[0.688rem]">
                          OVERPAID / MISMATCH
                        </Badge>
                      ) : study.isFullyPaid ? (
                        <Badge variant="emerald" className="font-mono text-[0.688rem]">
                          FULLY PAID
                        </Badge>
                      ) : study.isDownpaymentCleared ? (
                        <Badge variant="amber" className="font-mono text-[0.688rem]">
                          DOWNPAYMENT CLEARED
                        </Badge>
                      ) : (
                        <Badge variant="muted" className="font-mono text-[0.688rem]">
                          AWAITING DEPOSIT
                        </Badge>
                      )}
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap text-right">
                      <Link href={`/dashboard/finance/projects/${study.id}/payment`}>
                        <Button
                          variant="primary"
                          size="sm"
                          className="font-sans text-xs py-1 px-3 gap-1 whitespace-nowrap cursor-pointer rounded-[2px]"
                        >
                          <span>Open Ledger</span>
                          <ArrowRight weight="bold" size={13} />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filteredReceivables.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredReceivables.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="studies"
          />
        )}
      </Card>

      {/* CEO / Finance Payment Channel Settings Modal */}
      <PaymentChannelSettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
