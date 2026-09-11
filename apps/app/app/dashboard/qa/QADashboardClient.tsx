"use client";

import React, { useState, useCallback, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  Card,
  Button,
  KpiCard,
  Badge,
  LoadingState,
  Modal,
  Toast,
  Pagination,
} from "@repo/ui";
import {
  IconCheck,
  IconRefresh,
  IconArrowRight,
  IconDatabase,
  IconShieldCheck,
  IconCalendar,
  IconUserCheck,
  IconClock,
  IconLoader2,
  IconChevronDown,
  IconAlertOctagon,
} from "@tabler/icons-react";
import { getQaWorkload } from "@/features/assignments/actions";
import { getStaffSelfProfile, requestLeave, returnFromLeave } from "@/features/staff/actions";
import type { AssignmentDetailItem } from "@/features/assignments/schemas";

const LEAVE_REASON_TEMPLATES = [
  {
    label: "Annual Vacation / Personal Rest",
    text: "Taking scheduled annual vacation leave for personal rest and recuperation. Inquiries may be escalated to the active reviewer or administrator.",
  },
  {
    label: "Sick / Medical Recovery",
    text: "Taking medical recovery leave due to health concerns. Will resume quality assurance reviews once cleared.",
  },
  {
    label: "Academic Conference Presentation",
    text: "Attending and presenting research at an academic conference with limited daytime availability.",
  },
  {
    label: "Family Emergency / Urgent Matters",
    text: "Attending to an urgent family situation requiring immediate off-platform availability.",
  },
  {
    label: "Research Fieldwork / Data Collection",
    text: "Conducting off-site scientific research fieldwork and empirical data collection. QA duties will resume upon return.",
  },
];

interface QADashboardClientProps {
  initialAssignments: AssignmentDetailItem[];
  initialProfileStatus: string;
  initialLeaveData: { reason?: string | null; until?: string | null } | null;
}

export function QADashboardClient({
  initialAssignments,
  initialProfileStatus,
  initialLeaveData,
}: QADashboardClientProps) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<AssignmentDetailItem[]>(initialAssignments);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState<AssignmentDetailItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
        getQaWorkload(),
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
      console.error("Failed to load QA workload:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    if (!leaveReasonInput || leaveReasonInput.trim().length < 3) {
      setLeaveError("Please specify a reason for your leave (at least 3 characters).");
      return;
    }
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
          description: "Your request is queued for Finance Officer (HR) / Administrator review.",
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

  // Option 1: Only show submitted studies (FOR_QA) or studies under active QA revision (QA_REVISION)
  const qaQueueAssignments = useMemo(() => {
    return assignments.filter(
      (a) => a.masterStatus === "FOR_QA" || a.masterStatus === "QA_REVISION"
    );
  }, [assignments]);

  const urgentCount = qaQueueAssignments.filter((a) => a.isUrgent || a.isOverdue).length;

  // Prioritize studies ready for QA evaluation (FOR_QA) to the top of the queue
  const sortedAssignments = useMemo(() => {
    return [...qaQueueAssignments].sort((a, b) => {
      // 1. FOR_QA is highest priority (Ready for QA evaluation / Go Signal)
      const aIsForQa = a.masterStatus === "FOR_QA";
      const bIsForQa = b.masterStatus === "FOR_QA";
      if (aIsForQa && !bIsForQa) return -1;
      if (!aIsForQa && bIsForQa) return 1;

      // 2. QA_REVISION is second priority (Under active 24h revision)
      const aIsRevision = a.masterStatus === "QA_REVISION";
      const bIsRevision = b.masterStatus === "QA_REVISION";
      if (aIsRevision && !bIsRevision) return -1;
      if (!aIsRevision && bIsRevision) return 1;

      // 3. Urgent / Overdue studies
      const aIsUrgent = a.isOverdue || a.isUrgent;
      const bIsUrgent = b.isOverdue || b.isUrgent;
      if (aIsUrgent && !bIsUrgent) return -1;
      // 4. Secondary sort: newest assigned first
      const dateA = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
      const dateB = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [qaQueueAssignments]);

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans">
      {/* Page Header */}
      <PageHeader
        title="QA Review Desk"
        description="Review study calculations, check formatting, and approve files for release."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "QA Reviews" },
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
            <Link href="/dashboard/qa/profile">
              <Button variant="outline" size="sm" className="font-sans text-xs font-semibold rounded-[2px] cursor-pointer">
                My Profile
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
                New verification assignments are paused and you are hidden from the assignment directory.
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <KpiCard
          label="Pending QA Review"
          value={assignments.filter((a) => a.masterStatus === "FOR_QA").length}
          variant="sky"
          description="Awaiting verification scorecard"
        />

        <KpiCard
          label="Under Revision"
          value={assignments.filter((a) => a.masterStatus === "QA_REVISION").length}
          variant={assignments.some((a) => a.masterStatus === "QA_REVISION") ? "amber" : "default"}
          description="24-hr statistician correction"
        />

        <KpiCard
          label="Quality Cleared"
          value={assignments.filter((a) => a.masterStatus === "DELIVERED").length}
          variant="emerald"
          description="Passed dual-blind verification"
        />

        <KpiCard
          label="Urgent Milestones"
          value={urgentCount}
          variant={urgentCount > 0 ? "red" : "default"}
          description={urgentCount > 0 ? "Due within 24 hours" : "All reviews on schedule"}
        />
      </div>

      {/* Assigned QA Studies */}
      <Card className="p-0 overflow-hidden border border-white/10 bg-[#01142B]/90 rounded-[2px]">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white font-sans">
              Quality Assurance &amp; Deliverable Verification Queue
            </h2>
            <p className="text-sm text-white/60 mt-1 font-sans">
              Conduct dual-blind statistical recalculation, inspect notebooks, and validate APA 7th format compliance
            </p>
          </div>
          <span className="text-xs font-mono text-white/50">{sortedAssignments.length} Studies in Queue</span>
        </div>

        {isLoading ? (
          <LoadingState
            variant="table"
            label="Loading QA verification queue..."
            description="Retrieving assigned studies, verification records, and SLA timers."
          />
        ) : sortedAssignments.length === 0 ? (
          <div className="p-12 text-center text-white/50 text-sm font-sans flex flex-col items-center justify-center gap-2">
            <IconCheck size={32} stroke={1.5} className="text-[#10B981]" />
            <span className="font-semibold text-white">No Studies Pending QA Review</span>
            <span className="text-xs text-white/40">Studies assigned to your QA desk will appear here as soon as statisticians submit outputs for review.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Study ID</th>
                  <th className="py-3 px-4">Research &amp; Statistician</th>
                  <th className="py-3 px-4">SLA Countdown</th>
                  <th className="py-3 px-4">Master Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {sortedAssignments.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item) => {
                  const isReadyForQa = item.masterStatus === "FOR_QA";
                  const isUnderRevision = item.masterStatus === "QA_REVISION";

                  return (
                    <tr
                      key={item.id}
                      onMouseEnter={() =>
                        router.prefetch(
                           isReadyForQa
                            ? `/dashboard/qa/projects/${item.projectId}/review`
                            : `/dashboard/qa/projects/${item.projectId}/files`
                        )
                      }
                      className={`transition-colors virtual-row ${
                        isReadyForQa
                          ? "bg-[#10B981]/[0.06] hover:bg-[#10B981]/[0.10] border-l-4 border-l-[#10B981]"
                          : isUnderRevision
                          ? "bg-[#F59E0B]/[0.03] hover:bg-[#F59E0B]/[0.06] border-l-2 border-l-[#F59E0B]"
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono text-xs text-[#CC6600] font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isReadyForQa && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse shrink-0" />
                          )}
                          <span>{item.projectIntakeId}</span>
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
                          <span className="text-white/70 truncate">{item.statistician.fullName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
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
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {(() => {
                          if (item.masterStatus === "FOR_QA") {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] font-mono text-xs font-bold bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/50 shadow-[0_0_12px_rgba(16,185,129,0.15)] select-none">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
                                </span>
                                <span>FOR_QA • READY</span>
                              </span>
                            );
                          }
                          if (item.masterStatus === "QA_REVISION") {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] font-mono text-xs font-semibold bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/40 select-none">
                                <IconClock size={13} stroke={2} />
                                <span>QA_REVISION</span>
                              </span>
                            );
                          }
                          if (
                            item.masterStatus === "QA_APPROVED" ||
                            item.masterStatus === "DELIVERED" ||
                            item.masterStatus === "CLOSED"
                          ) {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] font-mono text-xs font-semibold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 select-none">
                                <IconCheck size={13} stroke={2} />
                                <span>{item.masterStatus === "QA_APPROVED" ? "QA_APPROVED" : "APPROVED"}</span>
                              </span>
                            );
                          }
                          if (
                            item.masterStatus === "ETHICAL_BREACH" ||
                            item.masterStatus === "CANCELLED" ||
                            item.masterStatus === "HALTED"
                          ) {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] font-mono text-xs font-bold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/40 select-none">
                                <IconAlertOctagon size={13} stroke={2} />
                                <span>{item.masterStatus}</span>
                              </span>
                            );
                          }
                          if (item.masterStatus === "IN_PROGRESS") {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] font-mono text-xs font-semibold bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 select-none">
                                <span>IN_PROGRESS</span>
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] font-mono text-xs font-medium bg-white/5 text-white/50 border border-white/10 select-none">
                              <span>{item.masterStatus}</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isReadyForQa ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/dashboard/qa/projects/${item.projectId}/files`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="font-sans text-xs h-7 px-2 rounded-[2px] cursor-pointer"
                              >
                                <span>Files</span>
                              </Button>
                            </Link>
                            <Link href={`/dashboard/qa/projects/${item.projectId}/review`}>
                              <Button
                                variant="primary"
                                size="sm"
                                className="font-sans text-xs font-semibold h-7 px-2.5 rounded-[2px] gap-1 cursor-pointer bg-[#CC6600] hover:bg-[#CC6600]/90 text-white shadow-sm"
                              >
                                <span>Evaluate &amp; Score</span>
                                <IconArrowRight size={12} stroke={2} />
                              </Button>
                            </Link>
                          </div>
                        ) : isUnderRevision ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/dashboard/qa/projects/${item.projectId}/files`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="font-sans text-xs h-7 px-2 rounded-[2px] cursor-pointer"
                              >
                                <span>Files</span>
                              </Button>
                            </Link>
                            <span className="text-[0.688rem] text-[#F59E0B] font-mono py-0.5 px-1.5 border border-[#F59E0B]/30 rounded-[2px]">
                              Awaiting Re-run
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedStudy(item)}
                              className="font-sans text-xs h-7 px-2 rounded-[2px]"
                            >
                              <span>View Run</span>
                            </Button>
                            <Link href={`/dashboard/qa/projects/${item.projectId}/files`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="font-sans text-xs h-7 px-2 rounded-[2px] cursor-pointer"
                              >
                                <span>Files</span>
                              </Button>
                            </Link>
                          </div>
                        )}
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
            itemLabel="studies"
          />
        )}
      </Card>

      {/* ── Read-Only Modal for In-Progress Studies ── */}
      {selectedStudy && (
        <Modal
          open={!!selectedStudy}
          onClose={() => setSelectedStudy(null)}
          title={`Active Pipeline: ${selectedStudy.projectIntakeId}`}
          description={selectedStudy.projectTitle}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-white/50 font-sans">
                Status: <strong className="text-white">{selectedStudy.masterStatus}</strong>
              </span>
              <div className="flex items-center gap-2">
                <Link href={`/dashboard/qa/projects/${selectedStudy.projectId}/files`}>
                  <Button variant="outline" size="sm" className="font-sans text-xs rounded-[2px]">
                    Inspect Repository Files
                  </Button>
                </Link>
                <Button
                  variant="secondary"
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
            {/* Status & SLA Details */}
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
                <span className="text-[0.688rem] text-white/50 block font-mono">Contractual Delivery Timer</span>
                <span className="text-xs font-mono font-semibold text-white">
                  Due: {new Date(selectedStudy.slaDueAt).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            {/* Team Personnel Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-1">
                <span className="text-[0.688rem] font-mono uppercase text-white/40 font-semibold">Assigned Statistician</span>
                <span className="text-xs font-semibold text-white">{selectedStudy.statistician.fullName}</span>
                <span className="text-[0.688rem] text-white/50">{selectedStudy.statistician.email}</span>
              </div>
              <div className="p-3.5 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-1">
                <span className="text-[0.688rem] font-mono uppercase text-white/40 font-semibold">Methodology Package</span>
                <span className="text-xs font-semibold text-[#CC6600]">
                  {selectedStudy.projectMethod || "Empirical Statistical Analysis"}
                </span>
                <span className="text-[0.688rem] text-white/50">{selectedStudy.projectField || "Academic Research"}</span>
              </div>
            </div>

            {/* Verified Artifacts */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-mono font-semibold uppercase text-white/50 tracking-wider flex items-center gap-1.5">
                <IconShieldCheck size={15} stroke={2} className="text-[#10B981]" />
                <span>Uploaded Documents &amp; Datasets</span>
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
                <div className="p-4 bg-[#01142B] border border-white/10 rounded-[2px] text-xs text-white/40 text-center">
                  No files currently deposited for this study.
                </div>
              )}
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
          description="Declare unavailable period and temporarily pause QA review intake."
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
                Leave requests are routed to the Finance Officer (HR) and Administrator for formal review. You remain active until approved.
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
                placeholder="Specify reasons or coverage instructions..."
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
