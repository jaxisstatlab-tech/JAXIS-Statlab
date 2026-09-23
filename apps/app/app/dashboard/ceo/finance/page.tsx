"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  PageHeader,
  KpiCard,
  Card,
  Button,
  Badge,
  Modal,
  LoadingState,
  Peso,
  Toast,
} from "@repo/ui";
import { ServiceCatalogModal } from "@/features/quotations/components/ServiceCatalogModal";
import { getCommercialCatalog } from "@/features/quotations/actions";
import type { CommercialCatalogData } from "@/lib/pricing-rules";
import {
  getCeoFinancialOverviewAction,
  updatePayoutRateConfigAction,
} from "@/features/finance/actions";
import type { CeoFinancialOverviewDTO, PayoutRateConfigDTO } from "@/features/finance/schemas";
import {
  IconEdit,
  IconCheck,
  IconAlertCircle,
  IconShieldLock,
} from "@tabler/icons-react";

export default function CeoFinancePage() {
  const [overview, setOverview] = useState<CeoFinancialOverviewDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Edit Rate Modal
  const [selectedConfig, setSelectedConfig] = useState<PayoutRateConfigDTO | null>(null);
  const [newMode, setNewMode] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [newRate, setNewRate] = useState<string>("");
  const [newQaRate, setNewQaRate] = useState<string>("");
  const [newFixedAmount, setNewFixedAmount] = useState<string>("");
  const [newFixedQaAmount, setNewFixedQaAmount] = useState<string>("");
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Commercial Pricing & Service Catalog Modal
  const [catalog, setCatalog] = useState<CommercialCatalogData | undefined>(undefined);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [res, catalogRes] = await Promise.all([
        getCeoFinancialOverviewAction(),
        getCommercialCatalog(),
      ]);
      if (res.success && res.data) {
        setOverview(res.data);
      }
      if (catalogRes) {
        setCatalog(catalogRes);
      }
    } catch (err) {
      console.error("Failed to load CEO financial overview:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenEditRate = (config: PayoutRateConfigDTO) => {
    setSelectedConfig(config);
    setNewMode(config.mode || "PERCENTAGE");
    setNewRate(config.ratePercent.toString());
    setNewQaRate((config.qaRatePercent ?? 10).toString());
    setNewFixedAmount((config.fixedAmount ?? 1500).toString());
    setNewFixedQaAmount((config.fixedQaAmount ?? 250).toString());
    setErrorMsg(null);
    setIsEditModalOpen(true);
  };

  const handleSaveRate = async () => {
    if (!selectedConfig) return;
    const parsedRate = parseFloat(newRate);
    const parsedQaRate = parseFloat(newQaRate);

    if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100) {
      setErrorMsg("Please enter a valid Statistician commission rate between 0% and 100%.");
      return;
    }
    if (isNaN(parsedQaRate) || parsedQaRate < 0 || parsedQaRate > 100) {
      setErrorMsg("Please enter a valid QA Reviewer commission rate between 0% and 100%.");
      return;
    }
    if (parsedRate + parsedQaRate > 100) {
      setErrorMsg(`Combined commission (${parsedRate + parsedQaRate}%) exceeds 100% of study fees.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await updatePayoutRateConfigAction({
        packageName: selectedConfig.packageName,
        mode: newMode,
        ratePercent: parsedRate,
        qaRatePercent: parsedQaRate,
        fixedAmount: parseFloat(newFixedAmount) || 0,
        fixedQaAmount: parseFloat(newFixedQaAmount) || 0,
      });

      if (res.success) {
        setIsEditModalOpen(false);
        loadData();
      } else {
        setErrorMsg(res.error?.message || "Failed to update package rates.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !overview) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto font-sans">
        <LoadingState
          variant="page"
          label="Loading Financial Overview..."
          description="Aggregating company revenue and profit margins"
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
          { label: "CEO OVERVIEW", href: "/dashboard/ceo" },
          { label: "TREASURY & RATES" },
        ]}
        title="Company Financials & Pay Rates"
        description="Company financial overview, package profitability breakdown, and commission rate settings."
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCatalogModalOpen(true)}
              className="rounded-[2px] border-white/20 text-white hover:bg-white/[0.06] flex items-center gap-1.5"
            >
              <IconEdit size={14} stroke={2} />
              <span>Configure Services &amp; Packages</span>
            </Button>
            <Badge variant="emerald" className="text-xs font-mono flex items-center gap-1">
              <IconShieldLock size={14} stroke={2} />
              <span>CEO Authority Verified</span>
            </Badge>
          </div>
        }
      />

      {/* Canonical KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <KpiCard
          label="REALIZED GROSS REVENUE"
          value={<><Peso />{overview.grossRealizedRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</>}
          description="Total realized receipts from completed studies"
        />
        <KpiCard
          label="NET PLATFORM MARGIN"
          value={<><Peso />{overview.netRealizedMargin.toLocaleString("en-US", { minimumFractionDigits: 2 })}</>}
          description="Corporate net earnings after specialist shares"
        />
        <KpiCard
          label="TOTAL DISBURSED"
          value={<><Peso />{overview.totalDisbursed.toLocaleString("en-US", { minimumFractionDigits: 2 })}</>}
          description="Total funds disbursed to statisticians & QA"
        />
        <KpiCard
          label="ESCROW VAULT BALANCE"
          value={<><Peso />{overview.escrowBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</>}
          description="Net funds held pending delivery clearances"
        />
      </div>

      {/* Package Profitability & Payout Rate Matrix */}
      <Card className="p-6 sm:p-8 flex flex-col gap-6 bg-[#01142B] border border-white/10 rounded-[4px]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-5">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-white text-base">Package Profitability & Commission Rates</span>
            <span className="text-xs text-white/50">
              Configure baseline specialist commission rates per package tier. Changes apply to all future completed studies.
            </span>
          </div>
          <Badge variant="sky" className="text-xs font-mono">
            {overview.rateConfigs.length} Active Package Rates
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-black/20 text-white/50 font-mono text-[0.688rem] uppercase tracking-wider">
                <th className="py-3 px-4">Package Name</th>
                <th className="py-3 px-4 text-center">Studies</th>
                <th className="py-3 px-4 text-right">Gross Revenue</th>
                <th className="py-3 px-4 text-right">Expert Payouts</th>
                <th className="py-3 px-4 text-right">Net Platform Profit</th>
                <th className="py-3 px-4 text-center">Margin %</th>
                <th className="py-3 px-4 text-center">Stat Commission</th>
                <th className="py-3 px-4 text-center">QA Commission</th>
                <th className="py-3 px-4 text-center">Total Pool</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {overview.packageProfitability.map((pkg) => {
                const config = overview.rateConfigs.find((c) => c.packageName === pkg.packageName);

                return (
                  <tr key={pkg.packageName} className="hover:bg-white/[0.02] transition-colors">
                    {/* Package Name */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-white">
                      {pkg.packageName}
                    </td>

                    {/* Studies Completed */}
                    <td className="py-3.5 px-4 text-center font-mono">
                      {pkg.projectCount}
                    </td>

                    {/* Gross Revenue */}
                    <td className="py-3.5 px-4 text-right font-mono text-white/90">
                      <Peso />{pkg.grossRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>

                    {/* Expert Payouts */}
                    <td className="py-3.5 px-4 text-right font-mono text-amber-400/90">
                      <Peso />{pkg.totalPayouts.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>

                    {/* Net Margin */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      <Peso />{pkg.netMargin.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>

                    {/* Margin % */}
                    <td className="py-3.5 px-4 text-center font-mono">
                      <span className="inline-block px-2 py-0.5 rounded-[2px] bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-[0.688rem] font-bold">
                        {pkg.marginPercent}%
                      </span>
                    </td>

                    {/* Stat Commission Rate */}
                    <td className="py-3.5 px-4 text-center font-mono font-semibold text-white">
                      <Badge variant="sky" className="text-xs">
                        {config?.mode === "FIXED" ? (
                          <>
                            <Peso className="text-[0.625rem] mr-0.5" />
                            {(config.fixedAmount ?? 1500).toLocaleString()}
                          </>
                        ) : (
                          `${pkg.currentRatePercent}%`
                        )}
                      </Badge>
                    </td>

                    {/* QA Commission Rate */}
                    <td className="py-3.5 px-4 text-center font-mono font-semibold text-white">
                      <Badge variant="amber" className="text-xs">
                        {config?.mode === "FIXED" ? (
                          <>
                            <Peso className="text-[0.625rem] mr-0.5" />
                            {(config.fixedQaAmount ?? 250).toLocaleString()}
                          </>
                        ) : (
                          `${pkg.currentQaRatePercent ?? 10}%`
                        )}
                      </Badge>
                    </td>

                    {/* Total Pool */}
                    <td className="py-3.5 px-4 text-center font-mono font-semibold text-emerald-400">
                      <span className="text-xs">
                        {(pkg.currentRatePercent || 0) + (pkg.currentQaRatePercent || 0)}%
                      </span>
                    </td>

                    {/* Edit Rate Action */}
                    <td className="py-3.5 px-4 text-right">
                      {config && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEditRate(config)}
                          className="text-xs rounded-[2px] px-3 py-1 font-sans"
                        >
                          <IconEdit size={13} stroke={1.5} className="mr-1" />
                          <span>Edit Rate</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* EDIT PACKAGE RATE MODAL */}
      {isEditModalOpen && selectedConfig && (
        <Modal
          open={isEditModalOpen}
          onClose={() => !isSubmitting && setIsEditModalOpen(false)}
          title={`Edit Commission Rates: ${selectedConfig.packageName}`}
          description="Adjust the percentage of study fees allocated to the Lead Statistician and Senior QA Reviewer."
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-3 w-full font-sans">
              <Button
                variant="secondary"
                size="sm"
                disabled={isSubmitting}
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={isSubmitting}
                onClick={handleSaveRate}
              >
                <IconCheck size={15} stroke={2} className="mr-1" />
                <span>Save Rates</span>
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-4 font-sans text-xs">
            {errorMsg && (
              <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-[2px] text-red-200 flex items-start gap-2">
                <IconAlertCircle size={16} stroke={2} className="text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Mode Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-white/80 font-semibold text-xs">Operating Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewMode("PERCENTAGE")}
                  className={`p-2 rounded-[2px] border text-center font-mono text-xs transition-colors cursor-pointer ${
                    newMode === "PERCENTAGE"
                      ? "bg-[#CC6600]/20 border-[#CC6600] text-white ring-1 ring-[#CC6600]"
                      : "bg-[#010114] border-white/10 text-white/60 hover:text-white"
                  }`}
                >
                  Percentage Split (% of SOW)
                </button>
                <button
                  type="button"
                  onClick={() => setNewMode("FIXED")}
                  className={`p-2 rounded-[2px] border text-center font-mono text-xs transition-colors cursor-pointer ${
                    newMode === "FIXED"
                      ? "bg-[#CC6600]/20 border-[#CC6600] text-white ring-1 ring-[#CC6600]"
                      : "bg-[#010114] border-white/10 text-white/60 hover:text-white"
                  }`}
                >
                  Fixed Payout (Flat ₱ Fee)
                </button>
              </div>
            </div>

            {newMode === "PERCENTAGE" ? (
              <>
                {/* Statistician Rate */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-white/80 font-semibold flex items-center justify-between">
                    <span>Lead Research Statistician Commission *</span>
                    <span className="text-white/40 font-mono text-[0.625rem]">Stat Share</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={newRate}
                      onChange={(e) => setNewRate(e.target.value)}
                      className="w-full p-2.5 bg-[#010114] border border-white/15 rounded-[2px] text-sm font-mono text-white focus:border-[#CC6600] focus:outline-none pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 font-mono font-bold">
                      %
                    </span>
                  </div>
                  <span className="text-[0.688rem] text-white/40 leading-relaxed">
                    Percentage of gross SOW fees disbursed to the Lead Statistician.
                  </span>
                </div>

                {/* QA Reviewer Rate */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-white/80 font-semibold flex items-center justify-between">
                    <span>Senior QA Reviewer Commission *</span>
                    <span className="text-white/40 font-mono text-[0.625rem]">QA Share</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={newQaRate}
                      onChange={(e) => setNewQaRate(e.target.value)}
                      className="w-full p-2.5 bg-[#010114] border border-white/15 rounded-[2px] text-sm font-mono text-white focus:border-[#CC6600] focus:outline-none pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 font-mono font-bold">
                      %
                    </span>
                  </div>
                  <span className="text-[0.688rem] text-white/40 leading-relaxed">
                    Percentage of gross SOW fees disbursed to the Senior QA Reviewer.
                  </span>
                </div>
              </>
            ) : (
              <>
                {/* Statistician Fixed Amount */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-white/80 font-semibold flex items-center justify-between">
                    <span>Lead Statistician Flat Fee (₱) *</span>
                    <span className="text-white/40 font-mono text-[0.625rem]">Fixed Payout</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-sans font-bold">
                      ₱
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={newFixedAmount}
                      onChange={(e) => setNewFixedAmount(e.target.value)}
                      className="w-full p-2.5 pl-8 bg-[#010114] border border-white/15 rounded-[2px] text-sm font-mono text-white focus:border-[#CC6600] focus:outline-none"
                    />
                  </div>
                  <span className="text-[0.688rem] text-white/40 leading-relaxed">
                    Fixed peso amount paid per completed study under this package key.
                  </span>
                </div>

                {/* QA Reviewer Fixed Amount */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-white/80 font-semibold flex items-center justify-between">
                    <span>Senior QA Reviewer Flat Fee (₱) *</span>
                    <span className="text-white/40 font-mono text-[0.625rem]">Fixed Payout</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-sans font-bold">
                      ₱
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={newFixedQaAmount}
                      onChange={(e) => setNewFixedQaAmount(e.target.value)}
                      className="w-full p-2.5 pl-8 bg-[#010114] border border-white/15 rounded-[2px] text-sm font-mono text-white focus:border-[#CC6600] focus:outline-none"
                    />
                  </div>
                  <span className="text-[0.688rem] text-white/40 leading-relaxed">
                    Fixed peso amount paid per QA-reviewed study under this package key.
                  </span>
                </div>
              </>
            )}

            {/* Live Commission Pool Summary */}
            {(() => {
              const sRate = parseFloat(newRate) || 0;
              const qRate = parseFloat(newQaRate) || 0;
              const totalPool = Math.round((sRate + qRate) * 10) / 10;
              const netMargin = Math.round((100 - totalPool) * 10) / 10;

              return (
                <div className="p-3 bg-[#010D1F] border border-white/10 rounded-[2px] flex flex-col gap-2">
                  <span className="text-white/60 font-mono text-[0.688rem] uppercase font-semibold">
                    Package Payout Breakdown
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-[#01142B] border border-white/5 rounded-[2px] flex flex-col">
                      <span className="text-white/50 text-[0.625rem]">Total Expert Pool</span>
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        {totalPool}%
                      </span>
                    </div>
                    <div className="p-2 bg-[#01142B] border border-white/5 rounded-[2px] flex flex-col">
                      <span className="text-white/50 text-[0.625rem]">Net Platform Margin</span>
                      <span className={`font-mono font-bold text-sm ${netMargin >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {netMargin}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </Modal>
      )}

      {/* Commercial Service Catalog & Pricing Governance Modal */}
      {catalog && (
        <ServiceCatalogModal
          isOpen={isCatalogModalOpen}
          onClose={() => setIsCatalogModalOpen(false)}
          initialCatalog={catalog}
          onSaveSuccess={(updated) => {
            setCatalog(updated);
            setToastMessage({
              message: "Pricing Catalog Updated",
              description: "Commercial service packages and pricing limits updated.",
              variant: "success",
            });
            loadData();
          }}
        />
      )}

      {/* Toast Notifications */}
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          description={toastMessage.description}
          variant={toastMessage.variant}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
