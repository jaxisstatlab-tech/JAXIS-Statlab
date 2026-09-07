"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  IconClock,
  IconClockPlay,
  IconCalendarEvent,
  IconAlertTriangle,
  IconCheck,
  IconPlus,
  IconLoader2,
  IconFileText,
  IconShieldCheck,
  IconCoffee,
  IconDeviceMobile,
  IconDeviceDesktop,
  IconBolt,
  IconChevronDown,
} from "@tabler/icons-react";
import { Button, Card, KpiCard, Badge, Modal, Toast, LoadingState, PageHeader, Pagination } from "@repo/ui";
import { getMyAttendanceHistory, fileAttendanceCorrection } from "@/features/attendance/actions";
import type { StaffAttendanceItem, AttendanceCorrectionItem } from "@/features/attendance/schemas";

export interface StaffAttendanceClientProps {
  initialData: {
    logs: StaffAttendanceItem[];
    corrections: AttendanceCorrectionItem[];
    kpis: {
      totalHoursThisWeek: number;
      completedShiftsCount: number;
      pendingCorrectionsCount: number;
    };
  };
}

export function StaffAttendanceClient({ initialData }: StaffAttendanceClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<StaffAttendanceItem[]>(initialData.logs);
  const [corrections, setCorrections] = useState<AttendanceCorrectionItem[]>(initialData.corrections);
  const [kpis, setKpis] = useState(initialData.kpis);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logPage, setLogPage] = useState<number>(1);
  const [logPageSize, setLogPageSize] = useState<number>(10);
  const [toast, setToast] = useState<{ message: string; description?: string; variant: "success" | "warning" | "danger" | "info" } | null>(null);

  // Form State
  const todayStr = new Date().toISOString().split("T")[0]!;
  const [correctionType, setCorrectionType] = useState<
    "MISSED_CLOCK_IN" | "MISSED_CLOCK_OUT" | "MISSED_FULL_SHIFT" | "BREAK_ADJUSTMENT" | "OVERTIME_CLAIM"
  >("MISSED_CLOCK_IN");
  const [targetDate, setTargetDate] = useState<string>(todayStr);
  const [claimedClockInTime, setClaimedClockInTime] = useState<string>("09:00");
  const [claimedClockOutTime, setClaimedClockOutTime] = useState<string>("18:00");
  const [claimedBreakMins, setClaimedBreakMins] = useState<number>(60);
  const [reason, setReason] = useState<string>("");
  const [tasksDelivered, setTasksDelivered] = useState<string>("");

  const isInitialMount = React.useRef(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getMyAttendanceHistory();
      setLogs(res.logs);
      setCorrections(res.corrections);
      setKpis(res.kpis);
    } catch (err) {
      console.error("Failed to load attendance history:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    loadData();
  }, [loadData]);

  // Calculate live preview of claimed net hours
  const calculateClaimedHours = () => {
    const inParts = claimedClockInTime.split(":").map(Number);
    const outParts = claimedClockOutTime.split(":").map(Number);
    if (inParts.length !== 2 || outParts.length !== 2) return 0;

    const inMinutes = (inParts[0] ?? 0) * 60 + (inParts[1] ?? 0);
    let outMinutes = (outParts[0] ?? 0) * 60 + (outParts[1] ?? 0);

    if (outMinutes <= inMinutes) {
      outMinutes += 24 * 60; // Overnight shift
    }

    const netMinutes = Math.max(0, outMinutes - inMinutes - claimedBreakMins);
    return Math.round((netMinutes / 60) * 100) / 100;
  };

  const netClaimedHours = calculateClaimedHours();

  // Submit Adjustment Request
  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 10) {
      setToast({
        variant: "warning",
        message: "Justification Required",
        description: "Please provide at least 10 characters explaining why the punch was missed.",
      });
      return;
    }

    if (!tasksDelivered.trim()) {
      setToast({
        variant: "warning",
        message: "Tasks Accomplished Required",
        description: "Please list deliverables or computational runs accomplished during this shift.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fileAttendanceCorrection({
        correctionType,
        targetDate,
        claimedClockInTime,
        claimedClockOutTime,
        claimedBreakMins,
        reason: reason.trim(),
        tasksDelivered: tasksDelivered.trim(),
      });

      if (res.success) {
        setToast({
          variant: "success",
          message: "Attendance Adjustment Submitted",
          description: "Your request has been routed to HR / Admin review for payroll crediting.",
        });
        setIsModalOpen(false);
        setReason("");
        setTasksDelivered("");
        await loadData();
      } else {
        setToast({
          variant: "danger",
          message: "Submission Failed",
          description: res.error.message,
        });
      }
    } catch {
      setToast({
        variant: "danger",
        message: "Network Error",
        description: "Failed to transmit attendance correction.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
        <LoadingState variant="page" label="Loading duty timesheets..." description="Please wait while we load your research workspace" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      {/* Standardized PageHeader Component */}
      <PageHeader
        title="My Duty Attendance & Timesheets"
        description="Review your digital punch history, break deductions, and file missed-punch corrections for payroll settlement."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Attendance & Timesheets" },
        ]}
        actions={
          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 self-start sm:self-auto cursor-pointer rounded-[2px]"
          >
            <IconPlus size={16} stroke={2.5} />
            <span>File Missed Punch / Adjustment</span>
          </Button>
        }
      />

      {/* KPI Telemetry Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Verified Hours This Week"
          value={kpis.totalHoursThisWeek}
          unit="hrs logged"
          icon={<IconClockPlay size={16} stroke={1.5} />}
          description="Weekly Accrual Credited"
        />

        <KpiCard
          label="Completed Duty Shifts"
          value={kpis.completedShiftsCount}
          unit="shifts"
          variant="sky"
          icon={<IconCalendarEvent size={16} stroke={1.5} />}
          description="Shift Delivery Logged"
        />

        <KpiCard
          label="Pending Adjustments"
          value={kpis.pendingCorrectionsCount}
          unit="pending"
          variant={kpis.pendingCorrectionsCount > 0 ? "amber" : "emerald"}
          icon={<IconAlertTriangle size={16} stroke={1.5} />}
          description={kpis.pendingCorrectionsCount > 0 ? "Under Review" : "Queue Clear"}
        />
      </div>

      {/* Section 1: Chronological Duty Timesheets */}
      <Card className="p-6 sm:p-8 bg-[#01142B] border-white/10 flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="text-base font-bold text-white font-sans">
              Recorded Duty Shifts (Last 30 Days)
            </h2>
            <p className="text-xs text-white/50 font-sans mt-0.5">
              Automated punch logs with verified server timestamps and IP audit signatures.
            </p>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-white/40 italic font-sans">
            Zero attendance logs recorded yet. Use the topbar Clock In button to commence your shift.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-white/50 font-mono uppercase text-[0.688rem]">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Clock In</th>
                  <th className="py-3 px-3">Clock Out</th>
                  <th className="py-3 px-3">Break Deducted</th>
                  <th className="py-3 px-3">Net Payable Hours</th>
                  <th className="py-3 px-3">Device &amp; Details</th>
                  <th className="py-3 px-3">Duty Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.slice((logPage - 1) * logPageSize, logPage * logPageSize).map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-white">
                      {new Date(log.clockInAt).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-3 font-mono text-white/80">
                      {new Date(log.clockInAt).toLocaleTimeString("en-PH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-3 font-mono text-white/80">
                      {log.clockOutAt
                        ? new Date(log.clockOutAt).toLocaleTimeString("en-PH", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "--"}
                    </td>
                    <td className="py-3 px-3 font-mono text-white/60">
                      {log.breakMinutes} min
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-white">
                      {log.netHoursFormatted}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          {log.isMobile ? (
                            <span className="text-[0.625rem] font-mono px-1.5 py-0.5 rounded-[2px] bg-amber-950/50 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                              <IconDeviceMobile size={11} stroke={2} />
                              <span>Mobile Punch</span>
                            </span>
                          ) : (
                            <span className="text-[0.688rem] font-mono text-white/70 flex items-center gap-1.5">
                              <IconDeviceDesktop size={13} stroke={1.5} className="text-white/40" />
                              <span>{log.deviceLabel}</span>
                            </span>
                          )}
                        </div>
                        {log.isZeroActivity ? (
                          <span className="text-[0.625rem] font-mono text-amber-400/90 font-medium flex items-center gap-1">
                            <IconAlertTriangle size={11} stroke={2} className="text-amber-400" />
                            <span>0 Study Actions Logged</span>
                          </span>
                        ) : log.studyActionsCount > 0 ? (
                          <span className="text-[0.625rem] font-mono text-emerald-400/80 flex items-center gap-1">
                            <IconBolt size={12} stroke={2} />
                            <span>{log.studyActionsCount} Study Events Verified</span>
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {log.status === "IN_PROGRESS" && (
                        <span className="text-[0.688rem] font-mono px-2 py-0.5 rounded-[2px] bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>In Progress</span>
                        </span>
                      )}
                      {log.status === "COMPLETED" && (
                        <span className="text-[0.688rem] font-mono px-2 py-0.5 rounded-[2px] bg-sky-950/40 text-sky-300 border border-sky-500/30">
                          {log.isAdjusted ? "Adjusted" : "Completed"}
                        </span>
                      )}
                      {log.status === "ADJUSTED" && (
                        <span className="text-[0.688rem] font-mono px-2 py-0.5 rounded-[2px] bg-purple-950/40 text-purple-300 border border-purple-500/30">
                          HR Adjusted
                        </span>
                      )}
                      {log.status === "AUTO_CLOSED" && (
                        <span className="text-[0.688rem] font-mono px-2 py-0.5 rounded-[2px] bg-amber-950/40 text-amber-300 border border-amber-500/30">
                          Auto-Capped (14h)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs.length > 0 && (
            <div className="border-t border-white/10 p-3 sm:px-6">
              <Pagination
                currentPage={logPage}
                totalItems={logs.length}
                pageSize={logPageSize}
                onPageChange={setLogPage}
                onPageSizeChange={setLogPageSize}
              />
            </div>
          )}
        </>
      )}
      </Card>

      {/* Section 2: Filed Attendance Correction Requests */}
      <Card className="p-6 sm:p-8 bg-[#01142B] border-white/10 flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="text-base font-bold text-white font-sans">
              Missed-Punch & Time Adjustment Filings
            </h2>
            <p className="text-xs text-white/50 font-sans mt-0.5">
              Review status of filed attendance corrections and HR authorization stamps.
            </p>
          </div>
        </div>

        {corrections.length === 0 ? (
          <div className="py-8 text-center text-xs text-white/40 italic font-sans">
            Zero attendance correction requests filed.
          </div>
        ) : (
          <div className="space-y-3">
            {corrections.map((corr) => (
              <div
                key={corr.id}
                className="p-4 bg-[#010D1F] border border-white/10 rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white">
                      Target Date: {corr.targetDate}
                    </span>
                    <Badge variant="sky" className="text-[0.625rem] font-mono uppercase">
                      {corr.correctionType.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs font-mono text-white/60">
                      Claimed: {corr.claimedNetHours} hrs (Break: {corr.claimedBreakMins}m)
                    </span>
                  </div>

                  <p className="text-xs text-white/80 font-sans">
                    <span className="text-white/40">Reason:</span> &ldquo;{corr.reason}&rdquo;
                  </p>

                  {corr.tasksDelivered && (
                    <p className="text-[0.688rem] text-white/60 font-sans truncate">
                      <span className="text-white/40">Deliverables:</span> {corr.tasksDelivered}
                    </p>
                  )}

                  {corr.reviewNotes && (
                    <p className="text-[0.688rem] text-white/50 italic font-sans mt-1">
                      Audit Note: {corr.reviewNotes}
                    </p>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  {corr.status === "PENDING" && (
                    <Badge variant="amber" className="font-mono text-xs flex items-center gap-1">
                      <IconClock size={12} stroke={2} />
                      <span>Pending HR Review</span>
                    </Badge>
                  )}
                  {corr.status === "APPROVED" && (
                    <Badge variant="emerald" className="font-mono text-xs flex items-center gap-1">
                      <IconCheck size={12} stroke={2.5} />
                      <span>Authorized & Credited</span>
                    </Badge>
                  )}
                  {corr.status === "REJECTED" && (
                    <Badge variant="danger" className="font-mono text-xs">
                      Declined
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Missed Punch / Adjustment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title="File Missed Punch or Attendance Correction"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button
              variant="secondary"
              size="sm"
              disabled={isSubmitting}
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isSubmitting || netClaimedHours <= 0}
              onClick={handleSubmitCorrection}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-1.5">
                  <IconLoader2 size={14} stroke={2.5} className="animate-spin text-white" />
                  <span>Submitting Filing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <IconFileText size={14} stroke={2} />
                  <span>Submit for HR Authorization</span>
                </div>
              )}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitCorrection} className="flex flex-col gap-4 text-xs font-sans text-white/90">
          {/* Issue Classification */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-white/90">
              Adjustment Type / Situation
            </label>
            <div className="relative">
              <select
                value={correctionType}
                onChange={(e) =>
                  setCorrectionType(
                    e.target.value as "MISSED_CLOCK_IN" | "MISSED_CLOCK_OUT" | "MISSED_FULL_SHIFT" | "BREAK_ADJUSTMENT" | "OVERTIME_CLAIM"
                  )
                }
                className="w-full bg-[#010D1F] border border-white/10 rounded-[2px] pl-3 pr-10 py-2.5 text-xs text-white outline-none cursor-pointer font-sans appearance-none hover:border-white/20 transition-colors"
              >
                <option value="MISSED_CLOCK_IN">Forgot to Clock In (Worked scheduled shift, clocked out late)</option>
                <option value="MISSED_CLOCK_OUT">Forgot to Clock Out (Session stayed open / auto-closed)</option>
                <option value="MISSED_FULL_SHIFT">Missed Full Shift (Worked full shift without digital punches)</option>
                <option value="OVERTIME_CLAIM">Approved Overtime / Emergency Compute Run</option>
                <option value="BREAK_ADJUSTMENT">Break Deduction Correction</option>
              </select>
              <IconChevronDown
                size={15}
                stroke={2}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none"
              />
            </div>
          </div>

          {/* Date & Times Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-white/90">Target Duty Date</label>
              <input
                type="date"
                max={todayStr}
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="bg-[#010D1F] border border-white/10 rounded-[2px] p-2 text-xs text-white outline-none font-mono cursor-pointer"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-white/90">Claimed Time In</label>
              <input
                type="time"
                value={claimedClockInTime}
                onChange={(e) => setClaimedClockInTime(e.target.value)}
                className="bg-[#010D1F] border border-white/10 rounded-[2px] p-2 text-xs text-white outline-none font-mono cursor-pointer"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-white/90">Claimed Time Out</label>
              <input
                type="time"
                value={claimedClockOutTime}
                onChange={(e) => setClaimedClockOutTime(e.target.value)}
                className="bg-[#010D1F] border border-white/10 rounded-[2px] p-2 text-xs text-white outline-none font-mono cursor-pointer"
                required
              />
            </div>
          </div>

          {/* Break Deduction Presets */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-white/90 flex items-center gap-1.5">
              <IconCoffee size={14} stroke={1.5} className="text-[#CC6600]" />
              <span>Unpaid Lunch & Break Duration</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "0 min", val: 0 },
                { label: "30 min", val: 30 },
                { label: "60 min (Std)", val: 60 },
                { label: "90 min", val: 90 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => setClaimedBreakMins(preset.val)}
                  className={`py-1.5 px-1 text-center font-mono text-xs rounded-[2px] border transition-colors cursor-pointer ${
                    claimedBreakMins === preset.val
                      ? "bg-[#CC6600]/20 border-[#CC6600] text-white font-bold"
                      : "bg-[#01142B] border-white/10 text-white/60 hover:text-white"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Claim Calculation Card */}
          <div className="p-3 bg-[#010D1F] border border-white/10 rounded-[2px] flex items-center justify-between">
            <span className="text-white/60">Net Claimed Working Hours:</span>
            <span className="font-mono text-base font-extrabold text-[#38BDF8]">
              {netClaimedHours} hrs
            </span>
          </div>

          {/* Justification Textarea */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-white/90">
              Stated Justification (Why was the digital punch missed?)
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Conducted remote statistical calculations on server cluster; forgot to initiate the digital punch due to immediate client emergency..."
              className="w-full bg-[#010D1F] border border-white/10 focus:border-[#CC6600] rounded-[2px] p-2.5 text-xs text-white placeholder-white/30 outline-none resize-none font-sans"
              required
            />
          </div>

          {/* Deliverables / Tasks Delivered */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-white/90">
              Tasks Delivered / Studies Accomplished During this Shift
            </label>
            <textarea
              rows={2}
              value={tasksDelivered}
              onChange={(e) => setTasksDelivered(e.target.value)}
              placeholder="e.g. Executed SEM analysis for Study #JX-04-2026, generated descriptive tables, and pushed code to repository..."
              className="w-full bg-[#010D1F] border border-white/10 focus:border-[#CC6600] rounded-[2px] p-2.5 text-xs text-white placeholder-white/30 outline-none resize-none font-sans"
              required
            />
          </div>

          <div className="p-3 bg-[#011B38] border border-white/10 rounded-[2px] flex items-start gap-2 text-white/70 text-[0.688rem]">
            <IconShieldCheck size={16} stroke={1.5} className="text-[#38BDF8] shrink-0 mt-0.5" />
            <span>
              <strong>Segregation of Duties Enforcement:</strong> Requests are independently audited against study deliverables by the Finance & HR Officer or Administrator prior to payroll disbursement.
            </span>
          </div>
        </form>
      </Modal>

      {/* Toast Notification */}
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
