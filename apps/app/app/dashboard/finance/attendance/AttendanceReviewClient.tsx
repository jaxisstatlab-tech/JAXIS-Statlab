"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  IconShieldCheck,
  IconClock,
  IconCheck,
  IconX,
  IconLoader2,
  IconAlertTriangle,
  IconUserCheck,
  IconLock,
} from "@tabler/icons-react";
import { Button, Card, KpiCard, Badge, Modal, Toast, LoadingState, PageHeader, Pagination } from "@repo/ui";
import {
  getAttendanceReviewDeskData,
  reviewAttendanceCorrection,
} from "@/features/attendance/actions";
import type { AttendanceCorrectionItem, AttendanceSummaryKPIs } from "@/features/attendance/schemas";

export interface AttendanceReviewClientProps {
  initialData?: {
    corrections: AttendanceCorrectionItem[];
    kpis: AttendanceSummaryKPIs;
  };
}

export function AttendanceReviewClient({ initialData }: AttendanceReviewClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [corrections, setCorrections] = useState<AttendanceCorrectionItem[]>(initialData?.corrections || []);
  const [kpis, setKpis] = useState<AttendanceSummaryKPIs>(
    initialData?.kpis || {
      totalHoursThisMonth: 0,
      completedShiftsCount: 0,
      pendingCorrectionsCount: 0,
      adjustedShiftsCount: 0,
      onDutyStaffCount: 0,
    }
  );

  // Action State
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [declineModalItem, setDeclineModalItem] = useState<AttendanceCorrectionItem | null>(null);
  const [declineNotes, setDeclineNotes] = useState<string>("");
  const [auditPage, setAuditPage] = useState<number>(1);
  const [auditPageSize, setAuditPageSize] = useState<number>(10);
  const [toast, setToast] = useState<{ message: string; description?: string; variant: "success" | "warning" | "danger" | "info" } | null>(null);
  const isMountedRef = React.useRef(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getAttendanceReviewDeskData();
      if (!isMountedRef.current) return;
      setCorrections(res.corrections);
      setKpis(res.kpis);
    } catch (err) {
      if (isMountedRef.current) {
        console.error("Failed to load HR attendance review desk data:", err);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (!initialData) {
      loadData();
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [loadData, initialData]);

  // Handle Authorization
  const handleAuthorize = async (correctionId: string) => {
    setIsProcessing(correctionId);
    try {
      const res = await reviewAttendanceCorrection({
        correctionId,
        action: "APPROVE",
        reviewNotes: "Authorized & verified against project computational runs.",
      });

      if (res.success) {
        setToast({
          variant: "success",
          message: "Attendance Adjustment Authorized",
          description: "Verified duty hours have been credited to the staff payroll ledger.",
        });
        await loadData();
      } else {
        setToast({
          variant: "danger",
          message: "Authorization Failed",
          description: res.error.message,
        });
      }
    } catch {
      setToast({
        variant: "danger",
        message: "Network Error",
        description: "Failed to process attendance authorization.",
      });
    } finally {
      setIsProcessing(null);
    }
  };

  // Handle Decline
  const handleConfirmDecline = async () => {
    if (!declineModalItem) return;
    if (!declineNotes.trim()) {
      setToast({
        variant: "warning",
        message: "Decline Reason Required",
        description: "Please provide an audit feedback explanation for the employee.",
      });
      return;
    }

    setIsProcessing(declineModalItem.id);
    try {
      const res = await reviewAttendanceCorrection({
        correctionId: declineModalItem.id,
        action: "REJECT",
        reviewNotes: declineNotes.trim(),
      });

      if (res.success) {
        setToast({
          variant: "info",
          message: "Attendance Adjustment Declined",
          description: "Employee has been notified with the audit rationale.",
        });
        setDeclineModalItem(null);
        setDeclineNotes("");
        await loadData();
      } else {
        setToast({
          variant: "danger",
          message: "Action Failed",
          description: res.error.message,
        });
      }
    } catch {
      setToast({
        variant: "danger",
        message: "Network Error",
        description: "Failed to transmit rejection.",
      });
    } finally {
      setIsProcessing(null);
    }
  };

  if (isLoading && corrections.length === 0) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
        <LoadingState
          variant="page"
          label="Loading HR Attendance Review Desk..."
          description="Retrieving staff timesheets and missed punch claims."
        />
      </div>
    );
  }

  const pendingQueue = corrections.filter((c) => c.status === "PENDING");
  const processedAudit = corrections.filter((c) => c.status !== "PENDING");

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      {/* Page Header */}
      <PageHeader
        title="Staff Attendance & Missed-Punch Review Desk"
        description="Audit missed punch filings, verify computational deliverables, and credit approved hours under Segregation of Duties."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Finance & HR", href: "/dashboard/finance" },
          { label: "Attendance Review" },
        ]}
        badge={
          <Badge variant="amber" className="text-xs font-mono">
            HR & Payroll Review
          </Badge>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Pending HR Review"
          value={kpis.pendingCorrectionsCount}
          unit="requests"
          variant={kpis.pendingCorrectionsCount > 0 ? "amber" : "emerald"}
          icon={<IconAlertTriangle size={16} stroke={1.5} />}
          description={kpis.pendingCorrectionsCount > 0 ? "Action Required" : "Queue Clear"}
        />

        <KpiCard
          label="Total Duty Hours (Month)"
          value={kpis.totalHoursThisMonth}
          unit="hrs logged"
          icon={<IconClock size={16} stroke={1.5} />}
          description="Verified Pay Cycle Time"
        />

        <KpiCard
          label="Adjusted Shifts Credited"
          value={kpis.adjustedShiftsCount}
          unit="shifts"
          icon={<IconShieldCheck size={16} stroke={1.5} />}
          description="Audit SoD Verified"
        />

        <KpiCard
          label="Active Staff on Duty"
          value={kpis.onDutyStaffCount}
          unit="active"
          variant="sky"
          icon={<IconUserCheck size={16} stroke={1.5} />}
          description={kpis.onDutyStaffCount > 0 ? "Live Duty Active" : "Standby"}
        />
      </div>

      {/* Segregation of Duties Governance Alert */}
      <div className="p-4 bg-[#0A0A18] border border-sky-500/30 rounded-[2px] flex items-start gap-3">
        <IconShieldCheck size={20} stroke={1.5} className="text-[#38BDF8] shrink-0 mt-0.5" />
        <div className="flex flex-col gap-0.5 text-xs text-white/80 font-sans">
          <span className="font-bold text-white">Anti-Fraud Segregation of Duties Protocol Active:</span>
          <span>
            Finance & HR Officers cannot authorize their own missed punches or leave windows. Submissions filed by Finance are routed to Administrator or CEO approval.
          </span>
        </div>
      </div>

      {/* Pending Approval Queue */}
      <Card className="p-6 sm:p-8 bg-[#0A0A18] border-white/10 flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="text-base font-bold text-white font-sans flex items-center gap-2">
              <span>Pending Missed-Punch & Time Adjustment Queue</span>
              {pendingQueue.length > 0 && (
                <span className="px-2 py-0.5 rounded-[2px] bg-amber-950/60 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
                  {pendingQueue.length}
                </span>
              )}
            </h2>
            <p className="text-xs text-white/50 font-sans mt-0.5">
              Review employee stated rationale and task accomplishments before crediting payroll hours.
            </p>
          </div>
        </div>

        {pendingQueue.length === 0 ? (
          <div className="py-12 text-center text-xs text-white/40 italic font-sans flex flex-col items-center gap-2">
            <IconCheck size={24} stroke={1.5} className="text-emerald-400" />
            <span>Zero pending attendance corrections awaiting review. All timesheets are reconciled.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingQueue.map((item) => (
              <div
                key={item.id}
                className="p-5 bg-[#050513] border border-white/10 rounded-[2px] flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  {/* Header Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-white text-sm">
                      {item.staffName}
                    </span>
                    <Badge variant="default" className="text-[0.625rem] font-mono">
                      {item.staffRole}
                    </Badge>
                    <span className="text-xs font-mono text-white/50">({item.staffEmail})</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-[2px] bg-sky-950/50 text-sky-300 border border-sky-500/30">
                      Date: {item.targetDate}
                    </span>
                  </div>

                  {/* Timing & Net Hours */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
                    <span className="text-white/80">
                      Claimed: {new Date(item.claimedClockIn).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })} &rarr;{" "}
                      {new Date(item.claimedClockOut).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-white/50">Break Deducted: {item.claimedBreakMins}m</span>
                    <span className="text-emerald-400 font-bold">
                      Net Payable: {item.claimedNetHours} hrs
                    </span>
                    <span className="text-[#F59E0B]">
                      Type: {item.correctionType.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Stated Justification */}
                  <div className="p-3 bg-black/40 border border-white/5 rounded-[2px] text-xs">
                    <p className="text-white/90 font-sans">
                      <span className="text-white/40 font-semibold uppercase text-[0.688rem] block mb-0.5">
                        Stated Justification:
                      </span>
                      &ldquo;{item.reason}&rdquo;
                    </p>
                    {item.tasksDelivered && (
                      <p className="text-white/70 font-sans mt-1.5 pt-1.5 border-t border-white/5 text-[0.688rem]">
                        <span className="text-white/40 font-semibold uppercase block mb-0.5">
                          Tasks & Deliverables Accomplished:
                        </span>
                        {item.tasksDelivered}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions with SoD Guard */}
                <div className="shrink-0 flex flex-col items-end gap-2">
                  {item.canApprove ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isProcessing === item.id}
                        onClick={() => setDeclineModalItem(item)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-950/40 border-red-500/30 cursor-pointer"
                      >
                        <IconX size={14} stroke={2} />
                        <span>Decline</span>
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isProcessing === item.id}
                        onClick={() => handleAuthorize(item.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
                      >
                        {isProcessing === item.id ? (
                          <div className="flex items-center gap-1.5">
                            <IconLoader2 size={14} stroke={2.5} className="animate-spin text-white" />
                            <span>Authorizing...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <IconCheck size={2.5} />
                            <span>Authorize & Credit</span>
                          </div>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-amber-950/30 border border-amber-500/30 rounded-[2px] flex items-center gap-2 text-amber-200 text-xs max-w-xs">
                      <IconLock size={16} stroke={2} className="text-amber-400 shrink-0" />
                      <span>{item.sodReason || "Requires higher-tier administrator authorization."}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Historical Audit Desk */}
      <Card className="p-6 sm:p-8 bg-[#0A0A18] border-white/10 flex flex-col gap-6">
        <div className="border-b border-white/10 pb-4">
          <h2 className="text-base font-bold text-white font-sans">
            Processed Attendance Adjustments Audit Trail
          </h2>
          <p className="text-xs text-white/50 font-sans mt-0.5">
            Permanent record of authorized credits, approver identity stamps, and rejected adjustments.
          </p>
        </div>

        {processedAudit.length === 0 ? (
          <div className="py-8 text-center text-xs text-white/40 italic font-sans">
            Zero historical adjustment records.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-white/50 font-mono uppercase text-[0.688rem]">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Employee</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Credited Hours</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Audited By</th>
                    <th className="py-3 px-3">Audit Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {processedAudit.slice((auditPage - 1) * auditPageSize, auditPage * auditPageSize).map((audit) => (
                    <tr key={audit.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 font-mono font-semibold text-white">
                        {audit.targetDate}
                      </td>
                      <td className="py-3 px-3 font-sans text-white">
                        <span className="font-semibold">{audit.staffName}</span>
                        <span className="text-[0.688rem] text-white/40 block font-mono">
                          {audit.staffRole}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-white/70">
                        {audit.correctionType.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-white">
                        {audit.claimedNetHours} hrs
                      </td>
                      <td className="py-3 px-3">
                        {audit.status === "APPROVED" ? (
                          <Badge variant="emerald" className="text-[0.688rem] font-mono">
                            Authorized
                          </Badge>
                        ) : (
                          <Badge variant="danger" className="text-[0.688rem] font-mono">
                            Declined
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 font-sans text-white/80">
                        {audit.reviewerName || "System / Executive"}
                      </td>
                      <td className="py-3 px-3 font-sans text-white/50 truncate max-w-xs">
                        {audit.reviewNotes || "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {processedAudit.length > 0 && (
              <div className="border-t border-white/10 p-3 sm:px-6">
                <Pagination
                  currentPage={auditPage}
                  totalItems={processedAudit.length}
                  pageSize={auditPageSize}
                  onPageChange={setAuditPage}
                  onPageSizeChange={setAuditPageSize}
                />
              </div>
            )}
          </>
        )}
      </Card>

      {/* Decline Feedback Modal */}
      <Modal
        isOpen={Boolean(declineModalItem)}
        onClose={() => setDeclineModalItem(null)}
        title="Decline Attendance Adjustment Request"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeclineModalItem(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmDecline}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold"
            >
              Confirm Decline
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 text-xs font-sans text-white/80">
          <p>
            Please provide a mandatory audit note explaining why the attendance adjustment for{" "}
            <strong className="text-white">{declineModalItem?.staffName}</strong> (Target Date:{" "}
            {declineModalItem?.targetDate}) is being declined:
          </p>
          <textarea
            rows={3}
            value={declineNotes}
            onChange={(e) => setDeclineNotes(e.target.value)}
            placeholder="e.g. Deliverables stated do not match repository commits or computational logs for this target date..."
            className="w-full bg-[#050513] border border-white/10 focus:border-red-500 rounded-[2px] p-2.5 text-xs text-white placeholder-white/30 outline-none resize-none font-sans"
            required
          />
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          description={toast.description}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
