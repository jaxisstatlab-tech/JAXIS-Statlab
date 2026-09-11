"use client";

import React, { useState, useCallback, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  Card,
  Button,
  Modal,
  KpiCard,
  Badge,
  StatusBadge,
  LoadingState,
  Toast,
  Pagination,
} from "@repo/ui";
import {
  IconPlayerPause,
  IconArrowRight,
  IconLoader2,
  IconRefresh,
  IconCheck,
  IconAlertTriangle,
  IconFileText,
  IconDatabase,
  IconCalendar,
  IconUserCheck,
  IconClock,
  IconChevronDown,
  IconMessages,
} from "@tabler/icons-react";
import { getStatisticianWorkload, requestSlaPause } from "@/features/assignments/actions";
import { getStaffSelfProfile, requestLeave, returnFromLeave } from "@/features/staff/actions";
import { assessBurnoutRisk } from "@/lib/assignment-rules";
import type { AssignmentDetailItem } from "@/features/assignments/schemas";

const LEAVE_REASON_TEMPLATES = [
  {
    label: "Annual Vacation / Personal Rest",
    text: "Taking scheduled annual vacation leave for personal rest and recuperation. Active projects can be monitored or escalated to the QA lead.",
  },
  {
    label: "Sick / Medical Recovery",
    text: "Taking medical recovery leave due to personal health reasons. Will resume statistical duties once medically cleared.",
  },
  {
    label: "Academic Conference Presentation",
    text: "Attending and presenting research at an academic conference with limited connectivity during daytime hours.",
  },
  {
    label: "Family Emergency / Urgent Matters",
    text: "Stepping away temporarily to attend to urgent family matters. Will keep the team updated on expected availability.",
  },
  {
    label: "Research Fieldwork / Data Collection",
    text: "Conducting off-site scientific research fieldwork and data gathering. Analysis will resume upon field mission completion.",
  },
];

interface StatisticianDashboardClientProps {
  initialAssignments: AssignmentDetailItem[];
  initialProfileStatus: string;
  initialLeaveData: { reason?: string | null; until?: string | null } | null;
}

export function StatisticianDashboardClient({
  initialAssignments,
  initialProfileStatus,
  initialLeaveData,
}: StatisticianDashboardClientProps) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<AssignmentDetailItem[]>(initialAssignments);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState<AssignmentDetailItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Pause Request Modal
  const [pauseTarget, setPauseTarget] = useState<AssignmentDetailItem | null>(null);
  const [pauseReason, setPauseReason] = useState("");
  const [pauseError, setPauseError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Leave Management State
  const [profileStatus, setProfileStatus] = useState<string>(initialProfileStatus);
  const [leaveData, setLeaveData] = useState<{ reason?: string | null; until?: string | null } | null>(initialLeaveData);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveReasonInput, setLeaveReasonInput] = useState("");
  const [leaveFromInput, setLeaveFromInput] = useState("");
  const [leaveUntilInput, setLeaveUntilInput] = useState("");
  const [leaveError, setLeaveError] = useState<string | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const loadWorkload = useCallback(async () => {
    setIsLoading(true);
    try {
      const [res, profileRes] = await Promise.all([
        getStatisticianWorkload(),
        getStaffSelfProfile(),
      ]);
      if (res.success && res.data) {
        setAssignments(res.data);
      }
      if (profileRes.success && profileRes.data) {
        setProfileStatus(profileRes.data.status);
        setLeaveData({
          reason: (profileRes.data as { leaveReason?: string | null }).leaveReason,
          until: (profileRes.data as { leaveUntil?: string | null }).leaveUntil,
        });
      }
    } catch (err) {
      console.error("Failed to load workload:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRequestPause = () => {
    if (!pauseTarget) return;
    if (!pauseReason || pauseReason.trim().length < 5) {
      setPauseError("Please specify a reason for the pause request (at least 5 characters).");
      return;
    }

    setPauseError(null);
    startTransition(async () => {
      const res = await requestSlaPause({
        projectId: pauseTarget.projectId,
        reason: pauseReason.trim(),
      });
      if (res.success) {
        setPauseTarget(null);
        setPauseReason("");
        loadWorkload();
        setToastMessage({
          message: "Pause Request Submitted",
          description: "Administrative governance team will review your SLA freeze request.",
          variant: "info",
        });
      } else {
        setPauseError(res.error?.message || "Failed to submit pause request.");
      }
    });
  };

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const isReturnBeforeStart = useMemo(() => {
    if (!leaveFromInput || !leaveUntilInput) return false;
    return leaveUntilInput < leaveFromInput;
  }, [leaveFromInput, leaveUntilInput]);

  const isStartInPast = useMemo(() => {
    if (!leaveFromInput) return false;
    return leaveFromInput < todayStr;
  }, [leaveFromInput, todayStr]);

  const calculatedDays = useMemo(() => {
    if (!leaveFromInput || !leaveUntilInput || isReturnBeforeStart) return null;
    const start = new Date(leaveFromInput);
    const end = new Date(leaveUntilInput);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff);
  }, [leaveFromInput, leaveUntilInput, isReturnBeforeStart]);

  const handleLeaveFromChange = (val: string) => {
    setLeaveFromInput(val);
    setLeaveError(null);
    // Auto-advance return date if it falls behind new start date
    if (leaveUntilInput && leaveUntilInput < val) {
      const nextDay = new Date(val);
      nextDay.setDate(nextDay.getDate() + 1);
      setLeaveUntilInput(nextDay.toISOString().split("T")[0]!);
    }
  };

  const handleLeaveUntilChange = (val: string) => {
    setLeaveUntilInput(val);
    setLeaveError(null);
  };

  const openLeaveModal = () => {
    setLeaveError(null);
    setLeaveReasonInput("");
    setLeaveFromInput(todayStr);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setLeaveUntilInput(tomorrow.toISOString().split("T")[0]!);
    setIsLeaveModalOpen(true);
  };

  const handleRequestLeave = () => {
    if (!leaveReasonInput.trim()) {
      setLeaveError("Please state a reason for your leave request.");
      return;
    }
    const today = new Date().toISOString().split("T")[0]!;
    const isStartInPast = Boolean(leaveFromInput && leaveFromInput < today);
    const isReturnBeforeStart = Boolean(
      leaveFromInput && leaveUntilInput && leaveUntilInput < leaveFromInput
    );
    if (isStartInPast) {
      setLeaveError("Leave start date cannot be in the past.");
      return;
    }
    if (isReturnBeforeStart) {
      setLeaveError("Expected return date cannot be earlier than leave start date.");
      return;
    }
    setLeaveError(null);
    startTransition(async () => {
      const res = await requestLeave({
        reason: leaveReasonInput.trim(),
        leaveFrom: leaveFromInput ? new Date(leaveFromInput).toISOString() : undefined,
        leaveUntil: leaveUntilInput ? new Date(leaveUntilInput).toISOString() : undefined,
      });
      if (res.success) {
        setIsLeaveModalOpen(false);
        setLeaveReasonInput("");
        setLeaveUntilInput("");
        window.dispatchEvent(new CustomEvent("leave-status-updated"));
        window.dispatchEvent(new CustomEvent("shift-status-updated"));
        loadWorkload();
        setToastMessage({
          message: "Leave Request Submitted",
          description: "Your request has been sent for HR review.",
          variant: "info",
        });
      } else {
        setLeaveError(res.error?.message || "Failed to submit leave request.");
      }
    });
  };

  const handleReturnFromLeave = () => {
    startTransition(async () => {
      const res = await returnFromLeave();
      if (res.success) {
        window.dispatchEvent(new CustomEvent("leave-status-updated"));
        window.dispatchEvent(new CustomEvent("shift-status-updated"));
        loadWorkload();
        setToastMessage({
          message: profileStatus === "LEAVE_PENDING" ? "Leave Request Cancelled" : "Welcome Back",
          description: profileStatus === "LEAVE_PENDING" ? "Your pending leave request has been cancelled." : "You are now marked as available for assignments.",
          variant: "success",
        });
      } else {
        setToastMessage({
          message: "Action Failed",
          description: res.error?.message || "Could not update availability status.",
          variant: "danger",
        });
      }
    });
  };

  const urgentCount = assignments.filter((a) => a.isUrgent || a.isOverdue).length;
  const pausedCount = assignments.filter((a) => a.isPaused).length;
  const burnoutRisk = assessBurnoutRisk(assignments);

  // Prioritize active work requiring statistician action to the top
  const sortedAssignments = useMemo(() => {
    return [...assignments].sort((a, b) => {
      // 1. Studies needing revisions or corrections from QA
      const aIsRevision = a.masterStatus === "QA_REVISION" || a.masterStatus === "REVISION_REQUESTED";
      const bIsRevision = b.masterStatus === "QA_REVISION" || b.masterStatus === "REVISION_REQUESTED";
      if (aIsRevision && !bIsRevision) return -1;
      if (!aIsRevision && bIsRevision) return 1;

      // 2. Urgent / Overdue studies
      const aIsUrgent = a.isOverdue || a.isUrgent;
      const bIsUrgent = b.isOverdue || b.isUrgent;
      if (aIsUrgent && !bIsUrgent) return -1;
      if (!aIsUrgent && bIsUrgent) return 1;

      // 3. Active in-progress runs
      const aIsWorking = a.masterStatus === "IN_PROGRESS";
      const bIsWorking = b.masterStatus === "IN_PROGRESS";
      if (aIsWorking && !bIsWorking) return -1;
      // 4. Secondary sort: newest assigned first
      const dateA = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
      const dateB = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [assignments]);

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans">
      {/* Page Header */}
      <PageHeader
        title="Statistician Workbench"
        description="View assigned research studies, run analysis, and submit results for QA review."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "My Projects" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadWorkload}
              className="gap-2 font-sans font-semibold rounded-[2px]"
            >
              <IconRefresh size={15} stroke={2} />
              <span>Refresh</span>
            </Button>
            {profileStatus === "ON_LEAVE" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReturnFromLeave}
                disabled={isPending}
                className="font-sans text-xs font-semibold rounded-[2px] bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30 gap-1.5 cursor-pointer"
              >
                <IconUserCheck size={14} stroke={2} />
                <span>Return to Work</span>
              </Button>
            ) : profileStatus === "LEAVE_PENDING" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReturnFromLeave}
                disabled={isPending}
                className="font-sans text-xs font-semibold rounded-[2px] bg-amber-600/20 text-amber-300 border-amber-500/40 hover:bg-amber-600/30 gap-1.5 cursor-pointer"
              >
                <IconClock size={14} stroke={2} />
                <span>Withdraw Leave Request</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={openLeaveModal}
                className="font-sans text-xs font-semibold rounded-[2px] gap-1.5 text-white/70 hover:text-white cursor-pointer"
              >
                <IconCalendar size={14} stroke={2} />
                <span>Request Leave</span>
              </Button>
            )}
            <Link href="/dashboard/statistician/profile">
              <Button variant="outline" size="sm" className="font-sans text-xs font-semibold rounded-[2px] cursor-pointer">
                Specialization Profile
              </Button>
            </Link>
          </div>
        }
      />

      {/* Leave Request Pending HR Approval Banner */}
      {profileStatus === "LEAVE_PENDING" && (
        <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-amber-200">
          <div className="flex items-start gap-3">
            <IconClock size={18} stroke={2} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-amber-300 block text-sm">Leave Request Pending HR Approval</span>
                <Badge variant="amber" className="text-[0.625rem] py-0 px-1 font-mono">Awaiting Review</Badge>
              </div>
              <p className="text-white/80 mt-1 leading-relaxed">
                {leaveData?.reason ? `Reason: "${leaveData.reason}". ` : ""}
                {leaveData?.until
                  ? `Scheduled return: ${new Date(leaveData.until).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}. `
                  : ""}
                Your leave request has been submitted and is awaiting formal acknowledgment from the Finance Officer (HR) / Admin. You remain active until HR approval is granted.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReturnFromLeave}
            disabled={isPending}
            className="font-sans text-xs font-semibold rounded-[2px] shrink-0 text-amber-300 border-amber-500/40 hover:bg-amber-500/10 cursor-pointer"
          >
            Cancel / Withdraw Request
          </Button>
        </div>
      )}

      {/* On Leave Status Banner */}
      {profileStatus === "ON_LEAVE" && (
        <div className="p-4 bg-purple-950/40 border border-purple-500/40 rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-purple-200">
          <div className="flex items-start gap-3">
            <IconClock size={18} stroke={2} className="text-purple-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-purple-300 block text-sm">Specialist On Leave Status Active</span>
              <p className="text-white/80 mt-0.5 leading-relaxed">
                {leaveData?.reason ? `Reason: "${leaveData.reason}". ` : ""}
                {leaveData?.until
                  ? `Scheduled return: ${new Date(leaveData.until).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}. `
                  : ""}
                New study assignments are paused and you are hidden from the assignment directory.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleReturnFromLeave}
            disabled={isPending}
            className="font-sans text-xs font-semibold rounded-[2px] shrink-0 cursor-pointer"
          >
            End Leave Now
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
        <KpiCard
          label="Assigned Analyses"
          value={assignments.length}
          variant="sky"
          description="Active computation pipelines"
        />

        <KpiCard
          label="Pre-Deadline Alerts"
          value={urgentCount}
          variant={urgentCount > 0 ? "amber" : "default"}
          description={urgentCount > 0 ? "Due within 24 hours or overdue" : "All deliverables on schedule"}
        />

        <KpiCard
          label="SLA Paused Pipelines"
          value={pausedCount}
          variant={pausedCount > 0 ? "amber" : "emerald"}
          description={pausedCount > 0 ? "Awaiting client clarification" : "Zero delays flagged"}
        />
      </div>

      {/* Burnout & Workload Alert Banner */}
      {burnoutRisk.isAtRisk && (
        <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-[2px] flex items-start gap-3 text-xs text-amber-200">
          <IconAlertTriangle size={18} stroke={2} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-amber-300">Workload &amp; Burnout Protection Active</span>
            <span className="text-white/80 leading-relaxed">
              {burnoutRisk.reasons.join(". ")}. Your wellbeing is protected under JAXIS workload policies. If client clarifications or missing datasets are slowing you down, use the &ldquo;Request Pause&rdquo; button to freeze your SLA countdown timer without penalty.
            </span>
          </div>
        </div>
      )}

      {/* Assigned Workbench Projects */}
      <Card className="p-0 overflow-hidden border border-white/10 bg-[#01142B]/90 rounded-[2px]">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white font-sans">
              Assigned Statistical Runs &amp; Computations
            </h2>
            <p className="text-sm text-white/60 mt-1 font-sans">
              Execute analytical models, track contractual turnaround timers, and upload verified syntax
            </p>
          </div>
          <span className="text-xs font-mono text-white/50">{assignments.length} Active Studies</span>
        </div>

        {isLoading ? (
          <LoadingState
            variant="table"
            label="Loading computational workbench..."
            description="Retrieving assigned models, datasets, and SLA telemetry."
          />
        ) : assignments.length === 0 ? (
          <div className="p-12 text-center text-white/50 text-sm font-sans flex flex-col items-center justify-center gap-2">
            <IconCheck size={32} stroke={1.5} className="text-[#10B981]" />
            <span className="font-semibold text-white">No Pending Runs Assigned</span>
            <span className="text-xs text-white/40">New projects assigned by the Administration will appear here with live SLA countdowns.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Study ID &amp; Package</th>
                  <th className="py-3 px-4">Research &amp; Specialist</th>
                  <th className="py-3 px-4">SLA Countdown</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {sortedAssignments.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item) => {
                  const isRevision = item.masterStatus === "QA_REVISION" || item.masterStatus === "REVISION_REQUESTED";

                  return (
                    <tr
                      key={item.id}
                      onMouseEnter={() =>
                        router.prefetch(`/dashboard/statistician/projects/${item.projectId}/workbench`)
                      }
                      className={`transition-colors virtual-row ${
                        isRevision
                          ? "bg-[#F59E0B]/[0.03] hover:bg-[#F59E0B]/[0.06] border-l-2 border-l-[#F59E0B]"
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-[#CC6600] font-semibold">
                            {item.projectIntakeId}
                          </span>
                          <span className="text-[0.688rem] text-white/40 font-mono tracking-wide mt-0.5">
                            {item.projectMethod || "JX 03 CORE"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 min-w-0">
                        <p className="font-semibold text-white text-sm line-clamp-1" title={item.projectTitle}>
                          {item.projectTitle}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-white/50 mt-0.5">
                          <span className="truncate max-w-[160px] sm:max-w-[220px]">
                            {item.projectField || "Empirical Research"}
                          </span>
                          <span className="text-white/20">•</span>
                          <span className="text-white/70 truncate">QA: {item.qaLead.fullName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge
                            variant={
                              item.isPaused
                                ? "amber"
                                : item.isOverdue
                                ? "danger"
                                : item.isUrgent
                                ? "amber"
                                : "emerald"
                            }
                            className="font-mono text-[0.688rem] py-0.5 px-1.5"
                          >
                            {item.slaLabel}
                          </Badge>
                          <span className="text-[0.688rem] text-white/40 font-mono">
                            Due: {new Date(item.slaDueAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={item.masterStatus} />
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!item.isPaused && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setPauseTarget(item)}
                              title="Request SLA Pause"
                              className="font-sans text-xs h-7 px-2 rounded-[2px] text-amber-300 border-amber-500/30 hover:bg-amber-500/10 gap-1"
                            >
                              <IconPlayerPause size={12} stroke={2} />
                              <span className="hidden sm:inline">Pause</span>
                            </Button>
                          )}
                          <Link href={`/dashboard/statistician/projects/${item.projectId}/workbench`}>
                            <Button
                              variant="primary"
                              size="sm"
                              className="font-sans text-xs font-semibold h-7 px-2.5 rounded-[2px] gap-1 cursor-pointer bg-[#CC6600] hover:bg-[#CC6600]/90 text-white shadow-sm"
                            >
                              <span>Workbench</span>
                              <IconArrowRight size={12} stroke={2} />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {sortedAssignments.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={sortedAssignments.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="assignments"
          />
        )}
      </Card>

      {/* ── Statistical Computational Desk Modal ── */}
      {selectedStudy && (
        <Modal
          open={!!selectedStudy}
          onClose={() => setSelectedStudy(null)}
          title={`Statistical Analysis Desk: ${selectedStudy.projectIntakeId}`}
          description={selectedStudy.projectTitle}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              {!selectedStudy.isPaused ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setPauseTarget(selectedStudy);
                    setSelectedStudy(null);
                  }}
                  className="font-sans text-xs rounded-[2px] text-amber-300 border-amber-500/30 hover:bg-amber-500/10 gap-1.5"
                >
                  <IconPlayerPause size={14} stroke={2} />
                  <span>Request SLA Freeze</span>
                </Button>
              ) : (
                <span className="text-xs font-mono text-amber-400">SLA Timer Currently Frozen</span>
              )}
              <div className="flex items-center gap-2">
                <Link href={`/dashboard/statistician/projects/${selectedStudy.projectId}/messages`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-sans text-xs rounded-[2px] gap-1.5"
                  >
                    <IconMessages size={14} stroke={2} className="text-sky-400" />
                    <span>Consultation</span>
                  </Button>
                </Link>
                <Link href={`/dashboard/statistician/projects/${selectedStudy.projectId}/workbench`}>
                  <Button
                    variant="primary"
                    size="sm"
                    className="font-sans text-xs font-semibold rounded-[2px] gap-1.5 cursor-pointer"
                  >
                    <span>Launch Workbench</span>
                    <IconArrowRight size={14} stroke={2} />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStudy(null)}
                  className="font-sans text-xs rounded-[2px]"
                >
                  Close
                </Button>
              </div>
            </div>
          }
        >
          <div className="flex flex-col gap-6 text-sm font-sans text-white/90">
            {/* Status & SLA Bar */}
            <div className="p-4 rounded-[2px] bg-white/[0.02] border border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Badge variant="sky" className="font-mono text-xs">
                  {selectedStudy.masterStatus}
                </Badge>
                <Badge
                  variant={
                    selectedStudy.isPaused
                      ? "amber"
                      : selectedStudy.isOverdue
                      ? "danger"
                      : selectedStudy.isUrgent
                      ? "amber"
                      : "emerald"
                  }
                  className="font-mono text-xs"
                >
                  {selectedStudy.slaLabel}
                </Badge>
              </div>

              <div className="text-right">
                <span className="text-[0.688rem] text-white/50 block font-mono">Contractual Deadline</span>
                <span className="text-xs font-mono font-semibold text-white">
                  {new Date(selectedStudy.slaDueAt).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            {/* Specialist Assignments Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-1">
                <span className="text-[0.688rem] font-mono uppercase text-white/40 font-semibold">Assigned QA Lead</span>
                <span className="text-xs font-semibold text-white">{selectedStudy.qaLead.fullName}</span>
                <span className="text-[0.688rem] text-white/50">{selectedStudy.qaLead.email}</span>
              </div>
              <div className="p-3.5 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-1">
                <span className="text-[0.688rem] font-mono uppercase text-white/40 font-semibold">Selected Package</span>
                <span className="text-xs font-semibold text-[#CC6600]">
                  {selectedStudy.projectMethod || "Empirical Statistical Analysis"}
                </span>
                <span className="text-[0.688rem] text-white/50">{selectedStudy.projectField || "Academic Research"}</span>
              </div>
            </div>

            {/* Research Objectives & Questions */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-mono font-semibold uppercase text-white/50 tracking-wider flex items-center gap-1.5">
                <IconFileText size={15} stroke={2} className="text-[#38BDF8]" />
                <span>Research Scope &amp; Objectives</span>
              </span>
              <div className="p-4 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-3 text-xs leading-relaxed text-slate-200">
                <div>
                  <span className="font-semibold text-white/80 block mb-0.5 font-mono text-[0.688rem]">Research Questions:</span>
                  <p>{selectedStudy.researchQuestions || "1. What is the primary statistical effect? 2. Are variances homogeneous across comparison cohorts?"}</p>
                </div>
                {selectedStudy.hypotheses && (
                  <div>
                    <span className="font-semibold text-white/80 block mb-0.5 font-mono text-[0.688rem]">Stated Hypotheses:</span>
                    <p>{selectedStudy.hypotheses}</p>
                  </div>
                )}
                <div>
                  <span className="font-semibold text-white/80 block mb-0.5 font-mono text-[0.688rem]">Analytical Objective:</span>
                  <p>{selectedStudy.researchObjectives || "Establish empirical significance at alpha = 0.05 with validated normality and homoscedasticity diagnostics."}</p>
                </div>
              </div>
            </div>

            {/* Datasets & Artifacts */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-mono font-semibold uppercase text-white/50 tracking-wider flex items-center gap-1.5">
                <IconDatabase size={15} stroke={2} className="text-[#10B981]" />
                <span>Verified Client Datasets &amp; Documentation</span>
              </span>
              {selectedStudy.files && selectedStudy.files.length > 0 ? (
                <div className="space-y-2">
                  {selectedStudy.files.map((file) => (
                    <div
                      key={file.id}
                      className="p-3 bg-[#01142B] border border-white/10 rounded-[2px] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <IconDatabase size={16} stroke={1.5} className="text-sky-400 shrink-0" />
                        <span className="font-medium text-white truncate">{file.fileName}</span>
                      </div>
                      <Badge variant="sky" className="font-mono text-[0.625rem]">
                        {file.fileCategory}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-[#01142B] border border-white/10 rounded-[2px] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <IconDatabase size={16} stroke={1.5} className="text-sky-400" />
                    <span>Raw_Dataset_Verified.xlsx (2.4 MB)</span>
                  </div>
                  <Badge variant="emerald" className="font-mono text-[0.625rem]">
                    VERIFIED INPUT
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Request SLA Pause Modal */}
      {pauseTarget && (
        <Modal
          open={!!pauseTarget}
          onClose={() => setPauseTarget(null)}
          title="Request SLA Timer Freeze"
          description={`Study: ${pauseTarget.projectTitle}`}
          size="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button variant="secondary" size="sm" onClick={() => setPauseTarget(null)} disabled={isPending}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRequestPause}
                disabled={isPending}
                className="font-sans text-xs font-semibold rounded-[2px]"
              >
                {isPending ? (
                  <IconLoader2 size={15} className="animate-spin" />
                ) : (
                  <span>Submit Freeze Request</span>
                )}
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-4 text-xs font-sans text-white/80">
            {pauseError && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-[2px] text-red-200">
                {pauseError}
              </div>
            )}

            <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-[2px] flex items-start gap-2.5 text-amber-200">
              <IconAlertTriangle size={16} stroke={2} className="text-amber-400 shrink-0 mt-0.5" />
              <span>
                SLA pauses freeze the contractual delivery timer while awaiting critical researcher responses, dataset corrections, or survey clarifications.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-white/90">
                Reason for Pause Request (Mandatory)
              </label>
              <textarea
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="Detail the exact missing data or clarification required from the Lead Researcher..."
                className="w-full bg-[#01142B] border border-white/10 rounded-[2px] p-3 text-xs text-white placeholder-white/40 focus:border-[#CC6600] outline-none resize-none h-24 font-sans"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Request Leave Modal */}
      {isLeaveModalOpen && (
        <Modal
          open={isLeaveModalOpen}
          onClose={() => setIsLeaveModalOpen(false)}
          title="Schedule Specialist Leave"
          description="Pause assignment intake and declare your unavailable period."
          size="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsLeaveModalOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRequestLeave}
                disabled={isPending}
                className="font-sans text-xs font-semibold rounded-[2px]"
              >
                {isPending ? (
                  <IconLoader2 size={15} className="animate-spin" />
                ) : (
                  <IconCheck size={15} stroke={2} />
                )}
                <span>Submit Leave Request</span>
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-4 text-xs font-sans text-white/80">
            {leaveError && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-[2px] text-red-200">
                {leaveError}
              </div>
            )}

            <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-[2px] flex items-start gap-2.5 text-amber-200">
              <IconClock size={16} stroke={2} className="text-amber-400 shrink-0 mt-0.5" />
              <span>
                Submitting this request will queue your leave for Finance Officer (HR) and Administrator approval. Once acknowledged and approved, your leave status will be activated and you will be hidden from new study assignments.
              </span>
            </div>

            {/* Reason for Leave with Dropdown Selector */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-white/90">
                  Reason for Leave (Mandatory)
                </label>
                <span className="text-[0.625rem] text-purple-300/60 font-mono">
                  Select template or enter custom note
                </span>
              </div>

              {/* Template Dropdown */}
              <div className="relative">
                <select
                  value={LEAVE_REASON_TEMPLATES.find((t) => t.text === leaveReasonInput)?.text || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      setLeaveReasonInput(e.target.value);
                    }
                  }}
                  className="w-full bg-[#01142B] border border-white/15 rounded-[2px] px-3 py-2 text-xs text-white/90 focus:border-[#CC6600] focus:ring-0 outline-none cursor-pointer appearance-none pr-8 transition-colors font-sans hover:border-white/30"
                >
                  <option value="" className="bg-[#01142B] text-white/50">
                    Select standard reason template...
                  </option>
                  {LEAVE_REASON_TEMPLATES.map((tmpl) => (
                    <option
                      key={tmpl.label}
                      value={tmpl.text}
                      className="bg-[#01142B] text-white"
                    >
                      {tmpl.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-white/40">
                  <IconChevronDown size={14} />
                </div>
              </div>

              {/* Free-text Reason Input */}
              <textarea
                value={leaveReasonInput}
                onChange={(e) => setLeaveReasonInput(e.target.value)}
                placeholder="State specific circumstances, emergency details, or operational notes for the team..."
                className="w-full bg-[#01142B] border border-white/10 rounded-[2px] p-3 text-xs text-white placeholder-white/40 focus:border-[#CC6600] outline-none resize-none h-20 font-sans"
              />
            </div>

            {/* Leave Duration Date Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-white/90">
                  Leave Start Date
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={leaveFromInput}
                  onChange={(e) => handleLeaveFromChange(e.target.value)}
                  className={`w-full bg-[#01142B] border rounded-[2px] p-2.5 text-xs text-white outline-none font-mono transition-colors [color-scheme:dark] ${
                    isStartInPast
                      ? "border-red-500/60 focus:border-red-500"
                      : "border-white/10 focus:border-[#CC6600]"
                  }`}
                />
                {isStartInPast && (
                  <span className="text-[0.688rem] text-red-400 font-sans">
                    Start date cannot be in the past.
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-white/90">
                    Expected Return Date
                  </label>
                  {calculatedDays !== null && (
                    <span className="text-[0.688rem] font-mono text-purple-300 font-semibold">
                      {calculatedDays} {calculatedDays === 1 ? "day" : "days"} duration
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  min={leaveFromInput || todayStr}
                  value={leaveUntilInput}
                  onChange={(e) => handleLeaveUntilChange(e.target.value)}
                  className={`w-full bg-[#01142B] border rounded-[2px] p-2.5 text-xs text-white outline-none font-mono transition-colors [color-scheme:dark] ${
                    isReturnBeforeStart
                      ? "border-red-500/60 focus:border-red-500"
                      : "border-white/10 focus:border-[#CC6600]"
                  }`}
                />
                {isReturnBeforeStart && (
                  <span className="text-[0.688rem] text-red-400 font-sans">
                    Return date cannot be earlier than start date.
                  </span>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast Notification */}
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
