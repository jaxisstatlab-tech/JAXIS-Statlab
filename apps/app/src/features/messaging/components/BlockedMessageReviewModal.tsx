"use client";

import React, { useState } from "react";
import type { BlockedMessageLogDTO } from "../schemas";
import { reviewBlockedMessage } from "../actions";
import { Modal, Button, Badge } from "@repo/ui";
import {
  Warning,
  ShieldCheck,
  Check,
  Clock,
  User,
  Folder,
} from "@phosphor-icons/react";

interface BlockedMessageReviewModalProps {
  log: BlockedMessageLogDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onReviewed: () => void;
}

export const BlockedMessageReviewModal: React.FC<BlockedMessageReviewModalProps> = ({
  log,
  isOpen,
  onClose,
  onReviewed,
}) => {
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!log) return null;

  const handleReview = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await reviewBlockedMessage({
        logId: log.id,
        reviewNotes: reviewNotes.trim() || undefined,
      });

      if (res.success) {
        onReviewed();
        onClose();
      } else {
        setError(res.error?.message || "Failed to mark as reviewed.");
      }
    } catch {
      setError("An unexpected error occurred during review submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Firewall Incident Review & Audit"
      size="lg"
    >
      <div className="flex flex-col gap-5 font-sans">
        {/* Incident Summary Card */}
        <div className="p-4 rounded-[2px] bg-red-950/30 border border-red-500/30 flex items-start gap-3">
          <div className="p-2 rounded-[2px] bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
            <Warning size={20} weight="fill" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-red-300 text-sm">
                Prohibited Communication Detected
              </span>
              <Badge variant="danger" className="text-[0.625rem] font-mono">
                {log.detectedPattern.replace(/_/g, " ")}
              </Badge>
              {log.reviewedAt && (
                <Badge variant="emerald" className="text-[0.625rem] font-mono">
                  Reviewed by {log.reviewerName || "Admin"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-white/80 leading-relaxed">
              This message was intercepted and completely blocked by the communication firewall. No other participants received this content.
            </p>
          </div>
        </div>

        {/* Sender & Project Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Sender Card */}
          <div className="p-3.5 rounded-[2px] bg-[#01142B] border border-white/10 flex flex-col gap-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-white/50 font-semibold uppercase tracking-wider text-[0.688rem]">
              <User size={14} weight="fill" className="text-sky-400" />
              <span>Sender Identity</span>
            </div>
            <span className="font-bold text-white text-sm">{log.senderName}</span>
            <span className="text-white/60 font-mono">{log.senderEmail}</span>
            <span className="text-white/40">Role: <strong className="text-sky-300">{log.senderRole}</strong></span>
          </div>

          {/* Project Card */}
          <div className="p-3.5 rounded-[2px] bg-[#01142B] border border-white/10 flex flex-col gap-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-white/50 font-semibold uppercase tracking-wider text-[0.688rem]">
              <Folder size={14} weight="fill" className="text-[#CC6600]" />
              <span>Associated Study</span>
            </div>
            <span className="font-bold text-[#CC6600] font-mono text-sm">{log.intakeId}</span>
            <span className="text-white/80 line-clamp-1">{log.projectTitle}</span>
            <span className="text-white/40 flex items-center gap-1">
              <Clock size={12} weight="fill" />
              <span>Flagged: {new Date(log.createdAt).toLocaleString("en-PH")}</span>
            </span>
          </div>
        </div>

        {/* Detected Snippet Highlight */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">
            Flagged Pattern Snippet
          </span>
          <div className="p-3 rounded-[2px] bg-red-950/40 border border-red-500/30 text-xs font-mono text-red-200">
            <strong>Matched String:</strong> &ldquo;{log.matchedText}&rdquo;
          </div>
        </div>

        {/* Full Message Body */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">
            Original Blocked Message Content
          </span>
          <div className="p-4 rounded-[2px] bg-[#010114] border border-white/15 text-sm text-white/90 font-sans leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
            {log.content}
          </div>
        </div>

        {/* Admin Review Notes */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reviewNotesInput" className="text-xs font-semibold text-white/60 uppercase tracking-wider">
            Admin Audit & Review Notes
          </label>
          <textarea
            id="reviewNotesInput"
            rows={3}
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Add internal audit notes or disciplinary follow-up actions..."
            defaultValue={log.reviewNotes || ""}
            disabled={isSubmitting || Boolean(log.reviewedAt)}
            className="w-full p-3 rounded-[2px] bg-[#01142B] border border-white/15 text-sm text-white placeholder:text-white/30 focus:border-[#CC6600] focus:outline-none resize-none font-sans disabled:opacity-60"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-[2px] text-xs text-red-200">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="cursor-pointer text-xs"
          >
            Close
          </Button>

          {!log.reviewedAt ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleReview}
              loading={isSubmitting}
              className="cursor-pointer text-xs font-semibold rounded-[2px]"
            >
              <Check size={16} weight="bold" className="mr-1.5" />
              <span>Mark as Reviewed</span>
            </Button>
          ) : (
            <span className="text-xs font-sans text-emerald-400 flex items-center gap-1">
              <ShieldCheck size={16} weight="fill" />
              <span>Audit Completed</span>
            </span>
          )}
        </div>
      </div>
    </Modal>
  );
};
