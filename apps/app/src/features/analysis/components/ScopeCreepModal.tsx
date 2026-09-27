"use client";

import React, { useState } from "react";
import { Modal, Button } from "@repo/ui";
import { IconAlertTriangle, IconPlayerPause, IconFileText } from "@tabler/icons-react";
import { flagScopeCreep } from "../actions";

interface ScopeCreepModalProps {
  projectId: string;
  projectTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SCOPE_CREEP_TEMPLATES = [
  {
    label: "Additional Hypotheses or Research Questions",
    text: "The client / research adviser has requested additional hypotheses and test objectives that were not included in the signed Scope of Work (SOW).",
  },
  {
    label: "Advanced Modeling Upgrade (SEM / ML / Time-Series)",
    text: "The analytical scope now requires Structural Equation Modeling (SEM) or multi-level econometric modeling beyond the agreed descriptive and regression package.",
  },
  {
    label: "Dataset Overhaul / Re-collection After Analysis Started",
    text: "The client submitted a completely overhauled dataset with new variables after initial cleaning and baseline computations were already executed.",
  },
  {
    label: "Complex Sub-Group Moderation / Mediation Testing",
    text: "Client requested comprehensive multi-tier mediation and moderation pathway analyses across demographic subgroups not specified in the original SOW.",
  },
];

export const ScopeCreepModal: React.FC<ScopeCreepModalProps> = ({
  projectId,
  projectTitle,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 10) {
      setErrorMessage("Please provide a detailed explanation (at least 10 characters).");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await flagScopeCreep({ projectId, flagReason: reason.trim() });
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.error?.message || "Failed to flag scope creep.");
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
        <div className="flex items-center gap-2 text-amber-400">
          <IconAlertTriangle size={20} stroke={2} />
          <span>Flag Scope Expansion (RULE_QUO_03)</span>
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
            variant="danger"
            size="sm"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!reason.trim() || reason.trim().length < 10 || isSubmitting}
            className="rounded-[2px] text-xs font-semibold px-4 gap-1.5"
          >
            <IconPlayerPause size={14} stroke={2} />
            <span>Halt Work &amp; Request Supplemental Quote</span>
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm font-sans">
        <div className="p-3.5 bg-amber-950/40 border border-amber-500/30 rounded-[2px] text-xs text-amber-200 leading-relaxed">
          <span className="font-semibold block mb-1 text-amber-300">
            Institutional Scope Protection Policy:
          </span>
          Flagging scope expansion immediately halts statistical work and transitions the study to{" "}
          <strong className="text-white font-mono">SCOPE_CREEP_HALTED</strong>. Administration will inspect the
          request and issue a Supplemental Quotation for client approval.
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-[2px] text-xs text-red-200">
            {errorMessage}
          </div>
        )}

        {/* Templates */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-mono text-white/50 uppercase tracking-wider">
            Quick Scope Reason Templates:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SCOPE_CREEP_TEMPLATES.map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setReason(tmpl.text);
                  setErrorMessage(null);
                }}
                className="p-2.5 rounded-[2px] bg-[#0A0A18] border border-white/10 hover:border-amber-500/40 text-left text-xs text-white/80 hover:text-white transition-colors cursor-pointer flex items-start gap-2"
              >
                <IconFileText size={14} stroke={1.5} className="text-amber-400 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{tmpl.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reason Textarea */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-white/80">
            Scope Expansion Details &amp; Additional Requirements: <span className="text-red-400">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setErrorMessage(null);
            }}
            placeholder="Describe the additional statistical objectives, datasets, or modeling requirements requested by the client or panel..."
            rows={4}
            maxLength={2000}
            disabled={isSubmitting}
            className="w-full p-3 bg-[#0A0A18] border border-white/15 rounded-[2px] text-xs text-white placeholder:text-white/30 focus:border-amber-500 focus:outline-none transition-colors resize-none font-sans"
          />
          <div className="flex justify-between text-[0.688rem] text-white/40 font-mono">
            <span>Minimum 10 characters required</span>
            <span>{reason.length} / 2000</span>
          </div>
        </div>
      </form>
    </Modal>
  );
};
