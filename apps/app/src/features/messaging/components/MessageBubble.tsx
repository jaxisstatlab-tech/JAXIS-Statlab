"use client";

import React from "react";
import type { MessageDTO } from "../schemas";
import { Badge } from "@repo/ui";
import {
  IconAlertTriangle,
  IconCheck,
  IconChecks,
  IconClock,
  IconShieldCheck,
} from "@tabler/icons-react";

interface MessageBubbleProps {
  message: MessageDTO;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { isMine, senderName, senderRole, content, sentAt, isBlocked, blockedReason, isRead } = message;

  const timeFormatted = new Date(sentAt).toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const dateFormatted = new Date(sentAt).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });

  // Role Badge Variant Mapping (Minimalist & Calm)
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "CLIENT":
        return <Badge variant="outline" className="text-[0.625rem] font-mono px-1.5 py-0 border-white/10 text-white/50 bg-white/[0.02]">Client</Badge>;
      case "STATISTICIAN":
        return <Badge variant="outline" className="text-[0.625rem] font-mono px-1.5 py-0 border-white/10 text-white/60 bg-white/[0.03]">Statistician</Badge>;
      case "SENIOR_QA_LEAD":
        return <Badge variant="outline" className="text-[0.625rem] font-mono px-1.5 py-0 border-white/10 text-white/60 bg-white/[0.03]">QA Lead</Badge>;
      case "ADMIN":
        return <Badge variant="outline" className="text-[0.625rem] font-mono px-1.5 py-0 border-white/10 text-white/60 bg-white/[0.03]">Manager</Badge>;
      case "CEO":
        return <Badge variant="outline" className="text-[0.625rem] font-mono px-1.5 py-0 border-white/10 text-white/60 bg-white/[0.03]">CEO</Badge>;
      default:
        return <Badge variant="outline" className="text-[0.625rem] font-mono px-1.5 py-0 border-white/10 text-white/50 bg-white/[0.02]">{role}</Badge>;
    }
  };

  if (isBlocked) {
    return (
      <div className={`flex flex-col gap-1 max-w-xl my-1.5 ${isMine ? "ml-auto items-end" : "mr-auto items-start"}`}>
        <div className="flex items-center gap-1.5 text-xs font-sans text-white/50">
          <span className="font-semibold text-white/80">{isMine ? "You" : senderName}</span>
          {!isMine && getRoleBadge(senderRole)}
          <span className="text-white/35 text-[0.688rem] font-mono">• {timeFormatted}</span>
        </div>

        <div className="p-3.5 rounded-[2px] bg-red-950/40 border border-red-500/40 text-red-200 text-xs font-sans flex flex-col gap-2 shadow-lg">
          <div className="flex items-center gap-2 text-red-300 font-bold uppercase tracking-wider text-[0.688rem]">
            <IconAlertTriangle size={15} stroke={2} className="text-red-400 shrink-0" />
            <span>Message Blocked by Communication Firewall</span>
          </div>
          <p className="text-white/70 italic line-clamp-3">
            &ldquo;{content}&rdquo;
          </p>
          <div className="pt-2 border-t border-red-500/20 text-[0.688rem] text-red-300">
            <strong>Reason:</strong> Prohibited {blockedReason?.replace(/_/g, " ").toLowerCase() || "external contact info"} detected. This message was NOT delivered to recipients.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-1 max-w-[85%] sm:max-w-xl my-1.5 ${
        isMine ? "ml-auto items-end" : "mr-auto items-start"
      }`}
    >
      {/* Sender Header */}
      <div className={`flex items-center gap-1.5 text-xs font-sans px-1 ${isMine ? "justify-end text-white/40" : "text-white/60"}`}>
        {isMine ? (
          <span className="text-[0.688rem] font-mono text-white/40">You • {timeFormatted}</span>
        ) : (
          <>
            <span className="font-semibold text-white/90">{senderName}</span>
            {getRoleBadge(senderRole)}
            <span className="text-white/35 text-[0.688rem] font-mono">• {dateFormatted} {timeFormatted}</span>
          </>
        )}
      </div>

      {/* Bubble Container */}
      <div
        className={`px-3.5 py-2.5 rounded-[2px] border text-sm font-sans leading-relaxed whitespace-pre-wrap break-words ${
          isMine
            ? "bg-[#011E3D] border-white/15 text-white"
            : "bg-[#01142B] border-white/10 text-white/90"
        }`}
      >
        {content}
      </div>

      {/* Footer Delivery & Read Receipts */}
      {isMine && (
        <div className="flex items-center gap-1.5 text-[0.625rem] font-mono text-white/35 px-1 justify-end select-none">
          {message.status === "sending" ? (
            <span className="flex items-center gap-1 text-white/40">
              <IconClock size={12} stroke={1.5} className="animate-pulse text-white/40" />
              <span>Sending...</span>
            </span>
          ) : message.status === "sent" ? (
            <span className="flex items-center gap-1 text-white/40" title="Sent to server">
              <IconCheck size={13} stroke={2} className="text-white/40" />
              <span>Sent</span>
            </span>
          ) : message.status === "delivered" ? (
            <span className="flex items-center gap-1 text-white/55" title="Delivered to recipients">
              <IconChecks size={13} stroke={2} className="text-white/50" />
              <span>Delivered</span>
            </span>
          ) : message.status === "seen" ? (
            <span
              className="flex items-center gap-1 text-[#38BDF8]"
              title={
                message.seenByNames && message.seenByNames.length > 0
                  ? `Seen by ${message.seenByNames.join(", ")}`
                  : "Seen"
              }
            >
              <IconChecks size={13} stroke={2.5} className="text-[#38BDF8]" />
              <span className="text-[#38BDF8] font-medium">
                {message.seenByNames && message.seenByNames.length > 0
                  ? `Seen by ${message.seenByNames[0]}`
                  : "Seen"}
              </span>
            </span>
          ) : isRead ? (
            <span className="flex items-center gap-1 text-[#38BDF8]">
              <IconChecks size={13} stroke={2.5} className="text-[#38BDF8]" />
              <span className="text-[#38BDF8] font-medium">Seen</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-white/40">
              <IconCheck size={13} stroke={2} className="text-white/40" />
              <span>Sent</span>
            </span>
          )}

          <span className="text-white/20">•</span>
          <span className="flex items-center gap-0.5 text-white/30">
            <IconShieldCheck size={11} stroke={1.5} />
            <span>Encrypted</span>
          </span>
        </div>
      )}
    </div>
  );
};
