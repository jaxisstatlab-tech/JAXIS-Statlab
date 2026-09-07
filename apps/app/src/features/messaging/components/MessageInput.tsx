import React, { useState, useEffect } from "react";
import { Button } from "@repo/ui";
import {
  IconSend,
  IconShieldLock,
  IconAlertTriangle,
  IconX,
  IconLock,
} from "@tabler/icons-react";

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<{ success: boolean; blocked?: boolean; warning?: string }>;
  disabled?: boolean;
  disabledReason?: string;
  placeholder?: string;
  externalText?: string;
  onExternalTextConsumed?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
  disabledReason,
  placeholder,
  externalText,
  onExternalTextConsumed,
}) => {
  const [content, setContent] = useState<string>("");
  const [firewallError, setFirewallError] = useState<string | null>(null);

  // Synchronize external preset or quick prompt text if provided
  useEffect(() => {
    if (externalText) {
      setContent(externalText);
      onExternalTextConsumed?.();
    }
  }, [externalText, onExternalTextConsumed]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = content.trim();
    if (!textToSend || disabled) return;

    setFirewallError(null);
    setContent(""); // Instant 0ms clear for immediate typing of next message

    // Send in background without freezing the input or spinning the Send button
    onSendMessage(textToSend)
      .then((res) => {
        if (!res.success) {
          if (res.blocked) {
            setFirewallError(
              res.warning ||
                "Your message was blocked. Sharing external contact info, direct payments, or outside chat links is prohibited."
            );
          } else if (res.warning) {
            setFirewallError(res.warning);
          }
          setContent(textToSend);
        }
      })
      .catch(() => {
        setFirewallError("An unexpected error occurred while sending your message.");
        setContent(textToSend);
      });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-2.5 w-full font-sans">
      {/* Firewall Block Notice */}
      {firewallError && (
        <div className="p-3.5 bg-red-950/50 border border-red-500/40 rounded-[2px] flex items-start justify-between gap-3 text-xs text-red-200 animate-content-fade">
          <div className="flex items-start gap-2.5">
            <IconAlertTriangle size={18} stroke={2} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-red-300 block">Firewall Block Notice</span>
              <p className="text-white/80 mt-0.5 leading-relaxed">{firewallError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFirewallError(null)}
            className="text-white/50 hover:text-white cursor-pointer"
            aria-label="Dismiss warning"
          >
            <IconX size={16} stroke={2} />
          </button>
        </div>
      )}

      {/* Unified Precision Composer Surface */}
      <form onSubmit={handleSubmit} className="flex flex-col w-full">
        <div
          className={`rounded-[2px] bg-[#010915] border transition-colors flex flex-col shadow-inner ${
            disabled
              ? "border-white/10 opacity-60 cursor-not-allowed"
              : "border-white/15 focus-within:border-[#CC6600]"
          }`}
        >
          {/* Main Textarea */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              disabled
                ? placeholder || disabledReason || "Consultation channel is locked until specialists are assigned..."
                : placeholder || "Type your message..."
            }
            disabled={disabled}
            maxLength={5000}
            rows={2}
            className="w-full p-2.5 sm:p-3.5 bg-transparent border-0 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-0 ring-0 resize-none font-sans leading-relaxed"
          />

          {/* Integrated Composer Action Toolbar */}
          <div className="flex items-center justify-between px-3 py-1.5 sm:px-3.5 sm:py-2.5 border-t border-white/[0.06] bg-[#010B18]/70 gap-2">
            {disabled && disabledReason ? (
              <div className="flex items-center gap-1.5 text-xs text-white/40 font-mono">
                <IconLock size={13} stroke={1.5} className="text-white/30" />
                <span>{disabledReason}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-white/40 font-sans">
                <span className="hidden sm:inline-flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded-[2px] bg-white/[0.06] border border-white/10 text-[0.625rem] font-mono text-white/50">Enter</kbd>
                  <span>to send</span>
                  <span className="mx-1 text-white/20">&bull;</span>
                  <kbd className="px-1.5 py-0.5 rounded-[2px] bg-white/[0.06] border border-white/10 text-[0.625rem] font-mono text-white/50">Shift+Enter</kbd>
                  <span>new line</span>
                </span>
                <span className="sm:hidden flex items-center gap-1 text-[0.688rem] text-white/40">
                  <IconShieldLock size={13} stroke={1.5} className="text-emerald-400/70" />
                  <span className="hidden xs:inline">Protected</span>
                </span>
              </div>
            )}

            <div className="flex items-center gap-2.5 sm:gap-3 ml-auto">
              <span
                className={`text-[0.688rem] sm:text-xs font-mono transition-colors ${
                  content.length > 4500
                    ? "text-amber-400 font-semibold"
                    : content.length > 3000
                    ? "text-white/60"
                    : "text-white/30 hidden sm:inline"
                }`}
              >
                {content.length.toLocaleString()} / 5,000
              </span>

              <Button
                type="submit"
                variant={disabled ? "secondary" : "primary"}
                size="sm"
                disabled={!content.trim() || disabled}
                className={`text-xs font-medium rounded-[2px] px-3.5 py-1.5 sm:px-4 sm:py-2 gap-1.5 transition-all ${
                  disabled
                    ? "bg-white/[0.04] text-white/30 border border-white/10 cursor-not-allowed hover:bg-white/[0.04]"
                    : "bg-[#CC6600] hover:bg-[#FFA040] text-white cursor-pointer shadow-sm"
                }`}
              >
                {disabled ? (
                  <>
                    <IconLock size={14} stroke={1.5} />
                    <span>Locked</span>
                  </>
                ) : (
                  <>
                    <IconSend size={14} stroke={2} />
                    <span>Send</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
