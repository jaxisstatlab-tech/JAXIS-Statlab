"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  IconShieldLock,
  IconClock,
  IconUserCheck,
  IconSearch,
  IconFingerprint,
  IconHistory,
  IconSettings,
  IconCheck,
  IconLoader2,
  IconCalendarEvent,
  IconSun,
  IconCoffee,
  IconDeviceAnalytics,
  IconCoin,
  IconDeviceMobile,
  IconDeviceDesktop,
  IconAlertTriangle,
  IconBolt,
} from "@tabler/icons-react";
import {
  Card,
  KpiCard,
  Badge,
  Button,
  LoadingState,
  PageHeader,
  Toast,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Switch,
  Pagination,
} from "@repo/ui";
import {
  getCeoAttendanceAuditVault,
  updateCompanyAttendancePolicy,
} from "@/features/attendance/actions";
import type {
  StaffAttendanceItem,
  AttendanceCorrectionItem,
  AttendanceSummaryKPIs,
  AttendancePolicyDTO,
} from "@/features/attendance/schemas";

export interface CeoAttendanceAuditClientProps {
  initialData: {
    allLogs: StaffAttendanceItem[];
    allCorrections: AttendanceCorrectionItem[];
    kpis: AttendanceSummaryKPIs;
    policyConfig: AttendancePolicyDTO | null;
  };
}

export function CeoAttendanceAuditClient({ initialData }: CeoAttendanceAuditClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<StaffAttendanceItem[]>(initialData.allLogs);
  const [corrections, setCorrections] = useState<AttendanceCorrectionItem[]>(initialData.allCorrections);
  const [kpis, setKpis] = useState<AttendanceSummaryKPIs>(initialData.kpis);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"LEDGER" | "POLICIES">("LEDGER");

  // CEO Policy State Form
  const [policy, setPolicy] = useState<AttendancePolicyDTO>(
    initialData.policyConfig || {
      allowWeekendWork: true,
      allowHolidayWork: true,
      operatingHoursMode: "FLEXIBLE_24_7",
      coreHoursStart: "08:00",
      coreHoursEnd: "18:00",
      autoDeductMealBreak: true,
      mealBreakMinutes: 60,
      mealBreakThresholdHours: 5.0,
      baseHourlyRate: 450.0,
      maxShiftCapHours: 14,
    }
  );
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    description?: string;
    variant: "success" | "warning" | "danger" | "info";
  } | null>(null);

  const isInitialMount = useRef(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getCeoAttendanceAuditVault();
      setLogs(res.allLogs);
      setCorrections(res.allCorrections);
      setKpis(res.kpis);
      if (res.policyConfig) {
        setPolicy(res.policyConfig);
      }
    } catch (err) {
      console.error("Failed to load CEO attendance audit vault:", err);
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

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPolicy(true);
    try {
      const res = await updateCompanyAttendancePolicy(policy);
      if (res.success) {
        setPolicy(res.data);
        setToast({
          variant: "success",
          message: "Corporate Labor Policy Updated",
          description: "New duty hours, weekend/holiday rules, and meal break policies are now active company-wide.",
        });
      } else {
        setToast({
          variant: "danger",
          message: "Policy Update Failed",
          description: res.error.message,
        });
      }
    } catch {
      setToast({
        variant: "danger",
        message: "Network Error",
        description: "Unable to reach server to save duty policies.",
      });
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredLogs = logs.filter(
    (l) =>
      l.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.staffRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.clockInAt.includes(searchQuery)
  );

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (isLoading) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
        <LoadingState
          variant="page"
          label="Loading CEO Audit Ledger..."
          description="Retrieving attendance records and company policy settings"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      {/* Toast Alert Portal */}
      {toast && (
        <Toast
          message={toast.message}
          description={toast.description}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}

      {/* Standardized PageHeader */}
      <PageHeader
        title="Staff Attendance & Duty Audit Ledger"
        description="Full overview of employee timesheets, shift records, and attendance policies."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "CEO Console", href: "/dashboard/ceo" },
          { label: "Attendance & Duty Ledger" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="amber" className="text-xs font-mono flex items-center gap-1">
              <IconShieldLock size={13} stroke={2} />
              <span>CEO Executive Oversight</span>
            </Badge>
          </div>
        }
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Hours Worked"
          value={kpis.totalHoursThisMonth}
          unit="hrs month"
          icon={<IconClock size={16} stroke={1.5} />}
          description="Total Monthly Hours"
        />

        <KpiCard
          label="Completed Shifts"
          value={kpis.completedShiftsCount}
          unit="verified"
          variant="sky"
          icon={<IconHistory size={16} stroke={1.5} />}
          description="100% Audited Shifts"
        />

        <KpiCard
          label="Manual Adjustments Credited"
          value={kpis.adjustedShiftsCount}
          unit="credited"
          icon={<IconFingerprint size={16} stroke={1.5} />}
          description="HR Governance SoD Integrity"
        />

        <KpiCard
          label="Active Staff on Duty"
          value={kpis.onDutyStaffCount}
          unit="active"
          variant="emerald"
          icon={<IconUserCheck size={16} stroke={1.5} />}
          description={kpis.onDutyStaffCount > 0 ? "Live Operations" : "Standby"}
        />
      </div>

      {/* Main Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "LEDGER" | "POLICIES")}
        className="w-full"
      >
        <TabsList className="bg-[#01142B] border border-white/10 p-1 rounded-[2px] w-fit flex flex-wrap gap-1">
          <TabsTrigger
            value="LEDGER"
            className="flex items-center gap-2 px-4 py-2 text-xs font-sans font-semibold rounded-[2px] transition-colors data-[state=active]:bg-[#CC6600] data-[state=active]:text-white text-white/70 hover:text-white"
          >
            <IconHistory size={15} stroke={2} />
            <span>Institutional Audit Ledger</span>
          </TabsTrigger>
          <TabsTrigger
            value="POLICIES"
            className="flex items-center gap-2 px-4 py-2 text-xs font-sans font-semibold rounded-[2px] transition-colors data-[state=active]:bg-[#CC6600] data-[state=active]:text-white text-white/70 hover:text-white"
          >
            <IconSettings size={15} stroke={2} />
            <span>Corporate Labor &amp; Duty Policies</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Institutional Audit Ledger */}
        <TabsContent value="LEDGER" className="mt-6 flex flex-col gap-6">
          {/* Raw Punch & Attendance Audit Ledger */}
          <Card className="p-6 sm:p-8 bg-[#01142B] border-white/10 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-base font-bold text-white font-sans">
                  Raw Punch &amp; Duty Shift Ledger (All Staff)
                </h2>
                <p className="text-xs text-white/50 font-sans mt-0.5">
                  Verified digital punches with server IP addresses and tamper-resistant audit stamps.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <IconSearch size={16} stroke={1.5} className="absolute left-3 top-2.5 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search staff name or role..."
                  className="w-full bg-[#010D1F] border border-white/10 rounded-[2px] pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-[#CC6600] font-sans"
                />
              </div>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-white/40 italic font-sans">
                Zero attendance logs found matching filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50 font-mono uppercase text-[0.688rem]">
                      <th className="py-3 px-3">Staff Member</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Clock In</th>
                      <th className="py-3 px-3">Clock Out</th>
                      <th className="py-3 px-3">Break</th>
                      <th className="py-3 px-3">Net Hours</th>
                      <th className="py-3 px-3">Device &amp; Details</th>
                      <th className="py-3 px-3">In-Shift Activity</th>
                      <th className="py-3 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {paginatedLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3 font-sans font-semibold text-white">
                          {log.staffName}
                        </td>
                        <td className="py-3 px-3 font-mono text-[0.688rem] text-white/60">
                          {log.staffRole}
                        </td>
                        <td className="py-3 px-3 font-mono text-white/80">
                          {new Date(log.clockInAt).toLocaleString("en-PH", {
                            month: "short",
                            day: "numeric",
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
                          {log.breakMinutes}m
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
                            <span className="text-[0.625rem] font-mono text-white/40">
                              IP: {log.ipAddress || "127.0.0.1"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {log.isZeroActivity ? (
                            <span className="text-[0.625rem] font-mono px-1.5 py-0.5 rounded-[2px] bg-amber-950/40 text-amber-300 border border-amber-500/30 font-medium flex items-center gap-1 w-fit">
                              <IconAlertTriangle size={11} stroke={2} className="text-amber-400" />
                              <span>0 Study Actions</span>
                            </span>
                          ) : log.studyActionsCount > 0 ? (
                            <span className="text-[0.625rem] font-mono text-emerald-400 flex items-center gap-1">
                              <IconBolt size={12} stroke={2} />
                              <span>{log.studyActionsCount} Events Verified</span>
                            </span>
                          ) : (
                            <span className="text-[0.625rem] font-mono text-white/40">
                              --
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {log.status === "IN_PROGRESS" && (
                            <span className="text-[0.688rem] font-mono px-2 py-0.5 rounded-[2px] bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                              In Progress
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
                              Auto-Capped ({policy.maxShiftCapHours}h)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredLogs.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredLogs.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                itemLabel="logs"
              />
            )}
          </Card>

          {/* Adjustments & SoD Audit Trail */}
          <Card className="p-6 sm:p-8 bg-[#01142B] border-white/10 flex flex-col gap-6">
            <div className="border-b border-white/10 pb-4">
              <h2 className="text-base font-bold text-white font-sans">
                Missed Punch Adjustments &amp; Approver Audit Signatures
              </h2>
              <p className="text-xs text-white/50 font-sans mt-0.5">
                Audit who filed adjustments, who approved or rejected them, and verified justifications.
              </p>
            </div>

            {corrections.length === 0 ? (
              <div className="py-8 text-center text-xs text-white/40 italic font-sans">
                Zero attendance adjustments on record.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50 font-mono uppercase text-[0.688rem]">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Employee</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3">Net Claimed</th>
                      <th className="py-3 px-3">Justification</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Approver Stamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {corrections.map((corr) => (
                      <tr key={corr.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3 font-mono font-semibold text-white">
                          {corr.targetDate}
                        </td>
                        <td className="py-3 px-3 font-sans text-white">
                          <span className="font-semibold">{corr.staffName}</span>
                          <span className="text-[0.688rem] text-white/40 block font-mono">
                            {corr.staffRole}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-white/70">
                          {corr.correctionType.replace(/_/g, " ")}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-white">
                          {corr.claimedNetHours} hrs
                        </td>
                        <td className="py-3 px-3 font-sans text-white/70 max-w-xs truncate">
                          &ldquo;{corr.reason}&rdquo;
                        </td>
                        <td className="py-3 px-3">
                          {corr.status === "APPROVED" && (
                            <Badge variant="emerald" className="text-[0.688rem] font-mono">
                              Approved
                            </Badge>
                          )}
                          {corr.status === "PENDING" && (
                            <Badge variant="amber" className="text-[0.688rem] font-mono">
                              Pending
                            </Badge>
                          )}
                          {corr.status === "REJECTED" && (
                            <Badge variant="danger" className="text-[0.688rem] font-mono">
                              Declined
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 font-sans text-white/80">
                          {corr.reviewerName ? (
                            <div>
                              <span className="font-semibold text-white/90">{corr.reviewerName}</span>
                              <span className="text-[0.688rem] text-white/40 block font-mono">
                                {corr.reviewedAt ? new Date(corr.reviewedAt).toLocaleDateString("en-PH") : ""}
                              </span>
                            </div>
                          ) : (
                            <span className="text-white/40 italic">Awaiting Audit</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* TAB 2: Corporate Labor & Duty Policy Controls */}
        <TabsContent value="POLICIES" className="mt-6">
          <form onSubmit={handleSavePolicy} className="flex flex-col gap-6">
            {/* Header Alert Banner */}
            <div className="p-4 bg-sky-950/40 border border-sky-500/30 rounded-[2px] flex items-start gap-3 text-xs text-sky-200">
              <IconDeviceAnalytics size={20} stroke={1.5} className="text-sky-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white block text-sm">
                  Executive Labor &amp; Duty Governance Controls
                </span>
                <p className="text-white/80 mt-1 leading-relaxed">
                  These parameters apply company-wide to all internal employees (Statisticians, Senior QA Leads, Finance Officers, and Administrators). Changes take effect instantly upon saving.
                </p>
              </div>
            </div>

            {/* Section 1: Weekend & Holiday Policies */}
            <Card className="p-6 sm:p-8 bg-[#01142B] border-white/10 flex flex-col gap-6">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white font-sans uppercase tracking-wider flex items-center gap-2">
                  <IconCalendarEvent size={18} stroke={1.5} className="text-[#CC6600]" />
                  <span>1. Weekend &amp; Holiday Duty Policies</span>
                </h3>
                <p className="text-xs text-white/50 font-sans mt-0.5">
                  Control whether employees are permitted to log duty punches on non-standard working days.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Weekend Work Toggle */}
                <div className="p-4 bg-[#010D1F] border border-white/10 rounded-[2px] flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-white font-sans">
                      Allow Weekend Duty (Saturdays &amp; Sundays)
                    </span>
                    <p className="text-xs text-white/60 font-sans leading-relaxed">
                      When enabled, specialists can clock in 7 days a week. When disabled, weekend punches are blocked, requiring an Overtime Claim with justification.
                    </p>
                  </div>
                  <Switch
                    checked={policy.allowWeekendWork}
                    onCheckedChange={(val) => setPolicy((p) => ({ ...p, allowWeekendWork: val }))}
                  />
                </div>

                {/* Holiday Work Toggle */}
                <div className="p-4 bg-[#010D1F] border border-white/10 rounded-[2px] flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-white font-sans">
                      Allow Philippine National Holiday Duty
                    </span>
                    <p className="text-xs text-white/60 font-sans leading-relaxed">
                      When enabled, duty is permitted on Philippine Regular and Special Non-Working holidays. When disabled, clock-in is restricted to working days.
                    </p>
                  </div>
                  <Switch
                    checked={policy.allowHolidayWork}
                    onCheckedChange={(val) => setPolicy((p) => ({ ...p, allowHolidayWork: val }))}
                  />
                </div>
              </div>
            </Card>

            {/* Section 2: Operating Shift Hours Window */}
            <Card className="p-6 sm:p-8 bg-[#01142B] border-white/10 flex flex-col gap-6">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white font-sans uppercase tracking-wider flex items-center gap-2">
                  <IconSun size={18} stroke={1.5} className="text-[#38BDF8]" />
                  <span>2. Operating Shift Windows &amp; Scheduling</span>
                </h3>
                <p className="text-xs text-white/50 font-sans mt-0.5">
                  Choose between flexible 24/7 research lab operations or strict core office hours.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPolicy((p) => ({ ...p, operatingHoursMode: "FLEXIBLE_24_7" }))}
                    className={`p-4 rounded-[2px] border text-left flex flex-col gap-1.5 transition-colors cursor-pointer ${
                      policy.operatingHoursMode === "FLEXIBLE_24_7"
                        ? "bg-[#CC6600]/10 border-[#CC6600] text-white"
                        : "bg-[#010D1F] border-white/10 text-white/70 hover:border-white/20"
                    }`}
                  >
                    <span className="text-sm font-bold font-sans flex items-center gap-2">
                      <span>Flexible 24/7 Research Shifts</span>
                      {policy.operatingHoursMode === "FLEXIBLE_24_7" && (
                        <IconCheck size={16} stroke={2.5} className="text-[#CC6600]" />
                      )}
                    </span>
                    <p className="text-xs text-white/60 font-sans leading-relaxed">
                      Statisticians and QA leads can work at any hour of the day or night to match project deliverable deadlines.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPolicy((p) => ({ ...p, operatingHoursMode: "FIXED_CORE_HOURS" }))}
                    className={`p-4 rounded-[2px] border text-left flex flex-col gap-1.5 transition-colors cursor-pointer ${
                      policy.operatingHoursMode === "FIXED_CORE_HOURS"
                        ? "bg-[#CC6600]/10 border-[#CC6600] text-white"
                        : "bg-[#010D1F] border-white/10 text-white/70 hover:border-white/20"
                    }`}
                  >
                    <span className="text-sm font-bold font-sans flex items-center gap-2">
                      <span>Fixed Core Operating Hours</span>
                      {policy.operatingHoursMode === "FIXED_CORE_HOURS" && (
                        <IconCheck size={16} stroke={2.5} className="text-[#CC6600]" />
                      )}
                    </span>
                    <p className="text-xs text-white/60 font-sans leading-relaxed">
                      Punches are only allowed within designated start and end time windows (e.g. 08:00 AM to 06:00 PM).
                    </p>
                  </button>
                </div>

                {policy.operatingHoursMode === "FIXED_CORE_HOURS" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#010D1F] border border-white/10 rounded-[2px] animate-content-fade">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-mono uppercase text-white/60 font-semibold">
                        Earliest Permitted Clock-In
                      </label>
                      <input
                        type="time"
                        value={policy.coreHoursStart}
                        onChange={(e) => setPolicy((p) => ({ ...p, coreHoursStart: e.target.value }))}
                        className="bg-[#01142B] border border-white/10 rounded-[2px] p-2.5 text-xs text-white font-mono outline-none focus:border-[#CC6600]"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-mono uppercase text-white/60 font-semibold">
                        Latest Permitted Clock-Out
                      </label>
                      <input
                        type="time"
                        value={policy.coreHoursEnd}
                        onChange={(e) => setPolicy((p) => ({ ...p, coreHoursEnd: e.target.value }))}
                        className="bg-[#01142B] border border-white/10 rounded-[2px] p-2.5 text-xs text-white font-mono outline-none focus:border-[#CC6600]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Section 3: Meal Break Automation */}
            <Card className="p-6 sm:p-8 bg-[#01142B] border-white/10 flex flex-col gap-6">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white font-sans uppercase tracking-wider flex items-center gap-2">
                  <IconCoffee size={18} stroke={1.5} className="text-[#10B981]" />
                  <span>3. Meal Break Automation &amp; Statutory Deductions</span>
                </h3>
                <p className="text-xs text-white/50 font-sans mt-0.5">
                  Configure whether lunch breaks are automatically deducted from net payable hours and the duration threshold.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Auto-Deduct Toggle */}
                <div className="p-4 bg-[#010D1F] border border-white/10 rounded-[2px] flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-white font-sans">
                      Auto-Deduct Meal Break
                    </span>
                    <p className="text-xs text-white/60 font-sans leading-relaxed">
                      Automatically deduct break minutes when shift duration meets or exceeds threshold.
                    </p>
                  </div>
                  <Switch
                    checked={policy.autoDeductMealBreak}
                    onCheckedChange={(val) => setPolicy((p) => ({ ...p, autoDeductMealBreak: val }))}
                  />
                </div>

                {/* Break Duration Selector */}
                <div className="p-4 bg-[#010D1F] border border-white/10 rounded-[2px] flex flex-col gap-2">
                  <label className="text-xs font-mono uppercase text-white/60 font-semibold">
                    Standard Break Duration
                  </label>
                  <select
                    disabled={!policy.autoDeductMealBreak}
                    value={policy.mealBreakMinutes}
                    onChange={(e) => setPolicy((p) => ({ ...p, mealBreakMinutes: Number(e.target.value) }))}
                    className="bg-[#01142B] border border-white/10 rounded-[2px] p-2.5 text-xs text-white font-mono outline-none focus:border-[#CC6600] disabled:opacity-50"
                  >
                    <option value={30}>30 Minutes (Short Break)</option>
                    <option value={45}>45 Minutes (Standard)</option>
                    <option value={60}>60 Minutes / 1 Hour (Statutory)</option>
                    <option value={90}>90 Minutes (Extended)</option>
                  </select>
                  <span className="text-[0.688rem] text-white/40 font-sans">
                    Deducted from gross duration upon shift conclusion.
                  </span>
                </div>

                {/* Shift Threshold Selector */}
                <div className="p-4 bg-[#010D1F] border border-white/10 rounded-[2px] flex flex-col gap-2">
                  <label className="text-xs font-mono uppercase text-white/60 font-semibold">
                    Minimum Shift Length for Deduction
                  </label>
                  <select
                    disabled={!policy.autoDeductMealBreak}
                    value={policy.mealBreakThresholdHours}
                    onChange={(e) => setPolicy((p) => ({ ...p, mealBreakThresholdHours: Number(e.target.value) }))}
                    className="bg-[#01142B] border border-white/10 rounded-[2px] p-2.5 text-xs text-white font-mono outline-none focus:border-[#CC6600] disabled:opacity-50"
                  >
                    <option value={4.0}>Shifts 4.0+ hours</option>
                    <option value={5.0}>Shifts 5.0+ hours (Standard)</option>
                    <option value={6.0}>Shifts 6.0+ hours</option>
                    <option value={8.0}>Full Shifts (8.0+ hours only)</option>
                  </select>
                  <span className="text-[0.688rem] text-white/40 font-sans">
                    Shifts shorter than this threshold receive 0 deduction.
                  </span>
                </div>
              </div>
            </Card>

            {/* Section 4: Wage Rate & Auto-Cap Protection */}
            <Card className="p-6 sm:p-8 bg-[#01142B] border-white/10 flex flex-col gap-6">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white font-sans uppercase tracking-wider flex items-center gap-2">
                  <IconCoin size={18} stroke={1.5} className="text-amber-400" />
                  <span>4. Base Duty Wage &amp; Runaway Session Protection</span>
                </h3>
                <p className="text-xs text-white/50 font-sans mt-0.5">
                  Set the institutional base hourly compute wage and the runaway session auto-capping boundary.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Base Hourly Rate */}
                <div className="p-4 bg-[#010D1F] border border-white/10 rounded-[2px] flex flex-col gap-2">
                  <label className="text-xs font-mono uppercase text-white/60 font-semibold">
                    Base Hourly Compute Rate (PHP)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-white/50 font-mono">₱</span>
                    <input
                      type="number"
                      step="10"
                      min="100"
                      max="10000"
                      value={policy.baseHourlyRate}
                      onChange={(e) => setPolicy((p) => ({ ...p, baseHourlyRate: Number(e.target.value) }))}
                      className="w-full bg-[#01142B] border border-white/10 rounded-[2px] pl-8 pr-3 py-2.5 text-xs text-white font-mono outline-none focus:border-[#CC6600]"
                    />
                  </div>
                  <span className="text-[0.688rem] text-white/40 font-sans">
                    Applies globally to all duty timesheet earnings calculations across staff payslips.
                  </span>
                </div>

                {/* Runaway Session Auto-Cap */}
                <div className="p-4 bg-[#010D1F] border border-white/10 rounded-[2px] flex flex-col gap-2">
                  <label className="text-xs font-mono uppercase text-white/60 font-semibold">
                    Runaway Session Auto-Cap Threshold
                  </label>
                  <select
                    value={policy.maxShiftCapHours}
                    onChange={(e) => setPolicy((p) => ({ ...p, maxShiftCapHours: Number(e.target.value) }))}
                    className="bg-[#01142B] border border-white/10 rounded-[2px] p-2.5 text-xs text-white font-mono outline-none focus:border-[#CC6600]"
                  >
                    <option value={10}>10 Hours Maximum</option>
                    <option value={12}>12 Hours Maximum</option>
                    <option value={14}>14 Hours Maximum (Recommended)</option>
                    <option value={16}>16 Hours Maximum</option>
                    <option value={20}>20 Hours Maximum</option>
                  </select>
                  <span className="text-[0.688rem] text-white/40 font-sans">
                    If an employee forgets to clock out, the server automatically caps the shift at this boundary and flags it for adjustment.
                  </span>
                </div>
              </div>
            </Card>

            {/* Form Action Controls */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                type="submit"
                variant="primary"
                disabled={isSavingPolicy}
                className="flex items-center gap-2 px-6 py-2.5 rounded-[2px] font-sans font-semibold text-xs cursor-pointer shadow-sm"
              >
                {isSavingPolicy ? (
                  <>
                    <IconLoader2 size={16} stroke={2.5} className="animate-spin text-white" />
                    <span>Saving Corporate Policies...</span>
                  </>
                ) : (
                  <>
                    <IconCheck size={16} stroke={2.5} />
                    <span>Save Corporate Duty Policies</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
