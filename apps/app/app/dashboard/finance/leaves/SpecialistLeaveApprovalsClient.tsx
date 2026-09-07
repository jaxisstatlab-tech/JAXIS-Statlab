"use client";

import React, { useState, useEffect, useTransition, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  KpiCard,
  Button,
  Badge,
  LoadingState,
  Toast,
  Modal,
  FormFooter,
  Pagination,
} from "@repo/ui";
import {
  IconCheck,
  IconClock,
  IconRefresh,
  IconCalendar,
  IconArrowLeft,
  IconUserCheck,
  IconChevronDown,
  IconLoader2,
  IconSearch,
} from "@tabler/icons-react";
import {
  getSpecialistLeaveOverview,
  approveLeave,
  rejectLeave,
  returnFromLeave,
  requestLeave,
} from "@/features/staff/actions";
import { PendingLeaveQueue } from "@/features/staff/components/PendingLeaveQueue";
import type { SpecialistLeaveOverviewData, StaffListItem } from "@/features/staff/schemas";

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

export interface SpecialistLeaveApprovalsClientProps {
  initialData: SpecialistLeaveOverviewData | null;
}

export function SpecialistLeaveApprovalsClient({ initialData }: SpecialistLeaveApprovalsClientProps) {
  const [data, setData] = useState<SpecialistLeaveOverviewData | null>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "STATISTICIAN" | "SENIOR_QA_LEAD">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "LEAVE_PENDING" | "ON_LEAVE">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Schedule Leave Modal State (Admin / HR placement on behalf of staff)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffListItem | null>(null);
  const [modalReason, setModalReason] = useState("");
  const [modalFrom, setModalFrom] = useState("");
  const [modalUntil, setModalUntil] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  // Active action tracking
  const [actionStaffId, setActionStaffId] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const isInitialMount = useRef(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getSpecialistLeaveOverview();
      if (res.success && res.data) {
        setData(res.data);
      } else if (!res.success) {
        setToastMessage({
          message: "Data Retrieval Failed",
          description: res.error.message,
          variant: "danger",
        });
      }
    } catch (err) {
      console.error("[SpecialistLeaveApprovalsPage] Error:", err);
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

  // Modal validation helpers
  const isModalReturnBeforeStart = useMemo(() => {
    if (!modalFrom || !modalUntil) return false;
    return modalUntil < modalFrom;
  }, [modalFrom, modalUntil]);

  const isModalStartInPast = useMemo(() => {
    if (!modalFrom) return false;
    return modalFrom < todayStr;
  }, [modalFrom, todayStr]);

  const modalCalculatedDays = useMemo(() => {
    if (!modalFrom || !modalUntil || isModalReturnBeforeStart) return null;
    const start = new Date(modalFrom);
    const end = new Date(modalUntil);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff);
  }, [modalFrom, modalUntil, isModalReturnBeforeStart]);

  const handleModalFromChange = (val: string) => {
    setModalFrom(val);
    setModalError(null);
    if (modalUntil && modalUntil < val) {
      const nextDay = new Date(val);
      nextDay.setDate(nextDay.getDate() + 1);
      setModalUntil(nextDay.toISOString().split("T")[0]!);
    }
  };

  const handleModalUntilChange = (val: string) => {
    setModalUntil(val);
    setModalError(null);
  };

  const openGrantLeaveModal = (staff: StaffListItem) => {
    setSelectedStaff(staff);
    setModalReason("");
    setModalFrom(todayStr);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setModalUntil(tomorrow.toISOString().split("T")[0]!);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleGrantLeaveSubmit = () => {
    if (!selectedStaff) return;
    if (!modalReason || modalReason.trim().length < 3) {
      setModalError("Please provide a valid leave justification (at least 3 characters).");
      return;
    }
    if (isModalStartInPast) {
      setModalError("Leave start date cannot be in the past.");
      return;
    }
    if (isModalReturnBeforeStart) {
      setModalError("Expected return date cannot be earlier than leave start date.");
      return;
    }
    setModalError(null);

    startTransition(async () => {
      const res = await requestLeave({
        userId: selectedStaff.id,
        reason: modalReason.trim(),
        leaveFrom: modalFrom ? new Date(modalFrom).toISOString() : undefined,
        leaveUntil: modalUntil ? new Date(modalUntil).toISOString() : undefined,
      });

      if (res.success) {
        setIsModalOpen(false);
        setToastMessage({
          message: "Leave Authorized",
          description: `${selectedStaff.fullName} has been placed On Leave and hidden from assignments.`,
          variant: "success",
        });
        loadData();
      } else {
        setModalError(res.error.message);
      }
    });
  };

  const handleApproveStaff = (staff: StaffListItem) => {
    setActionStaffId(staff.id);
    startTransition(async () => {
      const res = await approveLeave(staff.id);
      if (res.success) {
        window.dispatchEvent(new CustomEvent("leave-status-updated"));
        window.dispatchEvent(new CustomEvent("shift-status-updated"));
        setToastMessage({
          message: "Leave Request Approved",
          description: `${staff.fullName} is now On Leave. Study assignment intake has been paused.`,
          variant: "success",
        });
        loadData();
      } else {
        setToastMessage({
          message: "Approval Failed",
          description: res.error.message,
          variant: "danger",
        });
      }
      setActionStaffId(null);
    });
  };

  const handleDeclineStaff = (staff: StaffListItem) => {
    setActionStaffId(staff.id);
    startTransition(async () => {
      const res = await rejectLeave(staff.id);
      if (res.success) {
        window.dispatchEvent(new CustomEvent("leave-status-updated"));
        window.dispatchEvent(new CustomEvent("shift-status-updated"));
        setToastMessage({
          message: "Leave Request Declined",
          description: `${staff.fullName} has been restored to Active status.`,
          variant: "warning",
        });
        loadData();
      } else {
        setToastMessage({
          message: "Action Failed",
          description: res.error.message,
          variant: "danger",
        });
      }
      setActionStaffId(null);
    });
  };

  const handleRestoreDuty = (staff: StaffListItem) => {
    setActionStaffId(staff.id);
    startTransition(async () => {
      const res = await returnFromLeave(staff.id);
      if (res.success) {
        window.dispatchEvent(new CustomEvent("leave-status-updated"));
        window.dispatchEvent(new CustomEvent("shift-status-updated"));
        setToastMessage({
          message: "Active Duty Restored",
          description: `${staff.fullName} is now available in the assignment pool.`,
          variant: "success",
        });
        loadData();
      } else {
        setToastMessage({
          message: "Action Failed",
          description: res.error.message,
          variant: "danger",
        });
      }
      setActionStaffId(null);
    });
  };

  // Filtered specialist list
  const filteredSpecialists = useMemo(() => {
    if (!data?.specialists) return [];
    return data.specialists.filter((s) => {
      const matchesRole = roleFilter === "ALL" || s.role === roleFilter;
      const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        s.fullName.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.specializations.some((spec) => spec.toLowerCase().includes(query));
      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [data?.specialists, roleFilter, statusFilter, searchQuery]);

  const paginatedSpecialists = useMemo(() => {
    return filteredSpecialists.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [filteredSpecialists, currentPage, pageSize]);

  if (isLoading && !data) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
        <LoadingState
          variant="page"
          label="Loading HR Specialist Leave Desk..."
          description="Fetching specialist availability and pending leave requests."
        />
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalSpecialists: 0,
    activeCount: 0,
    pendingCount: 0,
    onLeaveCount: 0,
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      {/* ── Page Header ── */}
      <PageHeader
        title="Specialist Leave & HR Approvals"
        description="Formal human resources administration desk for reviewing absence submissions, authorizing leave windows, and governing specialist capacity across statistical pipelines."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Finance & HR", href: "/dashboard/finance" },
          { label: "Leave Approvals" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading || isPending}
              className="w-full sm:w-auto justify-center gap-2 font-sans text-xs rounded-[2px] cursor-pointer"
            >
              <IconRefresh size={14} className={isLoading ? "animate-spin" : ""} />
              <span>Refresh Directory</span>
            </Button>
            <Link href="/dashboard/finance" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto justify-center gap-1.5 font-sans text-xs rounded-[2px] cursor-pointer text-white/70 hover:text-white"
              >
                <IconArrowLeft size={14} />
                <span>Finance Dashboard</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* ── Live Governance KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <KpiCard
          label="Pending HR Approvals"
          value={kpis.pendingCount}
          variant={kpis.pendingCount > 0 ? "amber" : "default"}
          description={
            kpis.pendingCount > 0
              ? "Awaiting acknowledgment & approval"
              : "Zero leave requests in queue"
          }
        />

        <KpiCard
          label="Currently On Leave"
          value={kpis.onLeaveCount}
          variant={kpis.onLeaveCount > 0 ? "default" : "sky"}
          description="Paused from new study assignments"
        />

        <KpiCard
          label="Active Duty Specialists"
          value={kpis.activeCount}
          variant="emerald"
          description="Available for study analysis intake"
        />

        <KpiCard
          label="Total Expert Pool"
          value={kpis.totalSpecialists}
          variant="sky"
          description="Lead Statisticians & Senior QA Leads"
        />
      </div>

      {/* ── Pending Approvals Review Queue ── */}
      {data?.pendingLeaves && data.pendingLeaves.length > 0 ? (
        <PendingLeaveQueue
          onStatusChange={loadData}
          title="HR Personnel & Leave Authorization Queue"
          subtitle="Review and acknowledge specialist absence requests before activating official leave status."
        />
      ) : (
        <Card className="p-5 border border-white/10 bg-[#01142B]/70 rounded-[2px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[2px] bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <IconCheck size={18} stroke={2} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white font-sans">
                HR Leave Queue Cleared
              </h3>
              <p className="text-xs text-white/50 font-sans mt-0.5">
                All specialist time-off submissions have been processed. Zero requests awaiting acknowledgment.
              </p>
            </div>
          </div>
          <Badge variant="emerald" className="text-xs font-mono py-1 px-2.5">
            Operational 100%
          </Badge>
        </Card>
      )}

      {/* ── Specialist Availability Roster ── */}
      <Card className="p-0 overflow-hidden border border-white/10 bg-[#01142B] rounded-[2px]">
        {/* Table Header & Controls */}
        <div className="p-5 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white font-sans">
              Specialist Availability &amp; Leave Roster
            </h2>
            <p className="text-xs text-white/50 mt-0.5 font-sans">
              Real-time directory of Lead Statisticians and Senior QA Leads with leave windows and assignment loads.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
              <input
                type="text"
                placeholder="Search specialist..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-48 sm:w-56 bg-[#010D1F] border border-white/15 rounded-[2px] pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-[#CC6600] outline-none font-sans"
              />
            </div>

            {/* Role Filter */}
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value as typeof roleFilter); setCurrentPage(1); }}
                className="bg-[#010D1F] border border-white/15 rounded-[2px] pl-2.5 pr-8 py-1.5 text-xs text-white/80 focus:border-[#CC6600] outline-none cursor-pointer font-sans appearance-none hover:border-white/25 transition-colors"
              >
                <option value="ALL">All Roles</option>
                <option value="STATISTICIAN">Statisticians</option>
                <option value="SENIOR_QA_LEAD">Senior QA Leads</option>
              </select>
              <IconChevronDown
                size={14}
                stroke={2}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setCurrentPage(1); }}
                className="bg-[#010D1F] border border-white/15 rounded-[2px] pl-2.5 pr-8 py-1.5 text-xs text-white/80 focus:border-[#CC6600] outline-none cursor-pointer font-sans appearance-none hover:border-white/25 transition-colors"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="LEAVE_PENDING">Leave Pending</option>
                <option value="ON_LEAVE">On Leave</option>
              </select>
              <IconChevronDown
                size={14}
                stroke={2}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Specialists Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 text-[0.688rem] uppercase font-mono tracking-wider">
                <th className="py-3 px-5">Specialist</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Availability</th>
                <th className="py-3 px-4 text-center">Active Studies</th>
                <th className="py-3 px-4">Leave Window</th>
                <th className="py-3 px-5 text-right">HR Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredSpecialists.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-white/40 font-sans">
                    No specialists found matching your search or filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedSpecialists.map((staff) => {
                  const isItemBusy = isPending && actionStaffId === staff.id;
                  const isStat = staff.role === "STATISTICIAN";

                  const fromStr = staff.leaveFrom
                    ? new Date(staff.leaveFrom).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : null;
                  const untilStr = staff.leaveUntil
                    ? new Date(staff.leaveUntil).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : null;

                  return (
                    <tr
                      key={staff.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Specialist Name & Email */}
                      <td className="py-3.5 px-5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white text-xs">
                            {staff.fullName}
                          </span>
                          <span className="text-[0.688rem] font-mono text-white/50">
                            {staff.email}
                          </span>
                          {staff.specializations.length > 0 && (
                            <span className="text-[0.625rem] text-white/40 truncate max-w-xs mt-0.5">
                              {staff.specializations.slice(0, 2).join(", ")}
                              {staff.specializations.length > 2 ? ` +${staff.specializations.length - 2}` : ""}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge
                          variant={isStat ? "sky" : "emerald"}
                          className="font-sans text-[0.688rem] py-0 px-2 font-medium"
                        >
                          {isStat ? "Statistician" : "Senior QA Lead"}
                        </Badge>
                      </td>

                      {/* Availability Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {staff.status === "ACTIVE" && (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            <span>Active Duty</span>
                          </div>
                        )}
                        {staff.status === "LEAVE_PENDING" && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span>Leave Pending</span>
                          </div>
                        )}
                        {staff.status === "ON_LEAVE" && (
                          <div className="flex items-center gap-1.5 text-xs text-purple-400 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                            <span>On Leave</span>
                          </div>
                        )}
                      </td>

                      {/* Active Project Workload */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono text-xs">
                        <span className={staff.activeProjectsCount > 3 ? "text-amber-400 font-bold" : "text-white"}>
                          {staff.activeProjectsCount}
                        </span>
                      </td>

                      {/* Leave Window / Reason */}
                      <td className="py-3.5 px-4">
                        {fromStr && untilStr ? (
                          <div className="flex flex-col">
                            <span className="font-mono text-xs text-white">
                              {fromStr} → {untilStr}
                            </span>
                            {staff.leaveReason && (
                              <span className="text-[0.688rem] text-white/50 truncate max-w-xs mt-0.5">
                                {staff.leaveReason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-white/30 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* HR Actions */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {staff.status === "LEAVE_PENDING" ? (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleApproveStaff(staff)}
                                disabled={isItemBusy || isPending}
                                className="font-sans text-xs font-semibold rounded-[2px] bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer py-1 px-2.5 gap-1"
                              >
                                {isItemBusy ? (
                                  <IconLoader2 size={13} className="animate-spin" />
                                ) : (
                                  <IconCheck size={13} stroke={2.5} />
                                )}
                                <span>Approve</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeclineStaff(staff)}
                                disabled={isItemBusy || isPending}
                                className="font-sans text-xs rounded-[2px] text-red-400 hover:text-red-300 border-red-500/30 hover:bg-red-950/30 cursor-pointer py-1 px-2.5"
                              >
                                <span>Reject</span>
                              </Button>
                            </>
                          ) : staff.status === "ON_LEAVE" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestoreDuty(staff)}
                              disabled={isItemBusy || isPending}
                              className="font-sans text-xs font-semibold rounded-[2px] text-emerald-400 border-emerald-500/40 hover:bg-emerald-600/15 cursor-pointer py-1 px-2.5 gap-1"
                            >
                              <IconUserCheck size={13} stroke={2} />
                              <span>End Leave</span>
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openGrantLeaveModal(staff)}
                              disabled={isItemBusy || isPending}
                              className="font-sans text-xs rounded-[2px] text-white/60 hover:text-white border-white/10 cursor-pointer py-1 px-2.5 gap-1"
                            >
                              <IconCalendar size={13} stroke={1.5} />
                              <span>Grant Leave</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredSpecialists.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredSpecialists.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="specialists"
          />
        )}
      </Card>

      {/* ── Grant Specialist Leave Modal (HR Direct Authority) ── */}
      {isModalOpen && selectedStaff && (
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Grant Specialist Leave: ${selectedStaff.fullName}`}
          description="Direct HR administrative leave authorization. Specialist will be paused from new study assignments immediately upon confirmation."
          size="md"
        >
          <div className="flex flex-col gap-4 text-xs font-sans text-white/80">
            {modalError && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-[2px] text-red-200">
                {modalError}
              </div>
            )}

            <div className="p-3 bg-[#CC6600]/10 border border-[#CC6600]/30 rounded-[2px] flex items-start gap-2.5 text-amber-200">
              <IconClock size={16} stroke={2} className="text-[#FF9433] shrink-0 mt-0.5" />
              <span>
                As Finance Officer (acting as HR Administrator), authorizing leave will place {selectedStaff.fullName} on official leave status and pause incoming study intake until their return date.
              </span>
            </div>

            {/* Template Selector */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-white/90">
                  Reason for Leave (Mandatory)
                </label>
                <span className="text-[0.625rem] text-[#FF9433]/70 font-mono">
                  Select template or enter custom note
                </span>
              </div>

              <div className="relative">
                <select
                  value={LEAVE_REASON_TEMPLATES.find((t) => t.text === modalReason)?.text || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      setModalReason(e.target.value);
                      setModalError(null);
                    }
                  }}
                  className="w-full bg-[#01142B] border border-white/15 rounded-[2px] px-3 py-2 text-xs text-white/90 focus:border-[#CC6600] outline-none cursor-pointer appearance-none pr-8 font-sans hover:border-white/30"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
                />
              </div>

              <textarea
                value={modalReason}
                onChange={(e) => {
                  setModalReason(e.target.value);
                  setModalError(null);
                }}
                placeholder="e.g. Approved personal sabbatical, research conference presentation..."
                className="w-full bg-[#01142B] border border-white/10 rounded-[2px] p-2.5 text-xs text-white placeholder-white/40 focus:border-[#CC6600] outline-none resize-none h-16 font-sans leading-relaxed"
              />
            </div>

            {/* Date Range Inputs */}
            <div className="flex flex-col gap-2 p-3 bg-black/40 border border-white/10 rounded-[2px]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/90">
                  Leave Duration (Day or Days)
                </label>
                {isModalReturnBeforeStart ? (
                  <span className="text-xs font-mono font-semibold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded-[2px] border border-rose-500/30">
                    Invalid: Return Before Start
                  </span>
                ) : isModalStartInPast ? (
                  <span className="text-xs font-mono font-semibold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded-[2px] border border-rose-500/30">
                    Invalid: Past Start Date
                  </span>
                ) : modalCalculatedDays !== null ? (
                  <span className="text-xs font-mono font-semibold text-[#FF9433] bg-[#CC6600]/15 px-2 py-0.5 rounded-[2px] border border-[#CC6600]/30">
                    {modalCalculatedDays} {modalCalculatedDays === 1 ? "Day" : "Days"} Scheduled
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="flex flex-col gap-1">
                  <span className="text-[0.688rem] uppercase font-mono text-white/50">
                    Leave Start Date
                  </span>
                  <input
                    type="date"
                    min={todayStr}
                    value={modalFrom}
                    onChange={(e) => handleModalFromChange(e.target.value)}
                    className={`w-full bg-[#01142B] border rounded-[2px] p-2 text-xs text-white focus:border-[#CC6600] outline-none font-mono cursor-pointer transition-colors ${
                      isModalStartInPast ? "border-rose-500/60 bg-rose-950/10" : "border-white/10 hover:border-white/20"
                    }`}
                  />
                  {isModalStartInPast && (
                    <span className="text-[0.688rem] text-rose-400 font-sans">
                      Start date cannot be in the past.
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[0.688rem] uppercase font-mono text-white/50">
                    Expected Return Date
                  </span>
                  <input
                    type="date"
                    min={modalFrom || todayStr}
                    value={modalUntil}
                    onChange={(e) => handleModalUntilChange(e.target.value)}
                    className={`w-full bg-[#01142B] border rounded-[2px] p-2 text-xs text-white focus:border-[#CC6600] outline-none font-mono cursor-pointer transition-colors ${
                      isModalReturnBeforeStart ? "border-rose-500/60 bg-rose-950/10" : "border-white/10 hover:border-white/20"
                    }`}
                  />
                  {isModalReturnBeforeStart && (
                    <span className="text-[0.688rem] text-rose-400 font-sans">
                      Return date cannot be earlier than start date.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <FormFooter className="mt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleGrantLeaveSubmit}
                disabled={isPending || isModalReturnBeforeStart || isModalStartInPast}
                className="font-sans text-xs font-semibold rounded-[2px] gap-1.5"
              >
                {isPending ? (
                  <IconLoader2 size={14} className="animate-spin" />
                ) : (
                  <IconCheck size={14} stroke={2} />
                )}
                <span>Authorize Specialist Leave</span>
              </Button>
            </FormFooter>
          </div>
        </Modal>
      )}

      {/* ── Toast Notifications ── */}
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
