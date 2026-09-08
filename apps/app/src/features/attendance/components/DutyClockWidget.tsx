"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Play,
  Stop,
  Clock,
  CircleNotch,
  Coffee,
  CalendarX,
  Warning,
  Check,
} from "@phosphor-icons/react";
import { Button, Modal, Toast } from "@repo/ui";
import { clockIn, clockOut, getActiveShift } from "../actions";
import type { ActiveShiftStatus } from "../schemas";

interface DutyClockWidgetProps {
  userRole?: string;
  initialActiveShift?: ActiveShiftStatus | null;
}

export const DutyClockWidget: React.FC<DutyClockWidgetProps> = ({
  userRole = "CLIENT",
  initialActiveShift,
}) => {
  // Only render for internal staff roles
  const isInternal = ["STATISTICIAN", "SENIOR_QA_LEAD", "FINANCE_OFFICER", "ADMIN", "CEO"].includes(userRole);

  // Initialize from server prop first, then check localStorage cache for 0ms instantaneous paint
  const [shiftStatus, setShiftStatus] = useState<ActiveShiftStatus | null>(() => {
    if (initialActiveShift !== undefined && initialActiveShift !== null) {
      return initialActiveShift;
    }
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("jaxis_active_shift");
        if (cached) return JSON.parse(cached) as ActiveShiftStatus;
      } catch (e) {
        console.debug("Failed to read shift cache:", e);
      }
    }
    return initialActiveShift || null;
  });

  const [seconds, setSeconds] = useState<number>(() => {
    const active = initialActiveShift || shiftStatus;
    if (active?.isOnDuty && active.clockInAt) {
      return Math.max(0, Math.floor((Date.now() - new Date(active.clockInAt).getTime()) / 1000));
    }
    return active?.elapsedSeconds || 0;
  });

  const [isPunching, setIsPunching] = useState<boolean>(false);
  const [isClockOutModalOpen, setIsClockOutModalOpen] = useState<boolean>(false);
  const [shiftNotes, setShiftNotes] = useState<string>("");
  const [toast, setToast] = useState<{ message: string; description?: string; variant: "success" | "warning" | "danger" | "info" } | null>(null);

  const lastFetchRef = React.useRef<number>(0);

  // Helper to update state and sync with browser cache for instant 0ms transitions
  const updateShiftState = useCallback((newStatus: ActiveShiftStatus | null) => {
    setShiftStatus(newStatus);
    if (typeof window !== "undefined") {
      try {
        if (newStatus && newStatus.isOnDuty) {
          localStorage.setItem("jaxis_active_shift", JSON.stringify(newStatus));
        } else {
          localStorage.removeItem("jaxis_active_shift");
        }
      } catch (e) {
        console.debug("Failed to update shift cache:", e);
      }
    }
  }, []);

  // 1. Fetch initial or refreshed status (silent background sync)
  const refreshStatus = useCallback(async (force = false) => {
    if (!isInternal) return;
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 5000) {
      return;
    }
    lastFetchRef.current = now;
    try {
      const status = await getActiveShift();
      updateShiftState(status);
      if (status.isOnDuty && status.clockInAt) {
        setSeconds(Math.max(0, Math.floor((Date.now() - new Date(status.clockInAt).getTime()) / 1000)));
      } else {
        setSeconds(0);
      }
    } catch (err) {
      console.error("Failed to load active shift status:", err);
    }
  }, [isInternal, updateShiftState]);

  useEffect(() => {
    // If no initial shift was provided via SSR, fetch immediately
    if (initialActiveShift === undefined) {
      refreshStatus(true);
    }
  }, [refreshStatus, initialActiveShift]);

  // Listen for global leave and shift updates from anywhere in the application
  useEffect(() => {
    const handleGlobalUpdate = () => {
      refreshStatus(true);
    };
    const handleFocus = () => {
      refreshStatus(false);
    };

    window.addEventListener("leave-status-updated", handleGlobalUpdate);
    window.addEventListener("shift-status-updated", handleGlobalUpdate);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("leave-status-updated", handleGlobalUpdate);
      window.removeEventListener("shift-status-updated", handleGlobalUpdate);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshStatus]);

  // 2. High-Precision Wall-Clock Live Timer Tick (Immune to sleep or background tab drift)
  useEffect(() => {
    if (!shiftStatus?.isOnDuty || !shiftStatus.clockInAt) {
      setSeconds(0);
      return;
    }

    const clockInMs = new Date(shiftStatus.clockInAt).getTime();
    const updateTick = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - clockInMs) / 1000));
      setSeconds(elapsed);
    };

    updateTick();
    const interval = setInterval(updateTick, 1000);
    return () => clearInterval(interval);
  }, [shiftStatus?.isOnDuty, shiftStatus?.clockInAt]);

  if (!isInternal) return null;

  // Format seconds -> HH:MM:SS
  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 3. Clock In Action with 0ms Instant Optimistic Transition
  const handleClockIn = async () => {
    if (isPunching) return;
    setIsPunching(true);

    const previousStatus = shiftStatus;
    const now = new Date();

    // Instant optimistic state transition (0ms)
    const optimisticStatus: ActiveShiftStatus = {
      isOnDuty: true,
      activeLogId: "temp-optimistic-log",
      clockInAt: now.toISOString(),
      elapsedSeconds: 0,
      ipAddress: null,
      notes: null,
      isOnLeave: false,
    };

    updateShiftState(optimisticStatus);
    setSeconds(0);
    window.dispatchEvent(new CustomEvent("shift-status-updated"));

    try {
      const res = await clockIn();
      if (res.success) {
        setToast({
          variant: "success",
          message: "Duty Clock-In Recorded",
          description: "Active shift session has commenced. Server timestamp verified.",
        });
        const serverStatus: ActiveShiftStatus = {
          ...optimisticStatus,
          activeLogId: res.data.logId,
          clockInAt: res.data.clockInAt || now.toISOString(),
        };
        updateShiftState(serverStatus);
      } else {
        // Rollback on server validation or policy failure
        updateShiftState(previousStatus);
        window.dispatchEvent(new CustomEvent("shift-status-updated"));
        setToast({
          variant: "danger",
          message: "Clock-In Failed",
          description: res.error.message,
        });
      }
    } catch {
      updateShiftState(previousStatus);
      window.dispatchEvent(new CustomEvent("shift-status-updated"));
      setToast({
        variant: "danger",
        message: "Network Error",
        description: "Unable to contact duty logging service.",
      });
    } finally {
      setIsPunching(false);
    }
  };

  // 4. Clock Out Action with 0ms Instant Optimistic Transition
  const handleClockOut = async () => {
    if (isPunching) return;
    setIsPunching(true);

    const previousStatus = shiftStatus;

    // Instant optimistic state transition (0ms)
    const optimisticStatus: ActiveShiftStatus = {
      isOnDuty: false,
      activeLogId: null,
      clockInAt: null,
      elapsedSeconds: 0,
      ipAddress: null,
      notes: null,
      isOnLeave: shiftStatus?.isOnLeave || false,
      leaveReason: shiftStatus?.leaveReason,
    };

    updateShiftState(optimisticStatus);
    setSeconds(0);
    setIsClockOutModalOpen(false);
    window.dispatchEvent(new CustomEvent("shift-status-updated"));

    try {
      const res = await clockOut({
        notes: shiftNotes.trim() || undefined,
      });

      if (res.success) {
        setToast({
          variant: "success",
          message: "Shift Concluded & Saved",
          description: `Total Net Payable Hours: ${res.data.netHoursFormatted}.`,
        });
        setShiftNotes("");
      } else {
        // Rollback on failure
        updateShiftState(previousStatus);
        window.dispatchEvent(new CustomEvent("shift-status-updated"));
        setToast({
          variant: "danger",
          message: "Clock-Out Failed",
          description: res.error.message,
        });
      }
    } catch {
      updateShiftState(previousStatus);
      window.dispatchEvent(new CustomEvent("shift-status-updated"));
      setToast({
        variant: "danger",
        message: "Network Error",
        description: "Unable to record shift conclusion.",
      });
    } finally {
      setIsPunching(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* On Leave Indicator */}
        {shiftStatus?.isOnLeave ? (
          <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold rounded-[2px] bg-purple-950/50 text-purple-300 border border-purple-500/30 whitespace-nowrap shrink-0">
            <CalendarX size={13} weight="fill" />
            <span>On Leave</span>
          </span>
        ) : shiftStatus?.isOnDuty ? (
          /* Active Duty Live Timer Pill */
          <div className="flex items-center bg-[#01142B] border border-emerald-500/40 rounded-[2px] p-0.5 sm:p-1 gap-1 sm:gap-1.5 shadow-sm shrink-0">
            {/* Clickable Timer Pill (On mobile, this single element opens the Conclude modal without button cramming) */}
            <button
              type="button"
              disabled={isPunching}
              onClick={() => setIsClockOutModalOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-[2px] hover:bg-emerald-500/10 active:bg-emerald-500/20 transition-colors cursor-pointer"
              title="Click to view shift details or conclude shift"
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-mono font-bold text-emerald-300 tracking-wider">
                {formatTimer(seconds)}
              </span>
            </button>

            {/* Explicit Conclude Shift button for tablet & desktop viewports */}
            <button
              type="button"
              disabled={isPunching}
              onClick={() => setIsClockOutModalOpen(true)}
              className="hidden sm:flex px-2 sm:px-2.5 py-1 text-[0.688rem] font-sans font-semibold rounded-[2px] bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/30 hover:border-red-500/50 transition-colors items-center gap-1 cursor-pointer whitespace-nowrap"
              title="Conclude active shift"
            >
              <Stop size={12} weight="fill" />
              <span>Conclude Shift</span>
            </button>
          </div>
        ) : (
          /* Off Duty - Clock In Button */
          <Button
            size="sm"
            variant="secondary"
            disabled={isPunching}
            onClick={handleClockIn}
            className="flex items-center gap-1 sm:gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 min-h-[32px] sm:min-h-[36px] bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 rounded-[2px] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Clock In to commence duty shift"
          >
            {isPunching ? (
              <CircleNotch size={13} className="animate-spin text-emerald-300" />
            ) : (
              <Play size={12} weight="fill" />
            )}
            <span>Clock In</span>
          </Button>
        )}
      </div>

      {/* Clock Out Confirmation Modal */}
      <Modal
        isOpen={isClockOutModalOpen}
        onClose={() => !isPunching && setIsClockOutModalOpen(false)}
        title="Clock Out & End Shift"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button
              variant="secondary"
              size="sm"
              disabled={isPunching}
              onClick={() => setIsClockOutModalOpen(false)}
              className="cursor-pointer font-sans"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isPunching}
              onClick={handleClockOut}
              className="cursor-pointer font-sans"
            >
              {isPunching ? (
                <div className="flex items-center gap-1.5">
                  <CircleNotch size={14} className="animate-spin text-white" />
                  <span>Clocking out...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Check size={14} weight="bold" />
                  <span>Clock Out</span>
                </div>
              )}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 text-xs font-sans text-white/90">
          {/* Simple Duration Summary */}
          <div className="p-4 bg-[#010D1F] border border-white/10 rounded-[2px] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-[2px] bg-emerald-950/50 border border-emerald-500/30 text-emerald-400">
                <Clock size={20} weight="fill" />
              </div>
              <div>
                <span className="text-[0.688rem] text-white/50 uppercase font-mono tracking-wider block">
                  Total Shift Duration
                </span>
                <span className="text-xl font-mono font-extrabold text-white">
                  {formatTimer(seconds)}
                </span>
              </div>
            </div>
            <div className="text-right font-mono text-[0.688rem] text-white/50">
              <span>Clock In: </span>
              <span className="text-white">
                {shiftStatus?.clockInAt
                  ? new Date(shiftStatus.clockInAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })
                  : "--:--"}
              </span>
            </div>
          </div>

          {/* Automatic Meal Break Notice */}
          <div className="p-3 bg-[#010D1F] border border-white/10 rounded-[2px] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-[2px] bg-[#CC6600]/10 border border-[#CC6600]/30 text-[#CC6600]">
                <Coffee size={15} weight="fill" />
              </div>
              <div className="flex flex-col">
                <span className="text-white font-semibold font-sans">Lunch Break Deduction</span>
                <span className="text-[0.688rem] text-white/50 font-sans">
                  {seconds >= 5 * 3600
                    ? "Full shift (5+ hours) — 1 hour lunch break automatically applied"
                    : "Shift under 5 hours — no deduction"}
                </span>
              </div>
            </div>
            <span className={`font-mono text-xs font-bold ${seconds >= 5 * 3600 ? "text-amber-400" : "text-emerald-400"}`}>
              {seconds >= 5 * 3600 ? "-1 hr break" : "0 min deduction"}
            </span>
          </div>

          {/* Overtime / Overnight Alert if shift > 10h */}
          {seconds >= 10 * 3600 && (
            <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-[2px] flex items-start gap-2.5 text-xs text-amber-200">
              <Warning size={16} weight="fill" className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-300 block">Extended Shift Detected ({Math.floor(seconds / 3600)}h+)</span>
                <p className="text-white/70 text-[0.688rem] mt-0.5 leading-relaxed">
                  If you forgot to clock out yesterday, you can conclude this shift now and submit an <strong>Attendance Correction</strong> in your HR Portal to log your exact departure time.
                </p>
              </div>
            </div>
          )}

          {/* Quick Optional Note */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/60">
              Shift note / task accomplished (optional)
            </label>
            <input
              type="text"
              value={shiftNotes}
              onChange={(e) => setShiftNotes(e.target.value)}
              placeholder="e.g. Statistical analysis on Study #202608-0001"
              className="w-full bg-[#010D1F] border border-white/10 focus:border-[#CC6600] rounded-[2px] p-2.5 text-xs text-white placeholder-white/30 outline-none font-sans"
            />
          </div>
        </div>
      </Modal>

      {/* Standard Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          description={toast.description}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};
