"use client";

import React, { useState, useEffect, useCallback, useTransition, use, useMemo } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  Modal,
  ModalFooter,
  Toast,
  LoadingState,
  Peso,
  CopyButton,
} from "@repo/ui";
import {
  ArrowLeft,
  Check,
  Receipt,
  Clock,
  ShieldCheck,
  Sparkle,
  Warning,
  GraduationCap,
  Lightning,
  Flame,
  Lock,
  X,
  ClipboardText,
  FileText,
  Certificate,
} from "@phosphor-icons/react";
import { getProjectById } from "@/features/projects/actions";
import {
  getQuotationByProject,
  respondQuotation,
} from "@/features/quotations/actions";
import {
  PACKAGES_CATALOG,
  ADDONS_CATALOG,
  calculateQuotationTotals,
} from "@/lib/pricing-rules";
import { formatPeso } from "@/lib/formatters";
import type { ProjectDetailItem } from "@/features/projects/schemas";
import type { QuotationDetailItem } from "@/features/quotations/schemas";
import type { AddOnName } from "@prisma/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ClientQuotationReviewPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [project, setProject] = useState<ProjectDetailItem | null>(null);
  const [quotation, setQuotation] = useState<QuotationDetailItem | null>(null);
  const [selectedAddOnCodes, setSelectedAddOnCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Decision Modal States
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [projRes, quoteRes] = await Promise.all([
        getProjectById(projectId),
        getQuotationByProject(projectId),
      ]);

      if (projRes.success && projRes.data) {
        setProject(projRes.data);
      } else {
        setError(!projRes.success ? projRes.error.message : "Failed to load project details.");
      }

      setQuotation(quoteRes);
      if (quoteRes) {
        const initialCodes = quoteRes.lineItems
          .filter((li) => li.itemType === "ADDON")
          .map((li) => li.itemName);
        setSelectedAddOnCodes(initialCodes);
      }
    } catch {
      setError("Failed to load commercial quotation proposal.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAcceptProposal = () => {
    if (!quotation) return;

    startTransition(async () => {
      try {
        const res = await respondQuotation({
          quotationId: quotation.id,
          decision: "ACCEPT",
          selectedAddOnCodes,
        });

        if (res.success) {
          setToastMessage({
            message: "Proposal Accepted",
            description: "Thank you! Our operations admin has been notified to draft your formal Statement of Work.",
            variant: "success",
          });
          setIsAcceptModalOpen(false);
          loadData();
        } else {
          setToastMessage({
            message: "Acceptance Failed",
            description: res.error?.message || "Failed to accept proposal.",
            variant: "danger",
          });
        }
      } catch (err: unknown) {
        setToastMessage({
          message: "System Error",
          description: (err as Error).message || "An unexpected error occurred.",
          variant: "danger",
        });
      }
    });
  };

  const handleDeclineProposal = () => {
    if (!quotation) return;

    startTransition(async () => {
      try {
        const res = await respondQuotation({
          quotationId: quotation.id,
          decision: "DECLINE",
          declineReason,
        });

        if (res.success) {
          setToastMessage({
            message: "Proposal Declined",
            description: "Your feedback has been transmitted to our statistical team for revision.",
            variant: "warning",
          });
          setIsDeclineModalOpen(false);
          await loadData();
        } else {
          setToastMessage({
            message: "Decline Failed",
            description: res.error?.message || "Failed to process decline response.",
            variant: "danger",
          });
        }
      } catch (err: unknown) {
        setToastMessage({
          message: "System Error",
          description: (err as Error).message || "An unexpected error occurred.",
          variant: "danger",
        });
      }
    });
  };

  const getAddOnIcon = (name: AddOnName | string, isSelected: boolean = false) => {
    const iconClass = isSelected ? "text-[#FFA040]" : "text-white/40";
    switch (name) {
      case "DEFENSELAB":
        return <GraduationCap size={18} weight="fill" className={iconClass} />;
      case "RUSH":
        return <Lightning size={18} weight="fill" className={iconClass} />;
      case "EXPRESS":
        return <Flame size={18} weight="fill" className={iconClass} />;
      case "EMERGENCY":
        return <Warning size={18} weight="fill" className={iconClass} />;
      default:
        return <Sparkle size={18} weight="fill" className={iconClass} />;
    }
  };

  // Master available add-ons (combining quotation line items and master catalog)
  const availableAddOns = useMemo(() => {
    if (!quotation) return [];

    // If quotation is already approved by client, only show the add-ons that were approved and agreed upon
    if (quotation.status === "CLIENT_APPROVED") {
      return quotation.lineItems
        .filter((li) => li.itemType === "ADDON")
        .map((li) => {
          const catalogDef = ADDONS_CATALOG[li.itemName as AddOnName];
          return {
            code: li.itemName,
            name: li.description || catalogDef?.name || li.itemName,
            amount: Number(li.amount),
            tagline: catalogDef?.tagline || "Agreed priority add-on service",
            badge: catalogDef?.badge || "PRIORITY ADD-ON",
            isSpeedRider: ["RUSH", "EXPRESS", "EMERGENCY"].includes(li.itemName),
          };
        });
    }

    // When quote is open for review: combine quote's attached add-ons + full catalog
    const catalogKeys = Object.keys(ADDONS_CATALOG) as AddOnName[];
    const map = new Map<
      string,
      { code: string; name: string; amount: number; tagline: string; badge: string; isSpeedRider: boolean }
    >();

    catalogKeys.forEach((key) => {
      const def = ADDONS_CATALOG[key];
      map.set(key, {
        code: key,
        name: def.name,
        amount: def.defaultPrice,
        tagline: def.tagline,
        badge: def.badge,
        isSpeedRider: ["RUSH", "EXPRESS", "EMERGENCY"].includes(key),
      });
    });

    quotation.lineItems
      .filter((li) => li.itemType === "ADDON")
      .forEach((li) => {
        const existing = map.get(li.itemName);
        map.set(li.itemName, {
          code: li.itemName,
          name: li.description || existing?.name || li.itemName,
          amount: Number(li.amount),
          tagline: existing?.tagline || "Priority statistical add-on service",
          badge: existing?.badge || "PRIORITY ADD-ON",
          isSpeedRider: ["RUSH", "EXPRESS", "EMERGENCY"].includes(li.itemName),
        });
      });

    return Array.from(map.values());
  }, [quotation]);

  const generalAddOns = useMemo(
    () => availableAddOns.filter((a) => !a.isSpeedRider),
    [availableAddOns]
  );

  const speedAddOns = useMemo(
    () => availableAddOns.filter((a) => a.isSpeedRider),
    [availableAddOns]
  );

  // Toggle add-on selection
  const toggleAddOn = (code: string) => {
    if (quotation?.status !== "QUOTE_SENT" || quotation?.isExpired) return;

    setSelectedAddOnCodes((prev) => {
      const isSelected = prev.includes(code);
      const isSpeedRider = ["RUSH", "EXPRESS", "EMERGENCY"].includes(code);

      if (isSelected) {
        return prev.filter((k) => k !== code);
      } else {
        if (isSpeedRider) {
          // A study can only have 1 active turnaround speed rider at a time
          return [...prev.filter((k) => !["RUSH", "EXPRESS", "EMERGENCY"].includes(k)), code];
        } else {
          return [...prev, code];
        }
      }
    });
  };

  // Real-time calculation based on selected add-ons
  const currentPricing = useMemo(() => {
    if (!quotation) {
      return {
        totalAmount: 0,
        downpaymentRequired: 0,
        releaseBalance: 0,
        downpaymentPercentage: 50,
      };
    }

    if (quotation.status !== "QUOTE_SENT" || quotation.isExpired) {
      return {
        totalAmount: quotation.totalAmount,
        downpaymentRequired: quotation.downpaymentRequired,
        releaseBalance: quotation.releaseBalance,
        downpaymentPercentage: quotation.downpaymentPercentage,
      };
    }

    const selectedItems = availableAddOns
      .filter((a) => selectedAddOnCodes.includes(a.code))
      .map((a) => ({
        name: a.code as AddOnName,
        amount: a.amount,
        description: a.name,
      }));

    try {
      const breakdown = calculateQuotationTotals({
        packageName: quotation.packageName,
        basePrice: quotation.basePrice,
        addOns: selectedItems,
      });
      return {
        totalAmount: breakdown.totalAmount,
        downpaymentRequired: breakdown.downpaymentRequired,
        releaseBalance: breakdown.releaseBalance,
        downpaymentPercentage: breakdown.downpaymentPercentage,
      };
    } catch {
      return {
        totalAmount: quotation.totalAmount,
        downpaymentRequired: quotation.downpaymentRequired,
        releaseBalance: quotation.releaseBalance,
        downpaymentPercentage: quotation.downpaymentPercentage,
      };
    }
  }, [quotation, availableAddOns, selectedAddOnCodes]);

  if (isLoading) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
        <LoadingState
          variant="page"
          label="Retrieving commercial proposal..."
          description="Loading analytical scope, milestone schedule, and pricing basis"
        />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
        <PageHeader
          title="Proposal Error"
          breadcrumbs={[
            { label: "WORKSPACE", href: "/dashboard" },
            { label: "Projects", href: "/dashboard/client/projects" },
            { label: "Commercial Proposal" },
          ]}
        />
        <Card className="p-8 sm:p-12 text-center flex flex-col items-center gap-6 bg-[#01142B]/90 border border-white/10 rounded-[6px]">
          <Warning size={36} weight="fill" className="text-rose-400 mx-auto" />
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white font-sans">Unable to Load Quotation</h2>
            <p className="text-sm text-white/60 font-sans">{error || "Study not found."}</p>
          </div>
          <Link href="/dashboard/client/projects">
            <Button variant="secondary" size="md">
              ← Return to Projects Registry
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
        <PageHeader
          title={project.researchTitle}
          description={`Study ID: ${project.intakeId} · Primary Client: ${project.client.fullName}`}
          breadcrumbs={[
            { label: "WORKSPACE", href: "/dashboard" },
            { label: "Client Portal", href: "/dashboard/client" },
            { label: "Projects", href: "/dashboard/client/projects" },
            { label: project.intakeId, href: `/dashboard/client/projects/${projectId}` },
            { label: "Commercial Proposal" },
          ]}
          actions={
            <Link href={`/dashboard/client/projects/${projectId}`}>
              <Button variant="secondary" size="sm" className="font-sans font-semibold text-xs">
                ← Return to Study Details
              </Button>
            </Link>
          }
        />

        <Card className="p-10 sm:p-14 bg-[#01142B] border border-white/10 rounded-[6px] text-center space-y-5 max-w-2xl mx-auto shadow-2xl">
          <div className="h-14 w-14 rounded-full bg-[#CC6600]/15 border border-[#CC6600]/30 flex items-center justify-center mx-auto text-[#FFA040]">
            <Clock size={32} weight="fill" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white font-sans">
              Proposal Under Statistical Modeling
            </h2>
            <p className="text-sm text-white/70 font-sans leading-relaxed">
              Our Senior Statistical Team is currently reviewing your study methodology, hypotheses, and uploaded data vectors to prepare a customized commercial proposal. You will be notified as soon as your quote is issued.
            </p>
          </div>
          <div className="pt-2">
            <Link href={`/dashboard/client/projects/${projectId}`}>
              <Button variant="secondary" size="md">
                View Study Tracker
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const pkgDef = PACKAGES_CATALOG[quotation.packageName] || PACKAGES_CATALOG.JX_03_CORE;

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      {/* ── 1. Page Header ── */}
      <PageHeader
        title={project.researchTitle}
        description={`Study ID: ${project.intakeId} · Primary Client: ${project.client.fullName} · Submitted ${new Date(
          project.createdAt
        ).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Client Portal", href: "/dashboard/client" },
          { label: "Projects", href: "/dashboard/client/projects" },
          { label: project.intakeId, href: `/dashboard/client/projects/${projectId}` },
          { label: "Quote & Proposal" },
        ]}
        actions={
          <Link href={`/dashboard/client/projects/${projectId}`}>
            <Button variant="secondary" size="sm" className="font-sans font-semibold text-xs flex items-center gap-2 rounded-[2px] active:scale-[0.97] transition-transform">
              <ArrowLeft size={15} weight="fill" />
              <span>Return to Study Details</span>
            </Button>
          </Link>
        }
      />

      {/* ── 2. Quotation Status Bar ── */}
      <Card className="p-5 sm:p-6 bg-[#01142B] border border-white/10 rounded-[2px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-sans text-white/50 uppercase font-bold tracking-wider">
              Proposal Status:
            </span>
            {quotation.status === "CLIENT_APPROVED" ? (
              <span className="text-xs font-sans text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-[2px] uppercase font-bold flex items-center gap-1.5">
                <Check size={14} weight="fill" />
                PROPOSAL ACCEPTED
              </span>
            ) : quotation.status === "QUOTE_DECLINED" ? (
              <span className="text-xs font-sans text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-1 rounded-[2px] uppercase font-bold flex items-center gap-1.5">
                <X size={14} weight="fill" />
                PROPOSAL DECLINED
              </span>
            ) : quotation.isExpired ? (
              <span className="text-xs font-sans text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-1 rounded-[2px] uppercase font-bold flex items-center gap-1.5">
                <Warning size={14} weight="fill" />
                PROPOSAL EXPIRED
              </span>
            ) : (
              <span className="text-xs font-sans text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-[2px] uppercase font-bold flex items-center gap-1.5">
                <Clock size={14} weight="fill" />
                READY FOR YOUR REVIEW
              </span>
            )}

            <CopyButton
              variant="badge"
              value={project.intakeId}
              label={project.intakeId}
              onCopy={() =>
                setToastMessage({
                  message: "Copied to Clipboard",
                  description: `Study ID "${project.intakeId}" has been copied to your clipboard.`,
                  variant: "info",
                })
              }
            />
          </div>

          {quotation.status === "QUOTE_SENT" && !quotation.isExpired && (
            <div className="text-xs font-sans text-white/70 flex items-center gap-2">
              <span className="text-white/40">Proposal Valid Until:</span>
              <span className="text-amber-300 font-mono font-bold">
                {new Date(quotation.expiresAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
        </div>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        <div className="lg:col-span-7 flex flex-col gap-6">
          <Card className="p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-[2px] bg-[#CC6600]/15 border border-[#CC6600]/30 flex items-center justify-center shrink-0 text-[#FFA040]">
                  <ClipboardText size={20} weight="fill" />
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase text-white/50 font-semibold tracking-wider block">
                    Service Scope Specification · {pkgDef?.id || quotation.packageName}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-white font-sans tracking-tight mt-0.5">
                    {pkgDef?.name || quotation.packageName}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
                <span className="text-[11px] font-mono font-semibold uppercase px-2.5 py-1 rounded-[2px] bg-white/[0.04] text-white/70 border border-white/10">
                  {pkgDef?.badge || "STANDARD RESEARCH"}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs sm:text-sm text-white/80 font-sans leading-relaxed">
                {pkgDef?.tagline || "Comprehensive statistical modeling and hypothesis testing scope."}
              </p>

              {pkgDef?.recommendedFor && (
                <div className="flex items-center gap-2 flex-wrap text-xs font-sans text-white/60 pt-0.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 font-semibold">
                    Recommended For:
                  </span>
                  <span className="text-white/80 font-medium bg-white/[0.03] border border-white/10 px-2.5 py-0.5 rounded-[2px]">
                    {pkgDef.recommendedFor}
                  </span>
                </div>
              )}
            </div>

            {pkgDef?.deliverables && pkgDef.deliverables.length > 0 && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-white/50 font-semibold flex items-center gap-1.5">
                    <ShieldCheck size={14} weight="fill" className="text-emerald-400" />
                    <span>Guaranteed Deliverables Included in this Scope</span>
                  </span>
                  <span className="text-[10px] font-mono uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-[2px] font-semibold">
                    All Included
                  </span>
                </div>

                <div className="space-y-2">
                  {pkgDef.deliverables.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 sm:p-4 rounded-[2px] bg-[#010D1F] border border-white/10 flex items-start gap-3 transition-colors hover:border-white/20"
                    >
                      <div className="w-5 h-5 rounded-[2px] bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
                        <Check size={12} weight="bold" />
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-white/90 font-sans leading-relaxed">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-[2px] bg-[#CC6600]/15 border border-[#CC6600]/30 flex items-center justify-center shrink-0 text-[#FFA040]">
                  <Receipt size={20} weight="fill" />
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase text-white/50 font-semibold tracking-wider block">
                    Commercial Specification · {quotation.isUpfrontEnforced ? "100% Upfront" : "50% Milestone"}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-white font-sans tracking-tight mt-0.5">
                    Pricing Breakdown &amp; Scope Options
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
                <span className="text-[11px] font-mono font-semibold uppercase px-2.5 py-1 rounded-[2px] bg-white/[0.04] text-white/70 border border-white/10">
                  {quotation.isUpfrontEnforced ? "100% UPFRONT" : "50% MILESTONE"}
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-white/80 font-sans leading-relaxed">
              {quotation.status === "QUOTE_SENT" && !quotation.isExpired
                ? "Choose optional coaching or faster delivery turnaround for your study:"
                : "Itemized summary of research services and confirmed scope add-ons:"}
            </p>

            <div className="space-y-4">
              {/* Base Service Package */}
              <div className="p-4 sm:p-5 rounded-[2px] bg-[#010D1F] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="pt-0.5 flex-shrink-0">
                    <div className="w-5 h-5 rounded-[2px] bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Check size={12} weight="bold" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white font-sans">
                        {pkgDef?.name || quotation.packageName}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-[2px] bg-white/[0.06] text-white/70 border border-white/10 font-medium">
                        Base Package · Included
                      </span>
                    </div>
                    <p className="text-xs text-white/60 font-sans leading-relaxed">
                      Full statistical modeling, hypothesis testing, and APA 7th summary tables
                    </p>
                  </div>
                </div>
                <div className="text-base sm:text-lg font-mono font-bold text-white flex-shrink-0 self-end sm:self-auto">
                  <Peso className="text-white/70 font-sans mr-0.5" />{quotation.basePrice.toLocaleString()}
                </div>
              </div>

              {/* Optional Coaching Services */}
              {generalAddOns.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between flex-wrap gap-2 px-0.5">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-white/50 font-semibold flex items-center gap-1.5">
                      <GraduationCap size={14} weight="fill" className="text-white/40" />
                      <span>Optional Add-On Services</span>
                    </span>
                  </div>
                  <div className="space-y-2">
                    {generalAddOns.map((addon) => {
                      const isSelected = selectedAddOnCodes.includes(addon.code);
                      const isInteractive = quotation.status === "QUOTE_SENT" && !quotation.isExpired;

                      return (
                        <div
                          key={addon.code}
                          onClick={() => isInteractive && toggleAddOn(addon.code)}
                          className={`p-4 sm:p-5 rounded-[2px] border transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none ${
                            isInteractive ? "cursor-pointer group" : "cursor-default"
                          } ${
                            isSelected
                              ? "bg-[#011736] border-white/20 border-l-[3px] border-l-[#CC6600]"
                              : "bg-[#010D1F] border-white/10 hover:border-white/20 hover:bg-[#01142B]/70 opacity-85 hover:opacity-100"
                          }`}
                        >
                          <div className="flex items-start gap-3.5">
                            {isInteractive ? (
                              <div className="pt-0.5 flex-shrink-0">
                                <div
                                  className={`w-5 h-5 rounded-[2px] border flex items-center justify-center transition-all duration-150 active:scale-90 ${
                                    isSelected
                                      ? "bg-[#CC6600] border-[#CC6600] text-white shadow-sm"
                                      : "border-white/25 bg-white/[0.04] group-hover:border-white/40"
                                  }`}
                                >
                                  {isSelected && <Check size={12} weight="bold" />}
                                </div>
                              </div>
                            ) : (
                              <div className="pt-0.5 flex-shrink-0">
                                <div className="w-5 h-5 rounded-[2px] bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                  <Check size={12} weight="bold" />
                                </div>
                              </div>
                            )}

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {getAddOnIcon(addon.code, isSelected)}
                                <span className="text-sm font-semibold font-sans text-white">
                                  {addon.name}
                                </span>
                                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-[2px] bg-white/[0.05] text-white/60 border border-white/10 font-medium">
                                  {addon.badge}
                                </span>
                              </div>
                              <p className="text-xs text-white/60 font-sans leading-relaxed">
                                {addon.tagline}
                              </p>
                            </div>
                          </div>

                          <div
                            className={`text-base sm:text-lg font-mono flex-shrink-0 self-end sm:self-auto transition-colors ${
                              isSelected ? "font-bold text-white" : "font-medium text-white/40"
                            }`}
                          >
                            +<Peso className={isSelected ? "text-white/70 font-sans mr-0.5" : "text-white/40 font-sans mr-0.5"} />{addon.amount.toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Turnaround Speed Tiers */}
              {speedAddOns.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between flex-wrap gap-2 px-0.5">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-white/50 font-semibold flex items-center gap-1.5">
                      <Clock size={14} weight="fill" className="text-white/40" />
                      <span>Turnaround Speed (Select One)</span>
                    </span>
                    <span className="text-[11px] font-sans text-white/40">
                      Standard turnaround: 5–7 business days
                    </span>
                  </div>
                  <div className="space-y-2">
                    {speedAddOns.map((addon) => {
                      const isSelected = selectedAddOnCodes.includes(addon.code);
                      const isInteractive = quotation.status === "QUOTE_SENT" && !quotation.isExpired;

                      return (
                        <div
                          key={addon.code}
                          onClick={() => isInteractive && toggleAddOn(addon.code)}
                          className={`p-4 sm:p-5 rounded-[2px] border transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none ${
                            isInteractive ? "cursor-pointer group" : "cursor-default"
                          } ${
                            isSelected
                              ? "bg-[#011736] border-white/20 border-l-[3px] border-l-[#CC6600]"
                              : "bg-[#010D1F] border-white/10 hover:border-white/20 hover:bg-[#01142B]/70 opacity-85 hover:opacity-100"
                          }`}
                        >
                          <div className="flex items-start gap-3.5">
                            {isInteractive ? (
                              <div className="pt-0.5 flex-shrink-0">
                                <div
                                  className={`w-5 h-5 rounded-[2px] border flex items-center justify-center transition-all duration-150 active:scale-90 ${
                                    isSelected
                                      ? "bg-[#CC6600] border-[#CC6600] text-white shadow-sm"
                                      : "border-white/25 bg-white/[0.04] group-hover:border-white/40"
                                  }`}
                                >
                                  {isSelected && <Check size={12} weight="bold" />}
                                </div>
                              </div>
                            ) : (
                              <div className="pt-0.5 flex-shrink-0">
                                <div className="w-5 h-5 rounded-[2px] bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                  <Check size={12} weight="bold" />
                                </div>
                              </div>
                            )}

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {getAddOnIcon(addon.code, isSelected)}
                                <span className="text-sm font-semibold font-sans text-white">
                                  {addon.name}
                                </span>
                                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-[2px] bg-white/[0.05] text-white/60 border border-white/10 font-medium">
                                  {addon.badge}
                                </span>
                              </div>
                              <p className="text-xs text-white/60 font-sans leading-relaxed">
                                {addon.tagline}
                              </p>
                            </div>
                          </div>

                          <div
                            className={`text-base sm:text-lg font-mono flex-shrink-0 self-end sm:self-auto transition-colors ${
                              isSelected ? "font-bold text-white" : "font-medium text-white/40"
                            }`}
                          >
                            +<Peso className={isSelected ? "text-white/70 font-sans mr-0.5" : "text-white/40 font-sans mr-0.5"} />{addon.amount.toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dynamically Recalculated Total Investment Box */}
              <div className="p-5 sm:p-6 rounded-[2px] bg-[#010D1F] border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-3">
                <div className="space-y-1.5 max-w-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold uppercase text-white/50 tracking-wider">
                      Total Estimated Investment
                    </span>
                    {selectedAddOnCodes.length > 0 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-[2px] bg-[#CC6600]/15 text-[#FFA040] border border-[#CC6600]/30 font-semibold">
                        +{selectedAddOnCodes.length} {selectedAddOnCodes.length === 1 ? "Add-On" : "Add-Ons"} Included
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/60 font-sans leading-relaxed">
                    {quotation.isUpfrontEnforced
                      ? "All-inclusive statistical modeling, QA review, and summary tables · 100% upfront deposit"
                      : selectedAddOnCodes.length > 0
                        ? `Includes base scope + ${selectedAddOnCodes.length} add-on${selectedAddOnCodes.length > 1 ? "s" : ""} · ${quotation.downpaymentPercentage}% milestone deposit (${formatPeso(currentPricing.downpaymentRequired, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}) due upon signing`
                        : `Base package scope · ${quotation.downpaymentPercentage}% milestone deposit (${formatPeso(currentPricing.downpaymentRequired, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}) due upon signing`}
                  </p>
                </div>
                <div className="flex flex-col items-start sm:items-end flex-shrink-0">
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-mono font-bold text-white tracking-tight flex items-baseline">
                    <Peso className="text-white/70 font-sans mr-1" />
                    <span>{currentPricing.totalAmount.toLocaleString()}</span>
                  </div>
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider mt-0.5">
                    PHP · Philippine Peso
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {quotation.notes && (
            <Card className="p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-3">
              <div className="border-b border-white/10 pb-3 flex items-center gap-2">
                <FileText size={18} weight="fill" className="text-[#CC6600]" />
                <h3 className="text-sm font-bold text-white font-sans">
                  Scope Notes &amp; Assumptions
                </h3>
              </div>
              <div className="p-4 rounded-[2px] bg-[#010D1F] border border-white/10 text-xs text-white/80 font-sans leading-relaxed whitespace-pre-line">
                {quotation.notes}
              </div>
            </Card>
          )}
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">
          <Card className="p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-5">
            <div className="border-b border-white/10 pb-3">
              <span className="text-xs font-sans uppercase text-white/50 font-semibold tracking-wider">
                Payment Milestones
              </span>
              <h3 className="text-base font-bold text-white font-sans mt-0.5">
                Payment Schedule
              </h3>
            </div>

            <div className="space-y-3">
              <div className="p-4 sm:p-5 rounded-[2px] bg-[#010D1F] border border-emerald-500/25 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-sans uppercase text-emerald-400 font-semibold tracking-wider flex items-center gap-1.5">
                    <Lock size={14} weight="fill" />
                    <span>1. Escrow Deposit</span>
                  </span>
                  <span className="text-base font-mono font-bold text-emerald-400">
                    <Peso />{currentPricing.downpaymentRequired.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-white/60 font-sans leading-relaxed">
                  {quotation.isUpfrontEnforced
                    ? "100% Upfront deposit required to activate analysis queue."
                    : `Initial ${currentPricing.downpaymentPercentage}% deposit due upon SOW signing to commence computation.`}
                </p>
              </div>

              {!quotation.isUpfrontEnforced && currentPricing.releaseBalance > 0 && (
                <div className="p-4 sm:p-5 rounded-[2px] bg-[#010D1F] border border-white/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-sans uppercase text-white/50 font-semibold tracking-wider">
                      2. Deliverable Release
                    </span>
                    <span className="text-base font-mono font-bold text-[#38BDF8]">
                      <Peso />{currentPricing.releaseBalance.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-white/60 font-sans leading-relaxed">
                    Payable only after you inspect and accept the final statistical findings.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 rounded-[2px] bg-emerald-500/[0.06] border border-emerald-500/20 text-xs text-white/75 font-sans leading-relaxed flex items-start gap-2.5">
              <ShieldCheck size={18} weight="fill" className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong className="text-emerald-300 font-semibold">JAXIS Escrow Protection:</strong> Funds remain securely vaulted until you review and approve your defense-ready deliverables.
              </span>
            </div>
          </Card>

          <Card className="p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-5">
            <div className="border-b border-white/10 pb-3">
              <span className="text-xs font-sans uppercase font-bold text-white/80 tracking-wider">
                Actions
              </span>
            </div>

            {quotation.status === "QUOTE_SENT" && !quotation.isExpired ? (
              <div className="space-y-3 pt-1">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setIsAcceptModalOpen(true)}
                  disabled={isPending}
                  className="w-full gap-2 justify-center bg-[#CC6600] text-white hover:bg-[#E67300] min-h-[42px] text-xs font-sans font-semibold cursor-pointer flex items-center rounded-[2px] active:scale-[0.97] transition-transform"
                >
                  <Check size={16} weight="fill" />
                  <span>Accept Quote &amp; Proceed to SOW →</span>
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setIsDeclineModalOpen(true)}
                  disabled={isPending}
                  className="w-full text-white/75 hover:text-rose-400 hover:border-rose-500/40 justify-center text-xs font-sans min-h-[38px] cursor-pointer flex items-center gap-2 rounded-[2px] active:scale-[0.97] transition-transform"
                >
                  <X size={15} weight="fill" />
                  <span>Decline / Request Scope Adjustment</span>
                </Button>
              </div>
            ) : quotation.status === "CLIENT_APPROVED" ? (
              <div className="space-y-4">
                {project.masterStatus === "CLIENT_APPROVED" ? (
                  <>
                    <div className="p-5 rounded-[2px] bg-emerald-950/20 border border-emerald-500/30 text-left space-y-1.5">
                      <div className="text-xs font-sans text-emerald-400 font-bold flex items-center gap-2">
                        <Check size={16} weight="fill" />
                        <span>Proposal Accepted</span>
                      </div>
                      <p className="text-xs text-white/70 font-sans leading-relaxed">
                        Terms accepted! Our operations team has been notified and is preparing your formal Statement of Work (SOW). You will be notified as soon as it is ready for your signature.
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <Link href={`/dashboard/client/projects/${projectId}`} className="block w-full">
                        <Button
                          variant="secondary"
                          size="md"
                          className="w-full min-h-[38px] font-sans text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer rounded-[2px] active:scale-[0.97] transition-transform"
                        >
                          <ArrowLeft size={15} weight="fill" />
                          <span>Return to Study Details</span>
                        </Button>
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-5 rounded-[2px] bg-emerald-950/20 border border-emerald-500/30 text-left space-y-1.5">
                      <div className="text-xs font-sans text-emerald-400 font-bold flex items-center gap-2">
                        <Check size={16} weight="fill" />
                        <span>SOW Ready for Signing</span>
                      </div>
                      <p className="text-xs text-white/70 font-sans leading-relaxed">
                        Your formal Statement of Work (SOW) agreement has been compiled by our admin team and is ready for your digital signature.
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <Link href={`/dashboard/client/projects/${projectId}/sow`} className="block w-full">
                        <Button
                          variant="primary"
                          size="md"
                          className="w-full min-h-[42px] font-sans text-xs font-semibold flex items-center justify-center gap-2 bg-[#CC6600] hover:bg-[#E67300] text-white rounded-[2px] active:scale-[0.97] transition-transform"
                        >
                          <Certificate size={16} weight="fill" />
                          <span>Sign Statement of Work Now →</span>
                        </Button>
                      </Link>

                      <Link href={`/dashboard/client/projects/${projectId}`} className="block w-full">
                        <Button
                          variant="secondary"
                          size="md"
                          className="w-full min-h-[38px] font-sans text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer rounded-[2px] active:scale-[0.97] transition-transform"
                        >
                          <ArrowLeft size={15} weight="fill" />
                          <span>Return to Study Details</span>
                        </Button>
                      </Link>
                    </div>
                  </>
                )}
              </div>
            ) : quotation.status === "QUOTE_DECLINED" ? (
              <div className="space-y-4">
                <div className="p-5 rounded-[2px] bg-amber-950/20 border border-amber-500/30 text-left space-y-1.5">
                  <div className="text-xs font-sans text-amber-300 font-bold flex items-center gap-2">
                    <Clock size={16} weight="fill" />
                    <span>Proposal Declined</span>
                  </div>
                  <p className="text-xs text-white/70 font-sans leading-relaxed">
                    Our Senior Statistical Team is reviewing your requested adjustments and will prepare an updated scope.
                  </p>
                </div>

                <Link href={`/dashboard/client/projects/${projectId}`} className="block w-full">
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full min-h-[38px] font-sans text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer rounded-[2px] active:scale-[0.97] transition-transform"
                  >
                    <ArrowLeft size={15} weight="fill" />
                    <span>Return to Study Details</span>
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-5 rounded-[2px] bg-rose-950/20 border border-rose-500/30 text-left space-y-1.5">
                  <div className="text-xs font-sans text-rose-400 font-bold flex items-center gap-2">
                    <Warning size={16} weight="fill" />
                    <span>Proposal Expired</span>
                  </div>
                  <p className="text-xs text-white/70 font-sans leading-relaxed">
                    This quote has expired. Return to your study tracker to request an updated quotation.
                  </p>
                </div>

                <Link href={`/dashboard/client/projects/${projectId}`} className="block w-full">
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full min-h-[38px] font-sans text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer rounded-[2px] active:scale-[0.97] transition-transform"
                  >
                    <ArrowLeft size={15} weight="fill" />
                    <span>Return to Study Details</span>
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── Accept Proposal Confirmation Modal ── */}
      <Modal
        isOpen={isAcceptModalOpen}
        onClose={() => setIsAcceptModalOpen(false)}
        title="Accept Quote & Scope"
        size="md"
      >
        <div className="space-y-5 text-sm font-sans text-white/80 p-1">
          <p className="leading-relaxed">
            By accepting this quote for study{" "}
            <strong className="text-white font-mono">{project.intakeId}</strong>, you approve the{" "}
            <strong className="text-white font-semibold">{pkgDef?.name || quotation.packageName}</strong> scope and total price of{" "}
            <strong className="text-white font-mono font-bold"><Peso />{currentPricing.totalAmount.toLocaleString()}</strong>.
          </p>

          <div className="p-4 rounded-[2px] bg-[#01142B] border border-white/10 space-y-3 font-sans text-sm shadow-sm">
            <div className="text-xs uppercase font-semibold text-white/50 tracking-wider">
              Selected Services &amp; Scope:
            </div>
            <div className="space-y-1.5 pl-1">
              <div className="text-xs text-white/90 flex items-center justify-between">
                <span>{pkgDef?.name || quotation.packageName} (Base Package)</span>
                <span className="font-mono text-white/80"><Peso />{quotation.basePrice.toLocaleString()}</span>
              </div>
              {availableAddOns
                .filter((a) => selectedAddOnCodes.includes(a.code))
                .map((a) => (
                  <div key={a.code} className="text-xs text-white/80 flex items-center justify-between">
                    <span className="text-white/70">+ {a.name}</span>
                    <span className="font-mono text-white/90">+<Peso />{a.amount.toLocaleString()}</span>
                  </div>
                ))}
              {selectedAddOnCodes.length === 0 && (
                <div className="text-xs text-white/40 italic">
                  Standard 5–7 business days turnaround (No add-ons selected)
                </div>
              )}
            </div>

            <div className="border-t border-white/10 pt-2.5 space-y-2">
              <div className="flex justify-between font-semibold">
                <span className="text-white/80">Total Amount:</span>
                <span className="text-white font-mono font-bold"><Peso />{currentPricing.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Initial Downpayment ({currentPricing.downpaymentPercentage}%):</span>
                <span className="text-white font-mono font-bold"><Peso />{currentPricing.downpaymentRequired.toLocaleString()}</span>
              </div>
              {!quotation.isUpfrontEnforced && currentPricing.releaseBalance > 0 && (
                <div className="flex justify-between">
                  <span className="text-white/50">Final Balance:</span>
                  <span className="text-white/80 font-mono font-bold"><Peso />{currentPricing.releaseBalance.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-white/50 leading-relaxed">
            Once confirmed, our team will prepare your formal Statement of Work agreement for digital signature.
          </p>

          <ModalFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAcceptModalOpen(false)}
              disabled={isPending}
              className="rounded-[2px] active:scale-[0.97] transition-transform text-xs font-sans"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAcceptProposal}
              disabled={isPending}
              className="gap-2 bg-[#CC6600] text-white hover:bg-[#E67300] font-sans text-xs font-semibold rounded-[2px] active:scale-[0.97] transition-transform shadow-md"
            >
              <Check size={16} weight="fill" />
              <span>{isPending ? "Approving..." : "Confirm & Accept Quote"}</span>
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* ── Decline Proposal Modal ── */}
      <Modal
        isOpen={isDeclineModalOpen}
        onClose={() => setIsDeclineModalOpen(false)}
        title="Decline Quote"
        size="md"
      >
        <div className="space-y-5 text-sm font-sans text-white/80 p-1">
          <p className="leading-relaxed">
            Please let our statistical team know why this quote does not meet your requirements so we can adjust the scope or pricing for you.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-sans uppercase text-white/70 font-bold">
              Reason / Requested Adjustments (Optional)
            </label>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g., I only need Chapter 4 descriptive tables, or my deadline is 1 week later..."
              rows={4}
              className="w-full bg-[#01142B] border border-white/15 rounded-[2px] p-4 text-sm font-sans text-white placeholder:text-white/30 focus:outline-none focus:border-[#CC6600] transition-colors resize-none leading-relaxed"
            />
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeclineModalOpen(false)}
              disabled={isPending}
              className="rounded-[2px] active:scale-[0.97] transition-transform text-xs font-sans"
            >
              Back
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeclineProposal}
              disabled={isPending}
              className="rounded-[2px] active:scale-[0.97] transition-transform text-xs font-semibold"
            >
              {isPending ? "Submitting..." : "Submit Decline"}
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* ── Global Toast ── */}
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
