"use client";

import React, { useState } from "react";
import {
  Modal,
  Button,
  Toast,
  Label,
  Textarea,
} from "@repo/ui";
import { Trash, Info, CircleNotch, PaperPlaneRight } from "@phosphor-icons/react";
import { requestStudyDeletionAction } from "@/features/projects/actions";

export interface RequestStudyDeletionModalProps {
  open: boolean;
  onClose: () => void;
  study: {
    id: string;
    rawId?: string;
    intakeId?: string;
    title: string;
  } | null;
  onRequested?: () => void;
}

const CLIENT_REASONS = [
  "Research project cancelled or no longer proceeding",
  "Accidental or duplicate submission",
  "Data privacy or institutional clearance constraint",
  "Filing error in scope or methodological requirements",
  "Other reason",
];

export function RequestStudyDeletionModal({
  open,
  onClose,
  study,
  onRequested,
}: RequestStudyDeletionModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(CLIENT_REASONS[0] || "");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description: string;
    variant: "success" | "danger" | "warning" | "info";
  } | null>(null);

  if (!study) return null;

  const studyCode = study.intakeId || study.rawId || study.id;

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await requestStudyDeletionAction({
        projectId: (study.rawId || study.id) as string,
        reason: selectedReason,
        notes: notes.trim() || undefined,
      });

      if (!res.success) {
        const errorMsg =
          typeof res.error === "string"
            ? res.error
            : res.error?.message || "Could not submit deletion request.";
        setToastMessage({
          variant: "danger",
          message: "Request Failed",
          description: errorMsg,
        });
        setIsSubmitting(false);
        return;
      }

      setToastMessage({
        variant: "success",
        message: "Deletion Request Sent",
        description: `Your request to delete study ${studyCode} was routed to the administration team.`,
      });

      setTimeout(() => {
        setIsSubmitting(false);
        onRequested?.();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setToastMessage({
        variant: "danger",
        message: "Submission Error",
        description: errorMsg,
      });
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={isSubmitting ? () => {} : onClose}
        size="md"
        title={
          <div className="flex items-center gap-2 text-white">
            <Trash size={18} weight="fill" className="text-amber-400 shrink-0" />
            <span className="font-sans font-bold text-base">Request Study Deletion</span>
          </div>
        }
        description={`Study: ${studyCode} — ${study.title}`}
        footer={
          <div className="flex items-center justify-between gap-3 w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="font-sans text-xs font-semibold rounded-[2px]"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="font-sans text-xs font-semibold rounded-[2px] bg-[#CC6600] hover:bg-[#B35500] text-white flex items-center gap-2 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <CircleNotch size={14} className="animate-spin text-white" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <PaperPlaneRight size={14} weight="fill" />
                  <span>Submit Deletion Request</span>
                </>
              )}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5 text-sm font-sans">
          {/* Informational Guidance Notice */}
          <div className="rounded-[2px] bg-amber-500/10 border border-amber-500/20 p-3.5 flex items-start gap-3">
            <Info size={18} weight="fill" className="text-amber-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1 text-xs text-white/80">
              <span className="font-semibold text-white">Admin &amp; Leadership Review</span>
              <p className="leading-relaxed text-white/70">
                To safeguard active research and contractual commitments, study deletion requests are reviewed by our administration team. Once verified, files and data will be permanently wiped.
              </p>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-white/70 uppercase tracking-wider">
              Reason for Request
            </Label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              disabled={isSubmitting}
              className="bg-[#01142B] border border-white/15 text-white text-xs rounded-[2px] px-3 py-2 outline-none focus:border-[#CC6600]"
            >
              {CLIENT_REASONS.map((r) => (
                <option key={r} value={r} className="bg-[#01142B] text-white">
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Notes / Details */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-white/70 uppercase tracking-wider">
              Additional Details (Optional)
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide any additional details or instructions for our administration team..."
              disabled={isSubmitting}
              rows={3}
              className="bg-[#01142B] border-white/15 text-white text-xs rounded-[2px] resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Global Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          description={toastMessage.description}
          variant={toastMessage.variant}
          onClose={() => setToastMessage(null)}
        />
      )}
    </>
  );
}
