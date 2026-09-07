"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  IconCalendar,
  IconClock,
  IconCalendarOff,
  IconReceipt,
  IconShieldCheck,
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconPlus,
  IconLoader2,
  IconClockPlay,
  IconCheck,
  IconBuildingBank,
  IconPrinter,
  IconDeviceMobile,
  IconDeviceDesktop,
  IconAlertTriangle,
  IconBolt,
  IconHistory,
  IconFileText,
  IconWallet,
  IconCoins,
  IconCopy,
  IconEdit,
} from "@tabler/icons-react";
import { Button, Card, KpiCard, Badge, Modal, Toast, LoadingState, Peso, PageHeader, Pagination } from "@repo/ui";
import Link from "next/link";
import { getMyHrPortalData, fileAttendanceCorrection } from "@/features/attendance/actions";
import { requestLeave, returnFromLeave } from "@/features/staff/actions";
import { getMyOfficialPayslip, getMyPayoutDetails, updateMyPayoutDetails } from "@/features/payroll/actions";
import type { StaffPayslipDTO, StaffPayoutDetailsDTO, PayoutChannel } from "@/features/payroll/schemas";
import { PayslipStatementModal } from "@/features/payroll/components/PayslipStatementModal";
import type { HrPortalData, DailyAttendanceEvent } from "@/features/attendance/schemas";
import { formatSettlementAccountNumber } from "@/lib/formatters";

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

type ActiveHrTab = "TIMESHEETS" | "CALENDAR" | "LEAVES" | "OVERTIME" | "PAYSLIP" | "PAYOUT";

export interface HrPortalClientProps {
  initialPortalData: HrPortalData;
  initialAllMyPayslips: StaffPayslipDTO[];
  initialSelectedPayslip: StaffPayslipDTO | null;
  initialPayoutDetails: StaffPayoutDetailsDTO | null;
}

export function HrPortalClient({
  initialPortalData,
  initialAllMyPayslips,
  initialSelectedPayslip,
  initialPayoutDetails,
}: HrPortalClientProps) {
  const [activeTab, setActiveTab] = useState<ActiveHrTab>("TIMESHEETS");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [portalData, setPortalData] = useState<HrPortalData>(initialPortalData);

  // Month navigation
  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth() + 1); // 1-12

  // Selected Day Drawer / Inspector
  const [selectedDayEvent, setSelectedDayEvent] = useState<DailyAttendanceEvent | null>(
    () => initialPortalData.currentMonthEvents.find((e) => e.isToday) || initialPortalData.currentMonthEvents[0] || null
  );

  // Leave Request Modal
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState<boolean>(false);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState<boolean>(false);
  const [leaveReason, setLeaveReason] = useState<string>("");
  const [leaveFrom, setLeaveFrom] = useState<string>(new Date().toISOString().split("T")[0]!);
  const [leaveUntil, setLeaveUntil] = useState<string>(new Date().toISOString().split("T")[0]!);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const leaveDaysCount = useMemo(() => {
    if (!leaveFrom || !leaveUntil) return 0;
    const start = new Date(leaveFrom);
    const end = new Date(leaveUntil);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
    return Math.max(1, diff);
  }, [leaveFrom, leaveUntil]);

  const isReturnBeforeStart = useMemo(() => {
    if (!leaveFrom || !leaveUntil) return false;
    return new Date(leaveUntil) < new Date(leaveFrom);
  }, [leaveFrom, leaveUntil]);

  // Adjustment / Overtime Filing Modal
  const [isAdjModalOpen, setIsAdjModalOpen] = useState<boolean>(false);
  const [isSubmittingAdj, setIsSubmittingAdj] = useState<boolean>(false);
  const [adjType, setAdjType] = useState<"OVERTIME_CLAIM" | "MISSED_CLOCK_IN" | "MISSED_CLOCK_OUT" | "MISSED_FULL_SHIFT">("OVERTIME_CLAIM");
  const [adjDate, setAdjDate] = useState<string>(new Date().toISOString().split("T")[0]!);
  const [adjInTime, setAdjInTime] = useState<string>("09:00");
  const [adjOutTime, setAdjOutTime] = useState<string>("19:30");
  const [adjBreakMins, setAdjBreakMins] = useState<number>(60);
  const [adjReason, setAdjReason] = useState<string>("");
  const [adjDeliverables, setAdjDeliverables] = useState<string>("");

  // Payslips & History
  const [allMyPayslips, setAllMyPayslips] = useState<StaffPayslipDTO[]>(initialAllMyPayslips);
  const [selectedPayslip, setSelectedPayslip] = useState<StaffPayslipDTO | null>(initialSelectedPayslip);
  const [selectedPayslipForModal, setSelectedPayslipForModal] = useState<StaffPayslipDTO | null>(null);
  const [payslipPage, setPayslipPage] = useState<number>(1);
  const [payslipPageSize, setPayslipPageSize] = useState<number>(10);

  // Payout & Banking Details
  const [payoutDetails, setPayoutDetails] = useState<StaffPayoutDetailsDTO | null>(initialPayoutDetails);
  const [isSavingPayout, setIsSavingPayout] = useState<boolean>(false);
  const [payoutChannel, setPayoutChannel] = useState<PayoutChannel>(initialPayoutDetails?.payoutChannel || "GCASH");
  const [accountNumber, setAccountNumber] = useState<string>(initialPayoutDetails?.accountNumber || "");
  const [accountName, setAccountName] = useState<string>(initialPayoutDetails?.accountName || initialPortalData.user.fullName);
  const [bankName, setBankName] = useState<string>(initialPayoutDetails?.bankName || "BDO Unibank");
  const [payoutNotes, setPayoutNotes] = useState<string>(initialPayoutDetails?.notes || "");
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);

  const [toast, setToast] = useState<{ message: string; description?: string; variant: "success" | "warning" | "danger" | "info" } | null>(null);

  const isMountedRef = React.useRef(true);
  const isInitialMount = React.useRef(true);

  // Load Data for subsequent user interactions (e.g. changing month)
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [res, payslipRes, payoutRes] = await Promise.all([
        getMyHrPortalData(currentYear, currentMonth),
        getMyOfficialPayslip(),
        getMyPayoutDetails(),
      ]);
      if (!isMountedRef.current) return;
      setPortalData(res);
      setAllMyPayslips(payslipRes.allMyPayslips);
      if (payslipRes.allMyPayslips.length > 0) {
        setSelectedPayslip((prev) => prev || payslipRes.payslip || payslipRes.allMyPayslips[0] || null);
      }
      if (payoutRes?.data) {
        setPayoutDetails(payoutRes.data);
        setPayoutChannel(payoutRes.data.payoutChannel);
        setAccountNumber(payoutRes.data.accountNumber);
        setAccountName(payoutRes.data.accountName || res.user.fullName);
        setBankName(payoutRes.data.bankName || "BDO Unibank");
        setPayoutNotes(payoutRes.data.notes || "");
      } else if (res?.user?.fullName) {
        setAccountName(res.user.fullName);
      }
      // Default selected day to today if in current month
      const todayEvt = res.currentMonthEvents.find((e) => e.isToday) || res.currentMonthEvents[0] || null;
      setSelectedDayEvent(todayEvt);
    } catch (err) {
      if (isMountedRef.current) {
        console.error("Failed to load HR portal data:", err);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    isMountedRef.current = true;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return; // Skip initial mount fetch; data was preloaded by Server Component!
    }
    loadData();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadData]);

  const activeDisplayPayslip: StaffPayslipDTO | null =
    selectedPayslip ?? (allMyPayslips[0] ?? null);

  // Next / Prev Month Navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Submit Leave Request
  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingLeave(true);
    try {
      const res = await requestLeave({
        reason: leaveReason,
        leaveFrom,
        leaveUntil,
      });

      if (res.success) {
        setToast({
          variant: "success",
          message: "Leave Request Submitted",
          description: "Your leave request has been submitted for HR authorization.",
        });
        setIsLeaveModalOpen(false);
        window.dispatchEvent(new CustomEvent("leave-status-updated"));
        window.dispatchEvent(new CustomEvent("shift-status-updated"));
        await loadData();
      } else {
        setToast({
          variant: "danger",
          message: "Leave Submission Failed",
          description: res.error.message,
        });
      }
    } catch {
      setToast({
        variant: "danger",
        message: "Network Error",
        description: "Failed to submit leave request.",
      });
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // End Leave / Return from Leave
  const handleReturnFromLeave = async () => {
    try {
      const res = await returnFromLeave();
      if (res.success) {
        setToast({
          variant: "success",
          message: "Welcome Back",
          description: "Your leave has concluded and you are now active.",
        });
        window.dispatchEvent(new CustomEvent("leave-status-updated"));
        window.dispatchEvent(new CustomEvent("shift-status-updated"));
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
        description: "Failed to conclude leave.",
      });
    }
  };

  // Submit Overtime / Adjustment
  const handleSubmitAdj = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjReason.trim()) {
      setToast({
        variant: "warning",
        message: "Justification Required",
        description: "Please state the reason for this overtime claim or attendance adjustment.",
      });
      return;
    }

    setIsSubmittingAdj(true);
    try {
      const res = await fileAttendanceCorrection({
        correctionType: adjType,
        targetDate: adjDate,
        claimedClockInTime: adjInTime,
        claimedClockOutTime: adjOutTime,
        claimedBreakMins: adjBreakMins,
        reason: adjReason.trim(),
        tasksDelivered: adjDeliverables.trim() || "Regular research computational delivery",
      });

      if (res.success) {
        setToast({
          variant: "success",
          message: "Overtime / Adjustment Claim Submitted",
          description: "Filing transmitted to HR & Administration queue for verification.",
        });
        setIsAdjModalOpen(false);
        setAdjReason("");
        setAdjDeliverables("");
        await loadData();
      } else {
        setToast({
          variant: "danger",
          message: "Submission Error",
          description: res.error.message,
        });
      }
    } catch {
      setToast({
        variant: "danger",
        message: "Network Error",
        description: "Unable to transmit filing.",
      });
    } finally {
      setIsSubmittingAdj(false);
    }
  };

  const handleCopyAccount = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
    setToast({
      variant: "info",
      message: "Copied to Clipboard",
      description: "Account / Mobile number copied to clipboard.",
    });
  };

  const handleSavePayoutDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber.trim() || !accountName.trim()) {
      setToast({
        variant: "warning",
        message: "Incomplete Details",
        description: "Please provide both account/mobile number and account holder name.",
      });
      return;
    }

    setIsSavingPayout(true);
    try {
      const res = await updateMyPayoutDetails({
        payoutChannel,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        bankName: payoutChannel === "BANK_TRANSFER" ? bankName : "",
        notes: payoutNotes.trim(),
      });

      if (res.success && res.data) {
        setPayoutDetails(res.data);
        setToast({
          variant: "success",
          message: "Payout Method Saved",
          description: "Your payout details have been updated for future payslips.",
        });
      } else {
        setToast({
          variant: "danger",
          message: "Save Failed",
          description: res.error || "Unable to save payout details.",
        });
      }
    } catch {
      setToast({
        variant: "danger",
        message: "Network Error",
        description: "Unable to save payout details.",
      });
    } finally {
      setIsSavingPayout(false);
    }
  };

  if (isLoading || !portalData) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
        <LoadingState variant="page" label="Loading HR & Staff Portal..." description="Getting timesheets and payroll details" />
      </div>
    );
  }

  const monthTitle = new Date(currentYear, currentMonth - 1).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      {/* Standardized PageHeader Component */}
      <PageHeader
        title="My HR &amp; Timeclock"
        description="Manage your timesheets, duty calendar, leave requests, and monthly payslips."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "My HR" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsLeaveModalOpen(true)}
              className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold rounded-[2px]"
            >
              <IconCalendarOff size={14} stroke={2} />
              <span>Request Leave</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setAdjDate(selectedDayEvent?.date || new Date().toISOString().split("T")[0]!);
                setIsAdjModalOpen(true);
              }}
              className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold rounded-[2px]"
            >
              <IconPlus size={14} stroke={2.5} />
              <span>File Overtime / Correction</span>
            </Button>
          </div>
        }
      />

      {/* Leave Status Alert Banner if on leave */}
      {portalData.user.isOnLeave && (
        <div className="p-4 bg-purple-950/40 border border-purple-500/30 rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <IconCalendarOff size={20} stroke={1.5} className="text-purple-300 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5 text-xs text-white/90 font-sans">
              <span className="font-bold text-purple-200">Currently on Approved Leave</span>
              <span className="text-white/70">
                Reason: &ldquo;{portalData.user.leaveReason}&rdquo; &bull; Expected Return Date:{" "}
                {portalData.user.leaveUntil ? new Date(portalData.user.leaveUntil).toLocaleDateString("en-PH") : "Open"}
              </span>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleReturnFromLeave}
            className="cursor-pointer text-xs font-semibold rounded-[2px] shrink-0"
          >
            End Leave &amp; Return to Work
          </Button>
        </div>
      )}

      {/* Navigation Tab Bar */}
      <div className="flex items-center border-b border-white/10 gap-2 overflow-x-auto pb-1">
        {[
          { id: "TIMESHEETS", label: "Timesheets", icon: IconClock },
          { id: "CALENDAR", label: "Calendar", icon: IconCalendar },
          { id: "LEAVES", label: "Leave Requests", icon: IconCalendarOff },
          { id: "OVERTIME", label: "Overtime & Corrections", icon: IconClockPlay },
          { id: "PAYSLIP", label: "My Payslips", icon: IconReceipt },
          { id: "PAYOUT", label: "Payout Method", icon: IconBuildingBank },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ActiveHrTab)}
              className={`flex items-center gap-2 py-2.5 px-4 text-xs font-sans font-semibold rounded-t-[2px] transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
                isActive
                  ? "border-[#CC6600] text-white bg-[#01142B]"
                  : "border-transparent text-white/60 hover:text-white hover:bg-white/[0.03]"
              }`}
            >
              <Icon size={16} stroke={isActive ? 2 : 1.5} className={isActive ? "text-[#CC6600]" : "text-white/50"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 0: TIMESHEETS */}
      {activeTab === "TIMESHEETS" && (
        <Card className="p-6 sm:p-8 bg-[#01142B] border-white/10 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-black/40 border border-white/10 rounded-[2px] text-white">
                <IconClock size={18} stroke={1.5} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white font-sans">Timesheets &amp; Shift History</h2>
                <span className="text-[0.688rem] text-white/50 font-mono">
                  {portalData.recentLogs.length} shifts recorded in {monthTitle}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdjModalOpen(true)}
              className="flex items-center gap-2"
            >
              <IconPlus size={14} stroke={2} />
              <span>File Missed Punch / Adjustment</span>
            </Button>
          </div>

          {portalData.recentLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-white/40 italic font-sans flex flex-col items-center gap-2">
              <IconClock size={24} stroke={1.5} className="text-white/20" />
              <span>No recorded duty shifts found for this billing period.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-white/50 font-mono uppercase text-[0.688rem]">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Clock In</th>
                    <th className="py-3 px-3">Clock Out</th>
                    <th className="py-3 px-3">Break</th>
                    <th className="py-3 px-3">Total Hours</th>
                    <th className="py-3 px-3">Device</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {portalData.recentLogs.map((log) => (
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
          )}
        </Card>
      )}

      {/* TAB 1: MONTHLY CALENDAR & DAY INSPECTOR */}
      {activeTab === "CALENDAR" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Calendar Grid (8 Cols) */}
          <Card className="lg:col-span-8 p-3.5 sm:p-6 md:p-8 bg-[#01142B] border-white/10 flex flex-col gap-4 sm:gap-6">
            {/* Month Header & Controls */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 sm:pb-4 gap-2">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="p-2 sm:p-2.5 bg-black/40 border border-white/10 rounded-[2px] text-white shrink-0">
                  <IconCalendar size={18} stroke={1.5} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-white font-sans truncate">{monthTitle}</h2>
                  <span className="text-[0.625rem] sm:text-[0.688rem] text-white/50 font-mono block truncate">
                    {portalData.payslip.totalDutyHours} verified duty hours recorded
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-black/40 p-0.5 sm:p-1 border border-white/10 rounded-[2px] shrink-0">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 sm:p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-[2px] transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <IconChevronLeft size={16} stroke={2} />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 sm:p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-[2px] transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <IconChevronRight size={16} stroke={2} />
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:gap-4 text-[0.625rem] sm:text-[0.688rem] font-mono text-white/60">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" /> Present
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#38BDF8] shrink-0" /> Overtime
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" /> Leave
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" /> Missed Punch
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white/20 shrink-0" /> Rest / Holiday
              </span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-[0.625rem] sm:text-[0.688rem] font-mono uppercase text-white/40 py-1 font-semibold">
                  <span className="sm:hidden">{day.charAt(0)}</span>
                  <span className="hidden sm:inline">{day}</span>
                </div>
              ))}

              {/* Empty placeholder cells for days before the 1st of the month */}
              {Array.from({
                length: new Date(currentYear, currentMonth - 1, 1).getDay(),
              }).map((_, i) => (
                <div
                  key={`empty-prev-${i}`}
                  className="min-h-[50px] sm:min-h-[72px] p-1 sm:p-2 rounded-[2px] border border-white/[0.03] bg-white/[0.01] opacity-20 pointer-events-none"
                />
              ))}

              {portalData.currentMonthEvents.map((evt) => {
                const isSelected = selectedDayEvent?.date === evt.date;

                const bgStyle =
                  evt.status === "PRESENT"
                    ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                    : evt.status === "OVERTIME"
                    ? "bg-sky-950/30 border-sky-500/30 text-sky-300"
                    : evt.status === "ON_LEAVE"
                    ? "bg-purple-950/30 border-purple-500/30 text-purple-300"
                    : evt.status === "IN_PROGRESS"
                    ? "bg-emerald-950/60 border-emerald-400 text-emerald-200 animate-pulse"
                    : evt.status === "MISSED_PUNCH"
                    ? "bg-amber-950/20 border-amber-500/20 text-amber-300"
                    : "bg-[#010D1F] border-white/5 text-white/50";

                return (
                  <button
                    key={evt.date}
                    type="button"
                    onClick={() => setSelectedDayEvent(evt)}
                    className={`min-h-[50px] sm:min-h-[72px] p-1 sm:p-2 rounded-[2px] border text-left transition-all cursor-pointer flex flex-col justify-between overflow-hidden ${bgStyle} ${
                      isSelected ? "ring-1.5 sm:ring-2 ring-[#CC6600] border-transparent shadow-lg scale-[1.02]" : "hover:border-white/20"
                    } ${evt.isToday ? "border-t-2 border-t-[#CC6600]" : ""}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[0.688rem] sm:text-xs font-mono font-bold ${evt.isToday ? "text-[#CC6600]" : "text-white"}`}>
                        {evt.dayOfMonth}
                      </span>
                      {evt.isHoliday && (
                        <>
                          <span className="text-[0.5rem] font-mono uppercase px-1 py-0.2 rounded-[2px] bg-white/10 text-white/80 hidden sm:inline truncate max-w-[48px]" title={evt.holidayName || "Holiday"}>
                            Holiday
                          </span>
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 sm:hidden shrink-0" title={evt.holidayName || "Holiday"} />
                        </>
                      )}
                    </div>

                    <div className="text-[0.562rem] sm:text-[0.625rem] font-mono leading-tight truncate w-full">
                      {evt.status === "PRESENT" && (
                        <span>{evt.totalHours}</span>
                      )}
                      {evt.status === "OVERTIME" && (
                        <span className="text-sky-300 font-bold">
                          {evt.totalHours}
                          <span className="hidden sm:inline"> (OT)</span>
                        </span>
                      )}
                      {evt.status === "ON_LEAVE" && (
                        <span className="text-purple-300">
                          <span className="sm:hidden">Off</span>
                          <span className="hidden sm:inline">Leave</span>
                        </span>
                      )}
                      {evt.status === "IN_PROGRESS" && (
                        <span className="text-emerald-300 font-bold">
                          <span className="sm:hidden">Duty</span>
                          <span className="hidden sm:inline">On Duty</span>
                        </span>
                      )}
                      {evt.status === "MISSED_PUNCH" && (
                        <span className="text-amber-400">
                          <span className="sm:hidden">Miss</span>
                          <span className="hidden sm:inline">No Punch</span>
                        </span>
                      )}
                      {evt.status === "REST_DAY" && evt.isHoliday && (
                        <span className="text-white/40">
                          <span className="sm:hidden">Hol</span>
                          <span className="hidden sm:inline">Holiday</span>
                        </span>
                      )}
                      {evt.status === "REST_DAY" && !evt.isHoliday && (
                        <span className="text-white/30">
                          <span className="sm:hidden">—</span>
                          <span className="hidden sm:inline">Rest</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Right Column: Selected Day Duty Inspector (4 Cols) */}
          <Card className="lg:col-span-4 p-6 bg-[#01142B] border-white/10 flex flex-col gap-5">
            <div className="border-b border-white/10 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[0.688rem] uppercase font-mono tracking-wider text-white/50 block">
                  Day Duty Audit
                </span>
                <h3 className="text-base font-bold text-white font-sans">
                  {selectedDayEvent
                    ? new Date(selectedDayEvent.date).toLocaleDateString("en-PH", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Select a Date"}
                </h3>
              </div>
              {selectedDayEvent?.isToday && (
                <Badge variant="accent" className="text-[0.625rem] font-mono">
                  Today
                </Badge>
              )}
            </div>

            {selectedDayEvent ? (
              <div className="flex flex-col gap-4 text-xs font-sans">
                {/* Status Box */}
                <div className="p-3 bg-[#010D1F] border border-white/10 rounded-[2px] flex items-center justify-between">
                  <span className="text-white/60">Shift Classification:</span>
                  <span className="font-mono font-bold text-white">
                    {selectedDayEvent.status.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Day Type / Labor Policy Status */}
                <div className="p-3 bg-[#010D1F] border border-white/10 rounded-[2px] flex items-center justify-between">
                  <span className="text-white/60">Day Schedule:</span>
                  <span className="font-mono text-xs text-white/90">
                    {selectedDayEvent.isHoliday
                      ? `Holiday (${selectedDayEvent.isWorkingDay ? "Duty Permitted" : "Rest Day"})`
                      : selectedDayEvent.isWeekend
                      ? `Weekend (${selectedDayEvent.isWorkingDay ? "Duty Permitted" : "Rest Day"})`
                      : "Core Weekday (Working Day)"}
                  </span>
                </div>

                {/* Clock In / Out Times */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-[#010D1F] border border-white/5 rounded-[2px]">
                    <span className="text-[0.625rem] font-mono uppercase text-white/40 block">Clock In</span>
                    <span className="text-sm font-mono font-bold text-white">
                      {selectedDayEvent.clockInTime || "--:--"}
                    </span>
                  </div>
                  <div className="p-3 bg-[#010D1F] border border-white/5 rounded-[2px]">
                    <span className="text-[0.625rem] font-mono uppercase text-white/40 block">Clock Out</span>
                    <span className="text-sm font-mono font-bold text-white">
                      {selectedDayEvent.clockOutTime || "--:--"}
                    </span>
                  </div>
                </div>

                {/* Total Working Minutes & Deductions */}
                {selectedDayEvent.totalHours && (
                  <div className="p-3 bg-black/40 border border-white/10 rounded-[2px] flex items-center justify-between">
                    <span className="text-white/70">Net Verified Duty:</span>
                    <span className="text-base font-mono font-extrabold text-emerald-400">
                      {selectedDayEvent.totalHours}
                    </span>
                  </div>
                )}

                {/* Holiday or Leave Note */}
                {selectedDayEvent.holidayName && (
                  <div className="p-3 bg-sky-950/30 border border-sky-500/30 rounded-[2px] text-sky-200">
                    <span className="font-semibold block text-sky-300">Philippine Holiday</span>
                    {selectedDayEvent.holidayName}
                  </div>
                )}

                {selectedDayEvent.leaveReason && (
                  <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-[2px] text-purple-200">
                    <span className="font-semibold block text-purple-300">Authorized Leave</span>
                    &ldquo;{selectedDayEvent.leaveReason}&rdquo;
                  </div>
                )}

                {/* Quick Action to File Correction */}
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setAdjDate(selectedDayEvent.date);
                      setIsAdjModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <IconPlus size={14} stroke={2} />
                    <span>File Correction for this Date</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-white/40 italic">
                Click any day on the calendar to inspect duty logs.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: LEAVE CENTER & BALANCES */}
      {activeTab === "LEAVES" && (
        <div className="flex flex-col gap-6">
          {/* Leave Balances Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              label="Annual Vacation Leave"
              value={portalData.user.annualLeaveBalance}
              unit="days remaining"
              icon={<IconCalendarOff size={16} stroke={1.5} />}
              description="Annual Entitlement Available"
            />

            <KpiCard
              label="Medical & Sick Recovery"
              value={portalData.user.medicalLeaveBalance}
              unit="days remaining"
              variant="sky"
              icon={<IconShieldCheck size={16} stroke={1.5} />}
              description="Health Protection Active"
            />

            <Card variant="kpi" className="group p-5 sm:p-6 bg-[#01142B] border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs uppercase font-mono tracking-wider font-semibold text-white/50">
                    Active Leave Status
                  </span>
                  <Badge variant={portalData.user.isOnLeave ? "amber" : "emerald"} className="text-[0.625rem] font-mono">
                    {portalData.user.isOnLeave ? "On Leave" : "Active Duty"}
                  </Badge>
                </div>
                <div className="py-0.5 my-auto">
                  <span className="text-xl sm:text-2xl font-sans font-bold text-white tracking-tight block truncate">
                    {portalData.user.isOnLeave ? `On Leave until ${portalData.user.leaveUntil?.split("T")[0] || ""}` : "Active on Specialist Pool"}
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-xs font-sans text-white/50">Capacity Status</span>
                {portalData.user.isOnLeave ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleReturnFromLeave}
                    className="cursor-pointer text-xs py-1 px-2.5"
                  >
                    End Leave Now
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsLeaveModalOpen(true)}
                    className="cursor-pointer text-xs py-1 px-2.5"
                  >
                    + Request Leave
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* Past Leaves Record Table */}
          <Card className="p-6 sm:p-8 bg-[#01142B] border-white/10 flex flex-col gap-6">
            <div className="border-b border-white/10 pb-4">
              <h2 className="text-base font-bold text-white font-sans">
                Leave Records & Authorized Windows
              </h2>
              <p className="text-xs text-white/50 font-sans mt-0.5">
                History of authorized specialist leaves and exclusion windows from Module 08 study assignments.
              </p>
            </div>

            {portalData.leaveHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-white/40 italic font-sans">
                Zero previous leave records on file.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50 font-mono uppercase text-[0.688rem]">
                      <th className="py-3 px-3">Start Date</th>
                      <th className="py-3 px-3">Return Date</th>
                      <th className="py-3 px-3">Duration</th>
                      <th className="py-3 px-3">Stated Reason</th>
                      <th className="py-3 px-3">HR Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {portalData.leaveHistory.map((leave, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-3 font-mono font-semibold text-white">{leave.leaveFrom}</td>
                        <td className="py-3 px-3 font-mono text-white/80">{leave.leaveUntil}</td>
                        <td className="py-3 px-3 font-mono font-bold text-white">{leave.totalDays} days</td>
                        <td className="py-3 px-3 font-sans text-white/80">&ldquo;{leave.reason}&rdquo;</td>
                        <td className="py-3 px-3">
                          {leave.status === "ACTIVE_LEAVE" ? (
                            <span className="px-2 py-0.5 rounded-[2px] bg-purple-950/50 text-purple-300 border border-purple-500/30 font-mono text-[0.688rem]">
                              Active on Leave
                            </span>
                          ) : (
                            <Badge variant="emerald" className="font-mono text-[0.688rem]">
                              Completed
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: OVERTIMES & ADJUSTMENTS */}
      {activeTab === "OVERTIME" && (
        <div className="flex flex-col gap-6">
          <Card className="p-6 sm:p-8 bg-[#01142B] border-white/10 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-base font-bold text-white font-sans">
                  Filed Overtime Claims & Missed-Punch Corrections
                </h2>
                <p className="text-xs text-white/50 font-sans mt-0.5">
                  Track the verification status of extra compute runs and time adjustments.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAdjModalOpen(true)}
                className="flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <IconPlus size={14} stroke={2.5} />
                <span>File New Overtime / Adjustment</span>
              </Button>
            </div>

            {portalData.corrections.length === 0 ? (
              <div className="py-8 text-center text-xs text-white/40 italic font-sans">
                Zero overtime or adjustment filings recorded.
              </div>
            ) : (
              <div className="space-y-3">
                {portalData.corrections.map((c) => (
                  <div key={c.id} className="p-4 bg-[#010D1F] border border-white/10 rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">Date: {c.targetDate}</span>
                        <Badge variant="sky" className="text-[0.625rem] font-mono">
                          {c.correctionType.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-xs font-mono text-emerald-400 font-bold">
                          {c.claimedNetHours} hrs (Break: {c.claimedBreakMins}m)
                        </span>
                      </div>
                      <p className="text-xs text-white/80 font-sans">&ldquo;{c.reason}&rdquo;</p>
                      {c.tasksDelivered && (
                        <p className="text-[0.688rem] text-white/50 font-sans">
                          Deliverables: {c.tasksDelivered}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {c.status === "PENDING" && (
                        <Badge variant="amber" className="font-mono text-xs">
                          Pending HR Review
                        </Badge>
                      )}
                      {c.status === "APPROVED" && (
                        <Badge variant="emerald" className="font-mono text-xs flex items-center gap-1">
                          <IconCheck size={12} stroke={2.5} />
                          <span>Credited to Payroll</span>
                        </Badge>
                      )}
                      {c.status === "REJECTED" && (
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
        </div>
      )}

      {/* TAB 4: PAYSLIP & MONTHLY EARNINGS */}
      {activeTab === "PAYSLIP" && portalData && (
        <div className="flex flex-col gap-6">
          <Card className="p-4 sm:p-8 lg:p-10 bg-[#01142B] border-white/10 flex flex-col gap-6">
            {/* Header / Pay Period */}
            <div className="flex flex-col gap-5 border-b border-white/10 pb-6">
              {/* Top Controls Row: Badges & Cycle Selector */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Metadata Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {(activeDisplayPayslip?.payslipNumber || portalData.payslip.payslipNumber) && (
                    <Badge variant="sky" className="text-xs font-mono font-bold tracking-wider">
                      {activeDisplayPayslip?.payslipNumber || portalData.payslip.payslipNumber}
                    </Badge>
                  )}
                  {(activeDisplayPayslip?.status || portalData.payslip.status) && (
                    <Badge
                      variant={(activeDisplayPayslip?.status || portalData.payslip.status) === "DISBURSED" ? "emerald" : "amber"}
                      className="text-xs font-mono font-semibold"
                    >
                      {(activeDisplayPayslip?.status || portalData.payslip.status) === "DISBURSED"
                        ? `Disbursed (${activeDisplayPayslip?.disbursementMethod || "Paid"})`
                        : (activeDisplayPayslip?.status || portalData.payslip.status)}
                    </Badge>
                  )}
                  {activeDisplayPayslip?.cutOffCycle && (
                    <Badge variant="amber" className="text-xs font-mono">
                      {activeDisplayPayslip.cutOffCycle === "FIRST_HALF"
                        ? "1st Cut-Off (Days 1–15)"
                        : activeDisplayPayslip.cutOffCycle === "SECOND_HALF"
                        ? "2nd Cut-Off (Days 16–End)"
                        : "Full Month"}
                    </Badge>
                  )}
                  {(activeDisplayPayslip?.compensationType || portalData.payslip.compensationType) && (
                    <span className="text-xs font-mono text-white/50 bg-white/[0.04] px-2.5 py-1 rounded-[2px] border border-white/10">
                      Rate: {(activeDisplayPayslip?.compensationType || portalData.payslip.compensationType || "").replace(/_/g, " ")}
                    </span>
                  )}
                </div>

                {/* Right: Cycle History Selector */}
                {allMyPayslips.length > 0 && (
                  <div className="flex items-center gap-2 w-full lg:w-auto">
                    <span className="text-xs font-mono uppercase text-white/60 font-semibold tracking-wider shrink-0">
                      Cycle History:
                    </span>
                    <div className="relative flex-1 sm:w-[320px] md:w-[360px] min-w-0">
                      <select
                        value={activeDisplayPayslip?.id || ""}
                        onChange={(e) => {
                          const found = allMyPayslips.find((p) => p.id === e.target.value);
                          if (found) setSelectedPayslip(found);
                        }}
                        className="w-full bg-[#010D1F] border border-white/15 rounded-[2px] pl-3 pr-8 py-2 text-xs text-white font-mono outline-none focus:border-[#CC6600] cursor-pointer appearance-none transition-colors hover:border-white/25 truncate"
                      >
                        {allMyPayslips.map((ps) => {
                          const monthMatch = ps.payPeriodMonth.match(/([A-Za-z]+)\s+(\d{4})/);
                          const monthStr =
                            monthMatch?.[1] && monthMatch?.[2]
                              ? `${monthMatch[1].slice(0, 3)} ${monthMatch[2]}`
                              : ps.payPeriodMonth.split("(")[0]?.trim() || ps.payPeriodMonth;
                          const cycleStr =
                            ps.cutOffCycle === "FIRST_HALF" || ps.payPeriodMonth.includes("First") || ps.payPeriodMonth.includes("1–15")
                              ? "1st Cut-Off"
                              : ps.cutOffCycle === "SECOND_HALF" || ps.payPeriodMonth.includes("Second") || ps.payPeriodMonth.includes("16–")
                              ? "2nd Cut-Off"
                              : "Full Month";

                          return (
                            <option key={ps.id} value={ps.id} className="bg-[#010D1F] text-white">
                              {monthStr} ({cycleStr}) · ₱{ps.netPay.toLocaleString("en-PH", { minimumFractionDigits: 2 })} [{ps.status}]
                            </option>
                          );
                        })}
                      </select>
                      <IconChevronDown
                        size={14}
                        stroke={2}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Title & Actions Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-white font-sans tracking-tight">
                    Payslip Summary
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-white/60 font-sans mt-1 flex-wrap">
                    <span>Period: <strong className="text-white font-medium">{activeDisplayPayslip?.payPeriodMonth || portalData.payslip.payPeriod}</strong></span>
                    <span>&bull;</span>
                    <span>Staff Member: <strong className="text-white font-medium">{activeDisplayPayslip?.staffName || portalData.user.fullName}</strong> ({activeDisplayPayslip?.staffRole || portalData.user.role})</span>
                  </div>
                </div>

                {activeDisplayPayslip && (
                  <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPayslipForModal(activeDisplayPayslip)}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 cursor-pointer text-xs font-sans rounded-[2px] px-4 py-2"
                    >
                      <IconFileText size={14} stroke={1.5} />
                      <span>Inspect Statement</span>
                    </Button>

                    <Link
                      href={`/dashboard/staff/hr/payslips/${activeDisplayPayslip.id}/print`}
                      target="_blank"
                      className="w-full sm:w-auto"
                    >
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 cursor-pointer text-xs font-semibold rounded-[2px] px-4 py-2"
                      >
                        <IconPrinter size={14} stroke={2} />
                        <span>Print PDF</span>
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Compensation Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Verified Hours Worked"
                value={activeDisplayPayslip?.verifiedDutyHours ?? portalData.payslip.totalDutyHours}
                unit="hrs"
                icon={<IconClock size={16} stroke={1.5} />}
                description={<>@ <Peso />{(activeDisplayPayslip?.hourlyRate ?? portalData.payslip.baseHourlyRate ?? 450).toFixed(2)} / hour</>}
              />

              <KpiCard
                label="Hourly Duty Earnings"
                value={<><Peso />{(activeDisplayPayslip?.hourlyDutyEarnings ?? portalData.payslip.dutyHourlyEarnings).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</>}
                variant="emerald"
                icon={<IconReceipt size={16} stroke={1.5} />}
                description="From verified duty punches"
              />

              <KpiCard
                label="Studies Completed Pay"
                value={<><Peso />{(activeDisplayPayslip?.commissionEarnings ?? portalData.payslip.projectMilestoneEarnings).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</>}
                variant="emerald"
                icon={<IconBuildingBank size={16} stroke={1.5} />}
                description={activeDisplayPayslip?.completedStudiesCount ? `From ${activeDisplayPayslip.completedStudiesCount} delivered studies` : "From delivered studies"}
              />

              <KpiCard
                label="Allowances & Base Pay"
                value={<><Peso />{(
                  (activeDisplayPayslip?.baseSalary ?? 0) +
                  (activeDisplayPayslip?.allowances ?? portalData.payslip.allowances) +
                  (activeDisplayPayslip?.overtimeEarnings ?? portalData.payslip.overtimeEarnings)
                ).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</>}
                variant="sky"
                icon={<IconShieldCheck size={16} stroke={1.5} />}
                description={activeDisplayPayslip?.baseSalary ? <><Peso />{activeDisplayPayslip.baseSalary.toLocaleString()} Base + Allowances</> : "Overtime + Tech stipend"}
              />
            </div>

            {/* Total Net Take-Home */}
            <div className="p-4 sm:p-6 bg-[#011B38] border border-[#10B981]/40 rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                {/* Mobile Top Row: Icon + Disbursed Status Badge */}
                <div className="flex items-center justify-between sm:justify-start gap-3">
                  <div className="p-2.5 sm:p-3 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-[2px] shrink-0">
                    <IconBuildingBank size={22} stroke={1.5} />
                  </div>

                  <div className="sm:hidden">
                    <Badge
                      variant={(activeDisplayPayslip?.status || portalData.payslip.status) === "DISBURSED" ? "emerald" : "sky"}
                      className="font-mono text-[0.688rem] px-2.5 py-1"
                    >
                      {(activeDisplayPayslip?.status || portalData.payslip.status) === "DISBURSED"
                        ? `Disbursed (${activeDisplayPayslip?.disbursementMethod || "Cleared"})`
                        : (activeDisplayPayslip?.status || "Disbursement Ready")}
                    </Badge>
                  </div>
                </div>

                {/* Content: Labels & Big Currency Value */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[0.688rem] uppercase font-mono text-white/50 tracking-wider">
                      Estimated Net Disbursement
                    </span>
                    <span className="text-xs text-white/60 font-sans truncate max-w-full">
                      {activeDisplayPayslip?.payPeriodMonth || "This Pay Cycle"}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1.5 mt-1.5 flex-wrap">
                    <Peso className="text-xl sm:text-2xl text-white/80 font-normal" />
                    <span className="text-2xl sm:text-3xl font-mono font-extrabold text-white tracking-tight">
                      {(activeDisplayPayslip?.netPay ?? portalData.payslip.netPay).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Desktop Disbursed Status Badge */}
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <Badge
                  variant={(activeDisplayPayslip?.status || portalData.payslip.status) === "DISBURSED" ? "emerald" : "sky"}
                  className="font-mono text-xs px-3 py-1"
                >
                  {(activeDisplayPayslip?.status || portalData.payslip.status) === "DISBURSED"
                    ? `Disbursed (${activeDisplayPayslip?.disbursementMethod || "Cleared"})`
                    : (activeDisplayPayslip?.status || "Disbursement Ready")}
                </Badge>
              </div>
            </div>

            {/* Registered Disbursement Destination Banner */}
            <div className="p-3.5 sm:p-4 bg-[#010D1F] border border-white/10 rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-[#CC6600]/15 border border-[#CC6600]/30 text-[#FFA040] rounded-[2px] shrink-0">
                  <IconBuildingBank size={18} stroke={1.5} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs uppercase font-mono font-semibold text-white/50">
                    Disbursement Payout Destination
                  </span>
                  {payoutDetails ? (
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <Badge variant="amber" className="text-[0.625rem] font-mono">
                        {payoutDetails.payoutChannel.replace(/_/g, " ")}
                      </Badge>
                      <span className="font-mono text-xs font-bold text-white">
                        {payoutDetails.accountNumber}
                      </span>
                      {payoutDetails.bankName && (
                        <span className="text-xs text-sky-400 font-sans">
                          ({payoutDetails.bankName})
                        </span>
                      )}
                      <span className="text-xs text-white/60 font-sans truncate">
                        &bull; {payoutDetails.accountName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-400 font-sans mt-0.5">
                      No verified payout account registered yet.
                    </span>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("PAYOUT")}
                className="cursor-pointer text-xs flex items-center justify-center gap-1.5 rounded-[2px] w-full sm:w-auto shrink-0 py-1.5"
              >
                <IconEdit size={14} stroke={1.5} />
                <span>{payoutDetails ? "Update Payout Details" : "Configure Settlement Account"}</span>
              </Button>
            </div>

            {/* Historical Payslips Audit Ledger */}
            <div className="mt-6 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-[#CC6600]/20 border border-[#CC6600]/40 rounded-[2px] text-[#FFA040]">
                    <IconHistory size={16} stroke={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-sans">
                      Past Months &amp; Historical Payslips Ledger ({allMyPayslips.length})
                    </h3>
                    <span className="text-[0.688rem] text-white/50 font-sans">
                      Official compensation statements and corporate settlement records across all cut-off cycles.
                    </span>
                  </div>
                </div>
              </div>

              {allMyPayslips.length === 0 ? (
                <div className="py-8 text-center text-xs text-white/40 italic font-sans border border-white/10 rounded-[2px] bg-[#010D1F]">
                  No past payslip records found.
                </div>
              ) : (
                <div className="overflow-hidden rounded-[2px] border border-white/10 bg-[#010D1F]/60 shadow-xl flex flex-col">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse font-sans">
                      <thead>
                        <tr className="bg-[#010D1F] border-b border-white/10 text-white/50 font-mono uppercase text-[0.688rem] tracking-wider">
                          <th className="py-3.5 px-4 whitespace-nowrap min-w-[130px]">Statement Ref</th>
                          <th className="py-3.5 px-4 whitespace-nowrap min-w-[160px]">Pay Period</th>
                          <th className="py-3.5 px-4 whitespace-nowrap min-w-[140px]">Pay Structure</th>
                          <th className="py-3.5 px-4 whitespace-nowrap text-right min-w-[90px]">Duty Hours</th>
                          <th className="py-3.5 px-4 whitespace-nowrap text-right min-w-[110px]">Gross Pay</th>
                          <th className="py-3.5 px-4 whitespace-nowrap text-right min-w-[130px] text-emerald-400/90">Net Take-Home</th>
                          <th className="py-3.5 px-4 whitespace-nowrap text-center min-w-[140px]">Settlement Status</th>
                          <th className="py-3.5 px-4 whitespace-nowrap text-right min-w-[160px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {allMyPayslips
                          .slice((payslipPage - 1) * payslipPageSize, payslipPage * payslipPageSize)
                          .map((ps) => {
                          const isCurrent = ps.id === activeDisplayPayslip?.id;
                          const parts = ps.payPeriodMonth.split("(");
                          const mainMonth = parts[0]?.trim() || ps.payPeriodMonth;
                          let cycleSub = "";
                          if (parts.length > 1) {
                            const rawCycle = parts[1]?.replace(")", "").trim();
                            if (rawCycle?.includes("First Half") || rawCycle?.includes("Days 1-15") || rawCycle?.includes("Days 1–15")) {
                              cycleSub = "1st Half (Days 1–15)";
                            } else if (rawCycle?.includes("Second Half") || rawCycle?.includes("Days 16")) {
                              cycleSub = "2nd Half (Days 16–End)";
                            } else {
                              cycleSub = rawCycle || "";
                            }
                          } else if (ps.cutOffCycle === "FIRST_HALF") {
                            cycleSub = "1st Half (Days 1–15)";
                          } else if (ps.cutOffCycle === "SECOND_HALF") {
                            cycleSub = "2nd Half (Days 16–End)";
                          } else if (ps.cutOffCycle === "FULL_MONTH") {
                            cycleSub = "Full Month Cycle";
                          }

                          return (
                            <tr
                              key={ps.id}
                              className={`hover:bg-white/[0.04] transition-colors group ${
                                isCurrent ? "bg-[#CC6600]/10 border-l-2 border-l-[#CC6600]" : ""
                              }`}
                            >
                              <td className="py-3.5 px-4 font-mono text-[#FFA040] font-semibold whitespace-nowrap">
                                {ps.payslipNumber}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className="font-semibold text-white font-sans text-xs block leading-tight">
                                  {mainMonth}
                                </span>
                                {cycleSub && (
                                  <span className="text-[0.688rem] font-mono text-sky-400/80 block mt-0.5">
                                    {cycleSub}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-white/70 font-mono text-[0.688rem] whitespace-nowrap">
                                {ps.compensationType.replace(/_/g, " ")}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-right text-white/90 whitespace-nowrap">
                                {ps.verifiedDutyHours > 0 ? `${ps.verifiedDutyHours}h` : "—"}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-right text-white/70 text-xs whitespace-nowrap">
                                <span className="inline-flex items-baseline"><Peso />{ps.grossEarnings.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-right whitespace-nowrap">
                                <span className="inline-flex items-baseline font-mono font-bold text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-[2px]">
                                  <Peso className="text-emerald-400/80 text-xs" />{ps.netPay.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono">
                                <Badge
                                  variant={ps.status === "DISBURSED" ? "emerald" : ps.status === "APPROVED" ? "sky" : "amber"}
                                  className="text-[0.625rem] uppercase tracking-wider"
                                >
                                  {ps.status === "DISBURSED"
                                    ? `Disbursed (${ps.disbursementMethod || "Direct"})`
                                    : ps.status}
                                </Badge>
                                {ps.disbursementReference && (
                                  <span className="text-[0.625rem] text-white/40 block font-mono mt-0.5">
                                    Ref: {ps.disbursementReference}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedPayslipForModal(ps)}
                                    className="h-7 text-xs font-sans px-2.5 text-sky-400 border-sky-500/30 hover:bg-sky-500/10 cursor-pointer rounded-[2px]"
                                  >
                                    <span>Statement →</span>
                                  </Button>
                                  <Link
                                    href={`/dashboard/staff/hr/payslips/${ps.id}/print`}
                                    target="_blank"
                                    className="h-7 px-2 flex items-center gap-1 text-xs font-sans text-white/70 hover:text-white border border-white/10 hover:border-white/20 rounded-[2px] hover:bg-white/[0.06] transition-colors"
                                    title="Print Official Document Voucher / PDF"
                                  >
                                    <IconPrinter size={13} stroke={2} />
                                    <span className="hidden sm:inline">Voucher</span>
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <Pagination
                    currentPage={payslipPage}
                    totalItems={allMyPayslips.length}
                    pageSize={payslipPageSize}
                    onPageChange={setPayslipPage}
                    onPageSizeChange={(newSize) => {
                      setPayslipPageSize(newSize);
                      setPayslipPage(1);
                    }}
                    pageSizeOptions={[5, 10, 20, 50]}
                    itemLabel="payslips"
                  />
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: DISBURSEMENT & PAYOUT DETAILS */}
      {activeTab === "PAYOUT" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Configuration Card (8 Cols) */}
          <Card className="lg:col-span-8 p-6 sm:p-8 bg-[#01142B] border-white/10 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#CC6600]/15 border border-[#CC6600]/30 text-[#FFA040] rounded-[2px]">
                  <IconBuildingBank size={20} stroke={1.5} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white font-sans">
                    Disbursement &amp; Payout Account Configuration
                  </h2>
                  <span className="text-xs text-white/50 font-sans">
                    Configure your verified Philippine e-wallet or local bank account for direct milestone payments and salary releases.
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSavePayoutDetails} className="flex flex-col gap-5">
              {/* Channel Selector Grid */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono uppercase text-white/70 font-semibold">
                  Preferred Disbursement Channel *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: "GCASH", label: "GCash", desc: "Mobile E-Wallet", icon: IconDeviceMobile },
                    { id: "MAYA", label: "Maya", desc: "Digital Wallet", icon: IconWallet },
                    { id: "BANK_TRANSFER", label: "Bank Wire", desc: "Philippine Bank", icon: IconBuildingBank },
                    { id: "CASH", label: "Cash Window", desc: "In-Person Collection", icon: IconCoins },
                  ].map((ch) => {
                    const Icon = ch.icon;
                    const isSelected = payoutChannel === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => {
                          const nextChannel = ch.id as PayoutChannel;
                          setPayoutChannel(nextChannel);
                          if (nextChannel === "CASH" && !accountNumber.trim()) {
                            setAccountNumber("HQ Manila Treasury Settlement Desk");
                          } else if (accountNumber.trim()) {
                            setAccountNumber(formatSettlementAccountNumber(nextChannel, accountNumber));
                          }
                        }}
                        className={`p-3 rounded-[2px] border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                          isSelected
                            ? "bg-[#CC6600]/15 border-[#CC6600] text-white shadow-lg"
                            : "bg-[#010D1F] border-white/10 text-white/60 hover:text-white hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Icon size={18} stroke={1.5} className={isSelected ? "text-[#FFA040]" : "text-white/40"} />
                          {isSelected && <IconCheck size={14} stroke={2.5} className="text-[#FFA040]" />}
                        </div>
                        <div>
                          <span className={`text-xs font-bold font-sans block ${isSelected ? "text-white" : "text-white/80"}`}>
                            {ch.label}
                          </span>
                          <span className="text-[0.625rem] text-white/40 font-mono">
                            {ch.desc}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bank Name Dropdown (Conditional) */}
              {payoutChannel === "BANK_TRANSFER" && (
                <div className="flex flex-col gap-1.5 animate-content-fade">
                  <label className="text-xs font-mono uppercase text-white/70 font-semibold">
                    Philippine Bank Name *
                  </label>
                  <div className="relative">
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full bg-[#010D1F] border border-white/10 focus:border-[#CC6600] rounded-[2px] pl-3 pr-10 py-2.5 text-xs text-white outline-none cursor-pointer font-sans appearance-none hover:border-white/20 transition-colors"
                      required
                    >
                      <option value="BDO Unibank">BDO Unibank (Banco de Oro)</option>
                      <option value="Bank of the Philippine Islands (BPI)">Bank of the Philippine Islands (BPI)</option>
                      <option value="Metrobank">Metropolitan Bank & Trust Co. (Metrobank)</option>
                      <option value="UnionBank of the Philippines">UnionBank of the Philippines</option>
                      <option value="Security Bank">Security Bank Corporation</option>
                      <option value="RCBC">Rizal Commercial Banking Corporation (RCBC)</option>
                      <option value="Landbank">Land Bank of the Philippines</option>
                      <option value="GoTyme Bank">GoTyme Bank</option>
                      <option value="Maya Bank">Maya Bank</option>
                      <option value="Philippine National Bank (PNB)">Philippine National Bank (PNB)</option>
                      <option value="China Banking Corporation">China Banking Corporation (China Bank)</option>
                      <option value="Other Philippine Bank">Other Philippine Commercial Bank</option>
                    </select>
                    <IconChevronDown
                      size={15}
                      stroke={2}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none"
                    />
                  </div>
                </div>
              )}

              {/* Account Number / Mobile Number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono uppercase text-white/70 font-semibold">
                  {payoutChannel === "GCASH" || payoutChannel === "MAYA"
                    ? "Registered Mobile / Account Number *"
                    : payoutChannel === "BANK_TRANSFER"
                    ? "Bank Account Number *"
                    : "Office Reference / ID Number *"}
                </label>
                <input
                  type="text"
                  required
                  value={accountNumber}
                  maxLength={
                    payoutChannel === "GCASH" || payoutChannel === "MAYA"
                      ? 13
                      : payoutChannel === "BANK_TRANSFER"
                      ? 19
                      : 60
                  }
                  onChange={(e) =>
                    setAccountNumber(formatSettlementAccountNumber(payoutChannel, e.target.value))
                  }
                  placeholder={
                    payoutChannel === "GCASH"
                      ? "0917-123-4567"
                      : payoutChannel === "MAYA"
                      ? "0918-223-9901"
                      : payoutChannel === "BANK_TRANSFER"
                      ? "1092-3847-1920"
                      : "e.g. JAX-STAFF-001 (HQ Manila Window)"
                  }
                  className="w-full bg-[#010D1F] border border-white/10 focus:border-[#CC6600] rounded-[2px] p-2.5 text-xs text-white font-mono placeholder-white/30 outline-none transition-colors"
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40 font-sans">
                    {payoutChannel === "GCASH" || payoutChannel === "MAYA"
                      ? "Philippine 11-digit mobile e-wallet format (09XX-XXX-XXXX)."
                      : payoutChannel === "BANK_TRANSFER"
                      ? "Standard bank account number formatted in 4-digit groups."
                      : "All milestone disbursements are routed directly to this destination."}
                  </span>
                  {(payoutChannel === "GCASH" || payoutChannel === "MAYA") && (
                    <span
                      className={`font-mono text-[0.688rem] ${
                        accountNumber.replace(/\D/g, "").length === 11
                          ? "text-emerald-400 font-semibold"
                          : "text-white/40"
                      }`}
                    >
                      {accountNumber.replace(/\D/g, "").length} / 11 digits
                    </span>
                  )}
                </div>
              </div>

              {/* Account Holder KYC Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono uppercase text-white/70 font-semibold">
                  Registered Account Holder Name (KYC Verified) *
                </label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. Prof. Sofia Benitez or Dr. Juan Reyes"
                  className="w-full bg-[#010D1F] border border-white/10 focus:border-[#CC6600] rounded-[2px] p-2.5 text-xs text-white font-sans placeholder-white/30 outline-none"
                />
                <span className="text-xs text-white/40">
                  Must match the exact name registered on your bank or e-wallet account to prevent payment rejections.
                </span>
              </div>

              {/* Special Instructions / Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono uppercase text-white/70 font-semibold">
                  Disbursement Notes / Branch Info (Optional)
                </label>
                <input
                  type="text"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  placeholder="e.g. BDO Makati Avenue Branch or GCash merchant verified"
                  className="w-full bg-[#010D1F] border border-white/10 focus:border-[#CC6600] rounded-[2px] p-2.5 text-xs text-white font-sans placeholder-white/30 outline-none"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-2">
                <div className="text-xs text-white/50">
                  Updates take effect immediately on your upcoming cut-off payout.
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSavingPayout || !accountNumber.trim() || !accountName.trim()}
                  className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold rounded-[2px] px-5 py-2"
                >
                  {isSavingPayout ? (
                    <>
                      <IconLoader2 size={16} stroke={2.5} className="animate-spin text-white/90" />
                      <span>Saving Settlement...</span>
                    </>
                  ) : (
                    <>
                      <IconCheck size={16} stroke={2} />
                      <span>Save Settlement Method</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>

          {/* Right Column: Live Treasury & Finance View (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <Card className="p-6 bg-[#01142B] border-white/10 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-white/60">
                  Live Treasury Verification
                </span>
                <span className="text-[0.625rem] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-[2px] border border-emerald-500/20">
                  Verified Active
                </span>
              </div>

              <p className="text-xs text-white/60 font-sans leading-relaxed">
                This is how the **Finance Officer** and **CEO** see your payout account when releasing salary disbursements:
              </p>

              <div className="p-4 bg-[#010D1F] border border-white/10 rounded-[2px] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-white/40">Channel</span>
                  <Badge variant="amber" className="text-xs font-mono">
                    {payoutChannel.replace(/_/g, " ")}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-white/40">Account No.</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-white">
                      {accountNumber || "—"}
                    </span>
                    {accountNumber && (
                      <button
                        type="button"
                        onClick={() => handleCopyAccount(accountNumber)}
                        className="text-white/40 hover:text-white transition-colors cursor-pointer"
                        title="Copy Account"
                      >
                        {copiedAccount ? (
                          <IconCheck size={12} stroke={2} className="text-emerald-400" />
                        ) : (
                          <IconCopy size={12} stroke={1.5} />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {payoutChannel === "BANK_TRANSFER" && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-white/40">Bank Name</span>
                    <span className="text-xs font-sans text-sky-300 font-medium truncate max-w-[160px]">
                      {bankName}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-white/40">Holder</span>
                  <span className="text-xs font-sans text-white font-medium">
                    {accountName || portalData?.user?.fullName || "—"}
                  </span>
                </div>

                {payoutNotes && (
                  <div className="pt-2 border-t border-white/5 text-[0.688rem] text-white/40 font-sans italic">
                    Note: &ldquo;{payoutNotes}&rdquo;
                  </div>
                )}
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-[2px] flex items-start gap-2 text-xs text-white/50 font-sans">
                <IconShieldCheck size={16} stroke={1.5} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  All banking records are encrypted and restricted to authorized JAXIS Treasury signatories.
                </span>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* LEAVE REQUEST MODAL */}
      {isLeaveModalOpen && (
        <Modal
          open={isLeaveModalOpen}
          onClose={() => !isSubmittingLeave && setIsLeaveModalOpen(false)}
          title="Schedule Specialist Leave"
          description="Pause assignment intake and declare your unavailable period."
          size="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="secondary"
                size="sm"
                disabled={isSubmittingLeave}
                onClick={() => setIsLeaveModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isSubmittingLeave || !leaveReason.trim() || isReturnBeforeStart}
                onClick={handleSubmitLeave}
                className="font-sans text-xs font-semibold rounded-[2px]"
              >
                {isSubmittingLeave ? (
                  <div className="flex items-center gap-1.5">
                    <IconLoader2 size={15} stroke={2.5} className="animate-spin text-white" />
                    <span>Submitting...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <IconCheck size={15} stroke={2} />
                    <span>Submit Leave Request</span>
                  </div>
                )}
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
                  value={LEAVE_REASON_TEMPLATES.find((t) => t.text === leaveReason)?.text || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      setLeaveReason(e.target.value);
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
                      className="bg-[#01142B] text-white py-1"
                    >
                      {tmpl.label}
                    </option>
                  ))}
                </select>
                <IconChevronDown
                  size={14}
                  stroke={2}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none"
                />
              </div>

              <textarea
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="e.g. Annual vacation, medical recovery, academic conference presentation..."
                className="w-full bg-[#01142B] border border-white/10 rounded-[2px] p-2.5 text-xs text-white placeholder-white/40 focus:border-[#CC6600] outline-none resize-none h-16 font-sans leading-relaxed"
              />
            </div>

            {/* Leave Duration & Date Range (Day or Days) */}
            <div className="flex flex-col gap-2 p-3 bg-black/40 border border-white/10 rounded-[2px]">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-white/90">
                  Leave Duration (Day or Days)
                </label>
                {isReturnBeforeStart ? (
                  <span className="text-xs font-mono font-semibold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded-[2px] border border-rose-500/30">
                    Invalid Return Date
                  </span>
                ) : (
                  <span className="text-xs font-mono font-semibold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-[2px] border border-amber-500/30">
                    {leaveDaysCount} {leaveDaysCount === 1 ? "Day" : "Days"} Scheduled
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                <div className="flex flex-col gap-1">
                  <span className="text-[0.625rem] font-mono text-white/50 uppercase">Leave Start Date</span>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={leaveFrom}
                    onChange={(e) => setLeaveFrom(e.target.value)}
                    className="w-full bg-[#010D1F] border border-white/10 rounded-[2px] px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#CC6600] cursor-pointer"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[0.625rem] font-mono text-white/50 uppercase">Expected Return Date</span>
                  <input
                    type="date"
                    min={leaveFrom}
                    value={leaveUntil}
                    onChange={(e) => setLeaveUntil(e.target.value)}
                    className="w-full bg-[#010D1F] border border-white/10 rounded-[2px] px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#CC6600] cursor-pointer"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* OVERTIME / ADJUSTMENT MODAL */}
      <Modal
        isOpen={isAdjModalOpen}
        onClose={() => !isSubmittingAdj && setIsAdjModalOpen(false)}
        title="File Overtime Claim or Time Adjustment"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button
              variant="secondary"
              size="sm"
              disabled={isSubmittingAdj}
              onClick={() => setIsAdjModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isSubmittingAdj}
              onClick={handleSubmitAdj}
            >
              {isSubmittingAdj ? (
                <div className="flex items-center gap-1.5">
                  <IconLoader2 size={14} stroke={2.5} className="animate-spin text-white" />
                  <span>Submitting Filing...</span>
                </div>
              ) : (
                <span>Submit for HR Authorization</span>
              )}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitAdj} className="flex flex-col gap-4 text-xs font-sans text-white/90">
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-white/90">Filing Classification</label>
            <div className="relative">
              <select
                value={adjType}
                onChange={(e) =>
                  setAdjType(
                    e.target.value as "OVERTIME_CLAIM" | "MISSED_CLOCK_IN" | "MISSED_CLOCK_OUT" | "MISSED_FULL_SHIFT"
                  )
                }
                className="w-full bg-[#010D1F] border border-white/10 rounded-[2px] pl-3 pr-10 py-2.5 text-xs text-white outline-none cursor-pointer font-sans appearance-none hover:border-white/20 transition-colors"
              >
                <option value="OVERTIME_CLAIM">Approved Overtime / Emergency Compute Run</option>
                <option value="MISSED_CLOCK_IN">Forgot to Clock In (Worked on time)</option>
                <option value="MISSED_CLOCK_OUT">Forgot to Clock Out (Shift ran open)</option>
                <option value="MISSED_FULL_SHIFT">Missed Full Shift (Worked full shift without punch)</option>
              </select>
              <IconChevronDown
                size={15}
                stroke={2}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-white/90">Target Date</label>
              <input
                type="date"
                value={adjDate}
                onChange={(e) => setAdjDate(e.target.value)}
                className="bg-[#010D1F] border border-white/10 rounded-[2px] p-2 text-xs text-white outline-none font-mono cursor-pointer"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-white/90">Time In</label>
              <input
                type="time"
                value={adjInTime}
                onChange={(e) => setAdjInTime(e.target.value)}
                className="bg-[#010D1F] border border-white/10 rounded-[2px] p-2 text-xs text-white outline-none font-mono cursor-pointer"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-white/90">Time Out</label>
              <input
                type="time"
                value={adjOutTime}
                onChange={(e) => setAdjOutTime(e.target.value)}
                className="bg-[#010D1F] border border-white/10 rounded-[2px] p-2 text-xs text-white outline-none font-mono cursor-pointer"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-white/90">Break Deduction</label>
              <select
                value={adjBreakMins}
                onChange={(e) => setAdjBreakMins(Number(e.target.value))}
                className="bg-[#010D1F] border border-white/10 rounded-[2px] px-3 pr-10 py-2 text-xs text-white outline-none font-mono cursor-pointer"
              >
                <option value={0}>0 mins (No break)</option>
                <option value={30}>30 mins</option>
                <option value={60}>60 mins (Standard 1h)</option>
                <option value={90}>90 mins</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-white/90">Stated Justification</label>
            <textarea
              rows={3}
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              placeholder="e.g. Executed urgent statistical compute runs for Study #JX-2026-0001..."
              className="w-full bg-[#010D1F] border border-white/10 focus:border-[#CC6600] rounded-[2px] p-2.5 text-xs text-white placeholder-white/30 outline-none resize-none font-sans"
              required
            />
          </div>
        </form>
      </Modal>

      {/* Statement Document Modal */}
      {selectedPayslipForModal && (
        <PayslipStatementModal
          payslip={selectedPayslipForModal}
          open={Boolean(selectedPayslipForModal)}
          onClose={() => setSelectedPayslipForModal(null)}
        />
      )}

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
