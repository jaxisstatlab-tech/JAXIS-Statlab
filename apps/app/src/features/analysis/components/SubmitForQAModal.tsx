"use client";

import React, { useEffect, useState } from "react";
import { Modal, Button } from "@repo/ui";
import { Check, Warning } from "@phosphor-icons/react";
import { submitForQA } from "../actions";

// "Send for review": a short self-check, an optional note for the reviewer, then the study goes to them.

interface SubmitForQAModalProps {
  projectId: string;
  projectTitle: string;
  reviewerName: string | null;
  /** What's still missing (from missingForReview); sending is off until it's empty. */
  missing: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CHECKS = [
  "Every question in the agreement is answered.",
  "The write-up matches the numbers in the output.",
  "Tables and write-up follow APA 7.",
  "The code runs from start to finish and gives the same results.",
];

export const SubmitForQAModal: React.FC<SubmitForQAModalProps> = ({ projectId, projectTitle, reviewerName, missing, isOpen, onClose, onSuccess }) => {
  const [checked, setChecked] = useState<boolean[]>(CHECKS.map(() => false));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setChecked(CHECKS.map(() => false));
    setNotes("");
    setError(null);
  }, [isOpen]);

  const allChecked = checked.every(Boolean);
  const reviewer = reviewerName || "your reviewer";

  const send = async () => {
    if (missing.length > 0) return setError(`Add ${missing.join(" and ")} first.`);
    if (!allChecked) return setError("Tick each check first.");
    setBusy(true);
    setError(null);
    try {
      const res = await submitForQA({ projectId, notes: notes.trim() || undefined });
      if (res.success) {
        onSuccess();
        onClose();
      } else setError(res.error?.message || "Couldn't send it. Please try again.");
    } catch {
      setError("Couldn't send it. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={() => (busy ? undefined : onClose())}
      title="Send for review"
      description={projectTitle}
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={send} loading={busy} disabled={!allChecked || missing.length > 0} className="active:scale-[0.97]">
            Send to {reviewerName ? reviewerName.split(" ")[0] : "Reviewer"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 font-sans">
        <p className="text-[13px] leading-relaxed text-white/60">
          Your current files go to {reviewer}. Uploads are locked until they answer; if they ask for changes, you can upload again.
        </p>

        {missing.length > 0 ? (
          <p className="rounded-[2px] border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-[13px] text-white/75">Still needed: {missing.join(" and ")}.</p>
        ) : null}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[12px] font-medium text-white/45">Before you send</legend>
          {CHECKS.map((label, i) => (
            <label
              key={label}
              className={`flex cursor-pointer items-start gap-2.5 rounded-[2px] border px-3.5 py-2.5 text-[13px] transition-colors ${
                checked[i] ? "border-white/25 bg-white/[0.04] text-white" : "border-white/10 text-white/70 hover:border-white/20"
              }`}
            >
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={() => setChecked((all) => all.map((v, j) => (j === i ? !v : v)))}
                className="sr-only"
              />
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] border ${checked[i] ? "border-[#CC6600] bg-[#CC6600] text-white" : "border-white/30"}`}
                aria-hidden="true"
              >
                {checked[i] ? <Check size={10} weight="bold" /> : null}
              </span>
              {label}
            </label>
          ))}
        </fieldset>

        <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
          Note for {reviewer} (optional)
          <textarea
            rows={3}
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={busy}
            placeholder="For example: outliers above 3 SD were removed; the scale was reverse-coded first"
            className="w-full resize-none rounded-[2px] border border-white/10 bg-[#050513] p-3 text-[13px] text-white outline-none placeholder:text-white/30 focus:border-[#CC6600]/60"
          />
        </label>

        {error ? (
          <p role="alert" className="flex items-start gap-2 text-[13px] text-red-300">
            <Warning size={15} weight="fill" className="mt-0.5 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
};
