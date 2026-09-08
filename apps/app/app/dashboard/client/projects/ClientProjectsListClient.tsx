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
  CopyButton,
} from "@repo/ui";
import {
  DownloadSimple,
  FolderDashed,
  MagnifyingGlass,
  Plus,
  ArrowRight,
  Eye,
  Clock,
  CheckCircle,
  ShieldCheck,
} from "@phosphor-icons/react";
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
    <div
      data-portal="client"
      className="flex flex-col gap-8 max-w-7xl mx-auto pb-20 w-full animate-content-fade"
    >
      <PageHeader
        title="Research Studies Desk"
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
              className="opacity-50 cursor-wait pointer-events-none rounded-[2px]"
            >
              <LoadingState variant="inline" label="Loading..." />
            </Button>
          ) : isProfileComplete === false ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsProfileModalOpen(true)}
              className="animate-content-fade rounded-[2px]"
            >
              <span>Setup Profile First</span>
              <ArrowRight size={14} weight="bold" />
            </Button>
          ) : (
            <Link href="/dashboard/client/projects/new" className="animate-content-fade">
              <Button variant="primary" size="sm" className="bg-[#CC6600] hover:bg-[#B35500] text-white rounded-[2px]">
                <Plus size={15} weight="bold" />
                <span>New Project Intake</span>
              </Button>
            </Link>
          )
        }
      />

      {/* ── Top KPI Metrics Grid (Dashdark X Precision Standard) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 items-stretch">
        <KpiCard
          label="Total Studies"
          value={kpis.total}
          variant="default"
          badge="ALL TIME"
          badgeColor="gray"
          description="All client submitted research scopes"
          icon={<Eye size={16} weight="fill" className="text-white/60" />}
          className="animate-card-reveal stagger-1"
        />

        <KpiCard
          label="Action Required"
          value={kpis.awaitingInfo}
          variant={kpis.awaitingInfo > 0 ? "orange" : "default"}
          badge={kpis.awaitingInfo > 0 ? "ACTION NEEDED" : undefined}
          badgeColor={kpis.awaitingInfo > 0 ? "orange" : "gray"}
          description={
            kpis.awaitingInfo > 0
              ? "Clarification or dataset needed"
              : "No pending information requests"
          }
          icon={
            <Clock
              size={16}
              weight="fill"
              className={kpis.awaitingInfo > 0 ? "text-[#FFA040]" : "text-white/60"}
            />
          }
          className="animate-card-reveal stagger-2"
        />

        <KpiCard
          label="Under Evaluation"
          value={kpis.underEvaluation}
          variant="default"
          badge="UNDER REVIEW"
          badgeColor="sky"
          description="Methodology & pricing assessment"
          icon={<ShieldCheck size={16} weight="fill" className="text-sky-400" />}
          className="animate-card-reveal stagger-3"
        />

        <KpiCard
          label="Active & QA"
          value={kpis.active + kpis.delivered}
          variant="default"
          badge="ACTIVE"
          badgeColor="emerald"
          description={`${kpis.active} running · ${kpis.delivered} delivered`}
          icon={<CheckCircle size={16} weight="fill" className="text-emerald-400" />}
          className="animate-card-reveal stagger-4"
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
      <Card className="p-0 border border-white/10 overflow-hidden bg-[#01142B]/90 shadow-2xl -mx-4 sm:mx-0 animate-card-reveal stagger-5">
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

        {/* ── Table Container (Dashdark X Precision Standard) ── */}
        <div className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#010D1F] border-b border-white/10">
                <tr>
                  <th className="py-3.5 px-4 text-xs font-mono text-white/50 uppercase tracking-wider font-semibold w-[140px] whitespace-nowrap">
                    Study ID
                  </th>
                  <th className="py-3.5 px-4 text-xs font-mono text-white/50 uppercase tracking-wider font-semibold">
                    Research Study
                  </th>
                  <th className="py-3.5 px-4 text-xs font-mono text-white/50 uppercase tracking-wider font-semibold w-[150px] whitespace-nowrap">
                    Target Date
                  </th>
                  <th className="py-3.5 px-4 text-xs font-mono text-white/50 uppercase tracking-wider font-semibold w-[160px] whitespace-nowrap">
                    Status
                  </th>
                  <th className="py-3.5 px-4 text-xs font-mono text-white/50 uppercase tracking-wider font-semibold w-[150px] text-right whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <LoadingState variant="table" label="Loading research studies..." />
                    </td>
                  </tr>
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <EmptyState
                        icon={searchQuery || statusFilter !== "ALL" ? MagnifyingGlass : FolderDashed}
                        title="No Research Studies Found"
                        description={
                          searchQuery || statusFilter !== "ALL"
                            ? "No studies match your current filter criteria."
                            : "You have not submitted any research project intake requests yet."
                        }
                        action={
                          !searchQuery && statusFilter === "ALL" ? (
                            <Link href="/dashboard/client/projects/new">
                              <Button variant="primary" size="sm" className="font-sans text-xs font-semibold px-4 py-2 bg-[#CC6600] hover:bg-[#B35500] active:scale-[0.97] transition-transform rounded-[2px]">
                                + Submit Study Request →
                              </Button>
                            </Link>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setStatusFilter("ALL");
                                setSearchQuery("");
                                setCurrentPage(1);
                              }}
                              className="font-sans text-xs font-semibold px-4 py-2 active:scale-[0.97] transition-transform rounded-[2px]"
                            >
                              Clear Filters
                            </Button>
                          )
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
                        className={`group hover:bg-white/[0.02] transition-colors ${
                          isAwaiting ? "bg-amber-500/[0.03]" : ""
                        }`}
                      >
                        {/* 1. Study ID */}
                        <td className="py-3.5 px-4 font-mono text-xs whitespace-nowrap align-middle">
                          <CopyButton
                            variant="badge"
                            value={p.intakeId}
                            label={p.intakeId}
                            onCopy={() =>
                              setToastMessage({
                                message: "Study ID Copied",
                                description: `"${p.intakeId}" has been copied to your clipboard.`,
                                variant: "info",
                              })
                            }
                          />
                        </td>

                        {/* 2. Research Study & Intake (Two-Line Hierarchy) */}
                        <td className="py-3.5 px-4 max-w-[420px] min-w-0 align-middle">
                          <div className="flex flex-col gap-0.5 pr-2 min-w-0">
                            <Link
                              href={`/dashboard/client/projects/${p.id}`}
                              className="text-sm font-semibold text-white group-hover:text-[#FFA040] transition-colors leading-snug line-clamp-1 font-sans"
                              title={p.researchTitle}
                            >
                              {p.researchTitle}
                            </Link>
                            {isAwaiting && p.missingInfoReason ? (
                              <span
                                className="text-xs text-amber-300/90 font-sans truncate italic block min-w-0"
                                title={`Action Required: ${p.missingInfoReason}`}
                              >
                                Action Required: {p.missingInfoReason}
                              </span>
                            ) : (
                              <div className="flex items-center gap-2 text-xs text-white/40 font-sans">
                                <span>{p.client?.clientProfile?.institutionSchool || "JAXIS Statistical Research"}</span>
                                <span>·</span>
                                <span className="font-mono text-[11px]">{p.files.length} {p.files.length === 1 ? "doc" : "docs"}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 3. Target Deadline */}
                        <td className="py-3.5 px-4 whitespace-nowrap align-middle">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-sans text-white font-medium">
                              {new Date(p.deadlineRequested).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                            <span className="text-[11px] font-sans text-white/40">
                              Target Date
                            </span>
                          </div>
                        </td>

                        {/* 4. Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap align-middle">
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

                        {/* 5. Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap align-middle">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedStudyForInspect(p)}
                              className="font-sans text-xs font-semibold px-3 py-1.5 active:scale-[0.97] transition-all rounded-[2px]"
                            >
                              Details
                            </Button>
                            <Link href={`/dashboard/client/projects/${p.id}`}>
                              <Button
                                variant={isAwaiting ? "primary" : "secondary"}
                                size="sm"
                                className="font-sans text-xs font-semibold px-3.5 py-1.5 active:scale-[0.97] transition-all rounded-[2px]"
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
                  Open Study →
                </Button>
              </Link>
            </div>
          }
        >
          <div className="flex flex-col gap-5 text-xs font-sans text-white/90">
            {/* Status & Deadline Header Banner */}
            <div className="p-4 rounded-[2px] bg-[#011C38] border border-white/[0.08] flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-white/50 uppercase">Status:</span>
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
                    Information Needed:
                  </strong>
                  <p className="text-xs leading-relaxed font-sans">
                    &ldquo;{selectedStudyForInspect.missingInfoReason}&rdquo;
                  </p>
                </div>
              )}

            {/* Research Problem & Objectives */}
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[0.6875rem] text-white/40 uppercase tracking-wider">
                Core Research Objectives
              </span>
              <p className="p-4 text-xs text-slate-300 bg-white/[0.02] rounded-[2px] border border-white/10 leading-relaxed whitespace-pre-wrap font-sans">
                {selectedStudyForInspect.researchObjectives}
              </p>
            </div>

            {/* Research Questions */}
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[0.6875rem] text-white/40 uppercase tracking-wider">
                Key Research Questions
              </span>
              <p className="p-4 text-xs text-slate-300 bg-white/[0.02] rounded-[2px] border border-white/10 leading-relaxed whitespace-pre-wrap font-sans">
                {selectedStudyForInspect.researchQuestions}
              </p>
            </div>

            {/* Theoretical Hypotheses */}
            {selectedStudyForInspect.hypotheses && (
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[0.6875rem] text-white/40 uppercase tracking-wider">
                  Theoretical Hypotheses
                </span>
                <p className="p-4 text-xs text-slate-300 bg-white/[0.02] rounded-[2px] border border-white/10 leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedStudyForInspect.hypotheses}
                </p>
              </div>
            )}

            {/* Uploaded Artifacts */}
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[0.6875rem] text-white/40 uppercase tracking-wider">
                Attached Files ({selectedStudyForInspect.files.length})
              </span>
              {selectedStudyForInspect.files.length === 0 ? (
                <div className="p-4 text-xs text-white/40 italic bg-white/[0.02] border border-white/10 rounded-[2px]">
                  No files uploaded with this study yet.
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
                              <span className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-xs md:max-w-sm font-sans">
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
                              message: "Download Started",
                              description: `Downloading "${file.fileName}" to your device.`,
                              variant: "info",
                            });
                          }}
                          className="px-4 py-2 rounded-[2px] bg-[#CC6600]/20 hover:bg-[#CC6600]/35 text-white border border-[#CC6600]/60 hover:border-[#CC6600] text-xs font-sans font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer active:scale-[0.97] min-h-[36px]"
                        >
                          <DownloadSimple size={14} weight="bold" className="text-[#FFA040]" aria-hidden="true" />
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
