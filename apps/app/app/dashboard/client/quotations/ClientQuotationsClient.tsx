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
  Sparkle,
  ArrowRight,
  Receipt,
  Clock,
} from "@phosphor-icons/react";
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
    <div
      data-portal="client"
      className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade"
    >
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

      {/* ── KPI Metrics Ribbon (Dashdark X Precision Standard) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 items-stretch">
        <KpiCard
          label="PENDING REVIEW"
          value={stats.pendingAction}
          variant={stats.pendingAction > 0 ? "orange" : "default"}
          badge={stats.pendingAction > 0 ? "ACTION NEEDED" : "ALL CLEAR"}
          badgeColor={stats.pendingAction > 0 ? "orange" : "gray"}
          description="Quotes ready for your review"
          icon={
            stats.pendingAction > 0 ? (
              <Clock size={16} weight="fill" className="text-[#FFA040]" />
            ) : undefined
          }
          className="animate-card-reveal stagger-1"
        />

        <KpiCard
          label="APPROVED"
          value={stats.approved}
          variant="default"
          badge="ACCEPTED"
          badgeColor="emerald"
          description="Scope and milestones accepted"
          className="animate-card-reveal stagger-2"
        />

        <KpiCard
          label="BEING PRICED"
          value={stats.inPrep}
          variant="default"
          badge="IN PIPELINE"
          badgeColor="sky"
          description="Quotes being prepared by statisticians"
          className="animate-card-reveal stagger-3"
        />

        <KpiCard
          label="TOTAL VALUE"
          value={<MoneyDisplay amount={stats.totalCommitted} />}
          variant="default"
          badge="COMMITTED"
          badgeColor="orange"
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

        {/* ── Table Container (Dashdark X Precision Standard) ── */}
        <div className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#010D1F] border-b border-white/10">
                <tr>
                  <th className="py-3.5 px-4 text-xs font-mono text-white/50 uppercase tracking-wider font-semibold w-[140px] whitespace-nowrap">Study ID</th>
                  <th className="py-3.5 px-4 text-xs font-mono text-white/50 uppercase tracking-wider font-semibold">Research Study</th>
                  <th className="py-3.5 px-4 text-xs font-mono text-white/50 uppercase tracking-wider font-semibold w-[190px] whitespace-nowrap">Package Tier</th>
                  <th className="py-3.5 px-4 text-xs font-mono text-white/50 uppercase tracking-wider font-semibold w-[180px] whitespace-nowrap">Investment</th>
                  <th className="py-3.5 px-4 text-xs font-mono text-white/50 uppercase tracking-wider font-semibold w-[140px] whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 text-xs font-mono text-white/50 uppercase tracking-wider font-semibold w-[150px] text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <LoadingState variant="table" label="Loading quotes..." />
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <EmptyState
                        icon={Receipt}
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
                      <tr key={project.id} className="group hover:bg-white/[0.02] transition-colors">
                        {/* 1. Study ID */}
                        <td className="py-3.5 px-4 font-mono text-xs whitespace-nowrap align-middle">
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
                        </td>

                        {/* 2. Research Study & Intake */}
                        <td className="py-3.5 px-4 max-w-[380px] min-w-0 align-middle">
                          <div className="flex flex-col gap-0.5 pr-2 min-w-0">
                            <Link
                              href={
                                quotation
                                  ? `/dashboard/client/projects/${project.id}/quote`
                                  : `/dashboard/client/projects/${project.id}`
                              }
                              className="text-sm font-semibold text-white group-hover:text-[#FFA040] transition-colors line-clamp-1 leading-snug font-sans"
                              title={project.researchTitle}
                            >
                              {project.researchTitle}
                            </Link>
                            <span className="text-xs text-white/40 font-sans">
                              Target Date: {new Date(project.deadlineRequested).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </td>

                        {/* 3. Package & Scope */}
                        <td className="py-3.5 px-4 whitespace-nowrap align-middle">
                          {pkgInfo ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-mono font-bold text-[#FFA040]">
                                  {pkgInfo.id}
                                </span>
                                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-[2px] bg-white/[0.04] text-white/70 border border-white/[0.08]">
                                  {pkgInfo.badge}
                                </span>
                              </div>
                              <span className="text-xs text-white/90 font-sans">
                                {pkgInfo.name.replace(/^JX-\d+\s*/, "")}
                              </span>
                              {hasAddOns && (
                                <span className="text-[11px] font-sans text-white/50 flex items-center gap-1">
                                  <Sparkle size={11} weight="fill" className="text-[#CC6600]" />
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

                        {/* 4. Investment & Downpayment */}
                        <td className="py-3.5 px-4 whitespace-nowrap align-middle">
                          {quotation ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-sm font-mono text-white font-bold inline-flex items-baseline">
                                  <Peso className="text-white/80 text-sm" />
                                  {quotation.totalAmount.toLocaleString()}
                                </span>
                                <span className="text-xs font-sans text-white/40 inline-flex items-baseline">
                                  (Base: <Peso className="text-white/40 text-xs" />{quotation.basePrice.toLocaleString()})
                                </span>
                              </div>
                              <span className="text-[11px] font-mono text-white/70 font-medium inline-flex items-baseline">
                                <Peso className="text-white/50 text-[11px]" />
                                {quotation.downpaymentRequired.toLocaleString()} Due ({quotation.isUpfrontEnforced ? "100%" : `${quotation.downpaymentPercentage}%`})
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-mono text-white/30">—</span>
                          )}
                        </td>

                        {/* 5. Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap align-middle">
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

                        {/* 6. Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap align-middle">
                          {isPending ? (
                            <Link href={`/dashboard/client/projects/${project.id}/quote`}>
                              <Button
                                variant="primary"
                                size="sm"
                                className="whitespace-nowrap font-sans font-semibold text-xs bg-[#CC6600] text-white hover:bg-[#B35500] inline-flex items-center gap-1.5 rounded-[2px] active:scale-[0.97] transition-all px-3 py-1.5"
                              >
                                <span>Review Quote</span>
                                <ArrowRight size={13} weight="fill" />
                              </Button>
                            </Link>
                          ) : isApproved ? (
                            <Link href={`/dashboard/client/projects/${project.id}/quote`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="whitespace-nowrap font-sans font-medium text-xs rounded-[2px] active:scale-[0.97] transition-all px-3 py-1.5"
                              >
                                View Details
                              </Button>
                            </Link>
                          ) : (
                            <Link href={`/dashboard/client/projects/${project.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="whitespace-nowrap font-sans font-medium text-xs text-white/60 hover:text-white rounded-[2px] active:scale-[0.97] transition-all px-3 py-1.5"
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
