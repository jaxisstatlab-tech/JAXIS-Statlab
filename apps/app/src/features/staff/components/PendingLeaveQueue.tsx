"use client";

import React, { useState, useEffect, useTransition, useOptimistic, useCallback } from "react";
import { Card, Button, Badge, LoadingState, Toast } from "@repo/ui";
import {
  IconClock,
  IconCalendar,
  IconCheck,
  IconX,
  IconLoader2,
} from "@tabler/icons-react";
import { getPendingLeaves, approveLeave, rejectLeave } from "../actions";
import type { PendingLeaveItem } from "../schemas";

interface PendingLeaveQueueProps {
  onStatusChange?: () => void;
  title?: string;
  subtitle?: string;
  showLoadingCard?: boolean;
}

export function PendingLeaveQueue({
  onStatusChange,
  title = "HR Personnel & Specialist Leave Queue",
  subtitle = "Review and acknowledge specialist absence requests before activating leave status.",
  showLoadingCard = false,
}: PendingLeaveQueueProps) {
  const [leaves, setLeaves] = useState<PendingLeaveItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [optimisticLeaves, setOptimisticLeaves] = useOptimistic(
    leaves,
    (state, leaveIdToRemove: string) => state.filter((l) => l.id !== leaveIdToRemove)
  );

  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const fetchPending = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getPendingLeaves();
      if (res.success && res.data) {
        setLeaves(res.data);
      }
    } catch (err) {
      console.error("[PendingLeaveQueue] Error loading leaves:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleApprove = (item: PendingLeaveItem) => {
    setActiveActionId(item.id);
    startTransition(async () => {
      setOptimisticLeaves(item.id);
      const res = await approveLeave(item.id);
      if (res.success) {
        setLeaves((prev) => prev.filter((l) => l.id !== item.id));
        setToastMessage({
          message: "Leave Request Approved",
          description: `${item.fullName} is now on leave.`,
          variant: "success",
        });
        onStatusChange?.();
      } else {
        setToastMessage({
          message: "Approval Failed",
          description: res.error?.message || "Could not approve leave request.",
          variant: "danger",
        });
      }
      setActiveActionId(null);
    });
  };

  const handleReject = (item: PendingLeaveItem) => {
    setActiveActionId(item.id);
    startTransition(async () => {
      setOptimisticLeaves(item.id);
      const res = await rejectLeave(item.id);
      if (res.success) {
        setLeaves((prev) => prev.filter((l) => l.id !== item.id));
        setToastMessage({
          message: "Leave Request Declined",
          description: `${item.fullName} has been restored to active duty.`,
          variant: "warning",
        });
        onStatusChange?.();
      } else {
        setToastMessage({
          message: "Action Failed",
          description: res.error?.message || "Could not decline leave request.",
          variant: "danger",
        });
      }
      setActiveActionId(null);
    });
  };

  if (isLoading) {
    if (!showLoadingCard) {
      return null;
    }
    return (
      <Card className="p-6 border-white/10 bg-[#0A0A18]/90 rounded-[2px]">
        <LoadingState
          variant="card"
          label="Loading pending leave queue..."
          description="Fetching specialist submissions for HR review."
        />
      </Card>
    );
  }

  if (optimisticLeaves.length === 0) {
    return null; // Return nothing when queue is empty so layout stays minimal
  }

  return (
    <>
      <Card className="p-0 overflow-hidden border border-amber-500/30 bg-[#0A0A18] rounded-[2px] shadow-sm">
        {/* Card Header */}
        <div className="p-5 border-b border-white/10 bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[2px] bg-[#CC6600]/20 border border-[#CC6600]/40 flex items-center justify-center shrink-0">
              <IconClock size={18} stroke={2} className="text-[#FF9433]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-sans">{title}</h3>
                <span className="text-xs font-mono font-semibold text-[#FF9433] bg-[#CC6600]/20 px-2 py-0.5 rounded-[2px] border border-[#CC6600]/40">
                  {optimisticLeaves.length} Pending {optimisticLeaves.length === 1 ? "Request" : "Requests"}
                </span>
              </div>
              <p className="text-xs text-white/60 mt-0.5 font-sans">{subtitle}</p>
            </div>
          </div>
          <span className="text-[0.688rem] font-mono text-amber-300/70 shrink-0">
            HR &amp; Operations Oversight
          </span>
        </div>

        {/* Requests List */}
        <div className="divide-y divide-white/10">
          {optimisticLeaves.map((item) => {
            const isItemBusy = isPending && activeActionId === item.id;
            const fromStr = item.leaveFrom
              ? new Date(item.leaveFrom).toLocaleDateString("en-PH", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Immediate";
            const untilStr = item.leaveUntil
              ? new Date(item.leaveUntil).toLocaleDateString("en-PH", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Open-ended";

            const durationDays =
              item.leaveFrom && item.leaveUntil
                ? Math.max(
                    1,
                    Math.round(
                      (new Date(item.leaveUntil).getTime() -
                        new Date(item.leaveFrom).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  )
                : null;

            return (
              <div
                key={item.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
              >
                {/* Staff Details & Justification */}
                <div className="flex flex-col gap-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white text-sm font-sans">
                      {item.fullName}
                    </span>
                    <span className="text-xs font-mono text-white/50">
                      ({item.email})
                    </span>
                    <Badge
                      variant={item.role === "STATISTICIAN" ? "sky" : "emerald"}
                      className="text-[0.625rem] py-0 px-1.5 font-sans"
                    >
                      {item.role === "STATISTICIAN" ? "Lead Statistical Analyst" : "Senior QA Lead"}
                    </Badge>
                    {durationDays && (
                      <span className="text-[0.688rem] font-mono font-semibold text-[#FF9433] bg-[#CC6600]/15 px-2 py-0.5 rounded-[2px] border border-[#CC6600]/30">
                        {durationDays} {durationDays === 1 ? "Day" : "Days"} Requested
                      </span>
                    )}
                  </div>

                  {/* Schedule Dates */}
                  <div className="flex items-center gap-2 text-xs text-white/70 font-sans">
                    <IconCalendar size={14} stroke={1.5} className="text-white/50 shrink-0" />
                    <span>
                      <span className="text-white/50">Leave:</span> {fromStr} &rarr;{" "}
                      <span className="text-white/50">Return:</span> {untilStr}
                    </span>
                  </div>

                  {/* Stated Justification */}
                  {item.leaveReason && (
                    <div className="p-2.5 bg-black/40 border border-white/10 rounded-[2px] text-xs text-white/80 font-sans leading-relaxed">
                      <span className="text-[0.688rem] uppercase font-mono text-white/40 block mb-0.5">
                        Specialist Justification:
                      </span>
                      &ldquo;{item.leaveReason}&rdquo;
                    </div>
                  )}
                </div>

                {/* Approval & Decline Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleReject(item)}
                    disabled={isItemBusy || isPending}
                    className="font-sans text-xs rounded-[2px] text-white/70 hover:text-white border-white/15 cursor-pointer gap-1.5"
                  >
                    {isItemBusy ? (
                      <IconLoader2 size={14} className="animate-spin" />
                    ) : (
                      <IconX size={14} stroke={2} />
                    )}
                    <span>Decline</span>
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => handleApprove(item)}
                    disabled={isItemBusy || isPending}
                    className="font-sans text-xs font-semibold rounded-[2px] gap-1.5 cursor-pointer"
                  >
                    {isItemBusy ? (
                      <IconLoader2 size={14} className="animate-spin" />
                    ) : (
                      <IconCheck size={14} stroke={2} />
                    )}
                    <span>Acknowledge &amp; Approve Leave</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          description={toastMessage.description}
          variant={toastMessage.variant}
          onClose={() => setToastMessage(null)}
        />
      )}
    </>
  );
}
