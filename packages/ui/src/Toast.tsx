"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  WarningOctagon,
  Warning,
  CheckCircle,
  Info,
} from "@phosphor-icons/react";

export type ToastVariant = "info" | "success" | "warning" | "danger";

export interface ToastProps {
  message: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  onClose?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const toastVariantConfig = {
  danger: {
    icon: WarningOctagon,
    iconColor: "#EF4444",
    iconBg: "rgba(239, 68, 68, 0.12)",
    iconBorder: "rgba(239, 68, 68, 0.25)",
    bg: "rgba(1, 22, 46, 0.98)",
    border: "rgba(239, 68, 68, 0.35)",
    titleColor: "#F87171",
    label: "CRITICAL ALERT",
  },
  warning: {
    icon: Warning,
    iconColor: "#F59E0B",
    iconBg: "rgba(245, 158, 11, 0.12)",
    iconBorder: "rgba(245, 158, 11, 0.25)",
    bg: "rgba(1, 22, 46, 0.98)",
    border: "rgba(245, 158, 11, 0.35)",
    titleColor: "#FBBF24",
    label: "ATTENTION REQUIRED",
  },
  success: {
    icon: CheckCircle,
    iconColor: "#10B981",
    iconBg: "rgba(16, 185, 129, 0.12)",
    iconBorder: "rgba(16, 185, 129, 0.25)",
    bg: "rgba(1, 22, 46, 0.98)",
    border: "rgba(16, 185, 129, 0.35)",
    titleColor: "#34D399",
    label: "CONFIRMATION",
  },
  info: {
    icon: Info,
    iconColor: "#38BDF8",
    iconBg: "rgba(56, 189, 248, 0.12)",
    iconBorder: "rgba(56, 189, 248, 0.25)",
    bg: "rgba(1, 22, 46, 0.98)",
    border: "rgba(56, 189, 248, 0.35)",
    titleColor: "#38BDF8",
    label: "SYSTEM TELEMETRY",
  },
};

export const Toast: React.FC<ToastProps> = ({
  message,
  description,
  variant = "info",
  duration,
  onClose,
  className = "",
  style,
}) => {
  const [mounted, setMounted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Default duration: 7000ms for success & info, 0 (no auto-dismiss) for warning & danger
  const effectiveDuration =
    duration !== undefined
      ? duration
      : variant === "success" || variant === "info"
        ? 7000
        : 0;

  useEffect(() => {
    setMounted(true);
    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  const handleDismiss = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    exitTimerRef.current = setTimeout(() => {
      onClose?.();
    }, 220);
  }, [isExiting, onClose]);

  const cfg = toastVariantConfig[variant];
  const IconComponent = cfg.icon;

  const content = (
    <>
      <style>{`
        @keyframes toastCountdownAnim {
          from { width: 100%; }
          to { width: 0%; }
        }
        @keyframes toastExitAnim {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(10px) scale(0.96); }
        }
      `}</style>
      <div
        role="status"
        aria-live="polite"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[9999] flex flex-col rounded-[2px] shadow-2xl backdrop-blur-xl transition-all ${className}`}
        style={{
          position: "fixed",
          zIndex: 9999,
          backgroundColor: cfg.bg,
          border: `1px solid ${cfg.border}`,
          borderRadius: "2px",
          boxSizing: "border-box",
          minWidth: "0px",
          maxWidth: "28rem",
          boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.9), 0 0 1px 1px rgba(255, 255, 255, 0.08)",
          animation: isExiting
            ? "toastExitAnim 220ms cubic-bezier(0.4, 0, 1, 1) forwards"
            : "contentFadeIn 260ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
          ...style,
        }}
      >
        <div
          className="flex items-start gap-3.5 p-4 sm:p-5"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.875rem",
            padding: "1rem 1.25rem",
            boxSizing: "border-box",
            width: "100%",
          }}
        >
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-[2px] mt-0.5"
            style={{
              width: "1.875rem",
              height: "1.875rem",
              backgroundColor: cfg.iconBg,
              border: `1px solid ${cfg.iconBorder}`,
              color: cfg.iconColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "2px",
              flexShrink: 0,
            }}
          >
            <IconComponent size={16} weight="fill" />
          </div>

          <div
            className="flex-1 min-w-0 flex flex-col gap-0.5"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.125rem",
              flex: 1,
              minWidth: 0,
            }}
          >
            <h6
              className="text-sm font-semibold tracking-tight"
              style={{
                color: cfg.titleColor,
                margin: 0,
                fontSize: "0.875rem",
                fontWeight: 600,
              }}
            >
              {message}
            </h6>
            {description && (
              <p
                className="text-xs text-white/70 mt-0.5 leading-relaxed font-sans"
                style={{
                  margin: 0,
                  marginTop: "0.125rem",
                  fontSize: "0.75rem",
                  lineHeight: 1.5,
                  color: "rgba(255, 255, 255, 0.7)",
                }}
              >
                {description}
              </p>
            )}
          </div>

          {onClose && (
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-shrink-0 text-white/40 hover:text-white transition-colors p-1 rounded-[2px] hover:bg-white/10 cursor-pointer"
              style={{
                flexShrink: 0,
                background: "none",
                border: "none",
                padding: "0.25rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "2px",
              }}
              aria-label="Dismiss notification"
            >
              <X size={15} weight="bold" />
            </button>
          )}
        </div>

        {/* Precision CSS hardware-accelerated auto-dismiss countdown bar */}
        {effectiveDuration > 0 && (
          <div
            style={{
              width: "100%",
              height: "2px",
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              overflow: "hidden",
            }}
          >
            <div
              onAnimationEnd={handleDismiss}
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: cfg.iconColor,
                animation: `toastCountdownAnim ${effectiveDuration}ms linear forwards`,
                animationPlayState: isPaused ? "paused" : "running",
              }}
            />
          </div>
        )}
      </div>
    </>
  );

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(content, document.body);
};

