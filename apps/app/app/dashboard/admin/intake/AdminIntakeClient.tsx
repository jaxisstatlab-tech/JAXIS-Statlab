"use client";

import React, { useState, useEffect, useTransition, useMemo, useRef } from "react";
import Link from "next/link";
import {
  PageHeader,
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
  ArrowSquareOut,
  ArrowsClockwise,
  Calculator,
  CheckCircle,
  Copy,
  DownloadSimple,
  Eye,
  FileText,
  Hourglass,
  PaperPlaneTilt,
  Question,
  Tray,
} from "@phosphor-icons/react";
import {
  getProjects,
  markIntakeComplete,
  requestMissingInfo,
} from "@/features/projects/actions";
import { MISSING_INFO_TEMPLATES, getProjectDisplayStatus } from "@/lib/project-rules";
import { getFileMeta, formatFileCategory, triggerFileDownload } from "@/lib/file-utils";
import { QuotationBuilderModal } from "@/features/quotations/components/QuotationBuilderModal";
import { AnalysisGoalsList } from "@/features/projects/components/AnalysisGoalsList";
import { analysisGoalsFor } from "@/features/projects/analysis-goals";
import { getCommercialCatalog } from "@/features/quotations/actions";
import { getStudyVolunteers } from "@/features/volunteers/actions";
import { HandWaving, Star } from "@phosphor-icons/react";
import { VolunteersCard } from "@/features/volunteers/components/VolunteersCard";
import type { StudyVolunteerItem } from "@/features/volunteers/schemas";
import {
  PACKAGES_CATALOG,
  ADDONS_CATALOG,
  type CommercialCatalogData,
} from "@/lib/pricing-rules";
import type { ProjectDetailItem } from "@/features/projects/schemas";
import { ClientPreferences } from "@/features/projects/components/ClientPreferences";

interface AdminIntakeClientProps {
  initialProjects?: ProjectDetailItem[];
  initialCatalog?: CommercialCatalogData;
}

const DAY = 86_400_000;

const shortDate = (value: Date | string) =>
  new Date(value).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

const shortTime = (value: Date | string) =>
  new Date(value).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });

/** "in 12 days", "tomorrow", "today", "3 days late" — or nothing until the page has loaded in the browser. */
function dueHint(due: Date | string, now: number | null): string | null {
  if (now === null) return null;
  const days = Math.ceil((new Date(due).getTime() - now) / DAY);
  if (days > 1) return `in ${days} days`;
  if (days === 1) return "tomorrow";
  if (days === 0) return "today";
  return days === -1 ? "1 day late" : `${-days} days late`;
}

// Studies with nothing left to do. They're listed (search finds them) but always after the open ones.
const FINISHED = new Set(["DELIVERED", "CLOSED", "CANCELLED", "EXPIRED"]);
const REQUESTS = new Set(["NEW_REQUEST", "AWAITING_INFORMATION", "UNDER_EVALUATION", "QUOTE_SENT"]);
const isFinished = (p: { masterStatus: string }) => FINISHED.has(p.masterStatus);

type RowAction = { label: string; icon: React.ReactNode } & (
  | { kind: "quick-look" }
  | { kind: "quote" }
  | { kind: "link"; href: string }
);

// The one button each row shows: the next thing staff do for a study at that stage. Everything else is in the menu.
function nextStepFor(p: ProjectDetailItem): RowAction {
  switch (p.masterStatus) {
    case "NEW_REQUEST":
      return { kind: "quick-look", label: "Review", icon: <Eye size={14} weight="fill" /> };
    case "UNDER_EVALUATION":
      return { kind: "quote", label: "Build Quote", icon: <Calculator size={14} weight="fill" /> };
    case "CLIENT_APPROVED":
      return {
        kind: "link",
        href: `/dashboard/admin/projects/${p.id}/sow`,
        label: "Draft Agreement",
        icon: <FileText size={14} weight="fill" />,
      };
    case "AWAITING_INFORMATION":
      return { kind: "quick-look", label: "Quick Look", icon: <Eye size={14} weight="fill" /> };
    default:
      return {
        kind: "link",
        href: `/dashboard/admin/projects/${p.id}`,
        label: "Open",
        icon: <ArrowSquareOut size={14} weight="fill" />,
      };
  }
}

export function AdminIntakeClient({
  initialProjects = [],
  initialCatalog,
  offers = {},
}: AdminIntakeClientProps & { offers?: Record<string, { count: number; picked: string | null }> }) {
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
  const [sortBy, setSortBy] = useState<string>("newest");
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

  // "Now" only exists in the browser; set after mount so server and browser render the same first.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setNow(Date.now()));
    return () => cancelAnimationFrame(frame);
  }, []);

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

  // Background refresh of the list alone: the table stays on screen until the new rows arrive (no loading
  // state), and the price catalog, which barely changes, isn't fetched again. Server actions run one at a
  // time, so a full reload on every tab switch used to sit in front of the next click.
  const lastQuietRefreshRef = useRef(Date.now());
  const refreshQueueQuietly = async () => {
    lastQuietRefreshRef.current = Date.now();
    try {
      const res = await getProjects();
      if (res.success) {
        setProjects(res.data);
      }
    } catch (e) {
      console.error("Failed to refresh intake projects", e);
    }
  };

  useEffect(() => {
    if (initialProjects.length === 0) {
      loadData();
    }

    // New intake alerts refresh the list right away; coming back to the tab does at most once a minute.
    const handleStudyUpdated = () => {
      refreshQueueQuietly();
    };
    const handleFocus = () => {
      if (Date.now() - lastQuietRefreshRef.current >= 60_000) {
        refreshQueueQuietly();
      }
    };

    window.addEventListener("jaxis:study-updated", handleStudyUpdated);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("jaxis:study-updated", handleStudyUpdated);
      window.removeEventListener("focus", handleFocus);
    };
  }, [initialProjects.length]);

  // Filter by status and search
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (selectedStatus === "TRIAGE") {
        if (p.masterStatus !== "NEW_REQUEST" && p.masterStatus !== "AWAITING_INFORMATION") {
          return false;
        }
      } else if (selectedStatus === "IN_WORK") {
        if (REQUESTS.has(p.masterStatus) || isFinished(p)) return false;
      } else if (selectedStatus === "HAS_OFFERS") {
        if (!offers[p.id]?.count) return false;
      } else if (selectedStatus === "FINISHED") {
        if (!isFinished(p)) return false;
      } else if (selectedStatus !== "ALL") {
        if (p.masterStatus !== selectedStatus) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          p.researchTitle.toLowerCase().includes(q) ||
          p.intakeId.toLowerCase().includes(q) ||
          p.client.fullName.toLowerCase().includes(q) ||
          p.client.email.toLowerCase().includes(q) ||
          (p.client.clientProfile?.institutionSchool || "").toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [projects, selectedStatus, searchQuery, offers]);

  // Newest first by default, with oldest first and closest deadline
  const sortedFilteredProjects = useMemo(() => {
    return [...filteredProjects].sort((a, b) => {
      // Open studies first, whatever the sort; finished ones after them.
      const done = Number(isFinished(a)) - Number(isFinished(b));
      if (done !== 0) return done;
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "deadline") {
        const timeA = a.deadlineRequested ? new Date(a.deadlineRequested).getTime() : Infinity;
        const timeB = b.deadlineRequested ? new Date(b.deadlineRequested).getTime() : Infinity;
        if (timeA !== timeB) return timeA - timeB;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filteredProjects, sortBy]);

  const firstFinishedId = useMemo(() => {
    // Only when open studies are listed too; a "Finished" list needs no heading.
    const i = sortedFilteredProjects.findIndex(isFinished);
    return i > 0 ? sortedFilteredProjects[i]!.id : null;
  }, [sortedFilteredProjects]);

  const paginatedProjects = useMemo(() => {
    return sortedFilteredProjects.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [sortedFilteredProjects, currentPage, pageSize]);

  const kpis = useMemo(() => {
    const count = (status: string) => projects.filter((p) => p.masterStatus === status).length;
    const newRequests = count("NEW_REQUEST");
    const awaitingInfo = count("AWAITING_INFORMATION");
    return {
      total: projects.length,
      toCheck: newRequests + awaitingInfo,
      newRequests,
      awaitingInfo,
      underEvaluation: count("UNDER_EVALUATION"),
      quoteSent: count("QUOTE_SENT"),
      inWork: projects.filter((p) => !REQUESTS.has(p.masterStatus) && !isFinished(p)).length,
      finished: projects.filter(isFinished).length,
    };
  }, [projects]);

  // Who offered to take a study ("I'll take this study"): opened from the row's tag.
  const [offersOpen, setOffersOpen] = useState<ProjectDetailItem | null>(null);
  const [offerList, setOfferList] = useState<StudyVolunteerItem[] | null>(null);
  const openOffers = (p: ProjectDetailItem) => {
    setOffersOpen(p);
    setOfferList(null);
    void getStudyVolunteers(p.id).then((r) => setOfferList(r.success ? r.data : []));
  };

  const filtersActive = selectedStatus !== "ALL" || sortBy !== "newest" || searchQuery.trim() !== "";
  const clearFilters = () => {
    setSelectedStatus("ALL");
    setSortBy("newest");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const openQuote = (p: ProjectDetailItem) => {
    setSelectedStudyForInspect(null);
    setSelectedStudyForQuote(p);
    setIsQuoteModalOpen(true);
  };

  const openMissingInfo = (p: ProjectDetailItem) => {
    setSelectedStudyForInspect(null);
    setSelectedForMissingInfo(p);
    setMissingInfoReasonText(p.missingInfoReason || "");
    setSelectedTemplateId("");
    setMissingInfoError(null);
  };

  const handleMarkComplete = (projectId: string, intakeId: string) => {
    startTransition(async () => {
      const res = await markIntakeComplete(projectId);
      if (res.success) {
        setSelectedStudyForInspect(null);
        setToastMessage({
          message: "Ready to price",
          description: `${intakeId} is ready for a quote.`,
          variant: "success",
        });
        loadData();
      } else {
        setToastMessage({
          message: "Couldn't update the study",
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
    if (!missingInfoReasonText.trim() || missingInfoReasonText.trim().length < 5) {
      setMissingInfoError("Tell the client what's missing (at least 5 characters).");
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
          message: "Request sent",
          description: `We asked ${selectedForMissingInfo.client.fullName} for the missing information (${selectedForMissingInfo.intakeId}).`,
          variant: "success",
        });
        setSelectedForMissingInfo(null);
        setMissingInfoReasonText("");
        setSelectedTemplateId("");
        loadData();
      } else {
        setMissingInfoError(res.error.message);
        setToastMessage({
          message: "Request not sent",
          description: res.error.message,
          variant: "danger",
        });
      }
    });
  };

  const handleCopyId = (intakeId: string) => {
    navigator.clipboard.writeText(intakeId);
    setToastMessage({
      message: "Study ID copied",
      description: intakeId,
      variant: "info",
    });
  };

  const runRowAction = (p: ProjectDetailItem, action: RowAction) => {
    if (action.kind === "quick-look") setSelectedStudyForInspect(p);
    else if (action.kind === "quote") openQuote(p);
  };

  if (isLoading && projects.length === 0) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto font-sans">
        <LoadingState variant="page" label="Loading new study requests..." />
      </div>
    );
  }

  const inspect = selectedStudyForInspect;
  const offersFor = offersOpen;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      <PageHeader
        title="Studies"
        description="Every study, from the client's request to delivery. Open studies come first; finished ones are at the bottom."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Admin", href: "/dashboard/admin" },
          { label: "Studies" },
        ]}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs"
          >
            <ArrowsClockwise size={14} weight="fill" className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* Where the requests are in the pipeline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        <KpiCard
          label="New"
          value={kpis.newRequests}
          description="Read the study and check the files"
          icon={<Tray size={18} weight="fill" />}
          info="Requests no one has reviewed yet."
        />
        <KpiCard
          label="Waiting on client"
          value={kpis.awaitingInfo}
          description="We asked for something missing"
          icon={<Hourglass size={18} weight="fill" />}
          info="The client was asked to add or fix something and hasn't replied yet."
        />
        <KpiCard
          label="Ready to price"
          value={kpis.underEvaluation}
          description="Build and send the quote"
          icon={<Calculator size={18} weight="fill" />}
          info="Checked and complete; next step is the quote."
        />
        <KpiCard
          label="Quote sent"
          value={kpis.quoteSent}
          description="The client is deciding on the price"
          icon={<PaperPlaneTilt size={18} weight="fill" />}
          info="Waiting for the client to accept or ask for changes."
        />
      </div>

      <div className="rounded-[2px] border border-white/[0.08] bg-[#0A0A18] overflow-hidden">
        <FilterToolbar
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
          searchPlaceholder="Search title, client, school, or study ID"
          filters={[
            {
              key: "status",
              label: "Show",
              value: selectedStatus,
              defaultValue: "ALL",
              options: [
                { value: "ALL", label: `All (${kpis.total})` },
                { value: "TRIAGE", label: `To check (${kpis.toCheck})` },
                { value: "NEW_REQUEST", label: `New (${kpis.newRequests})` },
                { value: "AWAITING_INFORMATION", label: `Waiting on client (${kpis.awaitingInfo})` },
                { value: "UNDER_EVALUATION", label: `Ready to price (${kpis.underEvaluation})` },
                { value: "QUOTE_SENT", label: `Quote sent (${kpis.quoteSent})` },
                { value: "IN_WORK", label: `Signed and in the works (${kpis.inWork})` },
                { value: "HAS_OFFERS", label: `Analysts offered (${Object.values(offers).filter((o) => o.count > 0).length})` },
                { value: "FINISHED", label: `Finished (${kpis.finished})` },
              ],
            },
            {
              key: "sort",
              label: "Sort",
              value: sortBy,
              defaultValue: "newest",
              options: [
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
                { value: "deadline", label: "Due soonest" },
              ],
            },
          ]}
          onFilterChange={(key, value) => {
            if (key === "status") setSelectedStatus(value);
            else if (key === "sort") setSortBy(value);
            setCurrentPage(1);
          }}
          onClear={clearFilters}
        />

        <div className="w-full overflow-x-auto border-t border-white/[0.08]">
          <table className="data-table">
            <thead>
              <tr>
                <th>Study</th>
                <th className="w-[220px] whitespace-nowrap">Client</th>
                <th className="w-[150px] whitespace-nowrap">Due</th>
                <th className="w-[170px] whitespace-nowrap">Status</th>
                <th className="w-[150px] text-right whitespace-nowrap">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <LoadingState variant="table" label="Loading studies..." />
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <EmptyState
                      icon={Tray}
                      title={projects.length === 0 ? "No studies yet" : "No studies match"}
                      description={
                        projects.length === 0
                          ? "New requests from clients will show up here."
                          : "Try another search or show all studies."
                      }
                      action={
                        filtersActive ? (
                          <Button variant="secondary" size="sm" onClick={clearFilters}>
                            Clear Filters
                          </Button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                paginatedProjects.map((p) => {
                  const goals = analysisGoalsFor(p.analysisGoals);
                  const action = nextStepFor(p);
                  const displayStatus = getProjectDisplayStatus(p, "ADMIN");
                  const finished = isFinished(p);
                  const hint = p.deadlineRequested && !finished ? dueHint(p.deadlineRequested, now) : null;
                  const late = hint?.endsWith("late");
                  const firstFinished = finished && p.id === firstFinishedId;

                  return (
                    <React.Fragment key={p.id}>
                    {firstFinished ? (
                      <tr aria-hidden="true">
                        <td colSpan={5} className="!py-2.5 text-[12px] font-medium text-white/45">
                          Finished
                        </td>
                      </tr>
                    ) : null}
                    <tr className={`group align-top ${finished ? "[&_td]:text-white/60" : ""}`}>
                      {/* Study */}
                      <td className="max-w-[520px] min-w-[280px]">
                        <div className="flex flex-col gap-1.5 min-w-0 py-0.5 pr-2">
                          <Link
                            href={`/dashboard/admin/projects/${p.id}`}
                            className="text-[13px] font-semibold text-white hover:text-white/80 leading-snug line-clamp-2"
                            title={p.researchTitle}
                          >
                            {p.researchTitle}
                          </Link>
                          <div className="flex items-center gap-x-2 gap-y-1 flex-wrap text-[11px] text-white/45">
                            <button
                              type="button"
                              onClick={() => handleCopyId(p.intakeId)}
                              title="Copy study ID"
                              className="inline-flex items-center gap-1 font-mono text-white/70 hover:text-white cursor-pointer"
                            >
                              {p.intakeId}
                              <Copy size={11} weight="fill" className="opacity-50" />
                            </button>
                            <span aria-hidden="true">·</span>
                            <span>
                              Sent {shortDate(p.createdAt)}, {shortTime(p.createdAt)}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {p.files.length} file{p.files.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          {goals.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {goals.map((goal) => (
                                <span
                                  key={goal.code}
                                  title={`${goal.title}. Usual tests: ${goal.typicalTests}`}
                                  className={`text-[11px] px-1.5 py-0.5 rounded-[2px] border whitespace-nowrap ${
                                    goal.code === "UNSURE"
                                      ? "border-[#CC6600]/40 text-[#FFA040] bg-[#CC6600]/[0.06]"
                                      : "border-white/10 text-white/75 bg-white/[0.04]"
                                  }`}
                                >
                                  {goal.shortTitle}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-white/35">Analysis goals: not asked</span>
                          )}
                          {p.missingInfoReason && p.masterStatus === "AWAITING_INFORMATION" ? (
                            <p className="text-[11px] leading-relaxed text-white/55 line-clamp-2" title={p.missingInfoReason}>
                              <span className="text-white/75">We asked:</span> {p.missingInfoReason}
                            </p>
                          ) : null}
                          {offers[p.id]?.count && !finished ? (
                            <button
                              type="button"
                              onClick={() => openOffers(p)}
                              title="See who offered and pick one"
                              className="group/offer inline-flex max-w-full w-fit items-center gap-2 whitespace-nowrap rounded-[2px] border border-white/10 bg-white/[0.03] py-1 pl-2 pr-2.5 text-[11px] transition-colors hover:border-white/25 hover:bg-white/[0.06]"
                            >
                              {offers[p.id]!.picked ? (
                                <>
                                  <Star size={12} weight="fill" className="shrink-0 text-[#CC6600]" />
                                  <span className="truncate text-white">{offers[p.id]!.picked}</span>
                                  <span className="shrink-0 text-white/40">picked of {offers[p.id]!.count}</span>
                                </>
                              ) : (
                                <>
                                  <HandWaving size={12} weight="fill" className="shrink-0 text-[#CC6600]" />
                                  <span className="text-white">
                                    {offers[p.id]!.count} {offers[p.id]!.count === 1 ? "offer" : "offers"}
                                  </span>
                                  <span className="text-white/40">· choose</span>
                                </>
                              )}
                            </button>
                          ) : null}
                        </div>
                      </td>

                      {/* Client */}
                      <td>
                        <div className="flex flex-col gap-0.5 min-w-0 py-0.5">
                          <span className="text-[13px] font-medium text-white truncate">{p.client.fullName}</span>
                          <span className="text-[11px] text-white/50 truncate">
                            {p.client.clientProfile?.institutionSchool || p.client.email}
                          </span>
                          {p.client.clientProfile?.contactNumber ? (
                            <span className="text-[11px] text-white/40 font-mono">{p.client.clientProfile.contactNumber}</span>
                          ) : null}
                        </div>
                      </td>

                      {/* Due */}
                      <td>
                        <div className="flex flex-col gap-0.5 whitespace-nowrap py-0.5">
                          {p.deadlineRequested ? (
                            <>
                              <span className={`text-[13px] ${finished ? "text-white/60" : "text-white"}`}>
                                {p.deliveredAt && finished ? `Delivered ${shortDate(p.deliveredAt)}` : shortDate(p.deadlineRequested)}
                              </span>
                              {hint ? (
                                <span className={`text-[11px] ${late ? "text-red-400" : "text-white/45"}`}>{hint}</span>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-[11px] text-white/40">No date given</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <div className="py-0.5">
                          <StatusBadge
                            status={displayStatus.status}
                            label={displayStatus.label}
                            pulse={displayStatus.pulse}
                          />
                        </div>
                      </td>

                      {/* Next step + more */}
                      <td className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {action.kind === "link" ? (
                            <Link href={action.href}>
                              <Button variant="secondary" size="sm" className="text-xs gap-1.5">
                                {action.icon}
                                <span>{action.label}</span>
                              </Button>
                            </Link>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-xs gap-1.5"
                              onClick={() => runRowAction(p, action)}
                            >
                              {action.icon}
                              <span>{action.label}</span>
                            </Button>
                          )}

                          <DropdownMenu
                            trigger={
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-[2px] border-white/10"
                                aria-label={`More for ${p.intakeId}`}
                              >
                                ···
                              </Button>
                            }
                            items={[
                              {
                                label: "Quick look",
                                subtitle: "Goals, questions and files",
                                icon: <Eye size={16} weight="fill" />,
                                onClick: () => setSelectedStudyForInspect(p),
                              },
                              {
                                label: "Open study page",
                                subtitle: "Everything about this study",
                                icon: <ArrowSquareOut size={16} weight="fill" />,
                                onClick: () => {
                                  window.location.href = `/dashboard/admin/projects/${p.id}`;
                                },
                              },
                              ...(p.masterStatus === "CLIENT_APPROVED"
                                ? [
                                    {
                                      label: "Draft agreement",
                                      subtitle: "Prepare it and send it to the client",
                                      icon: <FileText size={16} weight="fill" />,
                                      onClick: () => {
                                        window.location.href = `/dashboard/admin/projects/${p.id}/sow`;
                                      },
                                    },
                                  ]
                                : []),
                              {
                                label: "Build quote",
                                subtitle: "Choose the package and price",
                                icon: <Calculator size={16} weight="fill" />,
                                onClick: () => openQuote(p),
                              },
                              {
                                label: "Ask for missing info",
                                subtitle: "Message the client what to add",
                                variant: "warning" as const,
                                icon: <Question size={16} weight="fill" />,
                                onClick: () => openMissingInfo(p),
                              },
                              ...(p.masterStatus === "NEW_REQUEST"
                                ? [
                                    {
                                      label: "Mark ready to price",
                                      subtitle: "Everything needed is here",
                                      variant: "success" as const,
                                      icon: <CheckCircle size={16} weight="fill" />,
                                      onClick: () => handleMarkComplete(p.id, p.intakeId),
                                    },
                                  ]
                                : []),
                              {
                                label: "Copy study ID",
                                subtitle: p.intakeId,
                                dividerBefore: true,
                                icon: <Copy size={16} weight="fill" />,
                                onClick: () => handleCopyId(p.intakeId),
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
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
      </div>

      {/* ── Quick look: read a request without leaving the list ── */}
      {inspect && (
        <Modal
          open={Boolean(inspect)}
          onClose={() => setSelectedStudyForInspect(null)}
          title={inspect.researchTitle}
          description={`${inspect.intakeId} · Sent ${shortDate(inspect.createdAt)}, ${shortTime(inspect.createdAt)}`}
          size="xl"
          footer={
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <Link
                href={`/dashboard/admin/projects/${inspect.id}`}
                className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
              >
                <ArrowSquareOut size={14} weight="fill" />
                Open study page
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => openMissingInfo(inspect)}>
                  Ask for Missing Info
                </Button>
                {inspect.masterStatus === "NEW_REQUEST" ? (
                  <Button
                    variant="primary"
                    size="sm"
                    loading={isPending}
                    onClick={() => handleMarkComplete(inspect.id, inspect.intakeId)}
                  >
                    Mark Ready to Price
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => openQuote(inspect)}>
                    Build Quote
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div className="flex flex-col gap-6 font-sans">
            {/* Client */}
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-[2px] border border-white/[0.08] bg-white/[0.02] p-4 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] text-white/45">Client</dt>
                <dd className="text-[13px] font-medium text-white">{inspect.client.fullName}</dd>
                <dd className="text-xs text-white/55">{inspect.client.email}</dd>
                {inspect.client.clientProfile?.contactNumber ? (
                  <dd className="text-xs font-mono text-white/45">{inspect.client.clientProfile.contactNumber}</dd>
                ) : null}
              </div>
              <div>
                <dt className="text-[11px] text-white/45">School and program</dt>
                <dd className="text-[13px] font-medium text-white">
                  {inspect.client.clientProfile?.institutionSchool || "Not given"}
                </dd>
                <dd className="text-xs text-white/55">{inspect.client.clientProfile?.academicProgram || "Not given"}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-white/45">Needed by</dt>
                <dd className="text-[13px] text-white">
                  {inspect.deadlineRequested ? shortDate(inspect.deadlineRequested) : "No date given"}
                  {inspect.deadlineRequested && dueHint(inspect.deadlineRequested, now) ? (
                    <span className="text-white/45"> · {dueHint(inspect.deadlineRequested, now)}</span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-white/45">Status</dt>
                <dd className="pt-0.5">
                  {(() => {
                    const s = getProjectDisplayStatus(inspect, "ADMIN");
                    return <StatusBadge status={s.status} label={s.label} pulse={s.pulse} />;
                  })()}
                </dd>
              </div>
            </dl>

            {inspect.missingInfoReason && inspect.masterStatus === "AWAITING_INFORMATION" ? (
              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-white">What we asked for</h3>
                <p className="whitespace-pre-wrap rounded-[2px] border border-white/[0.08] bg-white/[0.02] p-4 text-[13px] leading-relaxed text-white/75">
                  {inspect.missingInfoReason}
                </p>
              </section>
            ) : null}

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-white">What the analysis should do</h3>
              <div className="rounded-[2px] border border-white/[0.08] bg-white/[0.02] p-4">
                <AnalysisGoalsList codes={inspect.analysisGoals} />
              </div>
            </section>

            {inspect.researchObjectives?.trim() ? (
              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-white">Statement of the problem</h3>
                <p className="whitespace-pre-wrap rounded-[2px] border border-white/[0.08] bg-white/[0.02] p-4 text-[13px] leading-relaxed text-white/75">
                  {inspect.researchObjectives}
                </p>
              </section>
            ) : null}

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-white">Research objectives</h3>
              <p className="whitespace-pre-wrap rounded-[2px] border border-white/[0.08] bg-white/[0.02] p-4 text-[13px] leading-relaxed text-white/75">
                {inspect.researchQuestions?.trim() || "Not given"}
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-white">What the client would like</h3>
              <div className="rounded-[2px] border border-white/[0.08] bg-white/[0.02] p-4">
                <ClientPreferences preferredPackage={inspect.preferredPackage} preferredAddOns={inspect.preferredAddOns} clientNotes={inspect.clientNotes} />
              </div>
            </section>

            {inspect.hypotheses ? (
              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-white">Hypotheses</h3>
                <p className="whitespace-pre-wrap rounded-[2px] border border-white/[0.08] bg-white/[0.02] p-4 text-[13px] leading-relaxed text-white/75">
                  {inspect.hypotheses}
                </p>
              </section>
            ) : null}

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-white">Files ({inspect.files.length})</h3>
              {inspect.files.length === 0 ? (
                <p className="rounded-[2px] border border-white/[0.08] bg-white/[0.02] p-4 text-[13px] text-white/50">
                  The client hasn&apos;t added any files yet.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-white/[0.06] rounded-[2px] border border-white/[0.08]">
                  {inspect.files.map((file) => {
                    const meta = getFileMeta(file.fileName, file.fileType);
                    const category = formatFileCategory(file.fileCategory);
                    return (
                      <li key={file.id} className="flex items-center justify-between gap-4 px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="inline-flex w-12 shrink-0 justify-center rounded-[2px] border border-white/10 bg-white/[0.04] py-1 font-mono text-[10px] font-semibold uppercase text-white/65">
                            {meta.ext}
                          </span>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-[13px] text-white">{file.fileName}</span>
                            <span className="text-[11px] text-white/45">
                              {category.label} · added {shortDate(file.uploadedAt)}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="shrink-0 gap-1.5 text-xs"
                          onClick={() => {
                            triggerFileDownload(file.filePath, file.fileName);
                            setToastMessage({
                              message: "Download started",
                              description: file.fileName,
                              variant: "info",
                            });
                          }}
                        >
                          <DownloadSimple size={14} weight="fill" />
                          Download
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </Modal>
      )}

      {/* ── Ask the client for missing information ── */}
      {selectedForMissingInfo && (
        <Modal
          open={Boolean(selectedForMissingInfo)}
          onClose={() => setSelectedForMissingInfo(null)}
          title="Ask for missing information"
          description={`${selectedForMissingInfo.intakeId} · ${selectedForMissingInfo.researchTitle}`}
          size="lg"
        >
          <div className="flex flex-col gap-6 font-sans">
            <p className="text-[13px] leading-relaxed text-white/65">
              {selectedForMissingInfo.client.fullName} gets this message, and the study shows as{" "}
              <span className="text-white">Waiting on client</span> until they add what you asked for.
            </p>

            <FormSelect
              label="Start from a common request (optional)"
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              options={[
                { value: "", label: "Choose a common request…" },
                ...MISSING_INFO_TEMPLATES.map((t) => ({
                  value: t.id,
                  label: `${t.category}: ${t.label}`,
                })),
              ]}
            />

            <FormTextarea
              label="What do you need from the client?"
              required
              rows={5}
              placeholder="e.g. Please upload your raw survey responses as an Excel or CSV file, one column per question."
              value={missingInfoReasonText}
              onChange={(e) => {
                setMissingInfoReasonText(e.target.value);
                if (selectedTemplateId) setSelectedTemplateId("");
              }}
              error={missingInfoError || undefined}
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
                Send to Client
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      )}

      {/* Quote builder */}
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
          analysisGoals={selectedStudyForQuote.analysisGoals}
          clientPreference={{
            preferredPackage: selectedStudyForQuote.preferredPackage,
            preferredAddOns: selectedStudyForQuote.preferredAddOns,
            clientNotes: selectedStudyForQuote.clientNotes,
          }}
          customCatalog={catalog}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {offersFor ? (
        <Modal
          open
          onClose={() => setOffersOpen(null)}
          title="Analysts who want this study"
          description={`${offersFor.intakeId} · ${offersFor.researchTitle}`}
          size="lg"
        >
          {offerList === null ? (
            <LoadingState variant="inline" label="Loading offers" />
          ) : (
            <VolunteersCard
              projectId={offersFor.id}
              volunteers={offerList}
              paid={offersFor.masterStatus === "ACTIVE"}
              onChanged={() => {
                void getStudyVolunteers(offersFor.id).then((r) => setOfferList(r.success ? r.data : []));
                refreshQueueQuietly();
              }}
            />
          )}
        </Modal>
      ) : null}

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
