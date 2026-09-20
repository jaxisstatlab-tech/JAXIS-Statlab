"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { signOut } from "next-auth/react";
import { Clock, ShieldWarning } from "@phosphor-icons/react";

// Timing configurations
const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30 minutes total session idle threshold
const WARNING_THRESHOLD_MS = 25 * 60 * 1000; // Trigger warning at 25 minutes (5 minute buffer)
const THROTTLE_INTERVAL_MS = 5000; // Update activity timestamp at most every 5 seconds

export function IdleSessionManager() {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(300); // 5 minutes countdown

  const lastActiveRef = useRef<number>(Date.now());
  const lastThrottleRef = useRef<number>(0);
  const isLoggingOutRef = useRef<boolean>(false);

  const performLogout = useCallback(() => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setShowWarning(false);
    signOut({ callbackUrl: "/login?reason=idle_timeout" });
  }, []);

  const resetActivity = useCallback(() => {
    lastActiveRef.current = Date.now();
    if (showWarning) {
      setShowWarning(false);
      setSecondsRemaining(300);
    }
  }, [showWarning]);

  // User input activity listeners (throttled)
  useEffect(() => {
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastThrottleRef.current > THROTTLE_INTERVAL_MS) {
        lastThrottleRef.current = now;
        lastActiveRef.current = now;
      }
    };

    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((evt) => {
      window.addEventListener(evt, handleActivity, { passive: true });
    });

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleActivity);
      });
    };
  }, []);

  // Interval check loop for idle duration & countdown
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const idleTime = now - lastActiveRef.current;

      if (idleTime >= IDLE_LIMIT_MS) {
        performLogout();
      } else if (idleTime >= WARNING_THRESHOLD_MS) {
        setShowWarning(true);
        const remaining = Math.max(0, Math.ceil((IDLE_LIMIT_MS - idleTime) / 1000));
        setSecondsRemaining(remaining);
      } else if (showWarning) {
        setShowWarning(false);
        setSecondsRemaining(300);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [performLogout, showWarning]);

  // Check on tab visibility / device wake from sleep
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        const idleTime = now - lastActiveRef.current;
        if (idleTime >= IDLE_LIMIT_MS) {
          performLogout();
        } else if (idleTime >= WARNING_THRESHOLD_MS) {
          setShowWarning(true);
          const remaining = Math.max(0, Math.ceil((IDLE_LIMIT_MS - idleTime) / 1000));
          setSecondsRemaining(remaining);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [performLogout]);

  if (!showWarning) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedCountdown = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="idle-modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#010114]/80 backdrop-blur-sm animate-modal-backdrop-in print:hidden"
    >
      <div className="w-full max-w-md bg-[#01142B] border border-white/10 rounded-[2px] p-6 sm:p-8 flex flex-col gap-6 shadow-2xl animate-modal-content-in">
        {/* Header Anatomy */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="w-9 h-9 rounded-[2px] bg-[#CC6600]/15 border border-[#CC6600]/30 flex items-center justify-center flex-shrink-0">
            <Clock size={20} weight="fill" className="text-[#CC6600]" />
          </div>
          <div className="flex flex-col">
            <h3 id="idle-modal-title" className="text-base font-bold text-white font-sans tracking-tight">
              Session Inactivity Warning
            </h3>
            <span className="text-xs text-white/50 font-sans">
              Security protection for research & financial data
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex flex-col gap-4">
          <p className="text-sm text-white/70 font-sans leading-relaxed">
            You have been inactive for 25 minutes. To protect client confidentiality and financial transactions, your session will automatically log out in:
          </p>

          {/* Countdown Display */}
          <div className="flex items-center justify-center py-4 px-6 rounded-[2px] bg-[#010114]/60 border border-white/10">
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-bold text-3xl sm:text-4xl text-[#FFA040] tracking-wider">
                {formattedCountdown}
              </span>
              <span className="text-xs font-mono text-white/40 uppercase">
                remaining
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-white/50 font-sans bg-white/[0.03] p-2.5 rounded-[2px] border border-white/5">
            <ShieldWarning size={16} weight="fill" className="text-amber-400 flex-shrink-0" />
            <span>Click &ldquo;Keep Me Signed In&rdquo; below to extend your session.</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={performLogout}
            className="w-full sm:w-1/2 h-10 px-4 rounded-[2px] bg-white/[0.06] hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-sm font-sans font-medium transition-all active:scale-[0.98] outline-none"
          >
            Sign Out Now
          </button>
          <button
            type="button"
            onClick={resetActivity}
            className="w-full sm:w-1/2 h-10 px-4 rounded-[2px] bg-[#CC6600] hover:bg-[#CC6600]/90 text-white text-sm font-sans font-semibold transition-all active:scale-[0.98] shadow-sm outline-none"
          >
            Keep Me Signed In
          </button>
        </div>
      </div>
    </div>
  );
}
