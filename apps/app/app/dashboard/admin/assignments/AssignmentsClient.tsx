"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  KpiCard,
  LoadingState,
  Toast,
  Pagination,
} from "@repo/ui";
import {
  IconUserCheck,
  IconShieldCheck,
  IconClock,
  IconRefresh,
  IconArrowRight,
  IconAlertTriangle,
  IconCalendarOff,
} from "@tabler/icons-react";
import { getProjects } from "@/features/projects/actions";
import { getStaffCapacity } from "@/features/assignments/actions";
import { AssignmentModal } from "@/features/assignments/components/AssignmentModal";
import type { StaffCapacityItem } from "@/features/assignments/schemas";
import type { ProjectDetailItem } from "@/features/projects/schemas";

export interface AssignmentsClientProps {
  initialProjects?: ProjectDetailItem[];
  initialStatisticians?: StaffCapacityItem[];
  initialQaLeads?: StaffCapacityItem[];
}

export function AssignmentsClient({
  initialProjects,
  initialStatisticians,
  initialQaLeads,
}: AssignmentsClientProps) {
  const [unassignedProjects, setUnassignedProjects] = useState<ProjectDetailItem[]>(initialProjects || []);
  const [statisticians, setStatisticians] = useState<StaffCapacityItem[]>(initialStatisticians || []);
  const [qaLeads, setQaLeads] = useState<StaffCapacityItem[]>(initialQaLeads || []);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProjectForAssign, setSelectedProjectForAssign] = useState<ProjectDetailItem | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Toast
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const isMountedRef = React.useRef(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [projRes, capRes] = await Promise.all([
        getProjects({ status: "ACTIVE" }),
        getStaffCapacity(),
      ]);

      if (!isMountedRef.current) return;

      if (projRes.success && projRes.data) {
        setUnassignedProjects(projRes.data);
      }
      if (capRes.success && capRes.data) {
        setStatisticians(capRes.data.statisticians);
        setQaLeads(capRes.data.qaLeads);
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error("Failed to load assignment desk:", err);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (
      (!initialProjects || initialProjects.length === 0) &&
      (!initialStatisticians || initialStatisticians.length === 0)
    ) {
      loadData();
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [loadData, initialProjects, initialStatisticians]);

  if (isLoading && unassignedProjects.length === 0 && statisticians.length === 0) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
        <LoadingState
          variant="page"
          label="Loading assignment workbench..."
          description="Retrieving active studies and specialist workload."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans">
      {/* Page Header */}
      <PageHeader
        title="Specialist Assignments &amp; Workload"
        description="Assign lead statisticians and QA leads to active studies and manage team capacity."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Admin Command", href: "/dashboard/admin" },
          { label: "Specialist Assignments" },
        ]}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            className="gap-2 font-sans font-semibold rounded-[2px]"
          >
            <IconRefresh size={15} stroke={2} />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* KPI Grid */}
      {(() => {
        const allStaff = [...statisticians, ...qaLeads];
        const burnoutRiskCount = allStaff.filter((s) => s.burnoutRisk?.isAtRisk).length;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            <KpiCard
              label="Awaiting Assignment"
              value={unassignedProjects.length}
              variant={unassignedProjects.length > 0 ? "amber" : "default"}
              description={unassignedProjects.length > 0 ? "Studies ready for staffing" : "All studies staffed"}
            />
            <KpiCard
              label="Statisticians"
              value={statisticians.length}
              variant="sky"
              description={`${statisticians.filter((s) => !s.isOnLeave).length} available for studies`}
            />
            <KpiCard
              label="QA Leads"
              value={qaLeads.length}
              variant="emerald"
              description={`${qaLeads.filter((q) => !q.isOnLeave).length} available for reviews`}
            />
            <KpiCard
              label="Team Capacity"
              value={burnoutRiskCount > 0 ? `${burnoutRiskCount} Overloaded` : "Healthy"}
              variant={burnoutRiskCount > 0 ? "amber" : "emerald"}
              description={
                burnoutRiskCount > 0
                  ? "Some staff near capacity limits"
                  : "Balanced across active staff"
              }
            />
          </div>
        );
      })()}

      <div className="flex flex-col gap-8">
        {/* Section 1: Studies Awaiting Assignment Table */}
        <Card className="p-0 overflow-hidden border border-white/10 bg-[#01142B]/90 rounded-[2px]">
          <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white tracking-normal font-sans flex items-center gap-2">
                <span>Studies Awaiting Assignment</span>
                {unassignedProjects.length > 0 && (
                  <Badge variant="amber" className="text-[0.688rem] py-0 px-2 font-mono">
                    {unassignedProjects.length} Pending
                  </Badge>
                )}
              </h2>
              <p className="text-sm text-white/60 mt-1 font-sans leading-relaxed">
                Downpayment cleared and contract signed. Assign a statistician and QA lead to start work.
              </p>
            </div>
          </div>

          {unassignedProjects.length === 0 ? (
            <div className="p-12 text-center text-white/50 text-sm font-sans flex flex-col items-center justify-center gap-2">
              <IconUserCheck size={32} stroke={1.5} className="text-[#10B981]" />
              <span className="font-semibold text-white">All Active Studies Assigned</span>
              <span className="text-xs text-white/40">There are no pending studies waiting for staffing right now.</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 text-xs uppercase tracking-wider font-semibold">
                      <th className="py-3.5 px-6">Study ID</th>
                      <th className="py-3.5 px-6">Research Title &amp; Client</th>
                      <th className="py-3.5 px-6">Package</th>
                      <th className="py-3.5 px-6">Turnaround</th>
                      <th className="py-3.5 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {unassignedProjects.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((proj) => (
                      <tr key={proj.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-6 font-mono text-xs text-[#CC6600] font-semibold">
                          {proj.intakeId}
                        </td>
                        <td className="py-4 px-6 max-w-md">
                          <p className="font-semibold text-white text-sm line-clamp-1">
                            {proj.researchTitle}
                          </p>
                          <p className="text-xs text-white/50 mt-0.5">
                            {proj.client?.fullName || "Lead Researcher"} • {proj.client?.clientProfile?.institutionSchool || "Institution"}
                          </p>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-xs text-white/80 font-sans">
                            {proj.packageName?.replace(/_/g, " ") || "Standard Study"}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1.5 text-xs text-[#38BDF8]">
                            <IconClock size={15} stroke={2} />
                            <span>5-7 Days Standard</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setSelectedProjectForAssign(proj)}
                            className="font-sans text-xs font-semibold rounded-[2px]"
                          >
                            + Assign Specialists
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {unassignedProjects.length > 0 && (
                <div className="border-t border-white/10 p-3 sm:px-6">
                  <Pagination
                    currentPage={currentPage}
                    totalItems={unassignedProjects.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                  />
                </div>
              )}
            </>
          )}
        </Card>

        {/* Section 2: Team Workload & Directory (Unified, Clean 2-Column Desk) */}
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white font-sans">
              Team Workload &amp; Directory
            </h2>
            <p className="text-xs text-white/60 mt-0.5 font-sans">
              Specialist availability and study capacity (comfortable threshold of 3 concurrent active studies).
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: Lead Statisticians */}
            <Card className="p-6 border border-white/10 bg-[#01142B]/90 rounded-[2px] flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-sky-500/10 border border-sky-500/20 rounded-[2px] text-sky-400">
                    <IconUserCheck size={16} stroke={2} />
                  </div>
                  <h3 className="font-semibold text-white text-sm font-sans">Lead Statisticians</h3>
                </div>
                <span className="text-xs font-mono text-white/40">
                  {statisticians.length} {statisticians.length === 1 ? "specialist" : "specialists"}
                </span>
              </div>

              <div className="space-y-3">
                {statisticians.map((stat) => {
                  const isFull = stat.activeAssignmentCount >= 3;
                  const isModerate = stat.activeAssignmentCount > 0 && stat.activeAssignmentCount < 3;
                  return (
                    <div
                      key={stat.id}
                      className="p-4 bg-[#011B38] border border-white/10 rounded-[2px] flex flex-col gap-3"
                    >
                      {/* Staff Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white text-xs font-sans truncate">
                            {stat.fullName}
                          </h4>
                          <p className="text-[0.688rem] text-white/40 font-mono mt-0.5">
                            {stat.email}
                          </p>
                        </div>
                        {stat.isOnLeave ? (
                          <span className="text-[0.688rem] font-mono font-semibold px-2 py-0.5 rounded-[2px] border bg-purple-950/50 text-purple-300 border-purple-500/30 whitespace-nowrap flex items-center gap-1">
                            <IconCalendarOff size={11} stroke={2} />
                            <span>On Leave</span>
                          </span>
                        ) : (
                          <span
                            className={`text-[0.688rem] font-mono font-semibold px-2 py-0.5 rounded-[2px] border whitespace-nowrap ${
                              isFull
                                ? "bg-amber-950/50 text-amber-300 border-amber-500/30"
                                : isModerate
                                ? "bg-sky-950/50 text-sky-300 border-sky-500/30"
                                : "bg-emerald-950/50 text-emerald-300 border-emerald-500/30"
                            }`}
                          >
                            {stat.activeAssignmentCount} / 3 Studies
                          </span>
                        )}
                      </div>

                      {/* 3-Segment Capacity Bar */}
                      {!stat.isOnLeave && (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 w-full">
                            {[1, 2, 3].map((step) => (
                              <div
                                key={step}
                                className={`h-1.5 flex-1 rounded-[1px] transition-all ${
                                  stat.activeAssignmentCount >= step
                                    ? isFull
                                      ? "bg-amber-400"
                                      : isModerate
                                      ? "bg-sky-400"
                                      : "bg-emerald-400"
                                    : "bg-white/[0.08]"
                                }`}
                              />
                            ))}
                          </div>
                          <div className="flex justify-between text-[0.625rem] text-white/40 font-mono">
                            <span>Capacity</span>
                            <span>{Math.round((stat.activeAssignmentCount / 3) * 100)}% load</span>
                          </div>
                        </div>
                      )}

                      {/* Specializations */}
                      {stat.specializations.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {stat.specializations.map((spec) => (
                            <span
                              key={spec}
                              className="text-[0.625rem] font-sans px-1.5 py-0.5 rounded-[2px] bg-white/[0.03] text-white/60 border border-white/[0.06]"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Assigned Studies */}
                      {stat.assignedStudies.length > 0 ? (
                        <div className="pt-2 border-t border-white/[0.06] flex flex-col gap-2">
                          <span className="text-[0.625rem] font-mono uppercase text-white/40 font-semibold">
                            Active Assignments ({stat.assignedStudies.length})
                          </span>
                          {stat.assignedStudies.map((study) => (
                            <div
                              key={study.id}
                              className="p-2.5 bg-[#01142B] border border-white/[0.06] rounded-[2px] flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0 flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-[#CC6600] font-semibold">
                                    {study.intakeId}
                                  </span>
                                  <Badge
                                    variant={study.isUrgent ? "amber" : "emerald"}
                                    className="font-mono text-[0.5625rem] py-0 px-1"
                                  >
                                    {study.slaLabel}
                                  </Badge>
                                </div>
                                <p className="text-white/80 font-sans truncate text-xs">
                                  {study.title}
                                </p>
                              </div>
                              <Link
                                href={`/dashboard/admin/projects/${study.id}`}
                                className="shrink-0 flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-sans font-semibold hover:underline"
                              >
                                <span>Open</span>
                                <IconArrowRight size={11} stroke={2} />
                              </Link>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-white/40 font-sans italic pt-1">
                          {stat.isOnLeave
                            ? `On leave${stat.leaveUntil ? ` until ${new Date(stat.leaveUntil).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}` : ""}.`
                            : "No active studies assigned. Available for new studies."}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Column 2: Senior QA Leads */}
            <Card className="p-6 border border-white/10 bg-[#01142B]/90 rounded-[2px] flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-[2px] text-emerald-400">
                    <IconShieldCheck size={16} stroke={2} />
                  </div>
                  <h3 className="font-semibold text-white text-sm font-sans">Senior QA Leads</h3>
                </div>
                <span className="text-xs font-mono text-white/40">
                  {qaLeads.length} {qaLeads.length === 1 ? "lead" : "leads"}
                </span>
              </div>

              <div className="space-y-3">
                {qaLeads.map((qa) => {
                  const isFull = qa.activeAssignmentCount >= 3;
                  const isModerate = qa.activeAssignmentCount > 0 && qa.activeAssignmentCount < 3;
                  return (
                    <div
                      key={qa.id}
                      className="p-4 bg-[#011B38] border border-white/10 rounded-[2px] flex flex-col gap-3"
                    >
                      {/* Staff Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white text-xs font-sans truncate">
                            {qa.fullName}
                          </h4>
                          <p className="text-[0.688rem] text-white/40 font-mono mt-0.5">
                            {qa.email}
                          </p>
                        </div>
                        {qa.isOnLeave ? (
                          <span className="text-[0.688rem] font-mono font-semibold px-2 py-0.5 rounded-[2px] border bg-purple-950/50 text-purple-300 border-purple-500/30 whitespace-nowrap flex items-center gap-1">
                            <IconCalendarOff size={11} stroke={2} />
                            <span>On Leave</span>
                          </span>
                        ) : (
                          <span
                            className={`text-[0.688rem] font-mono font-semibold px-2 py-0.5 rounded-[2px] border whitespace-nowrap ${
                              isFull
                                ? "bg-amber-950/50 text-amber-300 border-amber-500/30"
                                : isModerate
                                ? "bg-sky-950/50 text-sky-300 border-sky-500/30"
                                : "bg-emerald-950/50 text-emerald-300 border-emerald-500/30"
                            }`}
                          >
                            {qa.activeAssignmentCount} in Review
                          </span>
                        )}
                      </div>

                      {/* 3-Segment Capacity Bar */}
                      {!qa.isOnLeave && (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 w-full">
                            {[1, 2, 3].map((step) => (
                              <div
                                key={step}
                                className={`h-1.5 flex-1 rounded-[1px] transition-all ${
                                  qa.activeAssignmentCount >= step
                                    ? isFull
                                      ? "bg-amber-400"
                                      : isModerate
                                      ? "bg-sky-400"
                                      : "bg-emerald-400"
                                    : "bg-white/[0.08]"
                                }`}
                              />
                            ))}
                          </div>
                          <div className="flex justify-between text-[0.625rem] text-white/40 font-mono">
                            <span>Review Load</span>
                            <span>{Math.round((qa.activeAssignmentCount / 3) * 100)}% load</span>
                          </div>
                        </div>
                      )}

                      {/* Review Focus */}
                      <p className="text-[0.688rem] text-white/50 font-sans">
                        {qa.isOnLeave
                          ? `Unavailable for reviews — "${qa.leaveReason || "Scheduled Absence"}"`
                          : "Statistical Verification & Peer Review"}
                      </p>

                      {/* Assigned Studies */}
                      {qa.assignedStudies.length > 0 ? (
                        <div className="pt-2 border-t border-white/[0.06] flex flex-col gap-2">
                          <span className="text-[0.625rem] font-mono uppercase text-white/40 font-semibold">
                            Active Reviews ({qa.assignedStudies.length})
                          </span>
                          {qa.assignedStudies.map((study) => (
                            <div
                              key={study.id}
                              className="p-2.5 bg-[#01142B] border border-white/[0.06] rounded-[2px] flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0 flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-[#CC6600] font-semibold">
                                    {study.intakeId}
                                  </span>
                                  <Badge
                                    variant={study.isUrgent ? "amber" : "emerald"}
                                    className="font-mono text-[0.5625rem] py-0 px-1"
                                  >
                                    {study.slaLabel}
                                  </Badge>
                                </div>
                                <p className="text-white/80 font-sans truncate text-xs">
                                  {study.title}
                                </p>
                              </div>
                              <Link
                                href={`/dashboard/admin/projects/${study.id}`}
                                className="shrink-0 flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-sans font-semibold hover:underline"
                              >
                                <span>Open</span>
                                <IconArrowRight size={11} stroke={2} />
                              </Link>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-white/40 font-sans italic pt-1">
                          {qa.isOnLeave
                            ? `On leave${qa.leaveUntil ? ` until ${new Date(qa.leaveUntil).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}` : ""}.`
                            : "No studies currently under review. Available for new assignments."}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {selectedProjectForAssign && (
        <AssignmentModal
          isOpen={!!selectedProjectForAssign}
          onClose={() => setSelectedProjectForAssign(null)}
          projectId={selectedProjectForAssign.id}
          projectTitle={selectedProjectForAssign.researchTitle}
          projectMethod={selectedProjectForAssign.packageName?.replace(/_/g, " ")}
          onSuccess={() => {
            loadData();
            setToastMessage({
              message: "Specialists Assigned Successfully",
              description: `Lead Statistician and QA Lead have been assigned to ${selectedProjectForAssign.intakeId}. SLA clock is now active.`,
              variant: "success",
            });
          }}
        />
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
