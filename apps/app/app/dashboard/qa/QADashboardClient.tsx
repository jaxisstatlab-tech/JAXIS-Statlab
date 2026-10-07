"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader, KpiCard, Button, Toast, CopyButton, Pagination, DropdownMenu } from "@repo/ui";
import {
  ArrowClockwise,
  ArrowRight,
  ArrowUUpLeft,
  ChatCircleDots,
  CheckCircle,
  ClockCountdown,
  Copy,
  Eye,
  Files,
  MagnifyingGlass,
  SealCheck,
  ShieldCheck,
  Warning,
} from "@phosphor-icons/react";
import { Meter, Panel, PanelBody, PanelFooterButton, PanelHeader } from "@/components/dashboard/Panel";
import { getQaWorkload } from "@/features/assignments/actions";
import { getStaffSelfProfile, returnFromLeave } from "@/features/staff/actions";
import { clientPackageName } from "@/features/projects/client-packages";
import { monthKey, monthWindow } from "@/lib/month-buckets";
import { DueText, FIELD, LeaveDialog, LeaveNotice, StudyDetailsModal, type LeaveData } from "@/features/assignments/components/WorkloadParts";
import type { AssignmentDetailItem } from "@/features/assignments/schemas";

// "Review Desk": the reviewer's home. Studies sent to them to check, ones sent back to the analyst, deadlines,
// and every study they review.

type Study = AssignmentDetailItem;
type ToastState = { message: string; description?: string; variant: "info" | "success" | "warning" | "danger" } | null;

type Group = "check" | "sentBack" | "analyst" | "delivered" | "stopped";

const GROUP_OF: Record<string, Group> = {
  FOR_QA: "check",
  QA_REVISION: "sentBack",
  DELIVERED: "delivered",
  CLOSED: "delivered",
  DISPUTED: "delivered",
  CANCELLED: "stopped",
  EXPIRED: "stopped",
  HALTED: "stopped",
  ETHICAL_BREACH: "stopped",
};
const groupOf = (s: Study): Group => GROUP_OF[s.masterStatus] ?? "analyst";
const isOpen = (s: Study) => ["check", "sentBack", "analyst"].includes(groupOf(s));

const GROUPS: Array<{ key: Group; label: string }> = [
  { key: "check", label: "To check" },
  { key: "sentBack", label: "Sent back" },
  { key: "analyst", label: "With the analyst" },
  { key: "delivered", label: "Delivered" },
  { key: "stopped", label: "Stopped" },
];

const STAGE_TEXT: Record<string, string> = {
  FOR_QA: "Ready for you to check",
  QA_REVISION: "Sent back for changes",
  EXPERT_ASSIGNED: "Analyst hasn't started",
  ACTIVE: "Analyst hasn't started",
  IN_PROGRESS: "Analyst working",
  SLA_PAUSED: "Deadline paused",
  SCOPE_CREEP_HALTED: "On hold (extra work)",
  REASSIGNMENT_NEEDED: "Being reassigned",
  REVISION_REQUESTED: "Client asked for changes",
  DELIVERED: "Delivered",
  CLOSED: "Delivered",
  DISPUTED: "Delivered, claim open",
};
const stageText = (s: Study) => STAGE_TEXT[s.masterStatus] ?? (groupOf(s) === "stopped" ? "Stopped" : "Analyst working");

/** Most urgent first: ready to check (closest due first), then sent back, then with the analyst. */
function urgencyRank(s: Study) {
  const g = groupOf(s);
  if (g === "check") return s.isOverdue ? 0 : s.isUrgent ? 1 : 2;
  if (g === "sentBack") return 3;
  if (g === "analyst") return 4;
  return g === "delivered" ? 5 : 6;
}
const byUrgency = (a: Study, b: Study) =>
  urgencyRank(a) - urgencyRank(b) || new Date(a.slaDueAt).getTime() - new Date(b.slaDueAt).getTime();

type SortKey = "urgent" | "due-soon" | "due-late" | "newest" | "oldest" | "id" | "title";
const SORTS: Array<{ value: SortKey; label: string; compare: (a: Study, b: Study) => number }> = [
  { value: "urgent", label: "Most urgent first", compare: byUrgency },
  { value: "due-soon", label: "Due date, soonest", compare: (a, b) => new Date(a.slaDueAt).getTime() - new Date(b.slaDueAt).getTime() },
  { value: "due-late", label: "Due date, latest", compare: (a, b) => new Date(b.slaDueAt).getTime() - new Date(a.slaDueAt).getTime() },
  { value: "newest", label: "Newest assigned", compare: (a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime() },
  { value: "oldest", label: "Oldest assigned", compare: (a, b) => new Date(a.assignedAt).getTime() - new Date(b.assignedAt).getTime() },
  { value: "id", label: "Study ID", compare: (a, b) => a.projectIntakeId.localeCompare(b.projectIntakeId) },
  { value: "title", label: "Title, A to Z", compare: (a, b) => a.projectTitle.localeCompare(b.projectTitle) },
];

const reviewHref = (s: Study) => `/dashboard/qa/projects/${s.projectId}/review`;
const filesHref = (s: Study) => `/dashboard/qa/projects/${s.projectId}/files`;
const chatHref = (s: Study) => `/dashboard/qa/messages?projectId=${s.projectId}`;

interface QADashboardClientProps {
  initialAssignments: Study[];
  initialLoadFailed?: boolean;
  initialProfileStatus: string;
  initialLeaveData: LeaveData;
  hasSignature?: boolean;
}

export function QADashboardClient({ initialAssignments, initialLoadFailed = false, initialProfileStatus, initialLeaveData, hasSignature = true }: QADashboardClientProps) {
  const [studies, setStudies] = useState<Study[]>(initialAssignments);
  const [loadFailed, setLoadFailed] = useState(initialLoadFailed);
  const [refreshing, setRefreshing] = useState(false);
  const [profileStatus, setProfileStatus] = useState(initialProfileStatus);
  const [leaveData, setLeaveData] = useState<LeaveData>(initialLeaveData);
  const [toast, setToast] = useState<ToastState>(null);
  const [lookAt, setLookAt] = useState<Study | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveBusy, startLeave] = useTransition();
  const lastLoad = useRef(Date.now());

  const reload = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const [res, profileRes] = await Promise.all([getQaWorkload(), getStaffSelfProfile()]);
      if (res.success && res.data) {
        setStudies(res.data);
        setLoadFailed(false);
      } else if (!quiet) {
        setToast({ message: "Couldn't refresh", description: "Your studies didn't load. Try again in a moment.", variant: "danger" });
      }
      if (profileRes.success && profileRes.data) {
        const p = profileRes.data as { status: string; leaveReason?: string | null; leaveUntil?: string | null };
        setProfileStatus(p.status);
        setLeaveData({ reason: p.leaveReason, until: p.leaveUntil });
      }
    } catch {
      if (!quiet) setToast({ message: "Couldn't refresh", description: "Check your connection and try again.", variant: "danger" });
    } finally {
      lastLoad.current = Date.now();
      setRefreshing(false);
    }
  }, []);

  // Quietly catch up when you come back to the tab (at most once a minute).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastLoad.current > 60_000) void reload(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reload]);

  const counts = useMemo(() => {
    const c: Record<Group, number> = { check: 0, sentBack: 0, analyst: 0, delivered: 0, stopped: 0 };
    for (const s of studies) c[groupOf(s)]++;
    return c;
  }, [studies]);
  const open = useMemo(() => studies.filter(isOpen), [studies]);
  const late = open.filter((s) => s.isOverdue).length;
  const toCheck = useMemo(() => studies.filter((s) => groupOf(s) === "check").sort(byUrgency), [studies]);

  const description = loadFailed
    ? "Studies to check, deadlines, and every study you review."
    : counts.check > 0
      ? `${counts.check} ${counts.check === 1 ? "study is" : "studies are"} ready for you to check.`
      : counts.sentBack > 0
        ? `Nothing to check right now. ${counts.sentBack} ${counts.sentBack === 1 ? "study is" : "studies are"} with the analyst for fixes.`
        : open.length > 0
          ? "Nothing to check right now. Your studies are with their analysts."
          : "Nothing to check right now. Studies show up here when an admin assigns you as the reviewer.";

  const leaveAction = (cancelling: boolean) =>
    startLeave(async () => {
      const res = await returnFromLeave();
      if (res.success) {
        window.dispatchEvent(new CustomEvent("leave-status-updated"));
        window.dispatchEvent(new CustomEvent("shift-status-updated"));
        setProfileStatus("ACTIVE");
        setLeaveData(null);
        setToast(
          cancelling
            ? { message: "Leave request cancelled", variant: "success" }
            : { message: "Welcome back", description: "Admins can give you new studies again.", variant: "success" },
        );
        void reload(true);
      } else {
        setToast({ message: "Couldn't update your leave", description: res.error?.message || "Please try again.", variant: "danger" });
      }
    });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans">
      <PageHeader
        title="Review Desk"
        description={description}
        breadcrumbs={[{ label: "WORKSPACE", href: "/dashboard" }, { label: "Review Desk" }]}
        actions={
          <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
            <Button variant="ghost" size="sm" onClick={() => void reload()} loading={refreshing} aria-label="Refresh my studies" className="gap-1.5 active:scale-[0.97]">
              {refreshing ? null : <ArrowClockwise size={14} weight="bold" />}
              Refresh
            </Button>
            <Button asChild variant="ghost" size="sm" className="active:scale-[0.97]">
              <Link href="/dashboard/qa/profile">My Profile</Link>
            </Button>
            {profileStatus === "ACTIVE" ? (
              <Button variant="outline" size="sm" onClick={() => setLeaveOpen(true)} className="active:scale-[0.97]">
                Request Leave
              </Button>
            ) : null}
          </div>
        }
      />

      {!hasSignature ? (
        <Panel as="div" className="border-[#CC6600]/40">
          <PanelBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#CC6600]" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-white">Add your signature before you approve studies</p>
                <p className="mt-0.5 text-[13px] text-white/55">It goes on the certificate the client gets. You can still check files and send studies back.</p>
              </div>
            </div>
            <Button asChild variant="primary" size="sm" className="shrink-0 active:scale-[0.97]">
              <Link href="/dashboard/qa/profile#signature">Add Signature</Link>
            </Button>
          </PanelBody>
        </Panel>
      ) : null}

      {profileStatus === "LEAVE_PENDING" || profileStatus === "ON_LEAVE" ? (
        <LeaveNotice status={profileStatus} leave={leaveData} busy={leaveBusy} onAction={() => leaveAction(profileStatus === "LEAVE_PENDING")} />
      ) : null}

      {loadFailed ? (
        <Panel as="div">
          <PanelBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Warning size={20} weight="fill" className="mt-0.5 shrink-0 text-white/50" />
              <div>
                <p className="text-sm font-medium text-white">Your studies didn&apos;t load.</p>
                <p className="mt-0.5 text-[13px] text-white/55">The database took too long to answer. Nothing is lost.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void reload()} loading={refreshing} className="active:scale-[0.97]">
              Try Again
            </Button>
          </PanelBody>
        </Panel>
      ) : (
        <>
          <KpiRow studies={studies} counts={counts} late={late} toCheck={toCheck} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <ToCheckPanel toCheck={toCheck} sentBack={counts.sentBack} hasStudies={studies.length > 0} onLook={setLookAt} />
            <div className="flex flex-col gap-6 lg:col-span-4">
              <WhereAllPanel counts={counts} total={studies.length} />
              <WhatToCheckPanel />
            </div>
          </div>

          <StudiesPanel
            studies={studies}
            counts={counts}
            onLook={setLookAt}
            onCopied={(id) => setToast({ message: "Study ID copied", description: id, variant: "success" })}
          />
        </>
      )}

      <StudyDetailsModal
        study={lookAt}
        stage={lookAt ? stageText(lookAt) : ""}
        person={["Analyst", lookAt?.statistician.fullName ?? ""]}
        onClose={() => setLookAt(null)}
        footer={
          lookAt ? (
            <div className="flex w-full flex-wrap justify-end gap-2">
              <Button asChild variant="ghost" size="sm" className="active:scale-[0.97]">
                <Link href={chatHref(lookAt)}>Messages</Link>
              </Button>
              {groupOf(lookAt) === "check" ? (
                <>
                  <Button asChild variant="outline" size="sm" className="active:scale-[0.97]">
                    <Link href={filesHref(lookAt)}>Working Files</Link>
                  </Button>
                  <Button asChild variant="primary" size="sm" className="gap-1.5 active:scale-[0.97]">
                    <Link href={reviewHref(lookAt)}>
                      Review
                      <ArrowRight size={13} weight="bold" />
                    </Link>
                  </Button>
                </>
              ) : (
                <Button asChild variant="primary" size="sm" className="gap-1.5 active:scale-[0.97]">
                  <Link href={filesHref(lookAt)}>
                    Working Files
                    <ArrowRight size={13} weight="bold" />
                  </Link>
                </Button>
              )}
            </div>
          ) : null
        }
      />

      <LeaveDialog
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        onSent={(reason, until) => {
          setLeaveOpen(false);
          setProfileStatus("LEAVE_PENDING");
          setLeaveData({ reason, until });
          window.dispatchEvent(new CustomEvent("leave-status-updated"));
          window.dispatchEvent(new CustomEvent("shift-status-updated"));
          setToast({ message: "Leave requested", description: "Finance (HR) or an admin will approve it.", variant: "success" });
          void reload(true);
        }}
      />

      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

function KpiRow({ studies, counts, late, toCheck }: { studies: Study[]; counts: Record<Group, number>; late: number; toCheck: Study[] }) {
  // Delivered per month (Philippine time), from the real delivery date.
  const { keys } = monthWindow(new Date(), 6);
  const deliveredByMonth = keys.map((k) => studies.filter((s) => s.deliveredAt && monthKey(new Date(s.deliveredAt)) === k).length);
  const delivered6 = deliveredByMonth.reduce((a, b) => a + b, 0);
  const inWindow = studies.filter((s) => s.deliveredAt && keys.includes(monthKey(new Date(s.deliveredAt))));
  const onTime = inWindow.filter((s) => new Date(s.deliveredAt!).getTime() <= new Date(s.slaDueAt).getTime()).length;
  const dueSoon = toCheck.filter((s) => s.isUrgent || s.isOverdue).length;
  const lateToCheck = toCheck.filter((s) => s.isOverdue).length;

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="To check"
        description="Sent to you by the analyst"
        icon={<ShieldCheck size={18} weight="fill" />}
        value={counts.check}
        badge={dueSoon > 0 ? `${dueSoon} due within a day` : counts.check > 0 ? "Nothing due within a day" : undefined}
      />
      <KpiCard
        label="Sent back"
        description="Waiting for the analyst's fixes"
        icon={<ArrowUUpLeft size={18} weight="fill" />}
        value={counts.sentBack}
      />
      <KpiCard
        label="Past due"
        description="Open studies past their due date"
        icon={<ClockCountdown size={18} weight="fill" />}
        value={late}
        variant={late > 0 ? "red" : "default"}
        badge={lateToCheck > 0 ? "Check these first" : late > 0 ? "Late with the analyst" : "All on time"}
        info="The due date covers the analysis and your check, so a late study needs your review quickly."
      />
      <KpiCard
        label="Delivered"
        description="Last 6 months"
        icon={<SealCheck size={18} weight="fill" />}
        value={delivered6}
        badge={delivered6 > 0 ? `${onTime} of ${delivered6} on time` : "None delivered yet"}
        trend={delivered6 > 0 ? deliveredByMonth : undefined}
        trendStyle="bars"
        trendLabel="Studies delivered per month, last 6 months"
        info="Counted on the day the client received the results, in Philippine time. On time means by the due date."
      />
    </div>
  );
}

function ToCheckPanel({ toCheck, sentBack, hasStudies, onLook }: { toCheck: Study[]; sentBack: number; hasStudies: boolean; onLook: (s: Study) => void }) {
  const router = useRouter();
  const shown = toCheck.slice(0, 5);
  return (
    <Panel className="lg:col-span-8">
      <PanelHeader title="Ready for you to check" count={toCheck.length > 0 ? toCheck.length : undefined} subtitle="Closest due date first." />
      {shown.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-14 text-center">
          <CheckCircle size={22} weight="fill" className="text-white/25" />
          <p className="text-sm text-white/65">Nothing to check right now.</p>
          <p className="text-[13px] text-white/40">
            {sentBack > 0
              ? `${sentBack} ${sentBack === 1 ? "study is" : "studies are"} with the analyst for fixes. You'll get a notification when it comes back.`
              : hasStudies
                ? "You'll get a notification when an analyst sends work to you."
                : "Studies show up here when an admin assigns you as the reviewer."}
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-white/[0.05] border-t border-white/[0.06]">
          {shown.map((s, i) => (
            <li
              key={s.id}
              onMouseEnter={() => router.prefetch(reviewHref(s))}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-white/55">{s.projectIntakeId}</span>
                  <span className="text-[12px] text-white/40">from {s.statistician.fullName}</span>
                </div>
                <p className="mt-1 text-sm text-white sm:truncate" title={s.projectTitle}>
                  {s.projectTitle}
                </p>
                <p className="mt-1 text-[13px]">
                  <DueText s={s} />
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => onLook(s)} className="active:scale-[0.97]">
                  Details
                </Button>
                <Button asChild variant="ghost" size="sm" className="active:scale-[0.97]">
                  <Link href={filesHref(s)}>Files</Link>
                </Button>
                <Button asChild variant={i === 0 ? "primary" : "outline"} size="sm" className="gap-1.5 active:scale-[0.97]">
                  <Link href={reviewHref(s)}>
                    Review
                    <ArrowRight size={13} weight="bold" />
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {hasStudies ? (
        <PanelFooterButton onClick={() => document.getElementById("studies")?.scrollIntoView({ behavior: "smooth" })}>
          {toCheck.length > shown.length ? `See all ${toCheck.length} to check` : "See all my studies"}
        </PanelFooterButton>
      ) : null}
    </Panel>
  );
}

function WhereAllPanel({ counts, total }: { counts: Record<Group, number>; total: number }) {
  const shown = GROUPS.filter((g) => g.key !== "stopped" || counts.stopped > 0);
  const max = Math.max(1, ...shown.map((g) => counts[g.key]));
  return (
    <Panel className="flex-1">
      <PanelHeader title="Where your studies are" subtitle={`${total} assigned to you in total`} />
      <PanelBody>
        <ul className="flex flex-col gap-3.5">
          {shown.map((g) => {
            const n = counts[g.key];
            return (
              <li key={g.key}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                  <span className={n > 0 ? "text-white/80" : "text-white/40"}>{g.label}</span>
                  <span className={`font-mono tabular-nums ${n > 0 ? "text-white" : "text-white/30"}`}>{n}</span>
                </div>
                <Meter value={n} max={max} label={`${g.label}: ${n}`} />
              </li>
            );
          })}
        </ul>
      </PanelBody>
    </Panel>
  );
}

// A short reminder of what a review covers (the old panel showed made-up counts of "checks").
const CHECKS = [
  "Re-run the numbers from the analyst's code or output",
  "Assumptions checked and the right test used",
  "Effect sizes and confidence intervals reported",
  "Tables and write-up follow APA 7 and match the output",
  "Every question in the agreement is answered",
];

function WhatToCheckPanel() {
  return (
    <Panel>
      <PanelHeader title="What to check" subtitle="Before you approve a study." />
      <PanelBody>
        <ul className="flex flex-col gap-2">
          {CHECKS.map((c) => (
            <li key={c} className="flex items-start gap-2.5 text-[13px] text-white/70">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-white/40" aria-hidden="true" />
              {c}
            </li>
          ))}
        </ul>
      </PanelBody>
    </Panel>
  );
}

type Filter = "all" | Group;

function StudiesPanel({
  studies,
  counts,
  onLook,
  onCopied,
}: {
  studies: Study[];
  counts: Record<Group, number>;
  onLook: (s: Study) => void;
  onCopied: (id: string) => void;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("urgent");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" jumps to search (unless you're typing somewhere); Esc clears it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const compare = SORTS.find((s) => s.value === sort)!.compare;
    return studies
      .filter(
        (s) =>
          (filter === "all" || groupOf(s) === filter) &&
          (!q ||
            s.projectIntakeId.toLowerCase().includes(q) ||
            s.projectTitle.toLowerCase().includes(q) ||
            (s.projectField ?? "").toLowerCase().includes(q) ||
            s.statistician.fullName.toLowerCase().includes(q)),
      )
      .sort(compare);
  }, [studies, filter, query, sort]);

  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const allTabs: Array<{ key: Filter; label: string; count: number }> = [
    { key: "all", label: "All", count: studies.length },
    ...GROUPS.map((g) => ({ key: g.key, label: g.label, count: counts[g.key] })),
  ];
  const tabs = allTabs.filter((t) => t.key === "all" || t.count > 0 || t.key === filter);

  const clearFilters = () => {
    setFilter("all");
    setQuery("");
    setPage(1);
  };

  const menuFor = (s: Study) => [
    { label: "Details", subtitle: "Questions, goals and files", icon: <Eye size={16} weight="fill" />, onClick: () => onLook(s) },
    { label: "Working files", subtitle: "Every file the analyst uploaded", icon: <Files size={16} weight="fill" />, onClick: () => router.push(filesHref(s)) },
    { label: "Messages", subtitle: "Chat with the client and analyst", icon: <ChatCircleDots size={16} weight="fill" />, onClick: () => router.push(chatHref(s)) },
    {
      label: "Copy study ID",
      subtitle: s.projectIntakeId,
      dividerBefore: true,
      icon: <Copy size={16} weight="fill" />,
      onClick: () => {
        void navigator.clipboard?.writeText(s.projectIntakeId).then(() => onCopied(s.projectIntakeId));
      },
    },
  ];

  const mainButton = (s: Study) =>
    groupOf(s) === "check" ? (
      <Button asChild variant="outline" size="sm" className="active:scale-[0.97]">
        <Link href={reviewHref(s)}>Review</Link>
      </Button>
    ) : (
      <Button asChild variant="outline" size="sm" className="active:scale-[0.97]">
        <Link href={filesHref(s)}>Files</Link>
      </Button>
    );

  return (
    <Panel id="studies" className="scroll-mt-6">
      <PanelHeader title="All my studies" count={studies.length} subtitle="Every study you review, including delivered ones." />
      <div className="mt-4 flex flex-col gap-3 px-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none]" role="tablist" aria-label="Show studies">
          {tabs.map((t) => {
            const active = filter === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setFilter(t.key);
                  setPage(1);
                }}
                className={`inline-flex shrink-0 items-center gap-2 rounded-[2px] px-3 py-1.5 font-sans text-[13px] transition-colors ${
                  active ? "bg-white/[0.08] font-medium text-white" : "text-white/55 hover:text-white"
                }`}
              >
                {t.label}
                <span className={`font-mono text-[11px] ${active ? "text-white/60" : "text-white/35"}`}>{t.count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-[13px] text-white/50">
            <span className="shrink-0">Sort</span>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as SortKey);
                setPage(1);
              }}
              className={`${FIELD} h-9 cursor-pointer px-2.5 [&>option]:bg-[#0A0A18] sm:w-44`}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="relative flex w-full items-center sm:w-64">
            <MagnifyingGlass size={14} weight="bold" className="pointer-events-none absolute left-3 text-white/35" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setQuery("");
                  e.currentTarget.blur();
                }
              }}
              placeholder="Search ID, title, or analyst"
              aria-label="Search my studies"
              className={`${FIELD} h-9 pl-8 pr-9`}
            />
            <kbd className="pointer-events-none absolute right-2.5 rounded-[2px] border border-white/15 px-1.5 font-mono text-[10px] text-white/40">/</kbd>
          </label>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <p className="text-sm text-white/60">{studies.length === 0 ? "No studies assigned to you yet." : "No studies match."}</p>
          {studies.length > 0 ? (
            <Button variant="outline" size="sm" onClick={clearFilters} className="active:scale-[0.97]">
              Clear Filters
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-white/[0.05] border-t border-white/[0.06] md:hidden">
            {pageRows.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 px-5 py-4">
                <div className="flex items-center justify-between gap-2">
                  <CopyButton value={s.projectIntakeId} label={s.projectIntakeId} copiedLabel="Copied" variant="badge" />
                  <span className="text-[12px] text-white/55">{stageText(s)}</span>
                </div>
                <p className="text-sm text-white">{s.projectTitle}</p>
                <p className="-mt-1 text-[13px] text-white/45">Analyst: {s.statistician.fullName}</p>
                <p className="text-[13px]">
                  <DueText s={s} />
                </p>
                <div className="flex items-center justify-end gap-1.5">
                  {mainButton(s)}
                  <DropdownMenu items={menuFor(s)} align="end" />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 hidden overflow-x-auto border-t border-white/[0.06] md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/40">
                  <th className="px-5 py-2.5 font-medium sm:px-6">Study</th>
                  <th className="px-3 py-2.5 font-medium">Stage</th>
                  <th className="px-3 py-2.5 font-medium">Due</th>
                  <th className="px-3 py-2.5 font-medium">Analyst</th>
                  <th className="px-5 py-2.5 sm:px-6" aria-label="Actions" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {pageRows.map((s) => (
                  <tr
                    key={s.id}
                    onMouseEnter={() => router.prefetch(groupOf(s) === "check" ? reviewHref(s) : filesHref(s))}
                    className="align-top transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="max-w-[380px] px-5 py-3.5 sm:px-6">
                      <div className="flex items-center gap-2">
                        <CopyButton value={s.projectIntakeId} label={s.projectIntakeId} copiedLabel="Copied" variant="badge" />
                        {clientPackageName(s.packageName) ? <span className="truncate text-[12px] text-white/40">{clientPackageName(s.packageName)}</span> : null}
                      </div>
                      <p className="mt-1.5 truncate text-sm text-white" title={s.projectTitle}>
                        {s.projectTitle}
                      </p>
                      {s.projectField ? <p className="mt-0.5 truncate text-[13px] text-white/45">{s.projectField}</p> : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-[13px] text-white/75">{stageText(s)}</td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-[13px]">
                      <DueText s={s} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-[13px] text-white/70">{s.statistician.fullName}</td>
                    <td className="whitespace-nowrap px-5 py-3 sm:px-6">
                      <div className="flex items-center justify-end gap-1.5">
                        {mainButton(s)}
                        <DropdownMenu items={menuFor(s)} align="end" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 10 ? (
            <Pagination
              currentPage={page}
              totalItems={rows.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
              itemLabel="studies"
              pageSizeOptions={[10, 20, 50]}
            />
          ) : null}
        </>
      )}
    </Panel>
  );
}
