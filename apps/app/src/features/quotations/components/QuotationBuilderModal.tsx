"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Modal, Button, Toast, Peso } from "@repo/ui";
import { Check, PaperPlaneTilt, Warning } from "@phosphor-icons/react";
import {
  PACKAGES_CATALOG,
  ADDONS_CATALOG,
  UPFRONT_PACKAGES,
  calculateQuotationTotals,
  validatePackageBasePrice,
  type PackageDefinition,
  type AddOnDefinition,
  type CommercialCatalogData,
} from "@/lib/pricing-rules";
import { createQuotation, updateQuotation, issueQuotation } from "@/features/quotations/actions";
import type { QuotationDetailItem } from "@/features/quotations/schemas";
import { AnalysisGoalsList } from "@/features/projects/components/AnalysisGoalsList";
import { ClientPreferences } from "@/features/projects/components/ClientPreferences";
import { preferredAddOnCodes } from "@/features/projects/intake-preferences";
import type { PackageName, AddOnName } from "@prisma/client";

// The quote window: pick the package and its price, add-ons, a note and how long the quote is valid, with the
// total, deposit and balance worked out on the right; save a draft or send it to the client. Quotes already sent,
// accepted or replaced open read-only (a sent quote changes by moving the study back to pricing).

interface QuotationBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectIntakeId?: string;
  projectTitle?: string;
  clientName?: string;
  /** What the client wants the analysis to do (intake form), shown while choosing the package. */
  analysisGoals?: string[] | null;
  existingQuotation?: QuotationDetailItem | null;
  customCatalog?: CommercialCatalogData;
  /** What the client would like (intake form). A new quote starts from it; JAXIS may change it. */
  clientPreference?: { preferredPackage?: string | null; preferredAddOns?: string[] | null; clientNotes?: string | null };
  onSuccess?: () => void;
}

const money = (n?: number) => (n ?? 0).toLocaleString("en-PH", { maximumFractionDigits: 2 });
const plainName = (name: string) => name.replace(/^[A-Z]{2}-\d+\s*/, "");
const FIELD =
  "w-full rounded-[2px] border border-white/10 bg-[#050513] px-3 font-sans text-[13px] text-white outline-none placeholder:text-white/30 focus:border-[#CC6600]/60";
const STATUS_WORD: Record<string, string> = {
  QUOTE_SENT: "Sent to the client",
  CLIENT_APPROVED: "Accepted by the client",
  QUOTE_DECLINED: "Declined by the client",
  QUOTE_EXPIRED: "Expired",
  SUPERSEDED: "Replaced by a newer quote",
};

function range(pkg: PackageDefinition) {
  if (pkg.maxPrice === null)
    return (
      <>
        From <Peso />
        {money(pkg.minPrice)}
      </>
    );
  if (pkg.minPrice === pkg.maxPrice)
    return (
      <>
        <Peso />
        {money(pkg.minPrice)}
      </>
    );
  return (
    <>
      <Peso />
      {money(pkg.minPrice)} to <Peso />
      {money(pkg.maxPrice)}
    </>
  );
}

export function QuotationBuilderModal({
  isOpen,
  onClose,
  projectId,
  projectIntakeId,
  projectTitle,
  clientName,
  analysisGoals,
  existingQuotation,
  customCatalog,
  clientPreference,
  onSuccess,
}: QuotationBuilderModalProps) {
  const packagesCatalog: Record<string, PackageDefinition> = customCatalog?.packages || PACKAGES_CATALOG;
  const addOnsCatalog: Record<string, AddOnDefinition> = customCatalog?.addOns || ADDONS_CATALOG;
  const readOnly = !!existingQuotation && existingQuotation.status !== "DRAFT";

  const [selectedPackage, setSelectedPackage] = useState<PackageName>("JX_03_CORE");
  const [basePrice, setBasePrice] = useState<number>(2500);
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, { selected: boolean; amount: number }>>({});
  const [customDownpayment, setCustomDownpayment] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [expiresInDays, setExpiresInDays] = useState<number>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; description?: string; variant: "success" | "danger" | "warning" } | null>(null);

  // Start from the existing quote, or the default package.
  useEffect(() => {
    const initialAddOns: Record<string, { selected: boolean; amount: number }> = {};
    Object.keys(addOnsCatalog).forEach((k) => {
      const item = addOnsCatalog[k];
      if (item) initialAddOns[k] = { selected: false, amount: item.defaultPrice };
    });
    if (existingQuotation) {
      setSelectedPackage(existingQuotation.packageName);
      setBasePrice(existingQuotation.basePrice);
      setNotes(existingQuotation.notes || "");
      existingQuotation.lineItems.forEach((li) => {
        if (li.itemType === "ADDON") initialAddOns[li.itemName] = { selected: true, amount: li.amount };
      });
      setSelectedAddOns(initialAddOns);
      setCustomDownpayment(!existingQuotation.isUpfrontEnforced && existingQuotation.downpaymentRequired ? String(existingQuotation.downpaymentRequired) : "");
    } else {
      // Start from the client's preferred package and add-ons when they picked some (else Core).
      const wanted = clientPreference?.preferredPackage;
      const preferred = wanted && wanted !== "UNSURE" && packagesCatalog[wanted]?.isActive !== false ? packagesCatalog[wanted] : undefined;
      const defaultPkg = preferred || packagesCatalog.JX_03_CORE || Object.values(packagesCatalog)[0];
      setSelectedPackage((defaultPkg?.code as PackageName) || "JX_03_CORE");
      setBasePrice(defaultPkg?.defaultPrice || 2500);
      for (const code of preferredAddOnCodes(clientPreference?.preferredAddOns)) {
        if (initialAddOns[code] && addOnsCatalog[code]?.isActive !== false) initialAddOns[code] = { ...initialAddOns[code]!, selected: true };
      }
      setSelectedAddOns(initialAddOns);
      setNotes("");
      setCustomDownpayment("");
      setExpiresInDays(3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingQuotation, isOpen, customCatalog]);

  const choosePackage = (pkg: PackageName) => {
    if (readOnly) return;
    setSelectedPackage(pkg);
    const def = packagesCatalog[pkg];
    if (def) setBasePrice(def.defaultPrice);
    if (def?.isUpfront ?? UPFRONT_PACKAGES.includes(pkg)) setCustomDownpayment("");
  };

  const toggleAddOn = (name: string) => {
    if (readOnly) return;
    setSelectedAddOns((prev) => (prev[name] ? { ...prev, [name]: { ...prev[name]!, selected: !prev[name]!.selected } } : prev));
  };

  const activeAddOns = useMemo(
    () =>
      Object.keys(selectedAddOns)
        .filter((k) => selectedAddOns[k]?.selected)
        .map((k) => ({ name: k as AddOnName, amount: selectedAddOns[k]?.amount || 0 })),
    [selectedAddOns],
  );

  const breakdown = useMemo(() => {
    try {
      return calculateQuotationTotals(
        { packageName: selectedPackage, basePrice, addOns: activeAddOns, customDownpayment: customDownpayment ? Number(customDownpayment) : undefined },
        customCatalog,
      );
    } catch {
      return null;
    }
  }, [selectedPackage, basePrice, activeAddOns, customDownpayment, customCatalog]);

  const priceCheck = useMemo(() => validatePackageBasePrice(selectedPackage, basePrice, packagesCatalog), [selectedPackage, basePrice, packagesCatalog]);
  const pkg: PackageDefinition = packagesCatalog[selectedPackage] || PACKAGES_CATALOG.JX_03_CORE;
  // Said plainly here (the pricing rules' own message uses the package code).
  const priceProblem = priceCheck.valid
    ? ""
    : !Number.isFinite(basePrice) || basePrice <= 0
      ? "Enter a price."
      : basePrice < pkg.minPrice
        ? `The lowest price for ${plainName(pkg.name)} is ₱${money(pkg.minPrice)}.`
        : pkg.maxPrice !== null && basePrice > pkg.maxPrice
          ? `The highest price for ${plainName(pkg.name)} is ₱${money(pkg.maxPrice)}. For more, pick a bigger package.`
          : priceCheck.error || "Check the price.";
  const upfront = !!breakdown?.isUpfrontEnforced;
  const validUntil = new Date(Date.now() + expiresInDays * 86_400_000).toLocaleDateString("en-PH", { month: "short", day: "numeric" });

  const payload = () => ({
    packageName: selectedPackage,
    basePrice,
    addOns: activeAddOns,
    customDownpayment: customDownpayment ? Number(customDownpayment) : undefined,
    notes,
    expiresInDays,
  });

  const saveDraft = async () => {
    if (!priceCheck.valid) return setToast({ message: "Check the price", description: priceProblem, variant: "warning" });
    setIsSubmitting(true);
    try {
      const res =
        existingQuotation?.status === "DRAFT"
          ? await updateQuotation({ quotationId: existingQuotation.id, ...payload() })
          : await createQuotation({ projectId, ...payload() });
      if (!res.success) return setToast({ message: "Not saved", description: res.error?.message, variant: "danger" });
      setToast({ message: "Draft saved", description: "It's not sent yet. Find it under Quotes → Drafts.", variant: "success" });
      onSuccess?.();
      setTimeout(onClose, 500);
    } catch {
      setToast({ message: "Not saved", description: "Something went wrong. Please try again.", variant: "danger" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const send = async () => {
    if (!priceCheck.valid) return setToast({ message: "Check the price", description: priceProblem, variant: "warning" });
    setIsIssuing(true);
    try {
      let id = existingQuotation?.status === "DRAFT" ? existingQuotation.id : undefined;
      if (!id) {
        const created = await createQuotation({ projectId, ...payload() });
        if (!created.success || !created.data) throw new Error(created.error?.message || "The quote wasn't saved.");
        id = created.data.id;
      } else {
        const updated = await updateQuotation({ quotationId: id, ...payload() });
        if (!updated.success) throw new Error(updated.error?.message || "The quote wasn't saved.");
      }
      const issued = await issueQuotation({ quotationId: id, expiresInDays, notes });
      if (!issued.success) throw new Error(issued.error?.message || "The quote wasn't sent.");
      setConfirmOpen(false);
      setToast({ message: "Quote sent", description: `${clientName || "The client"} can now accept it.`, variant: "success" });
      onSuccess?.();
      setTimeout(onClose, 600);
    } catch (err) {
      setToast({ message: "Not sent", description: err instanceof Error ? err.message : "Please try again.", variant: "danger" });
    } finally {
      setIsIssuing(false);
    }
  };

  const busy = isSubmitting || isIssuing;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Quote for ${projectIntakeId || "this study"}`}
        description={[existingQuotation?.status === "DRAFT" ? "Draft" : null, projectTitle, clientName].filter(Boolean).join(" · ")}
        size="5xl"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-3 font-sans">
            <p className="hidden text-[12px] text-white/45 sm:block">
              {readOnly ? (STATUS_WORD[existingQuotation!.status] ?? existingQuotation!.status) : "Prices come from the CEO's price list (Money & Pay Rates)."}
            </p>
            <div className="ml-auto flex gap-2 whitespace-nowrap">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
                {readOnly ? "Close" : "Cancel"}
              </Button>
              {!readOnly ? (
                <>
                  <Button variant="outline" size="sm" onClick={saveDraft} loading={isSubmitting} disabled={busy || !priceCheck.valid}>
                    Save Draft
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setConfirmOpen(true)}
                    disabled={busy || !priceCheck.valid}
                    className="gap-1.5 active:scale-[0.97]"
                  >
                    <PaperPlaneTilt size={14} weight="fill" />
                    Send to Client
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-6 font-sans lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-7">
            {readOnly ? (
              <p className="rounded-[2px] border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white/65">
                This quote was already sent, so it can&apos;t be edited. To change it, move the study back to pricing (Change status on the study page) and
                build a new quote.
              </p>
            ) : null}

            <section>
              <h3 className="text-[13px] font-medium text-white">What the client wants the analysis to do</h3>
              <div className="mt-2 rounded-[2px] border border-white/[0.08] px-3.5 py-3">
                <AnalysisGoalsList codes={analysisGoals} compact />
              </div>
            </section>

            {clientPreference ? (
              <section>
                <h3 className="text-[13px] font-medium text-white">What the client would like</h3>
                <div className="mt-2 rounded-[2px] border border-white/[0.08] px-3.5 py-3">
                  <ClientPreferences {...clientPreference} />
                </div>
                {!readOnly && !existingQuotation ? (
                  <p className="mt-1.5 text-[12px] text-white/45">The quote starts from these. Change them if the study needs something else.</p>
                ) : null}
              </section>
            ) : null}

            <section>
              <h3 className="text-[13px] font-medium text-white">Package</h3>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Package">
                {(Object.keys(packagesCatalog) as PackageName[])
                  .filter((k) => (readOnly ? k === selectedPackage : packagesCatalog[k]?.isActive !== false))
                  .map((k) => {
                    const p = packagesCatalog[k]!;
                    const on = selectedPackage === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => choosePackage(k)}
                        disabled={readOnly}
                        className={`flex flex-col gap-1.5 rounded-[2px] border px-3.5 py-3 text-left transition-colors ${
                          on ? "border-[#CC6600]/70 bg-white/[0.04] disabled:cursor-default" : "border-white/[0.08] hover:border-white/20"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-semibold text-white">{plainName(p.name)}</span>
                          {on ? <Check size={14} weight="bold" className="shrink-0 text-[#CC6600]" /> : null}
                        </span>
                        <span className="line-clamp-2 text-[12px] leading-relaxed text-white/55">{p.tagline}</span>
                        <span className="mt-auto flex items-center justify-between gap-2 pt-1 text-[12px]">
                          <span className="text-white/85">{range(p)}</span>
                          <span className="text-white/45">{p.isUpfront ? "Paid in full first" : "50% deposit"}</span>
                        </span>
                      </button>
                    );
                  })}
              </div>
              <div className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                <label htmlFor="quote-price" className="text-[13px] text-white/70">
                  Price for this study
                  <span className="ml-2 text-[12px] text-white/40">Allowed: {range(pkg)}</span>
                </label>
                <div className="flex h-10 items-center overflow-hidden rounded-[2px] border border-white/10 bg-[#050513] focus-within:border-[#CC6600]/60 sm:w-44">
                  <span className="px-3 text-[13px] text-white/50">
                    <Peso />
                  </span>
                  <input
                    id="quote-price"
                    type="number"
                    min={pkg.minPrice}
                    max={pkg.maxPrice || undefined}
                    step="50"
                    value={basePrice}
                    disabled={readOnly}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    className="h-full flex-1 bg-transparent pr-3 font-mono text-[14px] text-white outline-none [appearance:textfield] disabled:opacity-60 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
              </div>
              {!priceCheck.valid && !readOnly ? (
                <p className="mt-1.5 flex items-start gap-1.5 text-[12px] text-red-300">
                  <Warning size={13} weight="fill" className="mt-0.5 shrink-0" />
                  {priceProblem}
                </p>
              ) : null}
            </section>

            {readOnly && activeAddOns.length === 0 ? null : (
              <section>
                <h3 className="text-[13px] font-medium text-white">
                  Add-ons <span className="font-normal text-white/40">(optional)</span>
                </h3>
                <ul className="mt-2 divide-y divide-white/[0.05] rounded-[2px] border border-white/[0.08]">
                  {Object.keys(addOnsCatalog)
                    .filter((k) => (readOnly ? selectedAddOns[k]?.selected : addOnsCatalog[k]?.isActive !== false || selectedAddOns[k]?.selected))
                    .map((k) => {
                      const a = addOnsCatalog[k]!;
                      const on = !!selectedAddOns[k]?.selected;
                      return (
                        <li key={k}>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={on}
                            onClick={() => toggleAddOn(k)}
                            disabled={readOnly}
                            className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.02] disabled:cursor-default disabled:hover:bg-transparent"
                          >
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] border ${
                                on ? "border-[#CC6600] bg-[#CC6600] text-white" : "border-white/25"
                              }`}
                            >
                              {on ? <Check size={11} weight="bold" /> : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13px] text-white">{a.name}</span>
                              <span className="block truncate text-[12px] text-white/50">{a.tagline}</span>
                            </span>
                            <span className="shrink-0 text-[13px] text-white/80">
                              +<Peso />
                              {money(selectedAddOns[k]?.amount ?? a.defaultPrice)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                </ul>
              </section>
            )}

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5 text-[13px] text-white/70 sm:col-span-2">
                Note for the client (optional)
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={readOnly}
                  placeholder="For example: includes the full Chapter 4 write-up and your SPSS files."
                  className={`${FIELD} h-10 disabled:opacity-60`}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
                Valid for
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  disabled={readOnly}
                  className={`${FIELD} h-10 cursor-pointer disabled:opacity-60 [&>option]:bg-[#0A0A18]`}
                >
                  <option value={3}>3 days</option>
                  <option value={5}>5 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                </select>
              </label>
            </section>
          </div>

          <aside className="lg:col-span-5">
            <div className="flex flex-col gap-4 rounded-[2px] border border-white/[0.08] bg-[#0A0A18] p-5 lg:sticky lg:top-0">
              <h3 className="text-[13px] font-medium text-white">Summary</h3>
              <dl className="flex flex-col gap-2 text-[13px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-white/80">{plainName(pkg.name)}</dt>
                  <dd className="shrink-0 text-white">
                    <Peso />
                    {money(breakdown?.basePrice)}
                  </dd>
                </div>
                {activeAddOns.map((a) => (
                  <div key={a.name} className="flex justify-between gap-3">
                    <dt className="truncate text-white/60">+ {addOnsCatalog[a.name]?.name || a.name}</dt>
                    <dd className="shrink-0 text-white/80">
                      <Peso />
                      {money(a.amount)}
                    </dd>
                  </div>
                ))}
              </dl>
              <dl className="flex flex-col gap-2 border-t border-white/[0.08] pt-3 text-[13px]">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-white/70">Total</dt>
                  <dd className="text-xl font-semibold text-white">
                    <Peso />
                    {money(breakdown?.totalAmount)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/55">
                    {upfront ? "Paid in full before work starts" : `Deposit to start (${breakdown?.downpaymentPercentage ?? 50}%)`}
                  </dt>
                  <dd className="text-white">
                    <Peso />
                    {money(breakdown?.downpaymentRequired)}
                  </dd>
                </div>
                {!upfront ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-white/55">Balance before the final files</dt>
                    <dd className="text-white/80">
                      <Peso />
                      {money((breakdown?.totalAmount ?? 0) - (breakdown?.downpaymentRequired ?? 0))}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3 text-[12px]">
                  <dt className="text-white/45">Valid until</dt>
                  <dd className="text-white/70">
                    {readOnly && existingQuotation
                      ? new Date(existingQuotation.expiresAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
                      : validUntil}
                  </dd>
                </div>
              </dl>
              {pkg.deliverables?.length ? (
                <div className="border-t border-white/[0.08] pt-3">
                  <p className="text-[12px] font-medium text-white/50">What the client gets</p>
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {pkg.deliverables.map((d) => (
                      <li key={d} className="flex gap-2 text-[12px] leading-relaxed text-white/65">
                        <span aria-hidden="true" className="text-white/30">
                          –
                        </span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </Modal>

      <Modal
        isOpen={confirmOpen}
        onClose={() => (isIssuing ? undefined : setConfirmOpen(false))}
        title="Send this quote?"
        description={`${clientName || "The client"} is told and can accept it until ${validUntil}.`}
        size="md"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)} disabled={isIssuing}>
              Back
            </Button>
            <Button variant="primary" size="sm" onClick={send} loading={isIssuing} className="gap-1.5">
              <PaperPlaneTilt size={14} weight="fill" />
              Send Quote
            </Button>
          </div>
        }
      >
        <dl className="flex flex-col gap-2 font-sans text-[13px]">
          <div className="flex justify-between">
            <dt className="text-white/55">Package</dt>
            <dd className="text-white">{plainName(pkg.name)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/55">Total</dt>
            <dd className="font-semibold text-white">
              <Peso />
              {money(breakdown?.totalAmount)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/55">{upfront ? "Paid in full first" : "Deposit to start"}</dt>
            <dd className="text-white">
              <Peso />
              {money(breakdown?.downpaymentRequired)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/55">Valid for</dt>
            <dd className="text-white">{expiresInDays} days</dd>
          </div>
        </dl>
      </Modal>

      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </>
  );
}
