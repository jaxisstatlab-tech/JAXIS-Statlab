"use client";

import React from "react";
import type { MessageDTO } from "../schemas";
import { Check, Checks, Clock, WarningCircle } from "@phosphor-icons/react";
import { firstName, fullTimeLabel, initials, roleLabel, timeLabel } from "./chat-format";

/** A message as the chat holds it: server data plus local send state. */
export type ChatMessage = MessageDTO & {
  /** Set when saving failed (network or server error). The row stays with Try Again. */
  failed?: boolean;
  failReason?: string;
};

interface MessageBubbleProps {
  message: ChatMessage;
  /** First / last message in a run from the same sender (first shows avatar, name and time). */
  firstInGroup?: boolean;
  lastInGroup?: boolean;
  /** Show Sending / Sent / Delivered / Seen under this message (your latest one). */
  showStatus?: boolean;
  isNew?: boolean;
  onRetry?: (message: ChatMessage) => void;
  onDiscard?: (message: ChatMessage) => void;
}

/**
 * One chat message as a Slack-style row: avatar, name, role and time on the first line of a
 * group, the text underneath. Later messages in the same group are just text, with the time
 * shown in the left gutter on hover.
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  firstInGroup = true,
  showStatus = false,
  isNew = false,
  onRetry,
  onDiscard,
}) => {
  const { isMine, senderName, senderRole, content, sentAt, isBlocked } = message;
  const role = isMine ? "" : roleLabel(senderRole);
  const pending = message.status === "sending" && !message.failed;

  return (
    <div
      className={`group relative -mx-2 flex gap-3 rounded-[2px] px-2 py-0.5 transition-colors hover:bg-white/[0.025] ${
        firstInGroup ? "mt-3 pt-1.5" : ""
      } ${isNew ? "bg-white/[0.03]" : ""} animate-message-pop`}
    >
      {/* Avatar on the first row; hover time in the gutter on the rest */}
      <div className="w-8 shrink-0">
        {firstInGroup ? (
          <span
            aria-hidden
            className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-[2px] text-[0.688rem] font-semibold select-none ${
              isMine ? "bg-[#CC6600]/20 text-[#F08A2E]" : "bg-white/[0.08] text-white/75"
            }`}
          >
            {initials(senderName)}
          </span>
        ) : (
          <span className="block pt-[3px] text-right text-[0.625rem] leading-5 text-white/30 opacity-0 transition-opacity select-none group-hover:opacity-100">
            {timeLabel(sentAt).replace(/\s?[AP]M$/i, "")}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {firstInGroup ? (
          <p className="flex flex-wrap items-baseline gap-x-2 leading-5">
            <span className="text-sm font-semibold text-white">{isMine ? "You" : senderName}</span>
            {role ? <span className="text-xs text-white/45">{role}</span> : null}
            <span className="text-[0.688rem] text-white/35" title={fullTimeLabel(sentAt)}>
              {timeLabel(sentAt)}
            </span>
          </p>
        ) : null}

        {isBlocked ? (
          <div className="mt-0.5 text-sm">
            <p className="text-white/40 line-through decoration-white/20">{content}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-red-300">
              <WarningCircle size={13} weight="fill" /> Not sent. It looked like it had contact details.
            </p>
          </div>
        ) : (
          <div
            title={fullTimeLabel(sentAt)}
            className={`whitespace-pre-wrap break-words text-[0.938rem] leading-relaxed sm:text-sm ${
              message.failed ? "text-white/55" : pending ? "text-white/60" : "text-white/90"
            }`}
          >
            {content}
          </div>
        )}

        {message.failed ? (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-red-300">
            <span className="flex items-center gap-1">
              <WarningCircle size={13} weight="fill" />
              {message.failReason ? `Not sent. ${message.failReason}` : "Not sent."}
            </span>
            <button
              type="button"
              onClick={() => onRetry?.(message)}
              className="font-semibold text-white underline-offset-4 hover:underline"
            >
              Try Again
            </button>
            <span className="text-white/20">·</span>
            <button
              type="button"
              onClick={() => onDiscard?.(message)}
              className="text-white/60 underline-offset-4 hover:text-white hover:underline"
            >
              Remove
            </button>
          </div>
        ) : showStatus ? (
          <DeliveryStatus message={message} />
        ) : null}
      </div>
    </div>
  );
};

function DeliveryStatus({ message }: { message: ChatMessage }) {
  const base = "mt-0.5 flex items-center gap-1 text-[0.688rem] select-none";
  if (message.status === "sending") {
    return (
      <p className={`${base} text-white/40`}>
        <Clock size={12} weight="fill" /> Sending…
      </p>
    );
  }
  if (message.status === "seen" || message.isRead) {
    const who = message.seenByNames?.length ? firstName(message.seenByNames[0]) : "";
    return (
      <p className={`${base} text-white/55`}>
        <Checks size={13} weight="bold" className="text-[#CC6600]" />
        {who ? `Seen by ${who}` : "Seen"}
      </p>
    );
  }
  if (message.status === "delivered") {
    return (
      <p className={`${base} text-white/40`}>
        <Checks size={13} weight="bold" /> Delivered
      </p>
    );
  }
  return (
    <p className={`${base} text-white/40`}>
      <Check size={13} weight="bold" /> Sent
    </p>
  );
}
