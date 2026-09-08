"use client";

import React from "react";

export type StatusCategory = "success" | "warning" | "danger" | "info" | "neutral";

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
  label?: string;
  className?: string;
  pulse?: boolean;
}

const statusColorMap: Record<string, { bg: string; text: string; border: string; rawBg: string; rawText: string; rawBorder: string }> = {
  // Success states
  ACTIVE: { bg: "bg-[#10B981]/15", text: "text-[#10B981]", border: "border-[#10B981]/30", rawBg: "rgba(16, 185, 129, 0.15)", rawText: "#10B981", rawBorder: "rgba(16, 185, 129, 0.35)" },
  SOW_SIGNED: { bg: "bg-[#10B981]/15", text: "text-[#10B981]", border: "border-[#10B981]/30", rawBg: "rgba(16, 185, 129, 0.15)", rawText: "#10B981", rawBorder: "rgba(16, 185, 129, 0.35)" },
  CLIENT_APPROVED: { bg: "bg-[#10B981]/15", text: "text-[#10B981]", border: "border-[#10B981]/30", rawBg: "rgba(16, 185, 129, 0.15)", rawText: "#10B981", rawBorder: "rgba(16, 185, 129, 0.35)" },
  DELIVERED: { bg: "bg-[#10B981]/15", text: "text-[#10B981]", border: "border-[#10B981]/30", rawBg: "rgba(16, 185, 129, 0.15)", rawText: "#10B981", rawBorder: "rgba(16, 185, 129, 0.35)" },
  CLOSED: { bg: "bg-[#10B981]/15", text: "text-[#10B981]", border: "border-[#10B981]/30", rawBg: "rgba(16, 185, 129, 0.15)", rawText: "#10B981", rawBorder: "rgba(16, 185, 129, 0.35)" },
  QA_APPROVED: { bg: "bg-[#10B981]/15", text: "text-[#10B981]", border: "border-[#10B981]/30", rawBg: "rgba(16, 185, 129, 0.15)", rawText: "#10B981", rawBorder: "rgba(16, 185, 129, 0.35)" },
  VERIFIED: { bg: "bg-[#10B981]/15", text: "text-[#10B981]", border: "border-[#10B981]/30", rawBg: "rgba(16, 185, 129, 0.15)", rawText: "#10B981", rawBorder: "rgba(16, 185, 129, 0.35)" },
  FULLY_PAID: { bg: "bg-[#10B981]/15", text: "text-[#10B981]", border: "border-[#10B981]/30", rawBg: "rgba(16, 185, 129, 0.15)", rawText: "#10B981", rawBorder: "rgba(16, 185, 129, 0.35)" },
  RESOLVED_REFUND: { bg: "bg-[#10B981]/15", text: "text-[#10B981]", border: "border-[#10B981]/30", rawBg: "rgba(16, 185, 129, 0.15)", rawText: "#10B981", rawBorder: "rgba(16, 185, 129, 0.35)" },
  RESOLVED_NO_REFUND: { bg: "bg-[#10B981]/15", text: "text-[#10B981]", border: "border-[#10B981]/30", rawBg: "rgba(16, 185, 129, 0.15)", rawText: "#10B981", rawBorder: "rgba(16, 185, 129, 0.35)" },

  // In Progress / Working states
  IN_PROGRESS: { bg: "bg-[#38BDF8]/15", text: "text-[#38BDF8]", border: "border-[#38BDF8]/30", rawBg: "rgba(56, 189, 248, 0.15)", rawText: "#38BDF8", rawBorder: "rgba(56, 189, 248, 0.35)" },
  PENDING_ASSIGNMENT: { bg: "bg-[#38BDF8]/15", text: "text-[#38BDF8]", border: "border-[#38BDF8]/30", rawBg: "rgba(56, 189, 248, 0.15)", rawText: "#38BDF8", rawBorder: "rgba(56, 189, 248, 0.35)" },
  AWAITING_ASSIGNMENT: { bg: "bg-[#38BDF8]/15", text: "text-[#38BDF8]", border: "border-[#38BDF8]/30", rawBg: "rgba(56, 189, 248, 0.15)", rawText: "#38BDF8", rawBorder: "rgba(56, 189, 248, 0.35)" },
  FOR_QA: { bg: "bg-[#10B981]/20", text: "text-[#10B981]", border: "border-[#10B981]/50", rawBg: "rgba(16, 185, 129, 0.20)", rawText: "#10B981", rawBorder: "rgba(16, 185, 129, 0.50)" },
  EXPERT_ASSIGNED: { bg: "bg-white/5", text: "text-white/70", border: "border-white/20", rawBg: "rgba(255, 255, 255, 0.05)", rawText: "rgba(255, 255, 255, 0.70)", rawBorder: "rgba(255, 255, 255, 0.20)" },

  // Warning / Awaiting Action states
  NEW_REQUEST: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]", border: "border-[#F59E0B]/30", rawBg: "rgba(245, 158, 11, 0.15)", rawText: "#F59E0B", rawBorder: "rgba(245, 158, 11, 0.35)" },
  AWAITING_INFORMATION: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]", border: "border-[#F59E0B]/30", rawBg: "rgba(245, 158, 11, 0.15)", rawText: "#F59E0B", rawBorder: "rgba(245, 158, 11, 0.35)" },
  UNDER_EVALUATION: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]", border: "border-[#F59E0B]/30", rawBg: "rgba(245, 158, 11, 0.15)", rawText: "#F59E0B", rawBorder: "rgba(245, 158, 11, 0.35)" },
  QUOTE_SENT: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]", border: "border-[#F59E0B]/30", rawBg: "rgba(245, 158, 11, 0.15)", rawText: "#F59E0B", rawBorder: "rgba(245, 158, 11, 0.35)" },
  SOW_PENDING: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]", border: "border-[#F59E0B]/30", rawBg: "rgba(245, 158, 11, 0.15)", rawText: "#F59E0B", rawBorder: "rgba(245, 158, 11, 0.35)" },
  AWAITING_PAYMENT: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]", border: "border-[#F59E0B]/30", rawBg: "rgba(245, 158, 11, 0.15)", rawText: "#F59E0B", rawBorder: "rgba(245, 158, 11, 0.35)" },
  QA_REVISION: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]", border: "border-[#F59E0B]/30", rawBg: "rgba(245, 158, 11, 0.15)", rawText: "#F59E0B", rawBorder: "rgba(245, 158, 11, 0.35)" },
  REVISION_REQUESTED: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]", border: "border-[#F59E0B]/30", rawBg: "rgba(245, 158, 11, 0.15)", rawText: "#F59E0B", rawBorder: "rgba(245, 158, 11, 0.35)" },
  SLA_PAUSED: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]", border: "border-[#F59E0B]/30", rawBg: "rgba(245, 158, 11, 0.15)", rawText: "#F59E0B", rawBorder: "rgba(245, 158, 11, 0.35)" },
  PROOF_SUBMITTED: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]", border: "border-[#F59E0B]/30", rawBg: "rgba(245, 158, 11, 0.15)", rawText: "#F59E0B", rawBorder: "rgba(245, 158, 11, 0.35)" },
  AWAITING_PAYMENT_CONFIRMATION: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]", border: "border-[#F59E0B]/30", rawBg: "rgba(245, 158, 11, 0.15)", rawText: "#F59E0B", rawBorder: "rgba(245, 158, 11, 0.35)" },
  PAYMENT_VERIFICATION: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]", border: "border-[#F59E0B]/30", rawBg: "rgba(245, 158, 11, 0.15)", rawText: "#F59E0B", rawBorder: "rgba(245, 158, 11, 0.35)" },
  PENDING_VERIFICATION: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]", border: "border-[#F59E0B]/30", rawBg: "rgba(245, 158, 11, 0.15)", rawText: "#F59E0B", rawBorder: "rgba(245, 158, 11, 0.35)" },
  PENDING: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]", border: "border-[#F59E0B]/30", rawBg: "rgba(245, 158, 11, 0.15)", rawText: "#F59E0B", rawBorder: "rgba(245, 158, 11, 0.35)" },
  UNDER_REVIEW: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]", border: "border-[#F59E0B]/30", rawBg: "rgba(245, 158, 11, 0.15)", rawText: "#F59E0B", rawBorder: "rgba(245, 158, 11, 0.35)" },

  // Danger states
  HALTED: { bg: "bg-[#EF4444]/15", text: "text-[#EF4444]", border: "border-[#EF4444]/30", rawBg: "rgba(239, 68, 68, 0.15)", rawText: "#EF4444", rawBorder: "rgba(239, 68, 68, 0.35)" },
  CANCELLED: { bg: "bg-[#EF4444]/15", text: "text-[#EF4444]", border: "border-[#EF4444]/30", rawBg: "rgba(239, 68, 68, 0.15)", rawText: "#EF4444", rawBorder: "rgba(239, 68, 68, 0.35)" },
  DISPUTED: { bg: "bg-[#EF4444]/15", text: "text-[#EF4444]", border: "border-[#EF4444]/30", rawBg: "rgba(239, 68, 68, 0.15)", rawText: "#EF4444", rawBorder: "rgba(239, 68, 68, 0.35)" },
  ETHICAL_BREACH: { bg: "bg-[#EF4444]/15", text: "text-[#EF4444]", border: "border-[#EF4444]/30", rawBg: "rgba(239, 68, 68, 0.15)", rawText: "#EF4444", rawBorder: "rgba(239, 68, 68, 0.35)" },
  EXPIRED: { bg: "bg-[#EF4444]/15", text: "text-[#EF4444]", border: "border-[#EF4444]/30", rawBg: "rgba(239, 68, 68, 0.15)", rawText: "#EF4444", rawBorder: "rgba(239, 68, 68, 0.35)" },
  REASSIGNMENT_NEEDED: { bg: "bg-[#EF4444]/15", text: "text-[#EF4444]", border: "border-[#EF4444]/30", rawBg: "rgba(239, 68, 68, 0.15)", rawText: "#EF4444", rawBorder: "rgba(239, 68, 68, 0.35)" },
  SCOPE_CREEP_HALTED: { bg: "bg-[#EF4444]/15", text: "text-[#EF4444]", border: "border-[#EF4444]/30", rawBg: "rgba(239, 68, 68, 0.15)", rawText: "#EF4444", rawBorder: "rgba(239, 68, 68, 0.35)" },
  QA_REJECTED: { bg: "bg-[#EF4444]/15", text: "text-[#EF4444]", border: "border-[#EF4444]/30", rawBg: "rgba(239, 68, 68, 0.15)", rawText: "#EF4444", rawBorder: "rgba(239, 68, 68, 0.35)" },
  REJECTED: { bg: "bg-[#EF4444]/15", text: "text-[#EF4444]", border: "border-[#EF4444]/30", rawBg: "rgba(239, 68, 68, 0.15)", rawText: "#EF4444", rawBorder: "rgba(239, 68, 68, 0.35)" },
  SUSPENDED: { bg: "bg-[#EF4444]/15", text: "text-[#EF4444]", border: "border-[#EF4444]/30", rawBg: "rgba(239, 68, 68, 0.15)", rawText: "#EF4444", rawBorder: "rgba(239, 68, 68, 0.35)" },
  TERMINATED: { bg: "bg-[#EF4444]/15", text: "text-[#EF4444]", border: "border-[#EF4444]/30", rawBg: "rgba(239, 68, 68, 0.15)", rawText: "#EF4444", rawBorder: "rgba(239, 68, 68, 0.35)" },
  CHARGEBACK: { bg: "bg-[#EF4444]/15", text: "text-[#EF4444]", border: "border-[#EF4444]/30", rawBg: "rgba(239, 68, 68, 0.15)", rawText: "#EF4444", rawBorder: "rgba(239, 68, 68, 0.35)" },
};

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").toUpperCase();
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  className = "",
  pulse,
  ...props
}) => {
  const normalizedKey = status.toUpperCase().replace(/\s+/g, "_");
  const isActionReady =
    normalizedKey === "FOR_QA" ||
    normalizedKey === "PROOF_SUBMITTED" ||
    normalizedKey === "AWAITING_PAYMENT_CONFIRMATION" ||
    normalizedKey === "PENDING_VERIFICATION" ||
    normalizedKey === "PENDING_ASSIGNMENT" ||
    normalizedKey === "AWAITING_ASSIGNMENT";
  const shouldPulse = pulse !== undefined ? pulse : isActionReady;

  const style = statusColorMap[normalizedKey] ?? {
    bg: "bg-white/10",
    text: "text-white/80",
    border: "border-white/20",
    rawBg: "rgba(255, 255, 255, 0.1)",
    rawText: "rgba(255, 255, 255, 0.8)",
    rawBorder: "rgba(255, 255, 255, 0.2)",
  };

  const displayText =
    label ??
    (normalizedKey === "FOR_QA"
      ? "FOR QA • READY"
      : normalizedKey === "PROOF_SUBMITTED" || normalizedKey === "AWAITING_PAYMENT_CONFIRMATION"
      ? "AWAITING PAYMENT CONFIRMATION"
      : normalizedKey === "PENDING_ASSIGNMENT"
      ? "PENDING ASSIGNMENT"
      : normalizedKey === "AWAITING_ASSIGNMENT"
      ? "AWAITING ASSIGNMENT"
      : formatStatus(status));

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-sans text-[0.688rem] tracking-wide uppercase px-2.5 py-1 rounded-[3px] border ${style.bg} ${style.text} ${style.border} font-semibold select-none whitespace-nowrap ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        padding: "0.25rem 0.625rem",
        borderRadius: "3px",
        fontSize: "0.688rem",
        fontWeight: "600",
        letterSpacing: "0.025em",
        lineHeight: 1,
        whiteSpace: "nowrap",
        backgroundColor: style.rawBg,
        color: style.rawText,
        border: `1px solid ${style.rawBorder}`,
        boxSizing: "border-box",
        ...props.style,
      }}
      {...props}
    >
      {shouldPulse && (
        <span className="relative flex h-1.5 w-1.5" style={{ height: "0.375rem", width: "0.375rem", display: "inline-flex", position: "relative" }}>
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" style={{ position: "absolute", height: "100%", width: "100%", borderRadius: "9999px" }} />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" style={{ height: "0.375rem", width: "0.375rem", borderRadius: "9999px" }} />
        </span>
      )}
      <span>{displayText}</span>
    </span>
  );
};
