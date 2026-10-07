"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Button, Modal } from "@repo/ui";
import { Warning } from "@phosphor-icons/react";
import { requestLeave } from "@/features/staff/actions";
import { clientPackageName } from "@/features/projects/client-packages";
import { Panel, PanelBody } from "@/components/dashboard/Panel";
import type { AssignmentDetailItem } from "../schemas";

// Pieces shared by the analyst's "My Studies" and the reviewer's "Review Desk": due dates in plain words, the
// study details window, and asking for leave.

type Study = AssignmentDetailItem;
export type LeaveData = { reason?: string | null; until?: string | null } | null;

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

export const FIELD =
  "w-full rounded-[2px] border border-white/10 bg-[#050513] font-sans text-[13px] text-white outline-none placeholder:text-white/30 focus:border-[#CC6600]/60";

/** Delivered (or a claim opened after delivery) and stopped studies; their deadline no longer runs. */
export const DONE_STATUSES = ["DELIVERED", "CLOSED", "DISPUTED"];
export const STOPPED_STATUSES = ["CANCELLED", "EXPIRED", "HALTED", "ETHICAL_BREACH"];

export function shortDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric" });
}

export const pauseRequested = (s: Study) => Boolean(s.slaPauseReason) && !s.slaPausedAt;

const FILE_KIND: Record<string, string> = {
  DATASET: "Data file",
  RESEARCH_DOCUMENT: "Paper or document",
  QUESTIONNAIRE: "Questionnaire",
};

/** "Late by 2 days" / "Due in 5h" (with an orange dot), "Due Oct 12 · in 6 days", "Delivered Oct 1", "Paused". */
export function DueText({ s }: { s: Study }) {
  if (DONE_STATUSES.includes(s.masterStatus)) return <span className="text-white/50">Delivered {shortDate(s.deliveredAt)}</span>;
  if (STOPPED_STATUSES.includes(s.masterStatus)) return <span className="text-white/35">—</span>;
  if (s.masterStatus === "REVISION_REQUESTED") return <span className="text-white/60">No new due date</span>;
  if (s.isPaused) return <span className="text-white/60">Paused</span>;
  const diff = new Date(s.slaDueAt).getTime() - Date.now();
  if (s.isOverdue) {
    const days = Math.max(0, Math.floor(-diff / DAY));
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-white">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#CC6600]" aria-hidden="true" />
        {days === 0 ? "Due today, late" : `Late by ${days} ${days === 1 ? "day" : "days"}`}
      </span>
    );
  }
  if (s.isUrgent) {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-white">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#CC6600]" aria-hidden="true" />
        Due in {Math.max(1, Math.round(diff / HOUR))}h
      </span>
    );
  }
  const days = Math.ceil(diff / DAY);
  return (
    <span className="text-white/75">
      Due {shortDate(s.slaDueAt)}
      <span className="text-white/40">
        {" "}
        · in {days} {days === 1 ? "day" : "days"}
      </span>
    </span>
  );
}

/** Everything about one study in a window: stage, due, the other person on it, the client's questions and files. */
export function StudyDetailsModal({
  study: s,
  stage,
  person,
  footer,
  onClose,
}: {
  study: Study | null;
  stage: string;
  /** The other team member on the study, e.g. ["Reviewer", "Maria Lim"]. */
  person: [string, string];
  footer: React.ReactNode;
  onClose: () => void;
}) {
  if (!s) return null;
  const section = (title: string, text?: string | null) => (
    <div>
      <p className="text-[12px] font-medium text-white/45">{title}</p>
      <p className={`mt-1 whitespace-pre-line text-[13px] leading-relaxed ${text?.trim() ? "text-white/80" : "text-white/35"}`}>
        {text?.trim() || "Not given"}
      </p>
    </div>
  );
  const facts: Array<[string, React.ReactNode]> = [
    ["Stage", stage],
    ["Due", <DueText key="due" s={s} />],
    person,
    ["Package", clientPackageName(s.packageName) ?? "—"],
    ["Program", s.projectField || "—"],
  ];
  return (
    <Modal open onClose={onClose} title={s.projectIntakeId} description={s.projectTitle} size="lg" footer={footer}>
      <div className="flex flex-col gap-5 font-sans">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-[2px] border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 sm:grid-cols-3">
          {facts.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[12px] text-white/45">{label}</dt>
              <dd className="mt-0.5 truncate text-[13px] text-white">{value}</dd>
            </div>
          ))}
        </dl>
        {section("Statement of the problem", s.researchQuestions)}
        {section("Hypotheses", s.hypotheses)}
        {section("What the study wants to find out", s.researchObjectives)}
        <div>
          <p className="text-[12px] font-medium text-white/45">Files from the client</p>
          {s.files && s.files.length > 0 ? (
            <ul className="mt-1.5 divide-y divide-white/[0.05] rounded-[2px] border border-white/[0.08]">
              {s.files.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13px]">
                  <span className="min-w-0 truncate text-white/85">{f.fileName}</span>
                  <span className="shrink-0 text-[12px] text-white/45">{FILE_KIND[f.fileCategory] ?? "File"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[13px] text-white/35">No files yet. Open the study to see everything.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

/** "Waiting for approval" (Cancel Request) or "You're on leave" (I'm Back). */
export function LeaveNotice({ status, leave, busy, onAction }: { status: string; leave: LeaveData; busy: boolean; onAction: () => void }) {
  const pending = status === "LEAVE_PENDING";
  const back = leave?.until ? new Date(leave.until).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : null;
  return (
    <Panel as="div">
      <PanelBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#CC6600]" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">{pending ? "Your leave request is waiting for approval" : "You're on leave"}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-white/60">
              {pending
                ? "Finance (HR) or an admin will approve it. Until then you stay available for new studies."
                : "Admins won't give you new studies until you're back."}
              {back ? ` Back on ${back}.` : ""}
            </p>
            {leave?.reason ? <p className="mt-1 text-[13px] text-white/45">&ldquo;{leave.reason}&rdquo;</p> : null}
          </div>
        </div>
        <Button variant={pending ? "outline" : "primary"} size="sm" onClick={onAction} loading={busy} className="shrink-0 active:scale-[0.97]">
          {pending ? "Cancel Request" : "I'm Back"}
        </Button>
      </PanelBody>
    </Panel>
  );
}

const LEAVE_REASONS = [
  { label: "Vacation or rest", text: "Taking vacation leave to rest. My open studies can be checked with my teammate." },
  { label: "Sick leave", text: "On sick leave to recover. I'll pick up my studies when I'm well." },
  { label: "Family emergency", text: "A family emergency needs my attention. My return date is below." },
  { label: "Thesis defense or school duty", text: "Busy with a thesis defense or school duty, so I can't take new studies during this time." },
  { label: "Fieldwork", text: "Away for research fieldwork. I'll continue when I'm back." },
];

function localDay(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "Request leave": reason (with common ones to pick), first day off and return date. */
export function LeaveDialog({ open, onClose, onSent }: { open: boolean; onClose: () => void; onSent: (reason: string, until: string | null) => void }) {
  const [reason, setReason] = useState("");
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    setReason("");
    setFrom(localDay(0));
    setUntil(localDay(1));
    setError(null);
  }, [open]);

  if (!open) return null;
  const today = localDay(0);
  const startInPast = Boolean(from && from < today);
  const backBeforeStart = Boolean(from && until && until < from);
  const days = from && until && !backBeforeStart ? Math.max(1, Math.round((new Date(until).getTime() - new Date(from).getTime()) / DAY)) : null;

  const changeFrom = (v: string) => {
    setFrom(v);
    setError(null);
    // Keep the return date after the first day off.
    if (until && until < v) {
      const next = new Date(v);
      next.setDate(next.getDate() + 1);
      setUntil(next.toISOString().split("T")[0]!);
    }
  };

  const send = () => {
    const text = reason.trim();
    if (!text) return setError("Say why you need leave.");
    if (startInPast) return setError("The first day off can't be in the past.");
    if (backBeforeStart) return setError("The return date can't be before the first day off.");
    setError(null);
    start(async () => {
      const res = await requestLeave({
        reason: text,
        leaveFrom: from ? new Date(from).toISOString() : undefined,
        leaveUntil: until ? new Date(until).toISOString() : undefined,
      });
      if (res.success) onSent(text, until ? new Date(until).toISOString() : null);
      else setError(res.error?.message || "Couldn't send the request. Please try again.");
    });
  };

  const dateField = (bad: boolean) => `${FIELD} h-9 px-3 font-mono [color-scheme:dark] ${bad ? "border-red-500/60" : ""}`;

  return (
    <Modal
      open
      onClose={() => (busy ? undefined : onClose())}
      title="Request leave"
      description="Ask for time off. While you're on leave, admins won't give you new studies."
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={send} loading={busy} className="active:scale-[0.97]">
            Send Request
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 font-sans">
        <p className="text-[13px] leading-relaxed text-white/60">Finance (HR) or an admin approves it. Until then you stay available for new studies.</p>
        <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
          Reason
          <select
            value={LEAVE_REASONS.find((t) => t.text === reason)?.text ?? ""}
            onChange={(e) => e.target.value && setReason(e.target.value)}
            className={`${FIELD} h-9 cursor-pointer px-2.5 [&>option]:bg-[#0A0A18]`}
          >
            <option value="">Pick a common reason (optional)</option>
            {LEAVE_REASONS.map((t) => (
              <option key={t.label} value={t.text}>
                {t.label}
              </option>
            ))}
          </select>
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Or write your own" className={`${FIELD} resize-none p-3`} />
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
            First day off
            <input type="date" min={today} value={from} onChange={(e) => changeFrom(e.target.value)} className={dateField(startInPast)} />
            {startInPast ? <span className="text-[12px] text-red-300">Can&apos;t be in the past.</span> : null}
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
            <span className="flex items-center justify-between">
              Back on
              {days !== null ? (
                <span className="font-mono text-[12px] text-white/45">
                  {days} {days === 1 ? "day" : "days"}
                </span>
              ) : null}
            </span>
            <input
              type="date"
              min={from || today}
              value={until}
              onChange={(e) => {
                setUntil(e.target.value);
                setError(null);
              }}
              className={dateField(backBeforeStart)}
            />
            {backBeforeStart ? <span className="text-[12px] text-red-300">Can&apos;t be before the first day off.</span> : null}
          </label>
        </div>
        {error ? (
          <p role="alert" className="flex items-start gap-2 text-[13px] text-red-300">
            <Warning size={15} weight="fill" className="mt-0.5 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
