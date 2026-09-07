"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  KpiCard,
  FilterToolbar,
  StatusBadge,
  Button,
  FormTextarea,
  FormSelect,
  Modal,
  ModalFooter,
  DropdownMenu,
  Toast,
  LoadingState,
  EmptyState,
  Pagination,
} from "@repo/ui";
import {
  IconDownload,
  IconExternalLink,
  IconHelpCircle,
  IconCheck,
  IconCopy,
  IconInbox,
  IconShieldCheck,
  IconCalculator,
  IconFileCertificate,
  IconRefresh,
} from "@tabler/icons-react";
import {
  getProjects,
  markIntakeComplete,
  requestMissingInfo,
} from "@/features/projects/actions";
import { MISSING_INFO_TEMPLATES, getProjectDisplayStatus } from "@/lib/project-rules";
import {
  getFileMeta,
  formatFileCategory,
  triggerFileDownload,
} from "@/lib/file-utils";
import { QuotationBuilderModal } from "@/features/quotations/components/QuotationBuilderModal";
import { getCommercialCatalog } from "@/features/quotations/actions";
import {
  PACKAGES_CATALOG,
  ADDONS_CATALOG,
  type CommercialCatalogData,
} from "@/lib/pricing-rules";
import type { ProjectDetailItem } from "@/features/projects/schemas";

interface AdminIntakeClientProps {
  initialProjects?: ProjectDetailItem[];
  initialCatalog?: CommercialCatalogData;
}

export function AdminIntakeClient({
  initialProjects = [],
  initialCatalog,
}: AdminIntakeClientProps) {
  const [selectedStudyForQuote, setSelectedStudyForQuote] =
    useState<ProjectDetailItem | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [catalog, setCatalog] = useState<CommercialCatalogData>(
    initialCatalog || {
      packages: PACKAGES_CATALOG,
      addOns: ADDONS_CATALOG,
    }
  );
  const [projects, setProjects] = useState<ProjectDetailItem[]>(initialProjects);
  const [isLoading, setIsLoading] = useState<boolean>(initialProjects.length === 0);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals state
  const [selectedStudyForInspect, setSelectedStudyForInspect] =
    useState<ProjectDetailItem | null>(null);
  const [selectedForMissingInfo, setSelectedForMissingInfo] =
    useState<ProjectDetailItem | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [missingInfoReasonText, setMissingInfoReasonText] = useState<string>("");
  const [missingInfoError, setMissingInfoError] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [res, catalogData] = await Promise.all([
        getProjects(),
        getCommercialCatalog(),
      ]);
      if (res.success) {
        setProjects(res.data);
      }
      if (catalogData) {
        setCatalog(catalogData);
      }
    } catch (e) {
      console.error("Failed to load intake projects", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialProjects.length === 0) {
      loadData();
    }

    // Auto-refresh when new intake alerts arrive via SSE or when the admin tab regains focus
    const handleStudyUpdated = () => {
      loadData();
    };
    const handleFocus = () => {
      loadData();
    };

    window.addEventListener("jaxis:study-updated", handleStudyUpdated);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("jaxis:study-updated", handleStudyUpdated);
      window.removeEventListener("focus", handleFocus);
    };
  }, [initialProjects.length]);

  // Filter projects based on STATUS dropdown and search query
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // 1. Status Filter
      if (selectedStatus === "TRIAGE") {
        if (
          p.masterStatus !== "NEW_REQUEST" &&
          p.masterStatus !== "AWAITING_INFORMATION"
        ) {
          return false;
        }
      } else if (selectedStatus !== "ALL") {
        if (p.masterStatus !== selectedStatus) {
          return false;
        }
      }

      // 2. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = p.researchTitle.toLowerCase().includes(q);
        const matchesId = p.intakeId.toLowerCase().includes(q);
        const matchesClient = p.client.fullName.toLowerCase().includes(q);
        const matchesEmail = p.client.email.toLowerCase().includes(q);
        const matchesSchool =
          (p.client.clientProfile?.institutionSchool || "").toLowerCase().includes(q);

        if (
          !matchesTitle &&
          !matchesId &&
          !matchesClient &&
          !matchesEmail &&
          !matchesSchool
        ) {
          return false;
        }
      }

      return true;
    });
  }, [projects, selectedStatus, searchQuery]);

  // Prioritize studies requiring manager / QA / triage action to the top
  const sortedFilteredProjects = useMemo(() => {
    const managerActionPriority = [
      "FOR_QA",
      "QA_REVISION",
      "NEW_REQUEST",
      "AWAITING_INFORMATION",
      "UNDER_EVALUATION",
      "AWAITING_PAYMENT",
      "PROOF_SUBMITTED",
      "REASSIGNMENT_NEEDED",
      "ETHICAL_BREACH",
      "SLA_PAUSED",
      "QUOTE_SENT",
      "SOW_PENDING",
      "IN_PROGRESS",
      "EXPERT_ASSIGNED",
      "DELIVERED",
      "CLOSED",
    ];

    return [...filteredProjects].sort((a, b) => {
      const aIndex = managerActionPriority.indexOf(a.masterStatus);
      const bIndex = managerActionPriority.indexOf(b.masterStatus);
      const aPriority = aIndex === -1 ? 999 : aIndex;
      const bPriority = bIndex === -1 ? 999 : bIndex;
      if (aPriority !== bPriority) return aPriority - bPriority;
      // Secondary sort: newest first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filteredProjects]);

  const paginatedProjects = useMemo(() => {
    return sortedFilteredProjects.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [sortedFilteredProjects, currentPage, pageSize]);

  // Comprehensive Master Status & KPI calculations
  const kpis = useMemo(() => {
    const total = projects.length;
    const newRequests = projects.filter(
      (p) => p.masterStatus === "NEW_REQUEST"
    ).length;
    const awaitingInfo = projects.filter(
      (p) => p.masterStatus === "AWAITING_INFORMATION"
    ).length;
    const underEvaluation = projects.filter(
      (p) => p.masterStatus === "UNDER_EVALUATION"
    ).length;

    return {
      total,
      activeTriage: newRequests + awaitingInfo,
      newRequests,
      awaitingInfo,
      underEvaluation,
    };
  }, [projects]);

  const handleMarkComplete = (projectId: string, intakeId: string) => {
    startTransition(async () => {
      const res = await markIntakeComplete(projectId);
      if (res.success) {
        setToastMessage({
          message: "Intake Evaluation Complete",
          description: `Study ${intakeId} has been transitioned to UNDER_EVALUATION.`,
          variant: "success",
        });
        loadData();
      } else {
        setToastMessage({
          message: "Evaluation Update Failed",
          description: res.error.message,
          variant: "danger",
        });
      }
    });
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const found = MISSING_INFO_TEMPLATES.find((t) => t.id === templateId);
    if (found) {
      setMissingInfoReasonText(found.text);
      setMissingInfoError(null);
    }
  };

  const handleRequestMissingInfoSubmit = () => {
    if (!selectedForMissingInfo) return;
    if (
      !missingInfoReasonText.trim() ||
      missingInfoReasonText.trim().length < 5
    ) {
      setMissingInfoError(
        "Please provide a clear description of the missing information (min 5 characters)."
      );
      return;
    }

    setMissingInfoError(null);
    startTransition(async () => {
      const res = await requestMissingInfo({
        projectId: selectedForMissingInfo.id,
        reason: missingInfoReasonText.trim(),
      });

      if (res.success) {
        setToastMessage({
          message: "Information Request Sent",
          description: `Requested missing artifacts from ${selectedForMissingInfo.client.fullName} (${selectedForMissingInfo.intakeId}).`,
          variant: "warning",
        });
        setSelectedForMissingInfo(null);
        setMissingInfoReasonText("");
        setSelectedTemplateId("");
        loadData();
      } else {
        setMissingInfoError(res.error.message);
        setToastMessage({
          message: "Request Failed",
          description: res.error.message,
          variant: "danger",
        });
      }
    });
  };

  const handleCopyId = (intakeId: string) => {
    navigator.clipboard.writeText(intakeId);
    setToastMessage({
      message: "Copied to Clipboard",
      description: `Intake ID "${intakeId}" has been copied to your clipboard.`,
      variant: "info",
    });
  };

  if (isLoading && projects.length === 0) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto font-sans">
        <LoadingState
          variant="page"
          label="Loading Intake Queue..."
          description="Retrieving new study requests and pricing triage."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      {/* ── Page Header ── */}
      <PageHeader
        title="Project Intake Triage & Evaluation Queue"
        description="Evaluate incoming research submissions, verify methodology feasibility, request missing dataset artifacts, and approve complete studies for pricing quotation."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Admin Command", href: "/dashboard/admin" },
          { label: "Intake Triage" },
        ]}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 font-mono text-xs font-semibold"
          >
            <IconRefresh size={14} className={isLoading ? "animate-spin" : ""} stroke={2} />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* ── KPI Metrics Ribbon ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <KpiCard
          label="ACTIVE TRIAGE QUEUE"
          value={kpis.activeTriage}
          variant="amber"
          badge="ACTION REQUIRED"
          badgeColor="amber"
          description="Awaiting administrator evaluation"
        />

        <KpiCard
          label="NEW SUBMISSIONS"
          value={kpis.newRequests}
          variant="sky"
          badge="INITIAL REVIEW"
          badgeColor="sky"
          description="Fresh student & faculty intakes"
        />

        <KpiCard
          label="AWAITING INFO"
          value={kpis.awaitingInfo}
          variant="orange"
          badge="CLIENT ACTION"
          badgeColor="orange"
          description="Clarification or dataset pending"
        />

        <KpiCard
          label="UNDER EVALUATION"
          value={kpis.underEvaluation}
          variant="emerald"
          badge="QUOTATION READY"
          badgeColor="emerald"
          description="Feasibility approved for pricing"
        />
      </div>

      {/* ── Main Triage & Queue Glass Card ── */}
      <Card
        className="p-0 border-white/[0.08] overflow-hidden bg-gradient-to-b from-[#01142B]/90 via-[#010E20]/95 to-[#010A17] shadow-2xl"
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
              label: "STATUS",
              value: selectedStatus,
              defaultValue: "ALL",
              options: [
                { value: "ALL", label: `All Intakes (${kpis.total})` },
                { value: "TRIAGE", label: `Active Triage (${kpis.activeTriage})` },
                { value: "NEW_REQUEST", label: `New Requests (${kpis.newRequests})` },
                { value: "AWAITING_INFORMATION", label: `Awaiting Info (${kpis.awaitingInfo})` },
                { value: "UNDER_EVALUATION", label: `Under Evaluation (${kpis.underEvaluation})` },
              ],
            },
          ]}
          onFilterChange={(key, value) => {
            if (key === "status") {
              setSelectedStatus(value);
              setCurrentPage(1);
            }
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
                  <th className="w-[200px] whitespace-nowrap">Lead Researcher</th>
                  <th className="w-[140px] whitespace-nowrap">Target Deadline</th>
                  <th className="w-[130px] whitespace-nowrap">Status</th>
                  <th className="w-[120px] text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <LoadingState variant="table" label="Loading intake queue..." />
                    </td>
                  </tr>
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <EmptyState
                        icon={IconInbox}
                        title="No Intakes Found"
                        description="No research project records match the active filter criteria."
                      />
                    </td>
                  </tr>
                ) : (
                  paginatedProjects.map((p) => {
                    const isForQa = p.masterStatus === "FOR_QA";
                    const isNewRequest = p.masterStatus === "NEW_REQUEST";
                    const isRevision = p.masterStatus === "QA_REVISION" || p.masterStatus === "REVISION_REQUESTED";

                    return (
                      <tr
                        key={p.id}
                        className={`group transition-colors ${
                          isForQa
                            ? "bg-[#10B981]/[0.04] hover:bg-[#10B981]/[0.08] border-l-2 border-l-[#10B981]"
                            : isNewRequest
                            ? "bg-[#CC6600]/[0.04] hover:bg-[#CC6600]/[0.08] border-l-2 border-l-[#CC6600]"
                            : isRevision
                            ? "bg-[#F59E0B]/[0.04] hover:bg-[#F59E0B]/[0.08] border-l-2 border-l-[#F59E0B]"
                            : "hover:bg-white/[0.02]"
                        }`}
                      >
                        {/* Research Study & Intake */}
                        <td className="max-w-[440px] min-w-0">
                          <div className="flex flex-col gap-1 min-w-0 pr-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleCopyId(p.intakeId)}
                                title="Click to copy Intake ID"
                                className="text-xs font-mono font-bold text-[#FF9433] bg-[#CC6600]/15 hover:bg-[#CC6600]/25 border border-[#CC6600]/30 hover:border-[#CC6600] px-2 py-0.5 rounded-[2px] whitespace-nowrap cursor-pointer transition-all inline-flex items-center gap-1 group/btn"
                              >
                                <span>{p.intakeId}</span>
                                <IconCopy size={11} stroke={1.5} className="opacity-40 group-hover/btn:opacity-100 transition-opacity" />
                              </button>
                              {p.files.length > 0 && (
                                <span className="text-[0.6875rem] font-mono text-sky-300 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded-[2px] whitespace-nowrap">
                                  {p.files.length} doc{p.files.length === 1 ? "" : "s"}
                                </span>
                              )}
                              <span className="text-[0.6875rem] font-mono text-white/40 whitespace-nowrap">
                                Submitted {new Date(p.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })} · {new Date(p.createdAt).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </span>
                            </div>
                            <Link
                              href={`/dashboard/admin/projects/${p.id}`}
                              className="text-xs font-semibold text-white group-hover:text-sky-300 transition-colors line-clamp-2 leading-snug"
                              title={p.researchTitle}
                            >
                              {p.researchTitle}
                            </Link>
                            {p.missingInfoReason && p.masterStatus === "AWAITING_INFORMATION" && (
                              <span
                                className="text-[0.6875rem] text-amber-300/80 font-mono truncate italic block min-w-0"
                                title={`Pending info: ${p.missingInfoReason}`}
                              >
                                Pending info: {p.missingInfoReason}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Lead Researcher */}
                        <td>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="font-semibold text-white group-hover:text-[#CC6600] transition-colors whitespace-nowrap truncate text-[0.8125rem]">
                              {p.client.fullName}
                            </span>
                            <span className="text-[0.6875rem] text-white/40 font-mono truncate">
                              {p.client.clientProfile?.institutionSchool ||
                                p.client.email}
                            </span>
                            {p.client.clientProfile?.contactNumber && (
                              <span className="text-[0.6875rem] text-white/30 font-mono">
                                {p.client.clientProfile.contactNumber}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Target Deadline */}
                        <td>
                          <div className="flex flex-col gap-0.5 whitespace-nowrap font-mono text-xs">
                            {p.deadlineRequested ? (
                              <>
                                <span className="text-white font-medium">
                                  {new Date(p.deadlineRequested).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                                <span className="text-[0.6875rem] text-white/40">
                                  Target Delivery
                                </span>
                              </>
                            ) : (
                              <span className="text-white/30 italic font-sans text-xs">
                                Open Timeline
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td>
                          <div className="flex flex-col gap-1 items-start whitespace-nowrap">
                            {(() => {
                              const displayStatus = getProjectDisplayStatus(p);
                              return (
                                <StatusBadge
                                  status={displayStatus.status}
                                  label={
                                    p.masterStatus === "FOR_QA"
                                      ? "FOR QA • READY"
                                      : displayStatus.label
                                  }
                                  pulse={displayStatus.pulse}
                                />
                              );
                            })()}
                            {(p as unknown as { serviceType?: string }).serviceType && (
                              <span className="text-[0.6875rem] text-white/40 font-mono">
                                {(p as unknown as { serviceType?: string }).serviceType!.replace(/_/g, " ")}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {p.masterStatus === "CLIENT_APPROVED" ? (
                              <Link href={`/dashboard/admin/projects/${p.id}/sow`}>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="font-sans text-xs font-semibold py-1 px-2.5 rounded-[2px] bg-[#CC6600] text-white hover:bg-[#E67300] flex items-center gap-1"
                                >
                                  <IconFileCertificate size={13} stroke={2} />
                                  <span>Draft SOW →</span>
                                </Button>
                              </Link>
                            ) : (
                              <Link href={`/dashboard/admin/projects/${p.id}`}>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="font-sans text-xs font-semibold py-1 px-2.5 rounded-[2px]"
                                >
                                  <span>Inspect</span>
                                </Button>
                              </Link>
                            )}

                            <DropdownMenu
                              trigger={
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 p-0 rounded-[2px] border-white/10"
                                >
                                  ···
                                </Button>
                              }
                              items={[
                                ...(p.masterStatus === "CLIENT_APPROVED"
                                  ? [
                                      {
                                        label: "Draft Statement of Work",
                                        subtitle: "Compile SOW and issue to client",
                                        icon: <IconFileCertificate size={16} stroke={1.5} />,
                                        onClick: () => {
                                          window.location.href = `/dashboard/admin/projects/${p.id}/sow`;
                                        },
                                      },
                                    ]
                                  : []),
                                {
                                  label: "Open Inspection Desk",
                                  subtitle: "Full study workspace and data files",
                                  icon: <IconExternalLink size={16} stroke={1.5} />,
                                  onClick: () => {
                                    window.location.href = `/dashboard/admin/projects/${p.id}`;
                                  },
                                },
                                {
                                  label: "Prepare Commercial Proposal",
                                  subtitle: "Launch proposal builder",
                                  variant: "default" as const,
                                  icon: <IconCalculator size={16} stroke={1.5} />,
                                  onClick: () => {
                                    setSelectedStudyForQuote(p);
                                    setIsQuoteModalOpen(true);
                                  },
                                },
                                {
                                  label: "Request Missing Artifacts",
                                  subtitle: "Prompt client for clarifications",
                                  variant: "warning" as const,
                                  icon: <IconHelpCircle size={16} stroke={1.5} />,
                                  onClick: () => {
                                    setSelectedForMissingInfo(p);
                                    setMissingInfoReasonText(
                                      p.missingInfoReason || ""
                                    );
                                  },
                                },
                                ...(p.masterStatus === "NEW_REQUEST"
                                  ? [
                                      {
                                        label: "Approve & Mark Complete",
                                        subtitle: "Transition to UNDER_EVALUATION",
                                        variant: "success" as const,
                                        icon: <IconCheck size={16} stroke={2} />,
                                        onClick: () =>
                                          handleMarkComplete(p.id, p.intakeId),
                                      },
                                    ]
                                  : []),
                                {
                                  label: "Copy Intake ID",
                                  subtitle: p.intakeId,
                                  dividerBefore: true,
                                  icon: <IconCopy size={16} stroke={1.5} />,
                                  onClick: () => handleCopyId(p.intakeId),
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

        {filteredProjects.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredProjects.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="intakes"
          />
        )}
      </Card>

      {/* ── 1. Quick Study Overview Modal ── */}
      {selectedStudyForInspect && (
        <Modal
          open={Boolean(selectedStudyForInspect)}
          onClose={() => setSelectedStudyForInspect(null)}
          title={`Intake Evaluation: ${selectedStudyForInspect.intakeId}`}
          description={selectedStudyForInspect.researchTitle}
          size="xl"
          footer={
            <div className="flex items-center justify-between w-full flex-wrap gap-2">
              <span className="text-xs font-mono text-white/50">
                Submitted on {new Date(selectedStudyForInspect.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })} at {new Date(selectedStudyForInspect.createdAt).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedStudyForInspect(null)}
                >
                  CLOSE
                </Button>
                <Link
                  href={`/dashboard/admin/projects/${selectedStudyForInspect.id}`}
                >
                  <Button variant="primary">
                    OPEN FULL PROJECT DESK →
                  </Button>
                </Link>
              </div>
            </div>
          }
        >
          <div className="flex flex-col gap-6 font-sans">
            {/* Researcher & Institution Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 sm:px-7 rounded-[3px] bg-[#011B38] border border-white/10">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[0.6875rem] text-white/40 uppercase tracking-wider">
                  Lead Researcher
                </span>
                <p className="text-sm font-semibold text-white">
                  {selectedStudyForInspect.client.fullName}
                </p>
                <p className="text-xs text-white/50">
                  {selectedStudyForInspect.client.email}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[0.6875rem] text-white/40 uppercase tracking-wider">
                  Academic Institution & Program
                </span>
                <p className="text-sm font-semibold text-white">
                  {selectedStudyForInspect.client.clientProfile?.institutionSchool ||
                    "Institution Not Specified"}
                </p>
                <p className="text-xs text-white/50">
                  {selectedStudyForInspect.client.clientProfile?.academicProgram ||
                    "Graduate / Faculty Research"}
                </p>
              </div>
            </div>

            {/* Research Scope & Objectives */}
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[0.6875rem] text-white/40 uppercase tracking-wider">
                Core Research Objectives
              </span>
              <p
                className="text-xs text-slate-300 bg-white/[0.02] p-4 rounded-[3px] border border-white/10 leading-relaxed whitespace-pre-wrap"
                style={{ padding: "1rem" }}
              >
                {selectedStudyForInspect.researchObjectives}
              </p>
            </div>

            {/* Research Questions */}
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[0.6875rem] text-white/40 uppercase tracking-wider">
                Key Research Questions
              </span>
              <p
                className="text-xs text-slate-300 bg-white/[0.02] p-4 rounded-[3px] border border-white/10 leading-relaxed whitespace-pre-wrap"
                style={{ padding: "1rem" }}
              >
                {selectedStudyForInspect.researchQuestions}
              </p>
            </div>

            {/* Uploaded Artifacts & Files */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[0.6875rem] text-white/40 uppercase tracking-wider">
                  Submitted Artifacts ({selectedStudyForInspect.files.length})
                </span>
                <span className="font-mono text-[0.625rem] text-emerald-400/80 uppercase flex items-center gap-1">
                  <IconShieldCheck size={12} stroke={2} />
                  Cloud Encrypted
                </span>
              </div>
              {selectedStudyForInspect.files.length === 0 ? (
                <div
                  className="text-xs text-white/40 italic p-4 bg-white/[0.02] border border-white/10 rounded-[3px]"
                  style={{ padding: "1rem" }}
                >
                  No files or dataset packages attached to this intake record.
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-1">
                  {selectedStudyForInspect.files.map((file) => {
                    const meta = getFileMeta(file.fileName, file.fileType);
                    const category = formatFileCategory(file.fileCategory);
                    return (
                      <div
                        key={file.id}
                        className="rounded-[2px] bg-[#011C38] border border-white/[0.08] hover:border-white/20 px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between gap-4 transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`h-9 w-9 rounded-[2px] ${meta.theme.bg} ${meta.theme.border} border flex flex-col items-center justify-center flex-shrink-0`}
                          >
                            <span className={`text-[0.625rem] font-mono font-bold uppercase ${meta.theme.text}`}>
                              {meta.ext}
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-xs md:max-w-sm">
                                {file.fileName}
                              </span>
                              <span
                                className={`text-[0.5625rem] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-[2px] border ${category.badgeClass}`}
                              >
                                {category.label}
                              </span>
                            </div>
                            <span className="text-[0.688rem] text-white/40 font-mono">
                              {meta.friendlyType} · {new Date(file.uploadedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            triggerFileDownload(file.filePath, file.fileName);
                            setToastMessage({
                              message: "Download Initiated",
                              description: `Transferring "${file.fileName}" to your local device.`,
                              variant: "info",
                            });
                          }}
                          className="px-5 py-2 rounded-[2px] bg-[#CC6600]/20 hover:bg-[#CC6600]/35 text-white border border-[#CC6600]/80 hover:border-[#CC6600] text-xs font-mono font-bold tracking-wider uppercase transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
                        >
                          <IconDownload size={14} stroke={1.5} className="text-[#FFA040]" />
                          <span>DOWNLOAD</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── 2. Request Missing Information Modal ── */}
      {selectedForMissingInfo && (
        <Modal
          open={Boolean(selectedForMissingInfo)}
          onClose={() => setSelectedForMissingInfo(null)}
          title={`Request Missing Artifacts: ${selectedForMissingInfo.intakeId}`}
          description={selectedForMissingInfo.researchTitle}
          size="lg"
        >
          <div className="flex flex-col gap-6 font-sans">
            <div className="p-5 sm:px-7 rounded-[3px] bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 leading-relaxed">
              <strong>GOVERNANCE NOTICE:</strong> Specify the missing raw dataset files, validated survey instrument, or statistical scope clarification required from{" "}
              <strong className="text-white">
                {selectedForMissingInfo.client.fullName}
              </strong>
              . Submitting this request will automatically transition the intake to{" "}
              <code className="text-amber-300 font-mono font-bold">
                AWAITING_INFORMATION
              </code>{" "}
              and notify the client.
            </div>

            {/* Template Selector Dropdown */}
            <div className="flex flex-col gap-1.5">
              <FormSelect
                label="Pre-Configured Request Template (Optional)"
                monoLabel
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                options={[
                  { value: "", label: "-- Select a Standard Request Template (Auto-fills note) --" },
                  ...MISSING_INFO_TEMPLATES.map((t) => ({
                    value: t.id,
                    label: `[${t.category.toUpperCase()}] ${t.label}`,
                  })),
                ]}
              />
            </div>

            <FormTextarea
              label="Mandatory Information Request / Missing Items Note"
              required
              rows={4}
              placeholder="e.g. Please attach the raw SPSS / Excel survey responses with column codebook and confirm whether demographic covariates are required in Chapter 4."
              value={missingInfoReasonText}
              onChange={(e) => {
                setMissingInfoReasonText(e.target.value);
                if (selectedTemplateId) setSelectedTemplateId("");
              }}
              error={missingInfoError || undefined}
              monoLabel
            />

            <ModalFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSelectedForMissingInfo(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleRequestMissingInfoSubmit}
                loading={isPending}
                disabled={missingInfoReasonText.trim().length < 5}
              >
                SEND REQUEST TO CLIENT →
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      )}

      {/* Commercial Quotation Builder Modal */}
      {selectedStudyForQuote && (
        <QuotationBuilderModal
          isOpen={isQuoteModalOpen}
          onClose={() => {
            setIsQuoteModalOpen(false);
            setSelectedStudyForQuote(null);
          }}
          projectId={selectedStudyForQuote.id}
          projectIntakeId={selectedStudyForQuote.intakeId}
          projectTitle={selectedStudyForQuote.researchTitle}
          clientName={selectedStudyForQuote.client.fullName}
          customCatalog={catalog}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

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
