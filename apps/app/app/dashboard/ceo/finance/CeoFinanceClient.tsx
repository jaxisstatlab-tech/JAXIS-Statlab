"use client";

import React, { useState, useCallback } from "react";
import { PageHeader, KpiCard, Button, Modal, LoadingState, Peso, Toast } from "@repo/ui";
import {
  ArrowsLeftRight,
  ChartLineUp,
  CurrencyCircleDollar,
  HandCoins,
  PencilSimple,
  Percent,
  Tag,
  Vault,
  WarningCircle,
} from "@phosphor-icons/react";
import { ServiceCatalogModal } from "@/features/quotations/components/ServiceCatalogModal";
import { getCommercialCatalog } from "@/features/quotations/actions";
import type { CommercialCatalogData } from "@/lib/pricing-rules";
import { getCeoFinancialOverviewAction, updatePayoutRateConfigAction } from "@/features/finance/actions";
import type { CeoFinancialOverviewDTO, PayoutRateConfigDTO } from "@/features/finance/schemas";
import { clientPackageName } from "@/features/projects/client-packages";
import { Panel } from "@/components/dashboard/Panel";
import { useLoadUnlessPreloaded } from "@/hooks/use-load-unless-preloaded";

type Mode = "PERCENTAGE" | "FIXED";

const money = (n: number) => n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const packageLabel = (code: string) => (code === "DEFENSELAB" ? "DefenseLab" : clientPackageName(code) ?? code);
const changedOn = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" }) : "";

export function CeoFinanceClient({
  initialOverview,
  initialCatalog,
}: {
  initialOverview: CeoFinancialOverviewDTO | null;
  initialCatalog: CommercialCatalogData | null;
}) {
  const [overview, setOverview] = useState<CeoFinancialOverviewDTO | null>(initialOverview);
  const [isLoading, setIsLoading] = useState<boolean>(initialOverview === null);
  const [loadFailed, setLoadFailed] = useState(false);

  // Pay rate editor
  const [selectedConfig, setSelectedConfig] = useState<PayoutRateConfigDTO | null>(null);
  const [newMode, setNewMode] = useState<Mode>("PERCENTAGE");
  const [newRate, setNewRate] = useState("");
  const [newQaRate, setNewQaRate] = useState("");
  const [newFixedAmount, setNewFixedAmount] = useState("");
  const [newFixedQaAmount, setNewFixedQaAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Prices & packages
  const [catalog, setCatalog] = useState<CommercialCatalogData | undefined>(initialCatalog ?? undefined);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; description?: string; variant: "info" | "success" | "warning" | "danger" } | null>(null);

  /** quiet: refresh in place after a save, without swapping the page for a loader. */
  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const [res, catalogRes] = await Promise.all([getCeoFinancialOverviewAction(), getCommercialCatalog()]);
      if (res.success && res.data) {
        setOverview(res.data);
        setLoadFailed(false);
      } else if (!quiet) {
        setLoadFailed(true);
      }
      if (catalogRes) setCatalog(catalogRes);
    } catch (err) {
      console.error("Failed to load the finance page:", err);
      if (!quiet) setLoadFailed(true);
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, []);

  useLoadUnlessPreloaded(() => loadData(), [], initialOverview !== null);

  const openEditor = (config: PayoutRateConfigDTO) => {
    setSelectedConfig(config);
    setNewMode(config.mode || "PERCENTAGE");
    setNewRate(String(config.ratePercent));
    setNewQaRate(String(config.qaRatePercent ?? 10));
    setNewFixedAmount(String(config.fixedAmount ?? 1500));
    setNewFixedQaAmount(String(config.fixedQaAmount ?? 250));
    setErrorMsg(null);
  };

  const handleSave = async () => {
    if (!selectedConfig) return;
    const rate = parseFloat(newRate);
    const qaRate = parseFloat(newQaRate);
    const fixed = parseFloat(newFixedAmount);
    const fixedQa = parseFloat(newFixedQaAmount);

    if (newMode === "PERCENTAGE") {
      if (isNaN(rate) || rate < 0 || rate > 100 || isNaN(qaRate) || qaRate < 0 || qaRate > 100) {
        setErrorMsg("Enter each share as a number from 0 to 100.");
        return;
      }
      if (rate + qaRate > 100) {
        setErrorMsg(`Both shares add up to ${rate + qaRate}%, which is more than the whole price.`);
        return;
      }
    } else if (isNaN(fixed) || fixed < 0 || isNaN(fixedQa) || fixedQa < 0) {
      setErrorMsg("Enter each amount as ₱0 or more.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await updatePayoutRateConfigAction({
        packageName: selectedConfig.packageName,
        mode: newMode,
        ratePercent: isNaN(rate) ? selectedConfig.ratePercent : rate,
        qaRatePercent: isNaN(qaRate) ? selectedConfig.qaRatePercent : qaRate,
        fixedAmount: isNaN(fixed) ? selectedConfig.fixedAmount : fixed,
        fixedQaAmount: isNaN(fixedQa) ? selectedConfig.fixedQaAmount : fixedQa,
      });
      if (res.success) {
        setSelectedConfig(null);
        setToast({ message: "Pay rates saved", description: `${packageLabel(selectedConfig.packageName)} uses the new rates from now on.`, variant: "success" });
        await loadData(true);
      } else {
        setErrorMsg(res.error?.message || "We couldn't save the new rates. Please try again.");
      }
    } catch {
      setErrorMsg("We couldn't save the new rates. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="my-auto flex min-h-full w-full flex-1 items-center justify-center font-sans animate-content-fade">
        <LoadingState variant="page" label="Loading money and pay rates..." />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 font-sans animate-content-fade">
        <Panel as="div">
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <WarningCircle size={28} weight="fill" className="text-white/30" />
            <p className="mt-4 text-sm font-medium text-white">{loadFailed ? "We couldn't load this page" : "Nothing to show yet"}</p>
            <p className="mt-1 max-w-md text-[13px] text-white/55">Please try again in a moment.</p>
            <Button variant="outline" size="sm" className="mt-5" onClick={() => loadData()}>
              Try Again
            </Button>
          </div>
        </Panel>
      </div>
    );
  }

  const configs = new Map(overview.rateConfigs.map((c) => [c.packageName, c] as const));
  const marginLine =
    overview.grossRealizedRevenue > 0 ? `${overview.averageMarginPercent}% of revenue` : undefined;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 font-sans animate-content-fade">
      <PageHeader
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "CEO", href: "/dashboard/ceo" },
          { label: "Money & pay rates" },
        ]}
        title="Money & pay rates"
        description="What studies earned, what JAXIS kept, and how much each package pays your analysts and reviewers."
        actions={
          <Button variant="outline" size="sm" onClick={() => setIsCatalogModalOpen(true)} className="gap-1.5" disabled={!catalog}>
            <Tag size={14} weight="fill" />
            Edit Prices & Packages
          </Button>
        }
      />

      <section aria-label="Totals" className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Revenue"
          description="From finished studies"
          icon={<ChartLineUp size={18} weight="fill" />}
          value={`₱${money(overview.grossRealizedRevenue)}`}
          info="Money from studies that are finished and recorded in the books."
        />
        <KpiCard
          label="Profit"
          description="After paying staff"
          icon={<CurrencyCircleDollar size={18} weight="fill" />}
          value={`₱${money(overview.netRealizedMargin)}`}
          badge={marginLine}
          info="Revenue minus what analysts and reviewers earn on those studies."
        />
        <KpiCard
          label="Paid to staff"
          description="Sent to analysts and reviewers"
          icon={<HandCoins size={18} weight="fill" />}
          value={`₱${money(overview.totalDisbursed)}`}
          badge={overview.pendingDisbursements > 0 ? `₱${money(overview.pendingDisbursements)} waiting` : undefined}
          info="Staff pay already sent. 'Waiting' is pay worked out but not sent yet."
        />
        <KpiCard
          label="Not yet paid out"
          description="Revenue minus staff pay sent"
          icon={<Vault size={18} weight="fill" />}
          value={`₱${money(overview.escrowBalance)}`}
          info="Revenue from finished studies that hasn't gone out as staff pay yet."
        />
      </section>

      <Panel aria-label="Pay rates and profit by package">
        <div className="flex flex-col gap-3 border-b border-white/10 px-5 pb-4 pt-5 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:pt-6">
          <div className="flex items-start gap-2.5">
            <Percent size={18} weight="fill" className="mt-0.5 shrink-0 text-[#CC6600]" />
            <div>
              <h2 className="font-sans text-base font-bold text-white">Pay rates and profit by package</h2>
              <p className="mt-1 font-sans text-xs text-white/60">
                What each package pays the statistical analyst and the reviewer. New rates apply to pay worked out from now on.
              </p>
            </div>
          </div>
          <span className="self-start whitespace-nowrap rounded-[2px] border border-white/10 bg-white/[0.06] px-2.5 py-1 font-mono text-xs font-semibold uppercase text-white/70">
            {overview.packageProfitability.length} packages
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[60rem] border-collapse text-left font-sans text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.07] text-xs text-white/45">
                <th className="px-5 py-3 font-medium sm:px-6">Package</th>
                <th className="px-3 py-3 text-right font-medium">Finished</th>
                <th className="px-3 py-3 text-right font-medium">Revenue</th>
                <th className="px-3 py-3 text-right font-medium">Staff pay</th>
                <th className="px-3 py-3 text-right font-medium">Profit</th>
                <th className="px-3 py-3 text-right font-medium">Margin</th>
                <th className="px-3 py-3 text-right font-medium">Analyst gets</th>
                <th className="px-3 py-3 text-right font-medium">Reviewer gets</th>
                <th className="px-3 py-3 text-right font-medium">JAXIS keeps</th>
                <th className="px-5 py-3 text-right font-medium sm:px-6">
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {overview.packageProfitability.map((pkg) => {
                const cfg = configs.get(pkg.packageName);
                const fixed = cfg?.mode === "FIXED";
                const rate = cfg?.ratePercent ?? pkg.currentRatePercent;
                const qaRate = cfg?.qaRatePercent ?? pkg.currentQaRatePercent ?? 0;
                return (
                  <tr key={pkg.packageName} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5 sm:px-6">
                      <span className="block font-semibold text-white">{packageLabel(pkg.packageName)}</span>
                      <span className="mt-0.5 block font-mono text-[11px] text-white/40">
                        {pkg.packageName}
                        {cfg?.effectiveFrom && cfg.approvedBy ? ` · changed ${changedOn(cfg.effectiveFrom)}` : ""}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono text-white/80">{pkg.projectCount}</td>
                    <td className="px-3 py-3.5 text-right font-mono font-semibold text-white">
                      <Peso />
                      {money(pkg.grossRevenue)}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono text-white/80">
                      <Peso />
                      {money(pkg.totalPayouts)}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono font-semibold text-white">
                      <Peso />
                      {money(pkg.netMargin)}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono text-white/70">{pkg.projectCount ? `${pkg.marginPercent}%` : "—"}</td>
                    <td className="px-3 py-3.5 text-right font-mono font-semibold text-white">
                      {fixed ? (
                        <>
                          <Peso />
                          {money(cfg?.fixedAmount ?? 0)}
                        </>
                      ) : (
                        `${rate}%`
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono font-semibold text-white">
                      {fixed ? (
                        <>
                          <Peso />
                          {money(cfg?.fixedQaAmount ?? 0)}
                        </>
                      ) : (
                        `${qaRate}%`
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono text-white/70">{fixed ? "The rest" : `${Math.round((100 - rate - qaRate) * 10) / 10}%`}</td>
                    <td className="px-5 py-3.5 text-right sm:px-6">
                      {cfg ? (
                        <Button variant="outline" size="sm" onClick={() => openEditor(cfg)} className="gap-1.5" aria-label={`Edit pay rates for ${packageLabel(pkg.packageName)}`}>
                          <PencilSimple size={13} weight="fill" />
                          Edit
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {selectedConfig ? (
        <RateEditor
          config={selectedConfig}
          samplePrice={samplePriceFor(selectedConfig.packageName, catalog)}
          mode={newMode}
          setMode={setNewMode}
          rate={newRate}
          setRate={setNewRate}
          qaRate={newQaRate}
          setQaRate={setNewQaRate}
          fixedAmount={newFixedAmount}
          setFixedAmount={setNewFixedAmount}
          fixedQaAmount={newFixedQaAmount}
          setFixedQaAmount={setNewFixedQaAmount}
          errorMsg={errorMsg}
          isSubmitting={isSubmitting}
          onClose={() => !isSubmitting && setSelectedConfig(null)}
          onSave={handleSave}
        />
      ) : null}

      {catalog ? (
        <ServiceCatalogModal
          isOpen={isCatalogModalOpen}
          onClose={() => setIsCatalogModalOpen(false)}
          initialCatalog={catalog}
          onSaveSuccess={(updated) => {
            setCatalog(updated);
            setToast({ message: "Prices saved", description: "Package prices and limits are updated.", variant: "success" });
            loadData(true);
          }}
        />
      ) : null}

      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

/** A typical price for the package, to show the rates in pesos while editing. */
function samplePriceFor(pkg: string, catalog?: CommercialCatalogData): number {
  const fromPackages = catalog?.packages?.[pkg]?.defaultPrice;
  const fromAddOns = (catalog?.addOns as Record<string, { defaultPrice?: number }> | undefined)?.[pkg]?.defaultPrice;
  return Number(fromPackages ?? fromAddOns ?? 3000) || 3000;
}

const INPUT =
  "w-full rounded-[2px] border border-white/15 bg-[#050513] px-3 py-2.5 font-mono text-base text-white outline-none transition-colors focus:border-[#CC6600] sm:text-sm";

function RateEditor(props: {
  config: PayoutRateConfigDTO;
  samplePrice: number;
  mode: Mode;
  setMode: (m: Mode) => void;
  rate: string;
  setRate: (v: string) => void;
  qaRate: string;
  setQaRate: (v: string) => void;
  fixedAmount: string;
  setFixedAmount: (v: string) => void;
  fixedQaAmount: string;
  setFixedQaAmount: (v: string) => void;
  errorMsg: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const { config, samplePrice, mode, errorMsg, isSubmitting } = props;
  const name = packageLabel(config.packageName);

  // Live preview on a typical study price.
  const analyst =
    mode === "PERCENTAGE" ? (samplePrice * (parseFloat(props.rate) || 0)) / 100 : parseFloat(props.fixedAmount) || 0;
  const reviewer =
    mode === "PERCENTAGE" ? (samplePrice * (parseFloat(props.qaRate) || 0)) / 100 : parseFloat(props.fixedQaAmount) || 0;
  const kept = samplePrice - analyst - reviewer;

  return (
    <Modal
      open
      onClose={props.onClose}
      title={`Pay rates: ${name}`}
      description="Choose how much the statistical analyst and the reviewer earn on each study in this package."
      size="md"
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          <Button variant="outline" size="sm" disabled={isSubmitting} onClick={props.onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" loading={isSubmitting} disabled={isSubmitting} onClick={props.onSave}>
            {isSubmitting ? "Saving..." : "Save Pay Rates"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 font-sans text-sm">
        {errorMsg ? (
          <p role="alert" className="flex items-start gap-2 rounded-[2px] border border-red-500/30 bg-red-500/[0.06] p-3 text-[13px] text-red-200">
            <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-red-400" />
            {errorMsg}
          </p>
        ) : null}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-xs font-medium text-white/70">How staff are paid</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(
              [
                ["PERCENTAGE", "Share of the price", "A percent of what the client pays"],
                ["FIXED", "Flat amount", "The same peso amount on every study"],
              ] as const
            ).map(([value, title, hint]) => {
              const on = mode === value;
              return (
                <label
                  key={value}
                  className={`flex cursor-pointer gap-3 rounded-[2px] border p-3 transition-colors ${
                    on ? "border-[#CC6600]/60 bg-[#CC6600]/[0.06]" : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <input type="radio" name="pay-mode" checked={on} onChange={() => props.setMode(value)} className="mt-0.5 accent-[#CC6600]" />
                  <span>
                    <span className="block text-sm font-medium text-white">{title}</span>
                    <span className="mt-0.5 block text-xs text-white/55">{hint}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {mode === "PERCENTAGE" ? (
            <>
              <NumberField label="Statistical analyst" suffix="%" value={props.rate} onChange={props.setRate} step={0.5} max={100} />
              <NumberField label="Reviewer (QA)" suffix="%" value={props.qaRate} onChange={props.setQaRate} step={0.5} max={100} />
            </>
          ) : (
            <>
              <NumberField label="Statistical analyst" prefix="₱" value={props.fixedAmount} onChange={props.setFixedAmount} step={50} />
              <NumberField label="Reviewer (QA)" prefix="₱" value={props.fixedQaAmount} onChange={props.setFixedQaAmount} step={50} />
            </>
          )}
        </div>

        <div className="rounded-[2px] border border-white/[0.08] bg-white/[0.02] p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-white/50">
            <ArrowsLeftRight size={13} weight="fill" />
            <span>
              On a <Peso />
              {money(samplePrice)} study
            </span>
          </p>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-[13px]">
            {[
              ["Analyst gets", analyst],
              ["Reviewer gets", reviewer],
              ["JAXIS keeps", kept],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-xs text-white/45">{label}</dt>
                <dd className={`mt-0.5 font-mono font-semibold ${Number(value) < 0 ? "text-red-400" : "text-white"}`}>
                  <Peso />
                  {money(Math.round(Number(value) * 100) / 100)}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {config.effectiveFrom && config.approvedBy ? (
          <p className="text-xs text-white/45">
            Last changed {changedOn(config.effectiveFrom)}
            {config.approvedByName ? ` by ${config.approvedByName}` : ""}.
          </p>
        ) : (
          <p className="text-xs text-white/45">Using the standard rates for this package.</p>
        )}
      </div>
    </Modal>
  );
}

function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  step: number;
  max?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-white/70">{label}</span>
      <span className="relative">
        {prefix ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-sans text-white/45">{prefix}</span> : null}
        <input
          type="number"
          inputMode="decimal"
          min={0}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${INPUT} ${prefix ? "pl-8" : ""} ${suffix ? "pr-8" : ""}`}
        />
        {suffix ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-white/45">{suffix}</span> : null}
      </span>
    </label>
  );
}
