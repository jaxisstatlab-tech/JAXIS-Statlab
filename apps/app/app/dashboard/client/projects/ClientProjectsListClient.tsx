"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  StatusBadge,
  Button,
  KpiCard,
  FilterToolbar,
  Modal,
  Toast,
  LoadingState,
  EmptyState,
  Pagination,
} from "@repo/ui";
import { IconDownload, IconCopy, IconFolderOff, IconFileSearch, IconPlus, IconArrowRight } from "@tabler/icons-react";
import { getProjects } from "@/features/projects/actions";
import { getClientProfile } from "@/features/client-profile/actions";
import { QuickProfileModal } from "@/features/client-profile/components/QuickProfileModal";
import { getProjectDisplayStatus } from "@/lib/project-rules";
import {
  getFileMeta,
  formatFileCategory,
  triggerFileDownload,
} from "@/lib/file-utils";
import type { ProjectDetailItem } from "@/features/projects/schemas";

export interface ClientProjectsListClientProps {
  initialProjects: ProjectDetailItem[];
  initialProfileComplete: boolean;
}

export function ClientProjectsListClient({
  initialProjects,
  initialProfileComplete,
}: ClientProjectsListClientProps) {
  const [projects, setProjects] = useState<ProjectDetailItem[]>(initialProjects);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedStudyForInspect, setSelectedStudyForInspect] = useState<ProjectDetailItem | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(initialProfileComplete);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "danger";
  } | null>(null);

  const isInitialMount = React.useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    async function loadData() {
      setIsLoading(true);
      try {
        const [res, profile] = await Promise.all([
          getProjects({
            status: statusFilter,
            search: searchQuery,
          }),
          getClientProfile(),
        ]);
        if (res.success) {
          setProjects(res.data);
        }
        if (profile && profile.institutionSchool && profile.contactNumber) {
          setIsProfileComplete(true);
        } else {
          setIsProfileComplete(false);
        }
      } catch (err) {
        console.error("Failed to load client projects", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [statusFilter, searchQuery]);

  // Compute live KPIs
  const kpis = useMemo(() => {
    const total = projects.length;
    const awaitingInfo = projects.filter((p) => p.masterStatus === "AWAITING_INFORMATION").length;
    const underEvaluation = projects.filter(
      (p) => p.masterStatus === "UNDER_EVALUATION" || p.masterStatus === "NEW_REQUEST"
    ).length;
    const active = projects.filter(
      (p) =>
        p.masterStatus === "ACTIVE" ||
        p.masterStatus === "IN_PROGRESS" ||
        p.masterStatus === "EXPERT_ASSIGNED" ||
        p.masterStatus === "FOR_QA" ||
        p.masterStatus === "QA_REVISION"
    ).length;
    const delivered = projects.filter(
      (p) => p.masterStatus === "DELIVERED" || p.masterStatus === "CLOSED"
    ).length;

    return { total, awaitingInfo, underEvaluation, active, delivered };
  }, [projects]);

  // Filter projects in client memory if needed
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter === "ALL") return true;
      if (statusFilter === "AWAITING_INFORMATION") return p.masterStatus === "AWAITING_INFORMATION";
      if (statusFilter === "UNDER_EVALUATION") {
        return p.masterStatus === "UNDER_EVALUATION" || p.masterStatus === "NEW_REQUEST";
      }
      if (statusFilter === "ACTIVE") {
        return (
          p.masterStatus === "ACTIVE" ||
          p.masterStatus === "IN_PROGRESS" ||
          p.masterStatus === "EXPERT_ASSIGNED" ||
          p.masterStatus === "FOR_QA"
        );
      }
      if (statusFilter === "DELIVERED") {
        return p.masterStatus === "DELIVERED" || p.masterStatus === "CLOSED";
      }
      return p.masterStatus === statusFilter;
    });
  }, [projects, statusFilter]);

  // Prioritize studies requiring client action (Go Signal) to the top
  const sortedFilteredProjects = useMemo(() => {
    const clientActionPriority = [
      "QUOTE_SENT",
      "SOW_PENDING",
      "AWAITING_PAYMENT",
      "DELIVERED",
      "AWAITING_INFORMATION",
    ];

    return [...filteredProjects].sort((a, b) => {
      const aIsAction = clientActionPriority.includes(a.masterStatus);
      const bIsAction = clientActionPriority.includes(b.masterStatus);
      if (aIsAction && !bIsAction) return -1;
      if (!aIsAction && bIsAction) return 1;
      return 0;
    });
  }, [filteredProjects]);

  const paginatedProjects = useMemo(() => {
    return sortedFilteredProjects.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [sortedFilteredProjects, currentPage, pageSize]);

  const awaitingInfoList = useMemo(() => {
    return projects.filter((p) => p.masterStatus === "AWAITING_INFORMATION");
  }, [projects]);

  const handleCopyId = (e: React.MouseEvent, intakeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(intakeId);
    setToastMessage({
      message: "Copied to Clipboard",
      description: `Study ID "${intakeId}" has been copied to your clipboard.`,
      variant: "info",
    });
  };

  const handleProfileSuccess = async () => {
    const profile = await getClientProfile();
    if (profile && profile.institutionSchool && profile.contactNumber) {
      setIsProfileComplete(true);
    }
    setToastMessage({
      message: "School Profile Saved",
      description: "Your academic and contact details have been saved. Intake desk unlocked.",
      variant: "success",
    });
  };

  if (isLoading && projects.length === 0) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto font-sans">
        <LoadingState
          variant="page"
          label="Loading Research Studies..."
          description="Retrieving your research projects and consultation status."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-20 w-full animate-content-fade">
      <PageHeader
        title="My Research Projects & Active Studies"
        description="Track your research studies, review methodology updates, and download defense-ready statistical packages."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Client Portal", href: "/dashboard/client" },
          { label: "Projects" },
        ]}
        actions={
          isProfileComplete === null ? (
            <Button
              variant="primary"
              size="sm"
              disabled
              className="opacity-50 cursor-wait pointer-events-none"
            >
              <LoadingState variant="inline" label="Loading..." />
            </Button>
          ) : isProfileComplete === false ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsProfileModalOpen(true)}
              className="animate-content-fade"
            >
              <span>Setup Profile First</span>
              <IconArrowRight size={14} stroke={2} />
            </Button>
          ) : (
            <Link href="/dashboard/client/projects/new" className="animate-content-fade">
              <Button variant="primary" size="sm">
                <IconPlus size={15} stroke={2} />
                <span>New Project Intake</span>
              </Button>
            </Link>
          )
        }
      />

      {/* ── Top KPI Metrics Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <KpiCard
          label="Total Studies"
          value={kpis.total}
          variant="default"
          description="All client submitted research scopes"
        />

        <KpiCard
          label="Action Required"
          value={kpis.awaitingInfo}
          variant={kpis.awaitingInfo > 0 ? "orange" : "default"}
          badge={kpis.awaitingInfo > 0 ? "CLIENT ACTION" : undefined}
          badgeColor={kpis.awaitingInfo > 0 ? "orange" : "gray"}
          description={
            kpis.awaitingInfo > 0
              ? "Clarification or dataset needed"
              : "No pending information requests"
          }
        />

        <KpiCard
          label="Under Evaluation"
          value={kpis.underEvaluation}
          variant="default"
          description="Methodology & pricing assessment"
        />

        <KpiCard
          label="Active & QA"
          value={kpis.active + kpis.delivered}
          variant="default"
          description={`${kpis.active} running · ${kpis.delivered} delivered`}
        />
      </div>

      {/* ── High-Priority Missing Information Alert Banner ── */}
      {awaitingInfoList.length > 0 && (
        <div className="flex flex-col gap-3">
          {awaitingInfoList.map((p) => (
            <Card
              key={p.id}
              className="p-5 border border-amber-500/30 bg-amber-500/[0.06] shadow-xl flex flex-col gap-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                    Action Required: Additional Files or Information Needed
                  </span>
                  <span className="text-xs font-mono font-bold text-white bg-amber-500/20 px-2 py-0.5 rounded-[2px]">
                    {p.intakeId}
                  </span>
                </div>
                <Link href={`/dashboard/client/projects/${p.id}`}>
                  <Button
                    variant="primary"
                    size="sm"
                    className="py-1.5 px-3.5 h-auto font-sans text-xs font-semibold tracking-wide active:scale-[0.97] transition-transform min-h-[36px]"
                  >
                    View &amp; Upload Files →
                  </Button>
                </Link>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-white font-sans">
                  {p.researchTitle}
                </p>
                <div
                  className="p-3.5 rounded-[2px] bg-black/40 border border-amber-500/30 text-xs text-amber-100 font-sans leading-relaxed mt-1"
                  style={{ padding: "0.875rem 1rem" }}
                >
                  <strong className="text-amber-300 font-mono text-[0.6875rem] uppercase block mb-1">
                    Note from Statistical Team:
                  </strong>
                  &ldquo;{p.missingInfoReason || "Please attach the requested dataset or questionnaire clarification."}&rdquo;
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Main Projects List & Filter Table ── */}
      <Card className="p-0 border border-white/10 overflow-hidden bg-[#01142B]/90 shadow-2xl -mx-4 sm:mx-0">
        {/* Filter Toolbar */}
        <FilterToolbar
          searchQuery={searchQuery}
          onSearchChange={(q) => { setSearchQuery(q); setCurrentPage(1); }}
          searchPlaceholder="Search study title, JAXIS ID, or objectives..."
          filters={[
            {
              key: "status",
              label: "STATUS",
              value: statusFilter,
              defaultValue: "ALL",
              options: [
                { value: "ALL", label: `All Studies (${kpis.total})` },
                { value: "AWAITING_INFORMATION", label: `Awaiting Info (${kpis.awaitingInfo})` },
                { value: "UNDER_EVALUATION", label: `Under Evaluation (${kpis.underEvaluation})` },
                { value: "ACTIVE", label: `Active & In Progress (${kpis.active})` },
                { value: "DELIVERED", label: `Delivered (${kpis.delivered})` },
              ],
            },
          ]}
          onFilterChange={(key, value) => {
            if (key === "status") {
              setStatusFilter(value);
              setCurrentPage(1);
            }
          }}
          onClear={() => {
            setStatusFilter("ALL");
            setSearchQuery("");
            setCurrentPage(1);
          }}
        />

        {/* ── Table Container ── */}
        <div className="p-4 sm:p-6">
          <div className="w-full overflow-x-auto rounded-[3px] border border-white/[0.08]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Research Study &amp; Intake</th>
                  <th className="w-[140px] whitespace-nowrap">Target Deadline</th>
                  <th className="w-[140px] whitespace-nowrap">Status</th>
                  <th className="w-[140px] text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center">
                      <LoadingState variant="table" label="Loading research studies..." />
                    </td>
                  </tr>
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center">
                      <EmptyState
                        icon={searchQuery || statusFilter !== "ALL" ? IconFileSearch : IconFolderOff}
                        title="No Research Studies Found"
                        description={
                          searchQuery || statusFilter !== "ALL"
                            ? "No studies match your current filter criteria."
                            : "You have not submitted any research project intake requests yet."
                        }
                        action={
                          !searchQuery && statusFilter === "ALL" ? (
                            <Link href="/dashboard/client/projects/new">
                              <Button variant="primary" size="sm" className="font-sans text-xs font-semibold px-4 py-2 bg-[#CC6600] hover:bg-[#E67300] active:scale-[0.97] transition-transform">
                                + Submit Study Request →
                              </Button>
                            </Link>
                          ) : undefined
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  paginatedProjects.map((p) => {
                    const isAwaiting = p.masterStatus === "AWAITING_INFORMATION";

                    return (
                      <tr
                        key={p.id}
                        className={`group transition-colors ${
                          isAwaiting ? "bg-amber-500/[0.03] hover:bg-amber-500/[0.06]" : ""
                        }`}
                      >
                        {/* 1. Research Study & Intake */}
                        <td className="max-w-[440px] min-w-0">
                          <div className="flex flex-col gap-1.5 py-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={(e) => handleCopyId(e, p.intakeId)}
                                title="Click to copy Study ID"
                                className="font-mono text-xs font-bold text-[#FF9433] bg-[#CC6600]/15 hover:bg-[#CC6600]/25 border border-[#CC6600]/30 hover:border-[#CC6600] px-2 py-0.5 rounded-[2px] whitespace-nowrap cursor-pointer transition-all inline-flex items-center gap-1 group/btn"
                              >
                                <span>{p.intakeId}</span>
                                <IconCopy size={11} stroke={1.5} className="opacity-40 group-hover/btn:opacity-100 transition-opacity" />
                              </button>
                              <span className="font-mono text-[0.65rem] text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-[2px] whitespace-nowrap">
                                {p.files.length} {p.files.length === 1 ? "doc" : "docs"}
                              </span>
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
                              href={`/dashboard/client/projects/${p.id}`}
                              className="text-xs font-semibold text-white group-hover:text-[#FF9433] transition-colors leading-snug line-clamp-2"
                              title={p.researchTitle}
                            >
                              {p.researchTitle}
                            </Link>

                            {/* Missing Info Request Highlight */}
                            {isAwaiting && p.missingInfoReason && (
                              <div
                                className="flex items-center gap-1.5 text-[0.6875rem] font-mono text-amber-300 mt-0.5 min-w-0 max-w-full"
                                title={`Action Required: ${p.missingInfoReason}`}
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                                <span className="truncate italic block min-w-0">
                                  Action Required: {p.missingInfoReason}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 2. Target Deadline */}
                        <td className="whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-xs font-bold text-amber-400">
                              {new Date(p.deadlineRequested).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                            <span className="font-mono text-[0.65rem] text-white/40">
                              Requested SLA
                            </span>
                          </div>
                        </td>

                        {/* 3. Status */}
                        <td className="whitespace-nowrap">
                          {(() => {
                            const displayStatus = getProjectDisplayStatus(p);
                            return (
                              <StatusBadge
                                status={displayStatus.status}
                                label={displayStatus.label}
                                pulse={displayStatus.pulse}
                              />
                            );
                          })()}
                        </td>

                        {/* 4. Actions */}
                        <td className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedStudyForInspect(p)}
                              className="font-sans text-xs font-semibold px-3 py-1.5 active:scale-[0.97] transition-transform min-h-[36px]"
                            >
                              Details
                            </Button>
                            <Link href={`/dashboard/client/projects/${p.id}`}>
                              <Button
                                variant={isAwaiting ? "primary" : "secondary"}
                                size="sm"
                                className="font-sans text-xs font-semibold px-3 py-1.5 active:scale-[0.97] transition-transform min-h-[36px]"
                              >
                                {isAwaiting ? "Resolve →" : "Open Desk →"}
                              </Button>
                            </Link>
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
            itemLabel="studies"
          />
        )}
      </Card>

      {/* ── Quick View Modal ── */}
      {selectedStudyForInspect && (
        <Modal
          open={!!selectedStudyForInspect}
          onClose={() => setSelectedStudyForInspect(null)}
          title={`Study Details: ${selectedStudyForInspect.intakeId}`}
          description={selectedStudyForInspect.researchTitle}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedStudyForInspect(null)}
                className="font-sans text-xs font-semibold px-4 py-2 active:scale-[0.97] transition-transform"
              >
                Close
              </Button>
              <Link href={`/dashboard/client/projects/${selectedStudyForInspect.id}`}>
                <Button
                  variant="primary"
                  size="sm"
                  className="font-sans text-xs font-semibold px-4 py-2 bg-[#CC6600] hover:bg-[#E67300] active:scale-[0.97] transition-transform"
                >
                  Open Project Desk →
                </Button>
              </Link>
            </div>
          }
        >
          <div className="flex flex-col gap-5 text-xs font-sans text-white/90">
            {/* Status & Deadline Header Banner */}
            <div className="p-4 rounded-[2px] bg-[#011C38] border border-white/[0.08] flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-white/50 uppercase">Current Gate:</span>
                {(() => {
                  const displayStatus = getProjectDisplayStatus(selectedStudyForInspect);
                  return (
                    <StatusBadge
                      status={displayStatus.status}
                      label={displayStatus.label}
                      pulse={displayStatus.pulse}
                    />
                  );
                })()}
              </div>
              <div className="font-mono text-xs text-white/60">
                Target Deadline:{" "}
                <strong className="text-amber-400">
                  {new Date(selectedStudyForInspect.deadlineRequested).toLocaleDateString()}
                </strong>
              </div>
            </div>

            {/* Missing Information Note if applicable */}
            {selectedStudyForInspect.masterStatus === "AWAITING_INFORMATION" &&
              selectedStudyForInspect.missingInfoReason && (
                <div className="p-4 rounded-[2px] bg-amber-500/10 border border-amber-500/30 flex flex-col gap-1 text-amber-200">
                  <strong className="font-mono text-amber-400 text-[0.6875rem] uppercase">
                    Admin Missing Information Request:
                  </strong>
                  <p className="text-xs leading-relaxed">
                    &ldquo;{selectedStudyForInspect.missingInfoReason}&rdquo;
                  </p>
                </div>
              )}

            {/* Research Problem & Objectives */}
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[0.6875rem] text-white/40 uppercase tracking-wider">
                Core Research Objectives
              </span>
              <p className="p-4 text-xs text-slate-300 bg-white/[0.02] rounded-[3px] border border-white/10 leading-relaxed whitespace-pre-wrap">
                {selectedStudyForInspect.researchObjectives}
              </p>
            </div>

            {/* Research Questions */}
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[0.6875rem] text-white/40 uppercase tracking-wider">
                Key Research Questions
              </span>
              <p className="p-4 text-xs text-slate-300 bg-white/[0.02] rounded-[3px] border border-white/10 leading-relaxed whitespace-pre-wrap">
                {selectedStudyForInspect.researchQuestions}
              </p>
            </div>

            {/* Theoretical Hypotheses */}
            {selectedStudyForInspect.hypotheses && (
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[0.6875rem] text-white/40 uppercase tracking-wider">
                  Theoretical Hypotheses
                </span>
                <p className="p-4 text-xs text-slate-300 bg-white/[0.02] rounded-[3px] border border-white/10 leading-relaxed whitespace-pre-wrap">
                  {selectedStudyForInspect.hypotheses}
                </p>
              </div>
            )}

            {/* Uploaded Artifacts */}
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[0.6875rem] text-white/40 uppercase tracking-wider">
                Submitted Artifacts ({selectedStudyForInspect.files.length})
              </span>
              {selectedStudyForInspect.files.length === 0 ? (
                <div className="p-4 text-xs text-white/40 italic bg-white/[0.02] border border-white/10 rounded-[3px]">
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
                          className="px-4 py-2 rounded-[2px] bg-[#CC6600]/20 hover:bg-[#CC6600]/35 text-white border border-[#CC6600]/60 hover:border-[#CC6600] text-xs font-sans font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer active:scale-[0.97] min-h-[36px]"
                        >
                          <IconDownload size={14} stroke={1.5} className="text-[#FFA040]" aria-hidden="true" />
                          <span>Download</span>
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

      {/* ── Quick Profile Setup Modal ── */}
      <QuickProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSuccess={handleProfileSuccess}
      />

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
