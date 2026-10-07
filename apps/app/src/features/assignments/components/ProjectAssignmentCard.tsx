"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@repo/ui";
import { Warning } from "@phosphor-icons/react";
import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/Panel";
import { approveSlaPause, resumeSla } from "../actions";
import type { AssignmentDetailItem } from "../schemas";

// The study's analyst and reviewer and the deadline. Admins can pause or resume the deadline, answer a pause
// request, and change the team.

const OPEN = ["EXPERT_ASSIGNED", "IN_PROGRESS", "SLA_PAUSED", "SCOPE_CREEP_HALTED", "FOR_QA", "QA_REVISION", "REVISION_REQUESTED"];

const dateTime = (d: string) =>
  new Date(d).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

interface ProjectAssignmentCardProps {
  assignment: AssignmentDetailItem;
  onRefresh: () => void;
  onReassign: () => void;
  canManage?: boolean;
}

export function ProjectAssignmentCard({ assignment, onRefresh, onReassign, canManage = true }: ProjectAssignmentCardProps) {
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const open = OPEN.includes(assignment.masterStatus);
  const canPause = assignment.masterStatus === "IN_PROGRESS" && !assignment.isPaused;

  const run = (fn: () => Promise<{ success: boolean; error?: { message?: string } }>, fallback: string) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.success) onRefresh();
      else setError(res.error?.message || fallback);
    });
  };
  const pause = () => run(() => approveSlaPause({ projectId: assignment.projectId, approved: true }), "The deadline didn't pause.");
  const decline = () => run(() => approveSlaPause({ projectId: assignment.projectId, approved: false }), "Couldn't say no to the request.");
  const resume = () => run(() => resumeSla({ projectId: assignment.projectId }), "The deadline didn't resume.");

  const deadline = !open
    ? null
    : assignment.isPaused
      ? "Paused"
      : assignment.isOverdue
        ? "Past due"
        : assignment.isUrgent
          ? "Due within a day"
          : null;

  return (
    <Panel>
      <PanelHeader
        title="Team"
        subtitle={`Assigned ${dateTime(assignment.assignedAt)}`}
        aside={
          canManage ? (
            <Button variant="ghost" size="sm" onClick={onReassign} disabled={busy}>
              Change
            </Button>
          ) : null
        }
      />
      <PanelBody className="flex flex-col gap-4 font-sans text-[13px]">
        <Person role="Analyst" name={assignment.statistician.fullName} email={assignment.statistician.email} />
        <Person role="Reviewer" name={assignment.qaLead.fullName} email={assignment.qaLead.email} />

        <div className="border-t border-white/[0.06] pt-4">
          <p className="text-[12px] text-white/45">Deadline</p>
          <p className="mt-0.5 text-white">
            {dateTime(assignment.slaDueAt)}
            {deadline ? <span className={assignment.isOverdue && !assignment.isPaused ? "text-red-300" : "text-white/55"}> · {deadline}</span> : null}
          </p>
          {open ? <p className="mt-0.5 text-white/45">{assignment.slaLabel}</p> : null}
        </div>

        {canManage && open && !assignment.isPaused && assignment.slaPauseReason ? (
          <div className="rounded-[2px] border border-white/10 bg-white/[0.02] p-3.5">
            <p className="text-sm font-medium text-white">Asked to pause the deadline</p>
            <p className="mt-1 leading-relaxed text-white/65">&ldquo;{assignment.slaPauseReason}&rdquo;</p>
            {!canPause ? <p className="mt-1 text-[12px] text-white/45">Only work in progress can be paused.</p> : null}
            <div className="mt-3 flex gap-2">
              {canPause ? (
                <Button variant="primary" size="sm" onClick={pause} loading={busy}>
                  Pause Deadline
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" onClick={decline} disabled={busy}>
                Say No
              </Button>
            </div>
          </div>
        ) : null}

        {assignment.isPaused && assignment.slaPauseReason ? (
          <p className="text-white/55">Paused because: &ldquo;{assignment.slaPauseReason}&rdquo;</p>
        ) : null}

        {canManage && open ? (
          assignment.isPaused ? (
            <Button variant="outline" size="sm" onClick={resume} loading={busy} className="self-start">
              Resume Deadline
            </Button>
          ) : canPause && !assignment.slaPauseReason ? (
            <Button variant="ghost" size="sm" onClick={pause} loading={busy} className="self-start">
              Pause Deadline
            </Button>
          ) : null
        ) : null}

        {assignment.reassignedAt ? (
          <p className="text-[12px] text-white/45">
            Team changed {dateTime(assignment.reassignedAt)}
            {assignment.reassignReason ? `: ${assignment.reassignReason}` : ""}
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="flex items-start gap-2 text-red-300">
            <Warning size={15} weight="fill" className="mt-0.5 shrink-0" />
            {error}
          </p>
        ) : null}
      </PanelBody>
    </Panel>
  );
}

function Person({ role, name, email }: { role: string; name: string; email: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] text-white/45">{role}</p>
      <p className="mt-0.5 truncate font-medium text-white">{name}</p>
      <p className="truncate text-[12px] text-white/45">{email}</p>
    </div>
  );
}
