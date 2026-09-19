"use client";

import React, { useState } from "react";
import {
  Modal,
  Button,
  Toast,
  Checkbox,
  Label,
  Input,
  Textarea,
} from "@repo/ui";
import { Trash, Warning, CircleNotch, ShieldCheck } from "@phosphor-icons/react";
import { deleteStudyAction } from "@/features/projects/actions";

export interface DeleteStudyDialogProps {
  open: boolean;
  onClose: () => void;
  study: {
    id: string;
    rawId?: string;
    title: string;
    client?: string;
    intakeId?: string;
  } | null;
  onDeleted?: (deletedId: string) => void;
}

const COMMON_REASONS = [
  "Client requested cancellation & data erasure",
  "Duplicate submission or submission error",
  "Data retention policy expired",
  "Testing / Sandbox project cleanup",
  "Incorrect client or study filing parameters",
  "Other operational reason",
];

export function DeleteStudyDialog({
  open,
  onClose,
  study,
  onDeleted,
}: DeleteStudyDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>(COMMON_REASONS[0] || "");
  const [customExplanation, setCustomExplanation] = useState("");
  const [purgeFiles, setPurgeFiles] = useState(true);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description: string;
    variant: "success" | "danger" | "warning" | "info";
  } | null>(null);

  if (!study) return null;

  const studyCode = study.intakeId || study.rawId || study.id;
  const isConfirmed = confirmText.trim().toUpperCase() === "DELETE";

  const handleDelete = async () => {
    if (!isConfirmed || isDeleting) return;

    setIsDeleting(true);
    try {
      const fullReason =
        selectedReason === "Other operational reason" && customExplanation.trim()
          ? customExplanation.trim()
          : customExplanation.trim()
          ? `${selectedReason}: ${customExplanation.trim()}`
          : selectedReason;

      const res = await deleteStudyAction({
        projectId: (study.rawId || study.id) as string,
        reason: fullReason,
        purgeFiles,
      });

      if (!res.success) {
        const errorMsg =
          typeof res.error === "string"
            ? res.error
            : res.error?.message || "Failed to delete the study. Please try again.";
        setToastMessage({
          variant: "danger",
          message: "Deletion Failed",
          description: errorMsg,
        });
        setIsDeleting(false);
        return;
      }

      setToastMessage({
        variant: "success",
        message: "Study Permanently Deleted",
        description: `Study ${studyCode} and its linked records have been removed. An immutable snapshot was archived for CEO review.`,
      });

      setTimeout(() => {
        setIsDeleting(false);
        onDeleted?.(study.intakeId || study.id);
        onClose();
      }, 1000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setToastMessage({
        variant: "danger",
        message: "Deletion Error",
        description: errorMsg,
      });
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={isDeleting ? () => {} : onClose}
        size="md"
        title={
          <div className="flex items-center gap-2.5 text-red-400">
            <Trash size={20} weight="fill" className="text-red-400 shrink-0" />
            <span className="font-sans font-bold text-base text-white">Delete Study Permanently</span>
          </div>
        }
        description={`Target: ${studyCode} — ${study.title}`}
        footer={
          <div className="flex items-center justify-between gap-3 w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isDeleting}
              className="font-sans text-xs font-semibold rounded-[2px]"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={!isConfirmed || isDeleting}
              onClick={handleDelete}
              className="font-sans text-xs font-semibold rounded-[2px] bg-red-600 hover:bg-red-500 text-white flex items-center gap-2 shadow-sm"
            >
              {isDeleting ? (
                <>
                  <CircleNotch size={14} className="animate-spin text-white" />
                  <span>Deleting Study...</span>
                </>
              ) : (
                <>
                  <Trash size={14} weight="fill" />
                  <span>Delete Permanently</span>
                </>
              )}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5 text-sm font-sans">
          {/* Warning Banner */}
          <div className="rounded-[2px] bg-red-500/10 border border-red-500/20 p-3.5 flex items-start gap-3">
            <Warning size={20} weight="fill" className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1 text-xs text-white/80">
              <span className="font-semibold text-white">This action cannot be undone</span>
              <p className="leading-relaxed text-white/70">
                All associated records (SOW, deliverables, QA evaluations, messages, and ledger entries) will be permanently purged from the active system. An immutable backup snapshot is archived in the CEO Audit Ledger.
              </p>
            </div>
          </div>

          {/* Study Summary pill */}
          <div className="rounded-[2px] bg-[#01142B] border border-white/10 p-3 flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between text-white/50">
              <span>Study Identifier</span>
              <span className="font-mono text-white font-semibold">{studyCode}</span>
            </div>
            {study.client && (
              <div className="flex items-center justify-between text-white/50">
                <span>Lead Researcher</span>
                <span className="text-white font-medium">{study.client}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-white/50">
              <span>Audit Protection</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck size={13} weight="fill" />
                Snapshot preserved in CEO Ledger
              </span>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-white/70 uppercase tracking-wider">
              Reason for Deletion
            </Label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              disabled={isDeleting}
              className="bg-[#01142B] border border-white/15 text-white text-xs rounded-[2px] px-3 py-2 outline-none focus:border-[#CC6600]"
            >
              {COMMON_REASONS.map((r) => (
                <option key={r} value={r} className="bg-[#01142B] text-white">
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Additional Notes */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-white/70 uppercase tracking-wider">
              Administrative Notes &amp; Context
            </Label>
            <Textarea
              value={customExplanation}
              onChange={(e) => setCustomExplanation(e.target.value)}
              placeholder="Provide background context or compliance reference (optional)..."
              disabled={isDeleting}
              rows={2}
              className="bg-[#01142B] border-white/15 text-white text-xs rounded-[2px] resize-none"
            />
          </div>

          {/* Storage Purge Option */}
          <div className="flex items-start gap-3 p-3 rounded-[2px] bg-[#01142B] border border-white/10">
            <Checkbox
              id="purgeFilesCheckbox"
              checked={purgeFiles}
              onCheckedChange={(checked) => setPurgeFiles(checked === true)}
              disabled={isDeleting}
              className="mt-0.5"
            />
            <div className="flex flex-col gap-0.5">
              <label
                htmlFor="purgeFilesCheckbox"
                className="text-xs font-semibold text-white cursor-pointer select-none"
              >
                Purge all files from cloud storage (Cloudflare R2)
              </label>
              <p className="text-[11px] text-white/50 leading-normal">
                Sweeps and permanently erases raw datasets, scripts, deliverables, and review attachments from the cloud bucket.
              </p>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-white/10">
            <Label className="text-xs text-white/70 font-sans">
              To confirm permanent deletion, type <strong className="font-mono text-red-400 font-bold">DELETE</strong> in the box below:
            </Label>
            <Input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              disabled={isDeleting}
              className="bg-[#01142B] border-white/15 font-mono text-xs text-white rounded-[2px] placeholder:text-white/20"
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
