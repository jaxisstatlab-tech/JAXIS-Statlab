"use client";

import React, { useEffect, useState } from "react";
import { Modal, Button } from "@repo/ui";
import { Warning } from "@phosphor-icons/react";
import { flagScopeCreep } from "../actions";

// "Flag extra work": the client asked for more than the agreement covers. The study goes on hold while an admin
// prices the extra work with the client.

interface ScopeCreepModalProps {
  projectId: string;
  projectTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const REASONS = [
  {
    label: "New questions or hypotheses",
    text: "The client or adviser added research questions or hypotheses that aren't in the signed agreement.",
  },
  {
    label: "A harder method",
    text: "The study now needs a more advanced method (for example SEM, multilevel models or time series) than the agreed package covers.",
  },
  {
    label: "New data after we started",
    text: "The client sent a new or very different data file with new variables after the cleaning and first runs were done.",
  },
  {
    label: "Extra subgroup tests",
    text: "The client asked for mediation, moderation or subgroup tests that aren't in the agreement.",
  },
];

export const ScopeCreepModal: React.FC<ScopeCreepModalProps> = ({ projectId, projectTitle, isOpen, onClose, onSuccess }) => {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setReason("");
    setError(null);
  }, [isOpen]);

  const send = async () => {
    const text = reason.trim();
    if (text.length < 10) return setError("Say what the extra work is (at least 10 characters).");
    setBusy(true);
    setError(null);
    try {
      const res = await flagScopeCreep({ projectId, flagReason: text });
      if (res.success) {
        onSuccess();
        onClose();
      } else setError(res.error?.message || "Couldn't flag it. Please try again.");
    } catch {
      setError("Couldn't flag it. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={() => (busy ? undefined : onClose())}
      title="Flag extra work"
      description={projectTitle}
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={send} loading={busy} disabled={reason.trim().length < 10} className="active:scale-[0.97]">
            Put Study on Hold
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 font-sans">
        <p className="text-[13px] leading-relaxed text-white/60">
          Use this when the client asks for more than the agreement covers. The study goes on hold and uploads lock. An admin
          prices the extra work with the client, and you continue once that&apos;s settled.
        </p>

        <div className="flex flex-col gap-2">
          <p className="text-[12px] font-medium text-white/45">Common reasons</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {REASONS.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => {
                  setReason(r.text);
                  setError(null);
                }}
                className={`rounded-[2px] border px-3 py-2 text-left text-[13px] transition-colors ${
                  reason === r.text ? "border-white/30 bg-white/[0.05] text-white" : "border-white/10 text-white/70 hover:border-white/25 hover:text-white"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
          What is the extra work?
          <textarea
            rows={4}
            maxLength={2000}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            disabled={busy}
            placeholder="What did the client or adviser ask for that isn't in the agreement?"
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
