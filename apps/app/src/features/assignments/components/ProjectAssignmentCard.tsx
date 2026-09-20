"use client";

import React, { useState, useTransition } from "react";
import { Card, Button, Badge } from "@repo/ui";
import {
  IconUserCheck,
  IconShieldCheck,
  IconClock,
  IconPlayerPause,
  IconPlayerPlay,
  IconRefresh,
  IconLoader2,
} from "@tabler/icons-react";
import { approveSlaPause, resumeSla } from "../actions";
import type { AssignmentDetailItem } from "../schemas";

interface ProjectAssignmentCardProps {
  assignment: AssignmentDetailItem;
  onRefresh: () => void;
  onReassign: () => void;
  canManage?: boolean;
}

export function ProjectAssignmentCard({
  assignment,
  onRefresh,
  onReassign,
  canManage = true,
}: ProjectAssignmentCardProps) {
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const handlePause = () => {
    setActionError(null);
    startTransition(async () => {
      const res = await approveSlaPause({
        projectId: assignment.projectId,
        approved: true,
      });
      if (res.success) {
        onRefresh();
      } else {
        setActionError(res.error?.message || "Failed to pause SLA.");
      }
    });
  };

  const handleResume = () => {
    setActionError(null);
    startTransition(async () => {
      const res = await resumeSla({
        projectId: assignment.projectId,
      });
      if (res.success) {
        onRefresh();
      } else {
        setActionError(res.error?.message || "Failed to resume SLA.");
      }
    });
  };

  return (
    <Card className="p-6 border border-white/10 bg-[#01142B]/90 rounded-[2px] flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white text-base font-sans">
              Specialist Assignment &amp; Deadline Tracking
            </h3>
            {assignment.isPaused ? (
              <Badge variant="amber" className="font-mono text-[0.625rem] py-0 px-2">
                TIMER PAUSED
              </Badge>
            ) : assignment.isOverdue ? (
              <Badge variant="danger" className="font-mono text-[0.625rem] py-0 px-2">
                OVERDUE
              </Badge>
            ) : assignment.isUrgent ? (
              <Badge variant="amber" className="font-mono text-[0.625rem] py-0 px-2">
                URGENT (&lt;24H)
              </Badge>
            ) : (
              <Badge variant="emerald" className="font-mono text-[0.625rem] py-0 px-2">
                ON SCHEDULE
              </Badge>
            )}
          </div>
          <p className="text-xs text-white/60 mt-0.5 font-sans">
            Assigned on {new Date(assignment.assignedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            {assignment.isPaused ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleResume}
                disabled={isPending}
                className="font-sans text-xs font-semibold rounded-[2px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                {isPending ? (
                  <IconLoader2 size={14} className="animate-spin" />
                ) : (
                  <IconPlayerPlay size={14} stroke={2} />
                )}
                <span>Resume Timer</span>
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePause}
                disabled={isPending}
                className="font-sans text-xs font-semibold rounded-[2px] gap-1.5 text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
              >
                {isPending ? (
                  <IconLoader2 size={14} className="animate-spin" />
                ) : (
                  <IconPlayerPause size={14} stroke={2} />
                )}
                <span>Pause Timer</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onReassign}
              disabled={isPending}
              className="font-sans text-xs font-semibold rounded-[2px] gap-1.5"
            >
              <IconRefresh size={14} stroke={2} />
              <span>Reassign</span>
            </Button>
          </div>
        )}
      </div>

      {actionError && (
        <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-[2px] text-xs text-red-200">
          {actionError}
        </div>
      )}

      {/* Directory & SLA Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Statistician */}
        <div className="p-4 bg-[#011B38] border border-white/10 rounded-[2px] flex flex-col gap-1.5">
          <span className="text-[0.688rem] font-sans font-semibold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
            <IconUserCheck size={14} stroke={2} className="text-[#38BDF8]" />
            <span>Lead Statistician</span>
          </span>
          <p className="font-semibold text-white text-sm truncate">
            {assignment.statistician.fullName}
          </p>
          <span className="text-xs text-white/50 truncate font-mono">
            {assignment.statistician.email}
          </span>
        </div>

        {/* QA Lead */}
        <div className="p-4 bg-[#011B38] border border-white/10 rounded-[2px] flex flex-col gap-1.5">
          <span className="text-[0.688rem] font-sans font-semibold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
            <IconShieldCheck size={14} stroke={2} className="text-[#10B981]" />
            <span>Senior QA Lead</span>
          </span>
          <p className="font-semibold text-white text-sm truncate">
            {assignment.qaLead.fullName}
          </p>
          <span className="text-xs text-white/50 truncate font-mono">
            {assignment.qaLead.email}
          </span>
        </div>

        {/* SLA Due Date */}
        <div className="p-4 bg-[#011B38] border border-white/10 rounded-[2px] flex flex-col gap-1.5">
          <span className="text-[0.688rem] font-sans font-semibold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
            <IconClock size={14} stroke={2} className="text-[#CC6600]" />
            <span>Contractual Deadline</span>
          </span>
          <p className="font-semibold text-white text-sm">
            {new Date(assignment.slaDueAt).toLocaleDateString("en-PH", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <span
            className={`text-xs font-mono font-semibold ${
              assignment.isPaused
                ? "text-amber-400"
                : assignment.isOverdue
                ? "text-red-400"
                : assignment.isUrgent
                ? "text-amber-300"
                : "text-emerald-400"
            }`}
          >
            {assignment.slaLabel}
          </span>
        </div>
      </div>

      {assignment.reassignedAt && (
        <div className="p-3 bg-white/[0.02] border border-white/10 rounded-[2px] text-xs text-white/60 font-sans flex items-center gap-2">
          <span className="text-amber-400 font-semibold">Specialist Reassigned:</span>
          <span>
            {assignment.reassignReason} (at {new Date(assignment.reassignedAt).toLocaleString("en-PH")})
          </span>
        </div>
      )}
    </Card>
  );
}
