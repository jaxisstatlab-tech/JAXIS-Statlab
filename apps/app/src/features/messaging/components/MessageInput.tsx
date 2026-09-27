"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { PaperPlaneRight, WarningCircle, X, Lock } from "@phosphor-icons/react";

interface MessageInputProps {
  /** Resolves once the server answers. The text box is already cleared by then. */
  onSendMessage: (content: string) => Promise<{ success: boolean; blocked?: boolean; warning?: string }>;
  /** Called while the person types (the thread throttles the "is typing" signal). */
  onTyping?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  placeholder?: string;
  externalText?: string;
  onExternalTextConsumed?: () => void;
}

const MAX = 5000;

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  disabled = false,
  disabledReason,
  placeholder,
  externalText,
  onExternalTextConsumed,
}) => {
  const [content, setContent] = useState<string>("");
  const [notice, setNotice] = useState<string | null>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  // Starter prompts fill the box.
  useEffect(() => {
    if (externalText) {
      setContent(externalText);
      onExternalTextConsumed?.();
      boxRef.current?.focus();
    }
  }, [externalText, onExternalTextConsumed]);

  // Grow with the text, up to about 6 lines.
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [content]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = content.trim();
    if (!text || disabled) return;

    setNotice(null);
    setContent(""); // clear right away so the next message can be typed
    boxRef.current?.focus();

    onSendMessage(text)
      .then((res) => {
        // Blocked messages come back to the box so they can be edited. Other failures stay in the
        // chat as a "Not sent · Try Again" bubble, so the text isn't restored twice.
        if (!res.success && res.blocked) {
          setNotice(res.warning || "This message wasn't sent because it looks like it has contact details.");
          setContent((current) => current || text);
        }
      })
      .catch(() => {
        setNotice("Something went wrong. Please try again.");
      });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (disabled) {
    return (
      <div className="flex items-center gap-2.5 rounded-[2px] border border-white/10 bg-white/[0.02] px-3.5 py-3 text-sm text-white/45">
        <Lock size={15} weight="fill" className="shrink-0 text-white/35" />
        <span>{disabledReason || placeholder || "Chat opens once your team is assigned."}</span>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 font-sans">
      {notice ? (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-[2px] border border-red-500/30 bg-red-500/[0.06] px-3.5 py-2.5 text-[13px] leading-relaxed text-red-100 animate-content-fade"
        >
          <p className="flex gap-2">
            <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-red-300" />
            <span>
              <span className="font-semibold text-red-200">Not sent. </span>
              {notice}
            </span>
          </p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="shrink-0 text-white/50 hover:text-white"
            aria-label="Dismiss"
          >
            <X size={15} weight="fill" />
          </button>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex min-w-0 flex-1 items-end rounded-[2px] border border-white/15 bg-[#050513] transition-colors focus-within:border-[#CC6600]">
          <textarea
            ref={boxRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (e.target.value.trim()) onTyping?.();
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "Write a message…"}
            aria-label="Message"
            maxLength={MAX}
            rows={1}
            className="block max-h-40 min-h-[2.75rem] w-full resize-none bg-transparent px-3.5 py-2.5 text-base leading-relaxed text-white placeholder:text-white/35 focus:outline-none sm:text-sm"
          />
          {content.length > MAX - 1000 ? (
            <span
              className={`shrink-0 px-2.5 pb-3 font-mono text-[0.688rem] ${content.length > MAX - 200 ? "text-amber-300" : "text-white/40"}`}
            >
              {(MAX - content.length).toLocaleString()} left
            </span>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={!content.trim()}
          aria-label="Send message"
          title="Send"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[2px] bg-[#CC6600] text-white transition-[background-color,transform] duration-100 hover:bg-[#E07000] active:scale-95 disabled:bg-white/[0.06] disabled:text-white/30"
        >
          <PaperPlaneRight size={18} weight="fill" />
        </button>
      </form>
      <p className="hidden text-[0.688rem] text-white/30 select-none sm:block">
        Press Enter to send, Shift + Enter for a new line.
      </p>
    </div>
  );
};
