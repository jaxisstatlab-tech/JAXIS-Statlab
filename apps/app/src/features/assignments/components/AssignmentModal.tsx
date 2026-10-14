"use client";

import { clientPackageName } from "@/features/projects/client-packages";
import { getStudyVolunteers } from "@/features/volunteers/actions";
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
  /** The agreement promised a speed add-on (calendar days, e.g. Express = 2 days). */
  calendarDays?: boolean;
  existingAssignment?: AssignmentDetailItem | null;
  onSuccess: () => void;
}

const REASSIGNMENT_TEMPLATES = [
  { label: "On leave", text: "The analyst is on leave and can't finish the study by the due date." },
  { label: "Too many studies", text: "The analyst has too many studies right now, so the due date is at risk." },
  { label: "Better fit", text: "This study needs skills that the new analyst is a better fit for." },
  { label: "Client asked", text: "The client asked for a different analyst." },
  { label: "No response", text: "The analyst hasn't responded or started the study, so the due date is at risk." },
];

export function AssignmentModal({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  projectMethod,
  turnaroundDays = 5,
  calendarDays = false,
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
  // Watched by id, not by object: the page hands over a new assignment object every time it refreshes, and a
  // server call refreshes it, so watching the object reloaded the list endlessly (the window flickered between
  // "Loading" and the list, and the admin's picks were reset each time).
  const existingStatId = existingAssignment?.statistician.id;
  const existingQaId = existingAssignment?.qaLead.id;
  // Analysts and reviewers who offered to take this study ("I'll take this study"): picked by an admin, or offered.
  const [volunteerTag, setVolunteerTag] = useState<Record<string, "Picked" | "Offered">>({});

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingStaff(true);
    setError(null);

    Promise.all([
      getStaffCapacity(projectId),
      existingStatId ? Promise.resolve(null) : getStudyVolunteers(projectId).catch(() => null),
    ])
      .then(([res, vol]) => {
        if (!isMounted) return;
        if (!res.success) {
          setError(res.error.message);
          return;
        }
        const all = vol && vol.success ? vol.data : [];
        const volunteers = all.filter((v) => v.kind !== "REVIEWER");
        const reviewerOffers = all.filter((v) => v.kind === "REVIEWER");
        const tags: Record<string, "Picked" | "Offered"> = {};
        for (const v of all) tags[v.statisticianId] = v.picked ? "Picked" : "Offered";
        setVolunteerTag(tags);
        // Volunteers first (picked, then in the order they offered), then everyone else as before.
        const rank = (id: string) => (tags[id] === "Picked" ? 0 : tags[id] ? 1 + (all.find((v) => v.statisticianId === id)?.order ?? 0) : 1000);
        const stats = [...res.data.statisticians].sort((a, b) => rank(a.id) - rank(b.id));
        const qas = [...res.data.qaLeads].sort((a, b) => rank(a.id) - rank(b.id));
        setStatisticians(stats);
        setQaLeads(qas);

        if (existingStatId && existingQaId) {
          setSelectedStatId(existingStatId);
          setSelectedQaId(existingQaId);
        } else {
          // The analyst the admin picked, else the suggested volunteer, else the least busy analyst.
          const available = (id?: string) => (id && stats.some((s) => s.id === id && !s.isOnLeave) ? id : undefined);
          const statId =
            available(volunteers.find((v) => v.picked)?.statisticianId) ??
            available(volunteers.find((v) => v.suggested)?.statisticianId) ??
            stats.find((s) => !s.isOnLeave)?.id;
          if (statId) setSelectedStatId(statId);
          // The reviewer the admin picked, else the first reviewer who offered, else the first available one.
          const freeQa = (id?: string) => (id && id !== statId && qas.some((q) => q.id === id && !q.isOnLeave) ? id : undefined);
          const qaId =
            freeQa(reviewerOffers.find((v) => v.picked)?.statisticianId) ??
            freeQa(reviewerOffers.find((v) => v.suggested)?.statisticianId) ??
            qas.find((q) => !q.isOnLeave && q.id !== statId)?.id;
          if (qaId) setSelectedQaId(qaId);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "The analysts and reviewers didn't load. Please try again.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingStaff(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, projectId, existingStatId, existingQaId]);

  const selectedStat = statisticians.find((s) => s.id === selectedStatId);
  const selectedQa = qaLeads.find((q) => q.id === selectedQaId);

  const handleSubmit = () => {
    if (!selectedStatId) {
      setError("Pick an analyst.");
      return;
    }
    if (!selectedQaId) {
      setError("Pick a reviewer.");
      return;
    }
    if (selectedStat?.isOnLeave) {
      setError("That analyst is on leave. Pick someone else.");
      return;
    }
    if (selectedQa?.isOnLeave) {
      setError("That reviewer is on leave. Pick someone else.");
      return;
    }
    if (isReassign && (!reassignReason || reassignReason.trim().length < 5)) {
      setError("Say why the team is changing (at least 5 characters).");
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
          setError(res.error?.message || "The team wasn't changed. Please try again.");
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
          setError(res.error?.message || "The team wasn't assigned. Please try again.");
        }
      }
    });
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={isReassign ? "Change the Team" : "Assign the Team"}
      description={`Study: ${projectTitle}`}
      size="lg"
      bodyClassName="[scrollbar-gutter:stable]"
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
                <span>{isReassign ? "Changing..." : "Assigning..."}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span>{isReassign ? "Change Team" : "Assign Team"}</span>
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
              Delivery promised
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <IconClock size={16} stroke={2} className="shrink-0 text-white/50" />
              <span className="whitespace-nowrap font-semibold text-white text-sm">
                {turnaroundDays} {calendarDays ? (turnaroundDays === 1 ? "day" : "days") : "working days"}
              </span>
              <span className="text-xs text-white/50">
                {calendarDays ? "(faster delivery: weekends count)" : "(Excludes weekends and Philippine holidays)"}
              </span>
            </div>
          </div>

          {projectMethod && (
            <div className="sm:text-right">
              <span className="text-[0.688rem] font-sans font-semibold uppercase tracking-wider text-white/40">
                Package
              </span>
              <p className="font-semibold text-white text-sm mt-0.5">
                {clientPackageName(projectMethod.replace(/ /g, "_")) ?? projectMethod}
              </p>
            </div>
          )}
        </div>

        {isLoadingStaff ? (
          <div className="flex min-h-[22rem] flex-col items-center justify-center gap-3 text-white/60">
            <IconLoader2 size={24} stroke={2} className="animate-spin text-[#CC6600]" />
            <span className="text-xs font-sans">Loading analysts and reviewers...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Reassignment Reason Input (Only shown on Reassignment) */}
            {isReassign && (
              <div className="flex flex-col gap-2.5 rounded-[2px] border border-white/10 bg-white/[0.02] p-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs font-semibold text-white">
                    Why is the team changing? *
                  </label>
                  <span className="text-[0.688rem] text-white/45">
                    Pick a reason or write your own
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
                      Pick a reason...
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
                  placeholder="For example: the analyst is on leave until next week."
                  className="w-full bg-[#0A0A18] border border-white/15 rounded-[2px] p-2.5 text-xs text-white placeholder-white/40 focus:border-[#CC6600] outline-none resize-none h-16 font-sans leading-relaxed"
                />
                <span className="text-[0.688rem] text-white/50 font-sans">
                  The old team is taken off this study and the new analyst takes over the due date.
                </span>
              </div>
            )}

            {/* Lead Statistician Selector */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                  <IconUserCheck size={16} stroke={2} className="text-white/50" />
                  <span>Analyst</span>
                </label>
                <span className="text-[0.688rem] text-white/40">
                  {statisticians.filter((s) => !s.isOnLeave).length} available
                  {statisticians.some((s) => s.isOnLeave) && (
                    <span className="text-white/40">
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
                          {volunteerTag[stat.id] ? (
                            <span
                              className={`rounded-[2px] border px-1 py-0 font-mono text-[0.625rem] whitespace-nowrap ${
                                volunteerTag[stat.id] === "Picked" ? "border-[#CC6600]/50 text-[#FFA040]" : "border-white/15 text-white/60"
                              }`}
                            >
                              {volunteerTag[stat.id]}
                            </span>
                          ) : null}
                          {!stat.isOnLeave && stat.matchScore !== undefined && stat.matchScore >= 75 && (
                            <Badge variant="emerald" className="text-[0.625rem] py-0 px-1 font-mono whitespace-nowrap">
                              {stat.matchScore}% Match
                            </Badge>
                          )}
                          {!stat.isOnLeave && stat.burnoutRisk?.isAtRisk && (
                            <Badge variant="amber" className="text-[0.625rem] py-0 px-1 font-mono flex items-center gap-1 whitespace-nowrap">
                              <IconAlertTriangle size={10} stroke={2} />
                              <span>Heavy load</span>
                            </Badge>
                          )}
                          {!stat.isOnLeave && stat.isLeavePending && (
                            <Badge variant="amber" className="text-[0.625rem] py-0 px-1 font-mono flex items-center gap-1 whitespace-nowrap">
                              <IconClock size={10} stroke={2} />
                              <span>Leave asked</span>
                            </Badge>
                          )}
                        </div>
                        <p className="text-[0.688rem] text-white/50 truncate font-sans">
                          {stat.isOnLeave
                            ? `Unavailable — On Leave${stat.leaveUntil ? ` (returns ${new Date(stat.leaveUntil).toLocaleDateString("en-PH", { month: "short", day: "numeric" })})` : ""}${stat.leaveReason ? `: "${stat.leaveReason}"` : ""}`
                            : stat.specializations.length > 0
                            ? stat.specializations.join(", ")
                            : "General analysis"}
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

              {/* Heavy load Warning Banner for Statistician */}
              {selectedStat?.burnoutRisk?.isAtRisk && !selectedStat?.isOnLeave && (
                <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-[2px] text-xs text-amber-200 flex items-start gap-2">
                  <IconAlertTriangle size={15} stroke={2} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-amber-300">{selectedStat.fullName} has a lot on</span>
                    <span className="text-white/80">
                      {selectedStat.activeAssignmentCount} {selectedStat.activeAssignmentCount === 1 ? "study" : "studies"} on hand already. Pick someone with fewer if you can, so due dates stay safe.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Senior QA Lead Selector */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                  <IconShieldCheck size={16} stroke={2} className="text-[#10B981]" />
                  <span>Reviewer</span>
                </label>
                <span className="text-[0.688rem] text-white/40">
                  {qaLeads.filter((q) => !q.isOnLeave).length} available
                  {qaLeads.some((q) => q.isOnLeave) && (
                    <span className="text-white/40">
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
                          {volunteerTag[qa.id] ? (
                            <span
                              className={`rounded-[2px] border px-1 py-0 font-mono text-[0.625rem] whitespace-nowrap ${
                                volunteerTag[qa.id] === "Picked" ? "border-[#CC6600]/50 text-[#FFA040]" : "border-white/15 text-white/60"
                              }`}
                            >
                              {volunteerTag[qa.id]}
                            </span>
                          ) : null}
                          {!qa.isOnLeave && qa.burnoutRisk?.isAtRisk && (
                            <Badge variant="amber" className="text-[0.625rem] py-0 px-1 font-mono flex items-center gap-1 whitespace-nowrap">
                              <IconAlertTriangle size={10} stroke={2} />
                              <span>Heavy load</span>
                            </Badge>
                          )}
                          {!qa.isOnLeave && qa.isLeavePending && (
                            <Badge variant="amber" className="text-[0.625rem] py-0 px-1 font-mono flex items-center gap-1 whitespace-nowrap">
                              <IconClock size={10} stroke={2} />
                              <span>Leave asked</span>
                            </Badge>
                          )}
                        </div>
                        <p className="text-[0.688rem] text-white/50 truncate font-sans">
                          {qa.isOnLeave
                            ? `Unavailable — On Leave${qa.leaveUntil ? ` (returns ${new Date(qa.leaveUntil).toLocaleDateString("en-PH", { month: "short", day: "numeric" })})` : ""}${qa.leaveReason ? `: "${qa.leaveReason}"` : ""}`
                            : "Checks the analysis before delivery"}
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

              {/* Heavy load Warning Banner for QA Lead */}
              {selectedQa?.burnoutRisk?.isAtRisk && !selectedQa?.isOnLeave && (
                <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-[2px] text-xs text-amber-200 flex items-start gap-2">
                  <IconAlertTriangle size={15} stroke={2} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-amber-300">{selectedQa.fullName} has a lot on</span>
                    <span className="text-white/80">
                      {selectedQa.activeAssignmentCount} {selectedQa.activeAssignmentCount === 1 ? "study" : "studies"} to review already. Pick another reviewer if you can.
                    </span>
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
