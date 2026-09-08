"use client";

import React from "react";
import type { MessageDTO } from "../schemas";
import { Badge } from "@repo/ui";
import {
  Warning,
  Check,
  Checks,
} from "@phosphor-icons/react";

interface MessageBubbleProps {
  message: MessageDTO;
  isNew?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isNew }) => {
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
        return <Badge variant="outline" className="text-[0.625rem] font-mono px-1.5 py-0 border-amber-500/20 text-amber-300/80 bg-amber-500/[0.04]">Admin</Badge>;
      case "CEO":
        return <Badge variant="outline" className="text-[0.625rem] font-mono px-1.5 py-0 border-emerald-500/20 text-emerald-300/80 bg-emerald-500/[0.04]">Director</Badge>;
      default:
        return <Badge variant="outline" className="text-[0.625rem] font-mono px-1.5 py-0 border-white/10 text-white/50 bg-white/[0.02]">{role.replace(/_/g, " ")}</Badge>;
    }
  };

  if (isBlocked) {
    return (
      <div className={`flex flex-col gap-1 max-w-xl my-1.5 animate-message-pop ${isMine ? "ml-auto items-end" : "mr-auto items-start"}`}>
        <div className="flex items-center gap-1.5 text-xs font-sans text-white/50">
          <span className="font-semibold text-white/80">{isMine ? "You" : senderName}</span>
          {!isMine && getRoleBadge(senderRole)}
          <span className="text-white/35 text-[0.688rem] font-mono">• {timeFormatted}</span>
        </div>

        <div className="p-3.5 rounded-[2px] bg-red-950/40 border border-red-500/40 text-red-200 text-xs font-sans flex flex-col gap-2 shadow-lg">
          <div className="flex items-center gap-2 text-red-300 font-bold uppercase tracking-wider text-[0.688rem]">
            <Warning size={15} weight="fill" className="text-red-400 shrink-0" />
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
      className={`flex flex-col gap-1 max-w-[85%] sm:max-w-xl my-1.5 animate-message-pop transition-all ${
        isMine ? "ml-auto items-end origin-bottom-right" : "mr-auto items-start origin-bottom-left"
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
        className={`px-3.5 py-2.5 rounded-[2px] border text-sm font-sans leading-relaxed whitespace-pre-wrap break-words transition-all duration-300 ${
          isMine
            ? "bg-[#011E3D] border-white/15 text-white"
            : `bg-[#01142B] text-white/90 ${
                isNew ? "border-[#38BDF8]/60 animate-message-highlight" : "border-white/10"
              }`
        }`}
      >
        {content}
      </div>

      {/* Footer Delivery & Read Receipts */}
      {isMine && (
        <div className="flex items-center gap-1.5 text-[0.625rem] font-mono text-white/35 px-1 justify-end select-none">
          {message.status === "sending" || message.status === "sent" ? (
            <span className="flex items-center gap-1 text-white/40" title="Sent">
              <Check size={13} weight="bold" className="text-white/40" />
              <span>Sent</span>
            </span>
          ) : message.status === "delivered" ? (
            <span className="flex items-center gap-1 text-white/55" title="Delivered to recipients">
              <Checks size={13} weight="bold" className="text-white/50" />
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
              <Checks size={13} weight="bold" className="text-[#38BDF8]" />
              <span className="text-[#38BDF8] font-medium">
                {message.seenByNames && message.seenByNames.length > 0
                  ? `Seen by ${message.seenByNames[0]}`
                  : "Seen"}
              </span>
            </span>
          ) : isRead ? (
            <span className="flex items-center gap-1 text-[#38BDF8]">
              <Checks size={13} weight="bold" className="text-[#38BDF8]" />
              <span className="text-[#38BDF8] font-medium">Seen</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-white/40">
              <Check size={13} weight="bold" className="text-white/40" />
              <span>Sent</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
