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
  CopyButton,
  MoneyDisplay,
} from "@repo/ui";
import {
  IconSparkles,
  IconArrowRight,
  IconReceiptOff,
} from "@tabler/icons-react";
import { getProjects } from "@/features/projects/actions";
import { getQuotationByProject } from "@/features/quotations/actions";
import { PACKAGES_CATALOG } from "@/lib/pricing-rules";
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

  if (isLoading && entries.length === 0) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto font-sans">
        <LoadingState
          variant="page"
          label="Loading quotes..."
          description="Getting your study quotes and pricing."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      {/* ── Page Header ── */}
      <PageHeader
        title="Study Quotes & Proposals"
        description="Review pricing, package options, and payment terms for your research studies."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Client Portal", href: "/dashboard/client" },
          { label: "Quotes & Proposals" },
        ]}
      />

      {/* ── KPI Metrics Ribbon ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <KpiCard
          label="PENDING REVIEW"
          value={stats.pendingAction}
          variant={stats.pendingAction > 0 ? "orange" : "default"}
          badge={stats.pendingAction > 0 ? "NEEDS REVIEW" : undefined}
          badgeColor={stats.pendingAction > 0 ? "orange" : "gray"}
          description="Quotes ready for your review"
          className="animate-card-reveal stagger-1"
        />

        <KpiCard
          label="APPROVED"
          value={stats.approved}
          variant="default"
          description="Scope and milestones accepted"
          className="animate-card-reveal stagger-2"
        />

        <KpiCard
          label="BEING PRICED"
          value={stats.inPrep}
          variant="default"
          description="Quotes being prepared by statisticians"
          className="animate-card-reveal stagger-3"
        />

        <KpiCard
          label="TOTAL VALUE"
          value={<MoneyDisplay amount={stats.totalCommitted} />}
          variant="default"
          description="Total value of accepted studies"
          className="animate-card-reveal stagger-4"
        />
      </div>

      {/* ── Main Proposals Table Substrate Card ── */}
      <Card
        className="p-0 border border-white/10 overflow-hidden bg-[#01142B]/85 rounded-[2px] shadow-xl backdrop-blur-sm animate-card-reveal stagger-5"
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
              label: "Status",
              value: selectedStatus,
              defaultValue: "ALL",
              options: [
                { value: "ALL", label: `All Quotes (${stats.total})` },
                { value: "PENDING", label: `Needs Review (${stats.pendingAction})` },
                { value: "APPROVED", label: `Approved (${stats.approved})` },
                { value: "IN_PREP", label: `Being Priced (${stats.inPrep})` },
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
                  <th>Study &amp; Intake ID</th>
                  <th className="w-[200px] whitespace-nowrap">Package &amp; Scope</th>
                  <th className="w-[170px] whitespace-nowrap">Pricing &amp; Downpayment</th>
                  <th className="w-[130px] whitespace-nowrap">Status</th>
                  <th className="w-[150px] text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <LoadingState variant="table" label="Loading quotes..." />
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <EmptyState
                        icon={IconReceiptOff}
                        title="No Quotes Found"
                        description="No quotes match the active filter criteria."
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
                              <CopyButton
                                variant="badge"
                                value={project.intakeId}
                                label={project.intakeId}
                                onCopy={() =>
                                  setToastMessage({
                                    message: "Study ID Copied",
                                    description: `"${project.intakeId}" has been copied to your clipboard.`,
                                    variant: "info",
                                  })
                                }
                              />

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

                        {/* 2. Package & Scope */}
                        <td className="whitespace-nowrap">
                          {pkgInfo ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-mono font-bold text-[#FFA040]">
                                  {pkgInfo.id}
                                </span>
                                <span className="text-[0.5625rem] font-mono uppercase px-1.5 py-0.5 rounded-[2px] bg-white/[0.04] text-white/70 border border-white/[0.08]">
                                  {pkgInfo.badge}
                                </span>
                              </div>
                              <span className="text-xs text-white/90 font-sans leading-snug">
                                {pkgInfo.name.replace(/^JX-\d+\s*/, "")}
                              </span>
                              {hasAddOns && (
                                <span className="text-[0.6875rem] font-sans text-white/60 flex items-center gap-1 mt-0.5">
                                  <IconSparkles size={12} stroke={1.5} className="text-[#CC6600]" />
                                  <span>{quotation?.lineItems.filter((li) => li.itemType === "ADDON").length} Add-on(s) included</span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-white/40 font-mono italic">
                              In Evaluation
                            </span>
                          )}
                        </td>

                        {/* 3. Pricing & Downpayment */}
                        <td className="whitespace-nowrap">
                          {quotation ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xs font-mono text-white font-bold inline-flex items-baseline">
                                  <Peso className="text-white/80 text-xs" />
                                  {quotation.totalAmount.toLocaleString()}
                                </span>
                                <span className="text-[0.625rem] font-sans text-white/40 inline-flex items-baseline">
                                  (Base: <Peso className="text-white/40 text-[0.625rem]" />{quotation.basePrice.toLocaleString()})
                                </span>
                              </div>
                              <span className="text-[0.6875rem] font-mono text-white/70 font-medium inline-flex items-baseline">
                                <Peso className="text-white/50 text-[0.6875rem]" />
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
                                  ? "Needs Review"
                                  : isApproved
                                  ? "Approved"
                                  : quotation.status.replace(/_/g, " ")
                              }
                            />
                          ) : (
                            <StatusBadge
                              status="UNDER_EVALUATION"
                              label="In Evaluation"
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
                                className="py-1.5 px-3.5 h-auto whitespace-nowrap font-sans font-semibold text-xs tracking-wide bg-[#CC6600] text-white hover:bg-[#E67300] inline-flex items-center gap-1.5 cursor-pointer rounded-[2px]"
                              >
                                <span>Review Quote</span>
                                <IconArrowRight size={14} stroke={2} />
                              </Button>
                            </Link>
                          ) : isApproved ? (
                            <Link href={`/dashboard/client/projects/${project.id}/quote`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="py-1.5 px-3.5 h-auto whitespace-nowrap font-sans font-medium text-xs tracking-wide cursor-pointer rounded-[2px]"
                              >
                                View Details
                              </Button>
                            </Link>
                          ) : (
                            <Link href={`/dashboard/client/projects/${project.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="py-1.5 px-3.5 h-auto whitespace-nowrap font-sans font-medium text-xs tracking-wide text-white/60 hover:text-white cursor-pointer rounded-[2px]"
                              >
                                Study Tracker →
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
