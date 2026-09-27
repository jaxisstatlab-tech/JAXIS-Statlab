"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Modal, Button, Badge } from "@repo/ui";
import {
  IconUserCheck,
  IconShieldCheck,
  IconClock,
  IconCalendarOff,
  IconLoader2,
  IconAlertCircle,
  IconArrowRight,
  IconAlertTriangle,
  IconChevronDown,
} from "@tabler/icons-react";
import { getStaffCapacity, assignExperts, reassignExperts } from "../actions";
import type { StaffCapacityItem, AssignmentDetailItem } from "../schemas";

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
  projectMethod?: string | null;
  turnaroundDays?: number;
  existingAssignment?: AssignmentDetailItem | null;
  onSuccess: () => void;
}

const REASSIGNMENT_TEMPLATES = [
  {
    label: "Medical / Personal Leave",
    text: "Specialist is on approved medical or personal leave and unable to complete the analysis within the SLA deadline.",
  },
  {
    label: "Workload Rebalance",
    text: "Workload rebalance to alleviate specialist capacity and prevent deadline collision.",
  },
  {
    label: "Domain Realignment",
    text: "Research methodology requires specific technical expertise better aligned with the newly selected specialist.",
  },
  {
    label: "Client Request",
    text: "Client requested an alternative specialist to align with specific academic or committee expectations.",
  },
  {
    label: "Unresponsive Past Check-in",
    text: "Initial SLA check-in milestone was missed with zero response. Reassigning immediately to safeguard delivery timeline.",
  },
];

export function AssignmentModal({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  projectMethod,
  turnaroundDays = 5,
  existingAssignment,
  onSuccess,
}: AssignmentModalProps) {
  const [statisticians, setStatisticians] = useState<StaffCapacityItem[]>([]);
  const [qaLeads, setQaLeads] = useState<StaffCapacityItem[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);

  const [selectedStatId, setSelectedStatId] = useState<string>("");
  const [selectedQaId, setSelectedQaId] = useState<string>("");
  const [reassignReason, setReassignReason] = useState<string>(REASSIGNMENT_TEMPLATES[0]?.text || "");

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isReassign = !!existingAssignment;

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingStaff(true);
    setError(null);

    getStaffCapacity(projectId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success) {
          setStatisticians(res.data.statisticians);
          setQaLeads(res.data.qaLeads);

          // Pre-select least loaded staff not on leave or existing
          if (existingAssignment) {
            setSelectedStatId(existingAssignment.statistician.id);
            setSelectedQaId(existingAssignment.qaLead.id);
          } else {
            const firstAvailableStat = res.data.statisticians.find((s) => !s.isOnLeave);
            if (firstAvailableStat) {
              setSelectedStatId(firstAvailableStat.id);
            }
            const firstAvailableQa = res.data.qaLeads.find((q) => !q.isOnLeave);
            if (firstAvailableQa) {
              setSelectedQaId(firstAvailableQa.id);
            }
          }
        } else {
          setError(res.error.message);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Network error loading staff.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingStaff(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, projectId, existingAssignment]);

  const selectedStat = statisticians.find((s) => s.id === selectedStatId);
  const selectedQa = qaLeads.find((q) => q.id === selectedQaId);

  const handleSubmit = () => {
    if (!selectedStatId) {
      setError("Please select a Lead Statistician.");
      return;
    }
    if (!selectedQaId) {
      setError("Please select a Senior QA Lead.");
      return;
    }
    if (selectedStat?.isOnLeave) {
      setError("The selected Lead Statistician is currently on leave and unavailable for assignment.");
      return;
    }
    if (selectedQa?.isOnLeave) {
      setError("The selected Senior QA Lead is currently on leave and unavailable for assignment.");
      return;
    }
    if (isReassign && (!reassignReason || reassignReason.trim().length < 5)) {
      setError("Please provide a reason for specialist reassignment (at least 5 characters).");
      return;
    }

    setError(null);
    startTransition(async () => {
      if (isReassign) {
        const res = await reassignExperts({
          projectId,
          newStatisticianId: selectedStatId,
          statisticianId: selectedStatId,
          newQaLeadId: selectedQaId,
          qaLeadId: selectedQaId,
          reason: reassignReason.trim(),
          reassignReason: reassignReason.trim(),
        });

        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setError(res.error?.message || "Failed to reassign experts.");
        }
      } else {
        const res = await assignExperts({
          projectId,
          statisticianId: selectedStatId,
          qaLeadId: selectedQaId,
        });

        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setError(res.error?.message || "Failed to assign experts.");
        }
      }
    });
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={isReassign ? "Reassign Research Specialists" : "Assign Research Specialists"}
      description={`Study: ${projectTitle}`}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isPending || isLoadingStaff || selectedStat?.isOnLeave || selectedQa?.isOnLeave}
            className="font-sans text-xs font-semibold px-4 rounded-[2px]"
          >
            {isPending ? (
              <div className="flex items-center gap-2">
                <IconLoader2 size={16} stroke={2.5} className="animate-spin text-white/90" />
                <span>{isReassign ? "Reassigning..." : "Assigning..."}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span>{isReassign ? "Confirm Reassignment" : "Confirm Assignment"}</span>
                <IconArrowRight size={14} stroke={2} />
              </div>
            )}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6 text-sm font-sans">
        {error && (
          <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-[2px] flex items-start gap-2.5 text-xs text-red-200">
            <IconAlertCircle size={16} stroke={2} className="text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Study Context Ribbon */}
        <div className="p-4 bg-[#0A0A18] border border-white/10 rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[0.688rem] font-sans font-semibold uppercase tracking-wider text-white/40">
              Contractual Turnaround
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <IconClock size={16} stroke={2} className="text-[#38BDF8]" />
              <span className="font-semibold text-white text-sm">
                {turnaroundDays} Business Days
              </span>
              <span className="text-xs text-white/50">
                (Excludes weekends and Philippine holidays)
              </span>
            </div>
          </div>

          {projectMethod && (
            <div className="sm:text-right">
              <span className="text-[0.688rem] font-sans font-semibold uppercase tracking-wider text-white/40">
                Package / Methodology
              </span>
              <p className="font-semibold text-[#CC6600] text-sm mt-0.5">
                {projectMethod}
              </p>
            </div>
          )}
        </div>

        {isLoadingStaff ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-white/60">
            <IconLoader2 size={24} stroke={2} className="animate-spin text-[#CC6600]" />
            <span className="text-xs font-sans">Loading certified staff capacity directory...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Reassignment Reason Input (Only shown on Reassignment) */}
            {isReassign && (
              <div className="flex flex-col gap-2.5 p-3.5 bg-amber-950/25 border border-amber-500/40 rounded-[2px]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs font-semibold text-amber-200">
                    Reason for Specialist Reassignment *
                  </label>
                  <span className="text-[0.625rem] text-amber-300/70 font-mono">
                    Select a template or type custom note
                  </span>
                </div>

                {/* Quick Templates Dropdown */}
                <div className="relative">
                  <select
                    value={REASSIGNMENT_TEMPLATES.find((t) => t.text === reassignReason)?.text || ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        setReassignReason(e.target.value);
                      }
                    }}
                    className="w-full bg-[#0A0A18] border border-white/20 rounded-[2px] px-3 py-2 text-xs text-white focus:border-[#CC6600] focus:ring-0 outline-none cursor-pointer appearance-none pr-8 transition-colors font-sans hover:border-white/30"
                  >
                    <option value="" className="bg-[#0A0A18] text-white/50">
                      Select reason template from dropdown...
                    </option>
                    {REASSIGNMENT_TEMPLATES.map((tmpl) => (
                      <option
                        key={tmpl.label}
                        value={tmpl.text}
                        className="bg-[#0A0A18] text-white py-1"
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
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="Explain why the specialist is being reassigned (e.g. medical leave, domain realignment, client request)..."
                  className="w-full bg-[#0A0A18] border border-white/15 rounded-[2px] p-2.5 text-xs text-white placeholder-white/40 focus:border-[#CC6600] outline-none resize-none h-16 font-sans leading-relaxed"
                />
                <span className="text-[0.688rem] text-amber-300/80 font-sans">
                  Notice: Reassigning will archive the previous assignment and transfer active SLA oversight to the new specialist.
                </span>
              </div>
            )}

            {/* Lead Statistician Selector */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                  <IconUserCheck size={16} stroke={2} className="text-[#38BDF8]" />
                  <span>Lead Statistician</span>
                </label>
                <span className="text-[0.688rem] text-white/40">
                  {statisticians.filter((s) => !s.isOnLeave).length} available specialist{statisticians.filter((s) => !s.isOnLeave).length === 1 ? "" : "s"}
                  {statisticians.some((s) => s.isOnLeave) && (
                    <span className="text-purple-400 font-mono">
                      {" "}• {statisticians.filter((s) => s.isOnLeave).length} on leave
                    </span>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                {statisticians.map((stat) => {
                  const isSelected = selectedStatId === stat.id;
                  return (
                    <button
                      key={stat.id}
                      type="button"
                      disabled={stat.isOnLeave}
                      onClick={() => !stat.isOnLeave && setSelectedStatId(stat.id)}
                      className={`text-left p-3 rounded-[2px] border transition-colors flex items-center justify-between gap-3 ${
                        stat.isOnLeave
                          ? "bg-[#050513]/50 border-white/5 opacity-40 cursor-not-allowed select-none"
                          : isSelected
                          ? "bg-[#0F0F1D] border-[#CC6600] cursor-pointer"
                          : "bg-[#0A0A18] border-white/10 hover:border-white/20 cursor-pointer"
                      }`}
                    >
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-semibold text-white text-xs whitespace-nowrap">
                            {stat.fullName}
                          </span>
                          {!stat.isOnLeave && stat.matchScore !== undefined && stat.matchScore >= 75 && (
                            <Badge variant="emerald" className="text-[0.625rem] py-0 px-1 font-mono whitespace-nowrap">
                              {stat.matchScore}% Match
                            </Badge>
                          )}
                          {!stat.isOnLeave && stat.burnoutRisk?.isAtRisk && (
                            <Badge variant="amber" className="text-[0.625rem] py-0 px-1 font-mono flex items-center gap-1 whitespace-nowrap">
                              <IconAlertTriangle size={10} stroke={2} />
                              <span>Burnout Risk</span>
                            </Badge>
                          )}
                          {!stat.isOnLeave && stat.isLeavePending && (
                            <Badge variant="amber" className="text-[0.625rem] py-0 px-1 font-mono flex items-center gap-1 whitespace-nowrap">
                              <IconClock size={10} stroke={2} />
                              <span>Leave Pending</span>
                            </Badge>
                          )}
                        </div>
                        <p className="text-[0.688rem] text-white/50 truncate font-sans">
                          {stat.isOnLeave
                            ? `Unavailable — On Leave${stat.leaveUntil ? ` (returns ${new Date(stat.leaveUntil).toLocaleDateString("en-PH", { month: "short", day: "numeric" })})` : ""}${stat.leaveReason ? `: "${stat.leaveReason}"` : ""}`
                            : stat.specializations.length > 0
                            ? stat.specializations.join(", ")
                            : "General Statistical Analysis"}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        {stat.isOnLeave ? (
                          <span className="text-[0.688rem] font-mono font-semibold px-2 py-0.5 rounded-[2px] border bg-purple-950/50 text-purple-300 border-purple-500/30 whitespace-nowrap flex items-center gap-1">
                            <IconCalendarOff size={11} stroke={2} />
                            <span>On Leave</span>
                          </span>
                        ) : (
                          <span
                            className={`text-[0.688rem] font-mono font-semibold px-2 py-0.5 rounded-[2px] border whitespace-nowrap ${
                              stat.activeAssignmentCount === 0
                                ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                                : stat.activeAssignmentCount < 3
                                ? "bg-sky-950/40 text-sky-300 border-sky-500/30"
                                : "bg-amber-950/40 text-amber-300 border-amber-500/30"
                            }`}
                          >
                            {stat.activeAssignmentCount} active
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Burnout Risk Warning Banner for Statistician */}
              {selectedStat?.burnoutRisk?.isAtRisk && !selectedStat?.isOnLeave && (
                <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-[2px] text-xs text-amber-200 flex items-start gap-2">
                  <IconAlertTriangle size={15} stroke={2} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-amber-300">Burnout Warning for {selectedStat.fullName}</span>
                    <span className="text-white/80">{selectedStat.burnoutRisk.reasons.join(". ")}. Consider choosing a specialist with lower active load to protect staff wellbeing.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Senior QA Lead Selector */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                  <IconShieldCheck size={16} stroke={2} className="text-[#10B981]" />
                  <span>Senior QA Lead</span>
                </label>
                <span className="text-[0.688rem] text-white/40">
                  {qaLeads.filter((q) => !q.isOnLeave).length} available QA lead{qaLeads.filter((q) => !q.isOnLeave).length === 1 ? "" : "s"}
                  {qaLeads.some((q) => q.isOnLeave) && (
                    <span className="text-purple-400 font-mono">
                      {" "}• {qaLeads.filter((q) => q.isOnLeave).length} on leave
                    </span>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                {qaLeads.map((qa) => {
                  const isSelected = selectedQaId === qa.id;
                  return (
                    <button
                      key={qa.id}
                      type="button"
                      disabled={qa.isOnLeave}
                      onClick={() => !qa.isOnLeave && setSelectedQaId(qa.id)}
                      className={`text-left p-3 rounded-[2px] border transition-colors flex items-center justify-between gap-3 ${
                        qa.isOnLeave
                          ? "bg-[#050513]/50 border-white/5 opacity-40 cursor-not-allowed select-none"
                          : isSelected
                          ? "bg-[#0F0F1D] border-[#CC6600] cursor-pointer"
                          : "bg-[#0A0A18] border-white/10 hover:border-white/20 cursor-pointer"
                      }`}
                    >
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-semibold text-white text-xs whitespace-nowrap">
                            {qa.fullName}
                          </span>
                          {!qa.isOnLeave && qa.burnoutRisk?.isAtRisk && (
                            <Badge variant="amber" className="text-[0.625rem] py-0 px-1 font-mono flex items-center gap-1 whitespace-nowrap">
                              <IconAlertTriangle size={10} stroke={2} />
                              <span>Burnout Risk</span>
                            </Badge>
                          )}
                          {!qa.isOnLeave && qa.isLeavePending && (
                            <Badge variant="amber" className="text-[0.625rem] py-0 px-1 font-mono flex items-center gap-1 whitespace-nowrap">
                              <IconClock size={10} stroke={2} />
                              <span>Leave Pending</span>
                            </Badge>
                          )}
                        </div>
                        <p className="text-[0.688rem] text-white/50 truncate font-sans">
                          {qa.isOnLeave
                            ? `Unavailable — On Leave${qa.leaveUntil ? ` (returns ${new Date(qa.leaveUntil).toLocaleDateString("en-PH", { month: "short", day: "numeric" })})` : ""}${qa.leaveReason ? `: "${qa.leaveReason}"` : ""}`
                            : "Senior Verification & Quality Gatekeeper"}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        {qa.isOnLeave ? (
                          <span className="text-[0.688rem] font-mono font-semibold px-2 py-0.5 rounded-[2px] border bg-purple-950/50 text-purple-300 border-purple-500/30 whitespace-nowrap flex items-center gap-1">
                            <IconCalendarOff size={11} stroke={2} />
                            <span>On Leave</span>
                          </span>
                        ) : (
                          <span className="text-[0.688rem] font-mono font-semibold px-2 py-0.5 rounded-[2px] border bg-emerald-950/40 text-emerald-300 border-emerald-500/30 whitespace-nowrap">
                            {qa.activeAssignmentCount} in review
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Burnout Risk Warning Banner for QA Lead */}
              {selectedQa?.burnoutRisk?.isAtRisk && !selectedQa?.isOnLeave && (
                <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-[2px] text-xs text-amber-200 flex items-start gap-2">
                  <IconAlertTriangle size={15} stroke={2} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-amber-300">Burnout Warning for {selectedQa.fullName}</span>
                    <span className="text-white/80">{selectedQa.burnoutRisk.reasons.join(". ")}. Consider choosing an available reviewer to balance QA responsibilities.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
