"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Modal, ModalFooter, Button, Toast, Peso } from "@repo/ui";
import {
  IconSend,
  IconAlertTriangle,
  IconSchool,
  IconBolt,
  IconFlame,
  IconSparkles,
  IconCheck,
  IconDeviceFloppy,
  IconReceipt,
  IconX,
} from "@tabler/icons-react";
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
import {
  createQuotation,
  updateQuotation,
  issueQuotation,
} from "@/features/quotations/actions";
import type { QuotationDetailItem } from "@/features/quotations/schemas";
import type { PackageName, AddOnName } from "@prisma/client";

interface QuotationBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectIntakeId?: string;
  projectTitle?: string;
  clientName?: string;
  existingQuotation?: QuotationDetailItem | null;
  customCatalog?: CommercialCatalogData;
  onSuccess?: () => void;
}

export function QuotationBuilderModal({
  isOpen,
  onClose,
  projectId,
  projectIntakeId,
  projectTitle,
  clientName,
  existingQuotation,
  customCatalog,
  onSuccess,
}: QuotationBuilderModalProps) {
  const packagesCatalog: Record<string, PackageDefinition> =
    customCatalog?.packages || PACKAGES_CATALOG;
  const addOnsCatalog: Record<string, AddOnDefinition> =
    customCatalog?.addOns || ADDONS_CATALOG;

  const [selectedPackage, setSelectedPackage] = useState<PackageName>("JX_03_CORE");
  const [basePrice, setBasePrice] = useState<number>(2500);
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, { selected: boolean; amount: number }>>(() => {
    const initial: Record<string, { selected: boolean; amount: number }> = {};
    Object.keys(addOnsCatalog).forEach((k) => {
      const item = addOnsCatalog[k];
      if (item) {
        initial[k] = { selected: false, amount: item.defaultPrice };
      }
    });
    return initial;
  });
  const [customDownpayment, setCustomDownpayment] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [expiresInDays, setExpiresInDays] = useState<number>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isIssuingDirect, setIsIssuingDirect] = useState(false);
  const [confirmIssueModalOpen, setConfirmIssueModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  // Initialize or reset form based on existing quotation and catalog
  useEffect(() => {
    const initialAddOns: Record<string, { selected: boolean; amount: number }> = {};
    Object.keys(addOnsCatalog).forEach((k) => {
      const item = addOnsCatalog[k];
      if (item) {
        initialAddOns[k] = { selected: false, amount: item.defaultPrice };
      }
    });

    if (existingQuotation) {
      setSelectedPackage(existingQuotation.packageName);
      setBasePrice(existingQuotation.basePrice);
      setNotes(existingQuotation.notes || "");

      existingQuotation.lineItems.forEach((li) => {
        if (li.itemType === "ADDON" && li.itemName in initialAddOns) {
          initialAddOns[li.itemName] = {
            selected: true,
            amount: li.amount,
          };
        }
      });

      setSelectedAddOns(initialAddOns);
      if (!existingQuotation.isUpfrontEnforced && existingQuotation.downpaymentRequired) {
        setCustomDownpayment(String(existingQuotation.downpaymentRequired));
      } else {
        setCustomDownpayment("");
      }
    } else {
      const defaultPkg = packagesCatalog.JX_03_CORE || Object.values(packagesCatalog)[0];
      setSelectedPackage((defaultPkg?.code as PackageName) || "JX_03_CORE");
      setBasePrice(defaultPkg?.defaultPrice || 2500);
      setSelectedAddOns(initialAddOns);
      setNotes("");
      setCustomDownpayment("");
      setExpiresInDays(3);
    }
  }, [existingQuotation, isOpen, customCatalog, addOnsCatalog, packagesCatalog]);

  // Handle package change
  const handleSelectPackage = (pkg: PackageName) => {
    setSelectedPackage(pkg);
    const def = packagesCatalog[pkg];
    if (def) {
      setBasePrice(def.defaultPrice);
    }
    const isUpfront = def?.isUpfront ?? UPFRONT_PACKAGES.includes(pkg);
    if (isUpfront) {
      setCustomDownpayment("");
    }
  };

  // Toggle add-on
  const toggleAddOn = (name: string) => {
    setSelectedAddOns((prev) => {
      const current = prev[name];
      if (!current) return prev;
      return {
        ...prev,
        [name]: {
          ...current,
          selected: !current.selected,
        },
      };
    });
  };

  // Active add-ons list for computation
  const activeAddOnsList = useMemo(() => {
    return Object.keys(selectedAddOns)
      .filter((k) => selectedAddOns[k]?.selected)
      .map((k) => ({
        name: k as AddOnName,
        amount: selectedAddOns[k]?.amount || 0,
      }));
  }, [selectedAddOns]);

  // Live calculation breakdown
  const breakdown = useMemo(() => {
    const customDp = customDownpayment ? Number(customDownpayment) : undefined;
    try {
      return calculateQuotationTotals(
        {
          packageName: selectedPackage,
          basePrice,
          addOns: activeAddOnsList,
          customDownpayment: customDp,
        },
        customCatalog
      );
    } catch {
      return null;
    }
  }, [selectedPackage, basePrice, activeAddOnsList, customDownpayment, customCatalog]);

  // Validation
  const priceValidation = useMemo(() => {
    return validatePackageBasePrice(selectedPackage, basePrice, packagesCatalog);
  }, [selectedPackage, basePrice, packagesCatalog]);

  const currentPkgDef: PackageDefinition =
    packagesCatalog[selectedPackage] || PACKAGES_CATALOG.JX_03_CORE;

  // Save Draft action
  const handleSaveDraft = async () => {
    if (!priceValidation.valid) {
      setToastMessage({
        message: "Invalid Price",
        description: priceValidation.error || "Please adjust base price.",
        variant: "warning",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let res;
      if (existingQuotation && existingQuotation.status === "DRAFT") {
        res = await updateQuotation({
          quotationId: existingQuotation.id,
          packageName: selectedPackage,
          basePrice,
          addOns: activeAddOnsList,
          customDownpayment: customDownpayment ? Number(customDownpayment) : undefined,
          notes,
          expiresInDays,
        });
      } else {
        res = await createQuotation({
          projectId,
          packageName: selectedPackage,
          basePrice,
          addOns: activeAddOnsList,
          customDownpayment: customDownpayment ? Number(customDownpayment) : undefined,
          notes,
          expiresInDays,
        });
      }

      if (res.success) {
        setToastMessage({
          message: "Quote Draft Saved",
          description: `Quote draft for ${projectIntakeId || "Study"} saved successfully.`,
          variant: "success",
        });
        onSuccess?.();
        setTimeout(() => onClose(), 500);
      } else {
        setToastMessage({
          message: "Save Failed",
          description: res.error?.message || "Failed to save quotation.",
          variant: "danger",
        });
      }
    } catch {
      setToastMessage({
        message: "System Error",
        description: "An unexpected error occurred.",
        variant: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Issue directly to client
  const handleConfirmIssue = async () => {
    if (!priceValidation.valid) {
      setToastMessage({
        message: "Invalid Price",
        description: priceValidation.error || "Please adjust base price.",
        variant: "warning",
      });
      return;
    }

    setIsIssuingDirect(true);
    try {
      let targetQuoteId = existingQuotation?.id;

      if (!targetQuoteId || existingQuotation?.status !== "DRAFT") {
        const createRes = await createQuotation({
          projectId,
          packageName: selectedPackage,
          basePrice,
          addOns: activeAddOnsList,
          customDownpayment: customDownpayment ? Number(customDownpayment) : undefined,
          notes,
          expiresInDays,
        });

        if (!createRes.success || !createRes.data) {
          throw new Error(createRes.error?.message || "Failed to initialize quote draft.");
        }
        targetQuoteId = createRes.data.id;
      } else {
        const updateRes = await updateQuotation({
          quotationId: targetQuoteId,
          packageName: selectedPackage,
          basePrice,
          addOns: activeAddOnsList,
          customDownpayment: customDownpayment ? Number(customDownpayment) : undefined,
          notes,
          expiresInDays,
        });

        if (!updateRes.success) {
          throw new Error(updateRes.error?.message || "Failed to update quotation.");
        }
      }

      const issueRes = await issueQuotation({
        quotationId: targetQuoteId,
        expiresInDays,
        notes,
      });

      if (issueRes.success) {
        setToastMessage({
          message: "Proposal Issued to Client",
          description: `Quote issued to ${clientName || "Lead Researcher"}.`,
          variant: "success",
        });
        setConfirmIssueModalOpen(false);
        onSuccess?.();
        setTimeout(() => onClose(), 600);
      } else {
        setToastMessage({
          message: "Issuance Failed",
          description: issueRes.error?.message || "Failed to issue quote.",
          variant: "danger",
        });
      }
    } catch (err: unknown) {
      setToastMessage({
        message: "Issuance Error",
        description: (err as Error).message || "Failed to issue quotation.",
        variant: "danger",
      });
    } finally {
      setIsIssuingDirect(false);
    }
  };

  const getAddOnIcon = (name: string) => {
    switch (name) {
      case "DEFENSELAB":
        return <IconSchool size={18} stroke={1.5} className="text-sky-400 flex-shrink-0" />;
      case "RUSH":
        return <IconBolt size={18} stroke={1.5} className="text-amber-400 flex-shrink-0" />;
      case "EXPRESS":
        return <IconFlame size={18} stroke={1.5} className="text-orange-400 flex-shrink-0" />;
      case "EMERGENCY":
        return <IconAlertTriangle size={18} stroke={1.5} className="text-rose-400 flex-shrink-0" />;
      default:
        return <IconSparkles size={18} stroke={1.5} className="text-amber-400 flex-shrink-0" />;
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Commercial Proposal Builder · ${projectIntakeId || "Research Study"}`}
        size="5xl"
        className="min-h-[min(820px,calc(100dvh-2.5rem))]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch py-8 px-8 sm:px-10 flex-1">
          {/* ── Left Column: Configuration Controls (7 cols) ── */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-7">
            {/* 1. Analytical Package Tier Selection */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-white/90">
                  1. Select Analytical Tier
                </label>
                <span className="text-xs font-mono text-[#FFA040] font-bold">
                  Active: {currentPkgDef.id}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {(Object.keys(packagesCatalog) as PackageName[])
                  .filter((pkgKey) => packagesCatalog[pkgKey]?.isActive !== false)
                  .map((pkgKey) => {
                    const pkg = packagesCatalog[pkgKey];
                    if (!pkg) return null;
                    const isSelected = selectedPackage === pkgKey;

                    return (
                      <button
                        key={pkgKey}
                        type="button"
                        onClick={() => handleSelectPackage(pkgKey)}
                        className={`w-full p-4.5 sm:p-5 rounded-[2px] text-left transition-all border flex flex-col justify-between cursor-pointer group relative min-h-[145px] ${
                          isSelected
                            ? "bg-[#012247] border-[#FFA040] shadow-md shadow-[#CC6600]/15"
                            : "bg-[#01142B]/80 border-white/[0.08] hover:border-white/20 hover:bg-[#011B38]"
                        }`}
                      >
                        {/* Top: Tier ID + Category Badge */}
                        <div className="w-full space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-xs font-mono font-bold tracking-wider ${isSelected ? "text-[#FFA040]" : "text-sky-400"}`}>
                              {pkg.id}
                            </span>
                            <span className="text-[0.625rem] font-mono uppercase font-semibold text-white/50 bg-white/[0.04] px-2 py-0.5 rounded-[2px] border border-white/[0.06]">
                              {pkg.badge}
                            </span>
                          </div>

                          <div className="text-sm font-bold text-white leading-snug">
                            {pkg.name.replace(/^[A-Z0-9-]+\s*/, "")}
                          </div>

                          <p className="text-xs text-white/55 line-clamp-2 leading-relaxed font-sans pt-0.5">
                            {pkg.tagline}
                          </p>
                        </div>

                        {/* Bottom: Price Range & Payment Model */}
                        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2 w-full">
                          <span className="font-mono text-xs font-bold text-white whitespace-nowrap">
                            {pkg.maxPrice === null ? (
                              <>
                                <Peso />
                                {pkg.minPrice.toLocaleString()}+
                              </>
                            ) : pkg.minPrice === pkg.maxPrice ? (
                              <>
                                <Peso />
                                {pkg.minPrice.toLocaleString()}
                              </>
                            ) : (
                              <>
                                <Peso />
                                {pkg.minPrice.toLocaleString()} – <Peso />
                                {pkg.maxPrice.toLocaleString()}
                              </>
                            )}
                          </span>
                          <span className={`text-[0.625rem] font-mono uppercase px-2 py-0.5 rounded-[2px] border font-semibold ${
                            pkg.isUpfront
                              ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                              : "bg-sky-500/10 text-sky-300 border-sky-500/30"
                          }`}>
                            {pkg.isUpfront ? "100% Upfront" : "50% Milestone"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
              </div>

              {/* Integrated Base Package Fee Input */}
              <div className="p-4 sm:p-4.5 rounded-[2px] bg-[#01142B] border border-white/[0.12] flex items-center justify-between gap-4 mt-3 shadow-sm">
                <div className="space-y-1">
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                    Base Package Fee
                  </div>
                  <div className="text-xs font-mono text-white/50">
                    Allowed: <Peso />{currentPkgDef.minPrice.toLocaleString()}
                    {currentPkgDef.maxPrice !== null ? <> – <Peso />{currentPkgDef.maxPrice.toLocaleString()}</> : "+"}
                  </div>
                </div>

                <div className="flex items-center rounded-[2px] border border-white/[0.16] bg-[#010D1F] focus-within:border-[#FFA040] focus-within:ring-1 focus-within:ring-[#FFA040]/30 transition-all overflow-hidden h-11 w-60 sm:w-64">
                  <div className="h-full px-3.5 flex items-center bg-white/[0.05] border-r border-white/[0.12] text-[#FFA040] font-mono text-xs font-bold select-none whitespace-nowrap">
                    PHP (<Peso />)
                  </div>
                  <input
                    type="number"
                    min={currentPkgDef.minPrice}
                    max={currentPkgDef.maxPrice || undefined}
                    step="50"
                    value={basePrice}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    className="flex-1 h-full px-4 bg-transparent text-base font-mono font-bold text-white focus:outline-none placeholder:text-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {!priceValidation.valid && (
                <div className="text-xs font-sans text-rose-400 flex items-center gap-1.5 pt-0.5">
                  <IconAlertTriangle size={14} stroke={1.5} />
                  <span>{priceValidation.error}</span>
                </div>
              )}
            </div>

            {/* 2. Optional Priority Add-Ons (Streamlined Checklist) */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-white/90">
                  2. Optional Priority Add-Ons
                </label>
                <span className="text-xs font-mono text-[#FFA040] font-bold">
                  {activeAddOnsList.length > 0 ? `${activeAddOnsList.length} Selected` : "None"}
                </span>
              </div>

              <div className="space-y-3">
                {Object.keys(addOnsCatalog)
                  .filter((addonKey) => addOnsCatalog[addonKey]?.isActive !== false)
                  .map((addonKey) => {
                    const addon = addOnsCatalog[addonKey];
                    if (!addon) return null;
                    const isChecked = selectedAddOns[addonKey]?.selected;

                    return (
                      <button
                        key={addonKey}
                        type="button"
                        onClick={() => toggleAddOn(addonKey)}
                        className={`w-full p-3.5 sm:p-4 rounded-[2px] text-left transition-all border flex items-center justify-between cursor-pointer group ${
                          isChecked
                            ? "bg-[#012247] border-[#FFA040] shadow-sm"
                            : "bg-[#01142B]/80 border-white/[0.08] hover:border-white/20 hover:bg-[#011B38]"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                          {/* Custom Checkbox */}
                          <div
                            className={`w-4 h-4 rounded-[2px] flex items-center justify-center border transition-all flex-shrink-0 ${
                              isChecked
                                ? "bg-[#CC6600] border-[#CC6600] text-white"
                                : "border-white/20 bg-white/[0.02] group-hover:border-white/40"
                            }`}
                          >
                            {isChecked && <IconCheck size={12} stroke={3} />}
                          </div>

                          <div className={isChecked ? "text-amber-400" : "text-white/40"}>
                            {getAddOnIcon(addonKey)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white truncate">
                                {addon.name}
                              </span>
                              <span className="text-[0.625rem] font-mono text-white/40 uppercase tracking-wider hidden sm:inline-block">
                                · {addon.badge}
                              </span>
                            </div>
                            <p className="text-xs text-white/55 line-clamp-1 leading-relaxed font-sans pt-0.5">
                              {addon.tagline}
                            </p>
                          </div>
                        </div>

                        <div className="flex-shrink-0">
                          <span className={`text-xs font-mono font-bold px-3 py-1 rounded-[2px] border ${
                            isChecked
                              ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                              : "bg-white/[0.04] text-white/60 border-white/[0.08]"
                          }`}>
                            +<Peso />{addon.defaultPrice.toLocaleString()}
                          </span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* 3. Scope Clarifications & Validity Window */}
            <div className="pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 flex flex-col gap-2.5">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-white/90">
                    3. Scope Clarifications
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Include full Chapter 4 write-up and SPSS scripts..."
                    className="w-full h-11.5 px-4 bg-[#010D1F] border border-white/[0.12] focus:border-[#CC6600] rounded-[2px] text-xs text-white placeholder:text-white/30 focus:outline-none transition-colors font-sans"
                    style={{ paddingLeft: "1rem", paddingRight: "1rem", boxSizing: "border-box" }}
                  />
                </div>

                <div className="flex flex-col gap-2.5">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-white/90">
                    Validity Window
                  </label>
                  <select
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                    className="w-full h-11.5 px-4 bg-[#010D1F] border border-white/[0.12] focus:border-[#CC6600] rounded-[2px] text-xs font-mono text-white focus:outline-none transition-colors cursor-pointer"
                    style={{ paddingLeft: "1rem", paddingRight: "1rem", boxSizing: "border-box" }}
                  >
                    <option value={3}>3 Days (Standard)</option>
                    <option value={5}>5 Days</option>
                    <option value={7}>7 Days</option>
                    <option value={14}>14 Days</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column: Clean Commercial Summary Card (5 cols) ── */}
          <div className="lg:col-span-5 p-6 sm:p-7 rounded-[2px] bg-[#01142B] border border-white/[0.12] flex flex-col justify-between shadow-2xl space-y-6 h-full min-h-[660px]">
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <span className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-2 font-mono">
                  <IconReceipt size={16} stroke={1.5} className="text-sky-400" />
                  <span>Quotation Overview</span>
                </span>
                <span className="text-[0.6875rem] font-mono font-semibold px-2.5 py-0.5 rounded-[2px] bg-white/[0.06] text-white/70 border border-white/[0.08]">
                  {breakdown?.isUpfrontEnforced ? "100% Upfront" : "50% Milestone"}
                </span>
              </div>

              {/* Study Telemetry Header */}
              <div className="p-4 rounded-[2px] bg-[#010D1F]/90 border border-white/[0.06] space-y-1.5">
                <div className="text-[0.6875rem] font-mono text-[#FFA040] font-bold tracking-wider uppercase">
                  {projectIntakeId || "JAXIS-STUDY"}
                </div>
                <div className="text-xs font-semibold text-white leading-snug line-clamp-2" title={projectTitle}>
                  {projectTitle || "Research Study"}
                </div>
                {clientName && (
                  <div className="text-[0.6875rem] text-white/45 font-mono pt-0.5">
                    Lead Researcher: <span className="text-white/75">{clientName}</span>
                  </div>
                )}
              </div>

              {/* Itemized Line Items */}
              <div className="p-4 rounded-[2px] bg-[#010D1F]/90 border border-white/[0.06] space-y-3 text-xs">
                {/* Main Analytical Package */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-white">
                    <span className="font-bold text-xs">{currentPkgDef.name}</span>
                    <span className="font-mono font-bold text-white flex-shrink-0">
                      <Peso />{breakdown?.basePrice.toLocaleString()}
                    </span>
                  </div>
                  {currentPkgDef.deliverables && currentPkgDef.deliverables.length > 0 && (
                    <ul className="space-y-2 pt-1">
                      {currentPkgDef.deliverables.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-[0.6875rem] text-white/65 leading-relaxed font-sans pr-1">
                          <span className="text-sky-400 font-bold select-none">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Selected Priority Add-Ons */}
                {activeAddOnsList.length > 0 && (
                  <div className="pt-3 border-t border-white/[0.06] space-y-2">
                    <div className="text-[0.625rem] font-mono uppercase text-amber-300 font-semibold tracking-wider">
                      Selected Add-Ons:
                    </div>
                    {activeAddOnsList.map((addon) => {
                      const addonDef = addOnsCatalog[addon.name] || ADDONS_CATALOG[addon.name];
                      return (
                        <div key={addon.name} className="flex justify-between items-center text-amber-300 text-xs">
                          <span className="text-[0.75rem] truncate pr-2">+ {addonDef?.name || addon.name}</span>
                          <span className="font-mono font-bold text-amber-400 flex-shrink-0 text-[0.75rem]">
                            <Peso />{addon.amount.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Group: Totals & Action Controls */}
            <div className="space-y-5">
              {/* Totals Telemetry */}
              <div className="p-4.5 rounded-[2px] bg-white/[0.02] border border-white/[0.06] space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-white/60 font-sans">Total Contract Sum</span>
                  <span className="text-xl font-mono font-bold text-[#38BDF8]">
                    <Peso />{breakdown?.totalAmount.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-white/60 font-sans">
                    {breakdown?.isUpfrontEnforced ? "Full Payment Due" : "Initial Escrow Deposit (50%)"}
                  </span>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    <Peso />{breakdown?.downpaymentRequired.toLocaleString()}
                  </span>
                </div>

                {!breakdown?.isUpfrontEnforced && (
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-white/50 font-sans">Final Balance on Completion (50%)</span>
                    <span className="text-xs font-mono font-bold text-white/70">
                      <Peso />{((breakdown?.totalAmount || 0) - (breakdown?.downpaymentRequired || 0)).toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center text-[0.6875rem] text-white/40 pt-2.5 border-t border-white/[0.06] font-mono">
                  <span>Quote Validity Window</span>
                  <span className="text-white/80 font-bold">{expiresInDays} Days</span>
                </div>
              </div>

              {/* Actions Block */}
              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmIssueModalOpen(true)}
                  disabled={isSubmitting || isIssuingDirect || !priceValidation.valid}
                  className="w-full h-12 rounded-[2px] bg-gradient-to-b from-[#E67300] to-[#CC6600] text-white border border-[#CC6600] border-t-[#FFA040]/70 border-b-[#994D00] font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-[#CC6600]/20 hover:shadow-[0_2px_12px_rgba(204,102,0,0.4)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0"
                >
                  <IconSend size={15} stroke={2} />
                  <span>Issue Quote to Client →</span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSubmitting || isIssuingDirect || !priceValidation.valid}
                    className="w-full h-10 rounded-[2px] bg-white/[0.05] hover:bg-white/[0.09] active:bg-white/[0.12] border border-white/15 hover:border-sky-400/40 text-white/90 hover:text-white font-mono font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    <IconDeviceFloppy size={14} stroke={1.5} className="text-sky-400" />
                    <span>{isSubmitting ? "Saving..." : "Save Draft"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting || isIssuingDirect}
                    className="w-full h-10 rounded-[2px] bg-white/[0.02] hover:bg-white/[0.06] active:bg-white/[0.09] border border-white/10 hover:border-white/20 text-white/60 hover:text-white font-mono font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <IconX size={14} stroke={1.5} />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmIssueModalOpen}
        onClose={() => setConfirmIssueModalOpen(false)}
        title="Confirm Quotation Issuance"
        size="md"
      >
        <div className="space-y-4 text-xs font-sans text-white/80">
          <p className="leading-relaxed">
            You are about to issue a formal commercial quote of{" "}
            <strong className="text-[#38BDF8] font-mono font-bold">
              <Peso />{breakdown?.totalAmount.toLocaleString()}
            </strong>{" "}
            for study <span className="font-mono text-white">{projectIntakeId}</span>.
          </p>

          <div className="p-4 rounded-[4px] bg-[#010D1F] border border-white/[0.08] space-y-2.5 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-white/50 font-sans">Package:</span>
              <span className="text-white font-bold">{currentPkgDef.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50 font-sans">Total Sum:</span>
              <span className="text-[#38BDF8] font-bold"><Peso />{breakdown?.totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50 font-sans">Required Downpayment:</span>
              <span className="text-emerald-400 font-bold">
                <Peso />{breakdown?.downpaymentRequired.toLocaleString()} ({breakdown?.downpaymentPercentage}%)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50 font-sans">Validity Window:</span>
              <span className="text-amber-300 font-bold">{expiresInDays} Days</span>
            </div>
          </div>

          <ModalFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmIssueModalOpen(false)}
              disabled={isIssuingDirect}
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmIssue}
              disabled={isIssuingDirect}
              className="gap-1.5 bg-[#CC6600] text-white hover:bg-[#E67300]"
            >
              <IconSend size={14} stroke={1.5} />
              <span>{isIssuingDirect ? "Issuing..." : "Confirm & Send Quote"}</span>
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Global Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          description={toastMessage.description}
          variant={toastMessage.variant}
          onClose={() => setToastMessage(null)}
        />
      )}
    </>
  );
}
