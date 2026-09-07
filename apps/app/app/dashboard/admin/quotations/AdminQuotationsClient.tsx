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
  DropdownMenu,
  Toast,
  LoadingState,
  EmptyState,
  Pagination,
  Peso,
} from "@repo/ui";
import {
  IconCopy,
  IconSparkles,
  IconExternalLink,
  IconCalculator,
  IconReceiptOff,
  IconFileCertificate,
} from "@tabler/icons-react";
import { getQuotationsRoster, getCommercialCatalog } from "@/features/quotations/actions";
import { QuotationBuilderModal } from "@/features/quotations/components/QuotationBuilderModal";
import { ServiceCatalogModal } from "@/features/quotations/components/ServiceCatalogModal";
import {
  PACKAGES_CATALOG,
  ADDONS_CATALOG,
  type CommercialCatalogData,
} from "@/lib/pricing-rules";
import { copyTextToClipboard } from "@/lib/clipboard";
import type { QuotationDetailItem } from "@/features/quotations/schemas";
import type { PackageName } from "@prisma/client";

interface AdminQuotationsClientProps {
  initialQuotations?: QuotationDetailItem[];
  initialCatalog?: CommercialCatalogData;
}

export function AdminQuotationsClient({
  initialQuotations = [],
  initialCatalog,
}: AdminQuotationsClientProps) {
  const [quotations, setQuotations] = useState<QuotationDetailItem[]>(initialQuotations);
  const [catalog, setCatalog] = useState<CommercialCatalogData>(
    initialCatalog || {
      packages: PACKAGES_CATALOG,
      addOns: ADDONS_CATALOG,
    }
  );
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

  // Selected quote for editing in modal
  const [activeModalQuote, setActiveModalQuote] = useState<QuotationDetailItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);

  const isMountedRef = React.useRef(true);

  const loadQuotations = useCallback(async () => {
    setIsLoading(true);
    try {
      const [data, catalogData] = await Promise.all([
        getQuotationsRoster(),
        getCommercialCatalog(),
      ]);
      if (!isMountedRef.current) return;
      setQuotations(data);
      if (catalogData) {
        setCatalog(catalogData);
      }
    } catch {
      if (isMountedRef.current) {
        setToastMessage({
          message: "Load Error",
          description: "Failed to load quotations list.",
          variant: "danger",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (initialQuotations.length === 0) {
      loadQuotations();
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [initialQuotations.length, loadQuotations]);

  // Telemetry statistics
  const kpis = useMemo(() => {
    const total = quotations.length;
    const sent = quotations.filter((q) => q.status === "QUOTE_SENT").length;
    const approved = quotations.filter((q) => q.status === "CLIENT_APPROVED").length;
    const drafts = quotations.filter((q) => q.status === "DRAFT").length;
    const declined = quotations.filter((q) => q.status === "QUOTE_DECLINED").length;
    const expired = quotations.filter((q) => q.status === "QUOTE_EXPIRED" || q.isExpired).length;
    const totalValue = quotations
      .filter((q) => q.status === "QUOTE_SENT" || q.status === "CLIENT_APPROVED")
      .reduce((sum, q) => sum + q.totalAmount, 0);

    return { total, sent, approved, drafts, declined, expired, totalValue };
  }, [quotations]);

  // Filtered quotations based on STATUS dropdown and search query
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      // 1. Status filter
      if (selectedStatus !== "ALL") {
        if (selectedStatus === "EXPIRED") {
          if (!q.isExpired && q.status !== "QUOTE_EXPIRED") return false;
        } else if (q.status !== selectedStatus) {
          return false;
        }
      }

      // 2. Search filter
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase();
        const matchesId = (q.projectIntakeId || "").toLowerCase().includes(term);
        const matchesTitle = (q.projectTitle || "").toLowerCase().includes(term);
        const matchesClient = (q.clientName || "").toLowerCase().includes(term);
        const matchesEmail = (q.clientEmail || "").toLowerCase().includes(term);
        const matchesPkg = q.packageName.toLowerCase().includes(term);

        if (!matchesId && !matchesTitle && !matchesClient && !matchesEmail && !matchesPkg) {
          return false;
        }
      }

      return true;
    });
  }, [quotations, selectedStatus, searchQuery]);

  const paginatedQuotations = useMemo(() => {
    return filteredQuotations.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [filteredQuotations, currentPage, pageSize]);

  const handleEditQuote = (quote: QuotationDetailItem) => {
    setActiveModalQuote(quote);
    setIsModalOpen(true);
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

  const getPackageBadgeInfo = (pkgName: PackageName | string) => {
    const pkg = catalog.packages[pkgName] || PACKAGES_CATALOG[pkgName as PackageName];
    if (pkg) {
      return { id: pkg.id, name: pkg.name, badge: pkg.badge };
    }
    return { id: "JX", name: pkgName.replace(/_/g, " "), badge: "STANDARD" };
  };

  if (isLoading && quotations.length === 0) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto font-sans">
        <LoadingState
          variant="page"
          label="Loading Commercial Proposals..."
          description="Getting proposals, packages, and pricing."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      {/* ── Page Header ── */}
      <PageHeader
        title="Study Quotes & Proposals"
        description="Create and price quotes, customize add-on services, and manage proposal approvals."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Admin Command", href: "/dashboard/admin" },
          { label: "Quotes & Proposals" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={loadQuotations}
              loading={isLoading}
              className="rounded-[2px]"
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCatalogModalOpen(true)}
              className="rounded-[2px] bg-[#CC6600] text-white hover:bg-[#E67300]"
            >
              + Configure Services &amp; Add-ons
            </Button>
          </div>
        }
      />

      {/* ── KPI Metrics Ribbon ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <KpiCard
          label="ACTIVE QUOTES"
          value={kpis.sent}
          variant="amber"
          badge="NEEDS REVIEW"
          badgeColor="amber"
          description="Awaiting client confirmation"
        />

        <KpiCard
          label="APPROVED QUOTES"
          value={kpis.approved}
          variant="emerald"
          badge="SOW READY"
          badgeColor="emerald"
          description="Ready for contract execution"
        />

        <KpiCard
          label="PROPOSAL DRAFTS"
          value={kpis.drafts}
          variant="sky"
          badge="DRAFTING"
          badgeColor="sky"
          description="Internal quotes in preparation"
        />

        <KpiCard
          label="PIPELINE VALUE"
          value={`₱${kpis.totalValue.toLocaleString()}`}
          variant="orange"
          badge="TOTAL PIPELINE"
          badgeColor="orange"
          description="Issued and approved total sum"
        />
      </div>

      {/* ── Main Proposals Queue Substrate Card ── */}
      <Card
        className="p-0 border border-white/10 overflow-hidden bg-[#01142B]/85 rounded-[2px] shadow-xl backdrop-blur-sm"
        style={{ padding: 0 }}
      >
        {/* Filter Toolbar */}
        <FilterToolbar
          searchQuery={searchQuery}
          onSearchChange={(q) => { setSearchQuery(q); setCurrentPage(1); }}
          searchPlaceholder="Search study title, client, or JAXIS ID..."
          filters={[
            {
              key: "status",
              label: "Status",
              value: selectedStatus,
              defaultValue: "ALL",
              options: [
                { value: "ALL", label: `All Quotes (${kpis.total})` },
                { value: "QUOTE_SENT", label: `Active Issued (${kpis.sent})` },
                { value: "CLIENT_APPROVED", label: `Approved (${kpis.approved})` },
                { value: "DRAFT", label: `Drafts (${kpis.drafts})` },
                { value: "QUOTE_DECLINED", label: `Declined (${kpis.declined})` },
                { value: "EXPIRED", label: `Expired (${kpis.expired})` },
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
                  <th className="w-[180px] whitespace-nowrap">Lead Researcher</th>
                  <th className="w-[200px] whitespace-nowrap">Package &amp; Proposal</th>
                  <th className="w-[130px] whitespace-nowrap">Status</th>
                  <th className="w-[140px] text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <LoadingState variant="table" label="Loading quotes..." />
                    </td>
                  </tr>
                ) : filteredQuotations.length === 0 ? (
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
                  paginatedQuotations.map((quote) => {
                    const pkgInfo = getPackageBadgeInfo(quote.packageName);
                    const isExpired = quote.isExpired || quote.status === "QUOTE_EXPIRED";
                    const hasAddOns = quote.lineItems.some((li) => li.itemType === "ADDON");

                    return (
                      <tr key={quote.id} className="group">
                        {/* 1. Research Study & Intake */}
                        <td className="max-w-[420px] min-w-0">
                          <div className="flex flex-col gap-1 min-w-0 pr-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleCopyId(quote.projectIntakeId)}
                                title="Click to copy Intake ID"
                                className="text-xs font-mono font-bold text-[#FF9433] bg-[#CC6600]/15 hover:bg-[#CC6600]/25 border border-[#CC6600]/30 hover:border-[#CC6600] px-2 py-0.5 rounded-[2px] whitespace-nowrap cursor-pointer transition-all inline-flex items-center gap-1 group/btn"
                              >
                                <span>{quote.projectIntakeId || "JAXIS-STUDY"}</span>
                                <IconCopy size={11} stroke={1.5} className="opacity-40 group-hover/btn:opacity-100 transition-opacity" />
                              </button>
                              {quote.lineItems.length > 0 && (
                                <span className="text-[0.6875rem] font-mono text-sky-300 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded-[2px] whitespace-nowrap">
                                  {quote.lineItems.length} item{quote.lineItems.length === 1 ? "" : "s"}
                                </span>
                              )}
                              <span className="text-[0.6875rem] font-mono text-white/40 whitespace-nowrap">
                                Created {new Date(quote.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            <Link
                              href={`/dashboard/admin/projects/${quote.projectId}`}
                              className="text-xs font-semibold text-white group-hover:text-sky-300 transition-colors line-clamp-2 leading-snug"
                              title={quote.projectTitle}
                            >
                              {quote.projectTitle || "Research Study"}
                            </Link>
                          </div>
                        </td>

                        {/* 2. Lead Researcher */}
                        <td>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="font-semibold text-white group-hover:text-[#CC6600] transition-colors whitespace-nowrap truncate text-[0.8125rem]">
                              {quote.clientName || "Lead Researcher"}
                            </span>
                            <span className="text-[0.6875rem] text-white/40 font-mono whitespace-nowrap truncate max-w-[190px]">
                              {quote.clientEmail || "client@jaxis.dev"}
                            </span>
                          </div>
                        </td>

                        {/* 3. Commercial Proposal */}
                        <td className="whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-mono font-bold text-[#FFA040]">
                                {pkgInfo.id}
                              </span>
                              <span className="text-[0.5625rem] font-mono uppercase px-1.5 py-0.2 rounded-[2px] bg-white/[0.04] text-white/60 border border-white/[0.08]">
                                {pkgInfo.badge}
                              </span>
                              <span className="text-xs font-mono font-bold text-[#38BDF8] inline-flex items-baseline">
                                <Peso className="text-[#38BDF8]/80 text-xs" />
                                {quote.totalAmount.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-white/80 font-sans">
                              <span className="truncate max-w-[120px]">{pkgInfo.name}</span>
                              <span className="text-emerald-400 font-mono text-[0.6875rem] font-semibold inline-flex items-baseline">
                                <Peso className="text-emerald-400/80 text-[0.6875rem]" />
                                {quote.downpaymentRequired.toLocaleString()} DP
                              </span>
                            </div>
                            {hasAddOns && (
                              <span className="text-[0.6875rem] font-mono text-amber-300 flex items-center gap-1">
                                <IconSparkles size={11} stroke={1.5} />
                                <span>{quote.lineItems.filter((li) => li.itemType === "ADDON").length} Add-on(s) included</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. Status */}
                        <td className="whitespace-nowrap">
                          <StatusBadge
                            status={quote.status}
                            label={
                              isExpired && quote.status === "QUOTE_SENT"
                                ? "EXPIRED"
                                : quote.status.replace(/_/g, " ")
                            }
                          />
                        </td>

                        {/* 5. Actions */}
                        <td className="text-right whitespace-nowrap">
                          <div className="relative inline-flex items-center justify-end gap-2">
                            {quote.status === "CLIENT_APPROVED" ? (
                              <Link href={`/dashboard/admin/projects/${quote.projectId}/sow`}>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="py-1.5 px-3 h-auto whitespace-nowrap font-mono text-xs tracking-wider bg-[#CC6600] text-white hover:bg-[#E67300] flex items-center gap-1.5"
                                >
                                  <IconFileCertificate size={14} stroke={2} />
                                  <span>DRAFT SOW →</span>
                                </Button>
                              </Link>
                            ) : (quote.status === "DRAFT" || quote.status === "QUOTE_DECLINED") ? (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleEditQuote(quote)}
                                className="py-1.5 px-3 h-auto whitespace-nowrap font-mono text-xs tracking-wider bg-[#CC6600] text-white hover:bg-[#E67300]"
                              >
                                {quote.status === "DRAFT" ? "EDIT PROPOSAL" : "REVISE QUOTE"}
                              </Button>
                            ) : (
                              <Link href={`/dashboard/admin/projects/${quote.projectId}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="py-1.5 px-3 h-auto whitespace-nowrap font-mono text-xs tracking-wider"
                                >
                                  INSPECT
                                </Button>
                              </Link>
                            )}

                            <DropdownMenu
                              items={[
                                ...(quote.status === "CLIENT_APPROVED"
                                  ? [
                                      {
                                        label: "Draft Statement of Work",
                                        subtitle: "Compile SOW and issue to client",
                                        icon: <IconFileCertificate size={16} stroke={1.5} />,
                                        onClick: () => {
                                          window.location.href = `/dashboard/admin/projects/${quote.projectId}/sow`;
                                        },
                                      },
                                    ]
                                  : []),
                                {
                                  label: "Configure / Edit Quote",
                                  subtitle: "Open proposal builder drawer",
                                  icon: <IconCalculator size={16} stroke={1.5} />,
                                  onClick: () => handleEditQuote(quote),
                                },
                                {
                                  label: "Full Project Desk",
                                  subtitle: "Navigate to dedicated project console",
                                  icon: <IconExternalLink size={16} stroke={1.5} />,
                                  onClick: () => {
                                    window.location.href = `/dashboard/admin/projects/${quote.projectId}`;
                                  },
                                },
                                {
                                  label: "Copy Intake ID",
                                  subtitle: quote.projectIntakeId,
                                  dividerBefore: true,
                                  icon: <IconCopy size={16} stroke={1.5} />,
                                  onClick: () => handleCopyId(quote.projectIntakeId),
                                },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filteredQuotations.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredQuotations.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="proposals"
          />
        )}
      </Card>

      {/* ── Commercial Quotation Builder Modal ── */}
      {activeModalQuote && (
        <QuotationBuilderModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setActiveModalQuote(null);
          }}
          projectId={activeModalQuote.projectId}
          projectIntakeId={activeModalQuote.projectIntakeId}
          projectTitle={activeModalQuote.projectTitle}
          clientName={activeModalQuote.clientName}
          existingQuotation={activeModalQuote}
          customCatalog={catalog}
          onSuccess={loadQuotations}
        />
      )}

      {/* ── Service Catalog & Add-Ons Governance Modal ── */}
      <ServiceCatalogModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        initialCatalog={catalog}
        onSaveSuccess={(updated) => {
          setCatalog(updated);
          setToastMessage({
            message: "Catalog Updated",
            description: "Commercial service packages and add-ons successfully updated.",
            variant: "success",
          });
          loadQuotations();
        }}
      />

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
