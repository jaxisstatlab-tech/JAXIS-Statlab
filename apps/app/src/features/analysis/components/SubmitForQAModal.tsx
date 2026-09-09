"use client";

import React, { useState } from "react";
import { Modal, Button } from "@repo/ui";
import { IconCheck, IconShieldCheck, IconSend, IconAlertCircle } from "@tabler/icons-react";
import { submitForQA } from "../actions";

interface SubmitForQAModalProps {
  projectId: string;
  projectTitle: string;
  filesCount: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const QA_CHECKLIST_ITEMS = [
  "All statistical objectives specified in the signed SOW have been analyzed.",
  "Client Results & Discussion document (PDF or Word) is uploaded.",
  "Reproducible analysis script (RMD, R, Python, SPSS, or Stata) or calculation workbook is uploaded.",
  "Statistical results are formatted to standard scientific/APA guidelines.",
];

export const SubmitForQAModal: React.FC<SubmitForQAModalProps> = ({
  projectId,
  projectTitle,
  filesCount,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleCheck = (idx: number) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const allChecked = QA_CHECKLIST_ITEMS.every((_, idx) => Boolean(checkedItems[idx]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allChecked) {
      setErrorMessage("Please complete all verification checklist items before submitting.");
      return;
    }
    if (filesCount === 0) {
      setErrorMessage("Please upload at least one current analysis output file before submitting.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await submitForQA({ projectId, notes: notes.trim() });
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.error?.message || "Failed to submit work for QA.");
      }
    } catch {
      setErrorMessage("An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-[#38BDF8]">
          <IconShieldCheck size={20} stroke={2} />
          <span>Submit Analysis for Senior QA Evaluation</span>
        </div>
      }
      description={`Study: ${projectTitle}`}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-[2px] text-xs"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!allChecked || filesCount === 0 || isSubmitting}
            className="rounded-[2px] text-xs font-semibold px-4 gap-1.5 cursor-pointer"
          >
            <IconSend size={14} stroke={2} />
            <span>Submit for QA Review</span>
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm font-sans">
        <div className="p-3.5 bg-[#011B38] border border-sky-500/30 rounded-[2px] text-xs text-sky-200 leading-relaxed">
          <span className="font-semibold block mb-1 text-white">Quality Assurance Handoff Protocol:</span>
          Submitting advances this study to <strong className="text-white font-mono">FOR_QA</strong>. Workbench
          file uploads will be locked while the assigned Senior QA Lead performs mathematical and methodological
        </div>

        {filesCount < 2 && (
          <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-[2px] text-xs text-amber-200/90 leading-relaxed">
            <span className="font-semibold text-amber-300 block mb-0.5">Required Submission Assets:</span>
            Senior QA evaluation requires at least 2 files: <strong>(1) Client Results &amp; Discussion document</strong>, and <strong>(2) Reproducible Script File (RMD, R, Python, SPSS, or Stata)</strong>. You currently have {filesCount} file attached.
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-[2px] text-xs text-red-200 flex items-start gap-2">
            <IconAlertCircle size={16} stroke={2} className="text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Verification Checklist */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-mono text-white/50 uppercase tracking-wider">
            Pre-Submission Quality Checklist ({Object.values(checkedItems).filter(Boolean).length} /{" "}
            {QA_CHECKLIST_ITEMS.length}):
          </span>
          <div className="flex flex-col gap-2">
            {QA_CHECKLIST_ITEMS.map((item, idx) => {
              const isChecked = Boolean(checkedItems[idx]);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleCheck(idx)}
                  className={`p-3 rounded-[2px] border text-left text-xs transition-colors flex items-start gap-2.5 cursor-pointer ${
                    isChecked
                      ? "bg-emerald-950/30 border-emerald-500/40 text-white"
                      : "bg-[#01142B] border-white/10 text-white/70 hover:text-white"
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-[2px] shrink-0 mt-0.5 flex items-center justify-center border transition-colors ${
                      isChecked
                        ? "bg-emerald-600 border-emerald-500 text-white"
                        : "border-white/30 bg-transparent"
                    }`}
                  >
                    {isChecked && <IconCheck size={12} stroke={3} />}
                  </div>
                  <span className="leading-relaxed">{item}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes for QA Lead */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-white/80">
            Notes &amp; Methodological Remarks for QA Lead (Optional):
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Highlight any specific transformations, outlier treatments, or notes on packages used..."
            rows={3}
            maxLength={2000}
            disabled={isSubmitting}
            className="w-full p-3 bg-[#01142B] border border-white/15 rounded-[2px] text-xs text-white placeholder:text-white/30 focus:border-[#38BDF8] focus:outline-none transition-colors resize-none font-sans"
          />
        </div>
      </form>
    </Modal>
  );
};
