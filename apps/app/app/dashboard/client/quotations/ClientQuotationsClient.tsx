"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  KpiCard,
  FilterToolbar,
  StatusBadge,
  Button,
  Toast,
  LoadingState,
  EmptyState,
  Pagination,
  Peso,
} from "@repo/ui";
import {
  IconCopy,
  IconSparkles,
  IconArrowRight,
  IconReceiptOff,
} from "@tabler/icons-react";
import { getProjects } from "@/features/projects/actions";
import { getQuotationByProject } from "@/features/quotations/actions";
import { PACKAGES_CATALOG } from "@/lib/pricing-rules";
import { copyTextToClipboard } from "@/lib/clipboard";
import type { ProjectDetailItem } from "@/features/projects/schemas";
import type { QuotationDetailItem } from "@/features/quotations/schemas";
import type { PackageName } from "@prisma/client";
import type { ClientQuoteEntry } from "@/features/quotations/schemas";

interface ClientQuotationsClientProps {
  initialEntries?: ClientQuoteEntry[];
}

export function ClientQuotationsClient({
  initialEntries = [],
}: ClientQuotationsClientProps) {
  const [entries, setEntries] = useState<ClientQuoteEntry[]>(initialEntries);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const loadClientQuotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getProjects();
      if (res.success && res.data) {
        const quotePromises = res.data.map(async (project) => {
          const quote = await getQuotationByProject(project.id);
          return { project, quotation: quote };
        });
        const results = await Promise.all(quotePromises);
        const activeProposals = results.filter(
          (r) =>
            r.quotation !== null ||
            r.project.masterStatus === "QUOTE_SENT" ||
            r.project.masterStatus === "UNDER_EVALUATION" ||
            r.project.masterStatus === "CLIENT_APPROVED"
        );
        setEntries(activeProposals);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Background refresh if initial data was empty
  useEffect(() => {
    if (initialEntries.length === 0) {
      loadClientQuotes();
    }
  }, [initialEntries.length, loadClientQuotes]);

  // Client telemetry
  const stats = useMemo(() => {
    const total = entries.length;
    const pendingAction = entries.filter((e) => e.quotation?.status === "QUOTE_SENT").length;
    const approved = entries.filter((e) => e.quotation?.status === "CLIENT_APPROVED").length;
    const inPrep = entries.filter((e) => !e.quotation || e.quotation.status === "DRAFT").length;
    const totalCommitted = entries
      .filter((e) => e.quotation?.status === "CLIENT_APPROVED")
      .reduce((sum, e) => sum + (e.quotation?.totalAmount || 0), 0);

    return { total, pendingAction, approved, inPrep, totalCommitted };
  }, [entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter(({ project, quotation }) => {
      // 1. Status Filter
      if (selectedStatus === "PENDING") {
        if (quotation?.status !== "QUOTE_SENT") return false;
      } else if (selectedStatus === "APPROVED") {
        if (quotation?.status !== "CLIENT_APPROVED") return false;
      } else if (selectedStatus === "IN_PREP") {
        if (quotation && quotation.status !== "DRAFT") return false;
      }

      // 2. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = project.researchTitle.toLowerCase().includes(q);
        const matchesId = project.intakeId.toLowerCase().includes(q);
        const matchesPkg = quotation ? quotation.packageName.toLowerCase().includes(q) : false;

        if (!matchesTitle && !matchesId && !matchesPkg) {
          return false;
        }
      }

      return true;
    });
  }, [entries, selectedStatus, searchQuery]);

  const paginatedEntries = useMemo(() => {
    return filteredEntries.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [filteredEntries, currentPage, pageSize]);

  const getPackageBadgeInfo = (pkgName?: string) => {
    if (!pkgName) return null;
    const pkg = PACKAGES_CATALOG[pkgName as PackageName];
    if (pkg) {
      return { id: pkg.id, name: pkg.name, badge: pkg.badge };
    }
    return { id: "JX", name: pkgName.replace(/_/g, " "), badge: "STANDARD" };
  };

  const handleCopyId = async (intakeId?: string) => {
    const textToCopy = intakeId || "JAXIS-202608-1533";
    await copyTextToClipboard(textToCopy);
    setToastMessage({
      message: "Copied to Clipboard",
      description: `Intake ID "${textToCopy}" has been copied to your clipboard.`,
      variant: "info",
    });
  };

  if (isLoading && entries.length === 0) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto font-sans">
        <LoadingState
          variant="page"
          label="Loading Commercial Proposals..."
          description="Fetching your customized quotes and packages."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      {/* ── Page Header ── */}
      <PageHeader
        title="Commercial Quotations & Proposals"
        description="Inspect itemized analytical proposals, review methodology deliverables, and approve project quotations to commence statistical computation."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Client Portal", href: "/dashboard/client" },
          { label: "Commercial Proposals" },
        ]}
      />

      {/* ── KPI Metrics Ribbon ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <KpiCard
          label="PENDING REVIEW"
          value={stats.pendingAction}
          variant="amber"
          badge="ACTION REQUIRED"
          badgeColor="amber"
          description="Awaiting your approval decision"
        />

        <KpiCard
          label="APPROVED PROPOSALS"
          value={stats.approved}
          variant="emerald"
          badge="AUTHORIZED"
          badgeColor="emerald"
          description="Scope & milestones accepted"
        />

        <KpiCard
          label="IN FEASIBILITY PREP"
          value={stats.inPrep}
          variant="sky"
          badge="STAT LAB QUEUE"
          badgeColor="sky"
          description="Pricing under evaluation"
        />

        <KpiCard
          label="COMMITTED VALUE"
          value={`₱${stats.totalCommitted.toLocaleString()}`}
          variant="orange"
          badge="ESCROW SETTLED"
          badgeColor="orange"
          description="Active study contract value"
        />
      </div>

      {/* ── Main Proposals Table Glass Card ── */}
      <Card
        className="p-0 border-white/[0.08] overflow-hidden bg-gradient-to-b from-[#01142B]/90 via-[#010E20]/95 to-[#010A17] shadow-2xl"
        style={{ padding: 0 }}
      >
        {/* Filter Toolbar */}
        <FilterToolbar
          searchQuery={searchQuery}
          onSearchChange={(q) => { setSearchQuery(q); setCurrentPage(1); }}
          searchPlaceholder="Search study title or JAXIS ID..."
          filters={[
            {
              key: "status",
              label: "STATUS",
              value: selectedStatus,
              defaultValue: "ALL",
              options: [
                { value: "ALL", label: `All Proposals (${stats.total})` },
                { value: "PENDING", label: `Action Required (${stats.pendingAction})` },
                { value: "APPROVED", label: `Approved (${stats.approved})` },
                { value: "IN_PREP", label: `In Evaluation (${stats.inPrep})` },
              ],
            },
          ]}
          onFilterChange={(key, value) => {
            if (key === "status") { setSelectedStatus(value); setCurrentPage(1); }
          }}
          onClear={() => {
            setSelectedStatus("ALL");
            setSearchQuery("");
            setCurrentPage(1);
          }}
        />

        {/* ── Table Container ── */}
        <div style={{ padding: "1.25rem 1.75rem 1.75rem 1.75rem" }}>
          <div className="w-full overflow-x-auto rounded-[3px] border border-white/[0.08]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Research Study &amp; Intake</th>
                  <th className="w-[200px] whitespace-nowrap">Commercial Package</th>
                  <th className="w-[170px] whitespace-nowrap">Pricing &amp; Escrow</th>
                  <th className="w-[130px] whitespace-nowrap">Status</th>
                  <th className="w-[150px] text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <LoadingState variant="table" label="Loading proposals..." />
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <EmptyState
                        icon={IconReceiptOff}
                        title="No Proposals Found"
                        description="No commercial proposal records match the active filter criteria."
                      />
                    </td>
                  </tr>
                ) : (
                  paginatedEntries.map(({ project, quotation }) => {
                    const isPending = quotation?.status === "QUOTE_SENT";
                    const isApproved = quotation?.status === "CLIENT_APPROVED";
                    const pkgInfo = quotation ? getPackageBadgeInfo(quotation.packageName) : null;
                    const hasAddOns = quotation?.lineItems.some((li) => li.itemType === "ADDON");

                    return (
                      <tr key={project.id} className="group">
                        {/* 1. Research Study & Intake */}
                        <td className="max-w-[420px] min-w-0">
                          <div className="flex flex-col gap-1 min-w-0 pr-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleCopyId(project.intakeId)}
                                title="Click to copy Intake ID"
                                className="text-xs font-mono font-bold text-[#FF9433] bg-[#CC6600]/15 hover:bg-[#CC6600]/25 border border-[#CC6600]/30 hover:border-[#CC6600] px-2 py-0.5 rounded-[2px] whitespace-nowrap cursor-pointer transition-all inline-flex items-center gap-1 group/btn"
                              >
                                <span>{project.intakeId}</span>
                                <IconCopy size={11} stroke={1.5} className="opacity-40 group-hover/btn:opacity-100 transition-opacity" />
                              </button>

                              <span className="text-[0.6875rem] font-mono text-white/40 whitespace-nowrap">
                                Target: {new Date(project.deadlineRequested).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>

                            <Link
                              href={
                                quotation
                                  ? `/dashboard/client/projects/${project.id}/quote`
                                  : `/dashboard/client/projects/${project.id}`
                              }
                              className="text-xs font-semibold text-white group-hover:text-sky-300 transition-colors line-clamp-2 leading-snug"
                              title={project.researchTitle}
                            >
                              {project.researchTitle}
                            </Link>
                          </div>
                        </td>

                        {/* 2. Commercial Package */}
                        <td className="whitespace-nowrap">
                          {pkgInfo ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-mono font-bold text-[#FFA040]">
                                  {pkgInfo.id}
                                </span>
                                <span className="text-[0.5625rem] font-mono uppercase px-1.5 py-0.2 rounded-[2px] bg-white/[0.04] text-white/60 border border-white/[0.08]">
                                  {pkgInfo.badge}
                                </span>
                              </div>
                              <span className="text-xs text-white/80 font-sans truncate max-w-[170px]">
                                {pkgInfo.name}
                              </span>
                              {hasAddOns && (
                                <span className="text-[0.6875rem] font-mono text-amber-300 flex items-center gap-1">
                                  <IconSparkles size={11} stroke={1.5} />
                                  <span>{quotation?.lineItems.filter((li) => li.itemType === "ADDON").length} Add-on(s)</span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-white/40 font-mono italic">
                              In Evaluation
                            </span>
                          )}
                        </td>

                        {/* 3. Pricing & Escrow */}
                        <td className="whitespace-nowrap">
                          {quotation ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-mono text-[#38BDF8] font-bold inline-flex items-baseline">
                                  <Peso className="text-[#38BDF8]/80 text-xs" />
                                  {quotation.totalAmount.toLocaleString()}
                                </span>
                                <span className="text-[0.625rem] font-mono text-white/40 inline-flex items-baseline">
                                  (Base: <Peso className="text-white/40 text-[0.625rem]" />{quotation.basePrice.toLocaleString()})
                                </span>
                              </div>
                              <span className="text-[0.6875rem] font-mono text-emerald-400 font-medium inline-flex items-baseline">
                                <Peso className="text-emerald-400/80 text-[0.6875rem]" />
                                {quotation.downpaymentRequired.toLocaleString()} Due ({quotation.isUpfrontEnforced ? "100%" : `${quotation.downpaymentPercentage}%`})
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-mono text-white/30">—</span>
                          )}
                        </td>

                        {/* 4. Status */}
                        <td className="whitespace-nowrap">
                          {quotation ? (
                            <StatusBadge
                              status={quotation.status}
                              label={
                                isPending
                                  ? "ACTION REQUIRED"
                                  : isApproved
                                  ? "APPROVED"
                                  : quotation.status.replace(/_/g, " ")
                              }
                            />
                          ) : (
                            <StatusBadge
                              status="UNDER_EVALUATION"
                              label="IN EVALUATION"
                            />
                          )}
                        </td>

                        {/* 5. Actions */}
                        <td className="text-right whitespace-nowrap">
                          {isPending ? (
                            <Link href={`/dashboard/client/projects/${project.id}/quote`}>
                              <Button
                                variant="primary"
                                size="sm"
                                className="py-1.5 px-3.5 h-auto whitespace-nowrap font-mono text-xs tracking-wider bg-[#CC6600] text-white hover:bg-[#E67300] inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>REVIEW QUOTE</span>
                                <IconArrowRight size={13} stroke={1.5} />
                              </Button>
                            </Link>
                          ) : isApproved ? (
                            <Link href={`/dashboard/client/projects/${project.id}/quote`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="py-1.5 px-3.5 h-auto whitespace-nowrap font-mono text-xs tracking-wider cursor-pointer"
                              >
                                VIEW DETAILS
                              </Button>
                            </Link>
                          ) : (
                            <Link href={`/dashboard/client/projects/${project.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="py-1.5 px-3.5 h-auto whitespace-nowrap font-mono text-xs tracking-wider text-white/60 hover:text-white cursor-pointer"
                              >
                                TRACKER →
                              </Button>
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filteredEntries.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredEntries.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="proposals"
          />
        )}
      </Card>

      {/* ── Global Portaled Toast ── */}
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
