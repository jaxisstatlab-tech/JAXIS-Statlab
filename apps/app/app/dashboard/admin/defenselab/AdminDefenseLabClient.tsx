"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, CopyButton, KpiCard, Modal, PageHeader, Peso, Toast } from "@repo/ui";
import { CalendarCheck, CheckCircle, LinkSimple, MagnifyingGlass, VideoCamera, Warning } from "@phosphor-icons/react";
import { PanelBody } from "@/components/dashboard/Panel";
import {
  applyDefenseLabPenalty,
  completeDefenseLabSession,
  updateDefenseLabMeetingLink,
  uploadDefenseLabRecording,
} from "@/features/defenselab/actions";
import type { DefenseLabSessionDTO } from "@/features/defenselab/schemas";

// DefenseLab for admins: practice defense sessions clients booked with their analyst. What needs doing comes first
// (a meeting link, marking a session done, a recording to add); each row has its next step.

type S = DefenseLabSessionDTO;
type Show = "TODO" | "UPCOMING" | "DONE" | "MISSED" | "ALL";
type Mode = "LINK" | "DONE" | "RECORDING" | "FEE";

const HOUR = 3_600_000;
const DAY = 86_400_000;
const OPEN = ["SCHEDULED", "RESCHEDULED"];
const STATUS: Record<string, string> = {
  SCHEDULED: "Booked",
  RESCHEDULED: "Moved",
  COMPLETED: "Done",
  NO_SHOW_CLIENT: "Missed (changed too late)",
  CANCELLED: "Cancelled",
  PENALTY_APPLIED: "Late-change fee",
};
const FIELD =
  "w-full rounded-[2px] border border-white/10 bg-[#050513] px-3 font-sans text-[13px] text-white outline-none placeholder:text-white/30 focus:border-[#CC6600]/60";

const when = (d: string) =>
  new Date(d).toLocaleString("en-PH", { timeZone: "Asia/Manila", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** The next step on a session, if any (so the page can sort and show one button). */
function nextStep(s: S, now: number): { mode: Mode; label: string } | null {
  const started = +new Date(s.scheduledAt) <= now;
  if (OPEN.includes(s.status) && started) return { mode: "DONE", label: "Mark Done" };
  if (OPEN.includes(s.status) && !s.meetingUrl) return { mode: "LINK", label: "Add Link" };
  if (s.status === "COMPLETED" && !s.recordingUrl) return { mode: "RECORDING", label: "Add Recording" };
  return null;
}

export function AdminDefenseLabClient({ sessions, failed = false }: { sessions: S[]; failed?: boolean }) {
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);
  const [show, setShow] = useState<Show>("TODO");
  const [q, setQ] = useState("");
  const [dialog, setDialog] = useState<{ mode: Mode; s: S } | null>(null);
  const [toast, setToast] = useState<{ message: string; description?: string; variant: "success" | "danger" } | null>(null);
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => setNow(Date.now()), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const t = now ?? 0;
  const counts = useMemo(() => {
    const todo = sessions.filter((s) => now !== null && nextStep(s, t)).length;
    return {
      todo,
      upcoming: sessions.filter((s) => OPEN.includes(s.status) && +new Date(s.scheduledAt) > t).length,
      noLink: sessions.filter((s) => OPEN.includes(s.status) && !s.meetingUrl).length,
      recordings: sessions.filter((s) => s.status === "COMPLETED" && !s.recordingUrl).length,
      done: sessions.filter((s) => s.status === "COMPLETED").length,
      missed: sessions.filter((s) => ["NO_SHOW_CLIENT", "PENALTY_APPLIED", "CANCELLED"].includes(s.status)).length,
      all: sessions.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, now]);

  // Open on Needs you only when something is there.
  const settled = useRef(false);
  useEffect(() => {
    if (settled.current || now === null) return;
    settled.current = true;
    if (counts.todo === 0) setShow(counts.upcoming ? "UPCOMING" : "ALL");
  }, [now, counts.todo, counts.upcoming]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return sessions
      .filter((s) => {
        if (show === "TODO") return now !== null && !!nextStep(s, t);
        if (show === "UPCOMING") return OPEN.includes(s.status) && +new Date(s.scheduledAt) > t;
        if (show === "DONE") return s.status === "COMPLETED";
        if (show === "MISSED") return ["NO_SHOW_CLIENT", "PENALTY_APPLIED", "CANCELLED"].includes(s.status);
        return true;
      })
      .filter((s) => !term || [s.projectTitle, s.projectIntakeId, s.clientName, s.expertName].join(" ").toLowerCase().includes(term))
      .sort((a, b) =>
        show === "UPCOMING" || show === "TODO" ? +new Date(a.scheduledAt) - +new Date(b.scheduledAt) : +new Date(b.scheduledAt) - +new Date(a.scheduledAt)
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, show, q, now]);

  const description = failed
    ? "The sessions didn't load. Refresh the page to try again."
    : counts.todo === 0
      ? counts.upcoming
        ? `Nothing needs you. ${counts.upcoming} ${counts.upcoming === 1 ? "session is" : "sessions are"} coming up.`
        : "Nothing needs you right now."
      : [
          counts.noLink ? `${counts.noLink} ${counts.noLink === 1 ? "session needs" : "sessions need"} a meeting link` : "",
          counts.recordings ? `${counts.recordings} ${counts.recordings === 1 ? "recording" : "recordings"} to add` : "",
        ]
          .filter(Boolean)
          .join(", ") || `${counts.todo} ${counts.todo === 1 ? "session needs" : "sessions need"} you.`;

  const tabs: Array<[Show, string, number]> = [
    ["TODO", "Needs you", counts.todo],
    ["UPCOMING", "Coming up", counts.upcoming],
    ["DONE", "Done", counts.done],
    ["MISSED", "Missed or cancelled", counts.missed],
    ["ALL", "All", counts.all],
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 font-sans animate-content-fade">
      <PageHeader
        title="DefenseLab"
        description={description}
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Admin", href: "/dashboard/admin" },
          { label: "DefenseLab" },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Coming up" description="Booked practice defenses" icon={<CalendarCheck size={18} weight="fill" />} value={counts.upcoming} />
        <KpiCard label="Need a meeting link" description="Booked, no video link yet" icon={<LinkSimple size={18} weight="fill" />} value={counts.noLink} />
        <KpiCard label="Recordings to add" description="Done, no recording link yet" icon={<VideoCamera size={18} weight="fill" />} value={counts.recordings} />
        <KpiCard label="Done" description="Practice defenses held" icon={<CheckCircle size={18} weight="fill" />} value={counts.done} />
      </div>

      <div className="overflow-hidden rounded-[2px] border border-white/[0.07] bg-[#0A0A18]">
        <div className="flex flex-col gap-3 border-b border-white/[0.07] px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Show">
            {tabs.map(([key, label, n]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={show === key}
                onClick={() => setShow(key)}
                className={`rounded-[2px] px-2.5 py-1.5 text-[13px] transition-colors ${
                  show === key ? "bg-white/[0.08] text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {label} <span className="font-mono text-[11px] text-white/40">{n}</span>
              </button>
            ))}
          </div>
          <label className="relative lg:w-[320px]">
            <MagnifyingGlass size={15} weight="bold" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              ref={search}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setQ("");
                  e.currentTarget.blur();
                }
              }}
              placeholder="Search client, analyst, study or ID"
              aria-label="Search sessions"
              className={`${FIELD} h-9 pl-9 pr-9`}
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-[2px] border border-white/15 px-1.5 font-mono text-[10px] text-white/45">/</kbd>
          </label>
        </div>

        {failed ? (
          <PanelBody className="flex items-center justify-between gap-4">
            <p className="text-[13px] text-white/60">The sessions didn&apos;t load.</p>
            <Button variant="outline" size="sm" onClick={() => router.refresh()}>
              Try Again
            </Button>
          </PanelBody>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <VideoCamera size={28} weight="fill" className="text-white/25" />
            <p className="mt-3 text-sm font-medium text-white">{sessions.length === 0 ? "No practice defenses booked yet" : show === "TODO" && !q ? "Nothing needs you" : "No sessions match"}</p>
            <p className="mt-1 max-w-md text-[13px] text-white/50">
              {sessions.length === 0
                ? "Clients with the DefenseLab add-on book sessions from their DefenseLab page. They show up here."
                : "Try another search or show all sessions."}
            </p>
            {sessions.length > 0 && (q || show !== "ALL") ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setQ("");
                  setShow("ALL");
                }}
              >
                Show All Sessions
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {rows.map((s) => {
              const step = now !== null ? nextStep(s, t) : null;
              const diff = now !== null ? +new Date(s.scheduledAt) - t : null;
              const rel =
                diff === null
                  ? ""
                  : Math.abs(diff) < HOUR
                    ? diff >= 0
                      ? "starting soon"
                      : "just started"
                    : Math.abs(diff) < DAY
                      ? diff >= 0
                        ? `in ${Math.round(diff / HOUR)}h`
                        : `${Math.round(-diff / HOUR)}h ago`
                      : diff >= 0
                        ? `in ${Math.round(diff / DAY)} days`
                        : `${Math.round(-diff / DAY)} days ago`;
              const open = OPEN.includes(s.status);
              const canFee = !s.penaltyApplied && ["SCHEDULED", "RESCHEDULED", "NO_SHOW_CLIENT"].includes(s.status);
              return (
                <li key={s.id} className="grid grid-cols-1 gap-3 px-5 py-4 sm:px-6 lg:grid-cols-[180px_minmax(0,1fr)_200px_auto] lg:items-center lg:gap-6">
                  <div>
                    <p className="text-[13px] font-medium text-white">{when(s.scheduledAt)}</p>
                    <p className="text-[12px] text-white/45">
                      {s.durationHours} {s.durationHours === 1 ? "hour" : "hours"}
                      {rel ? ` · ${rel}` : ""}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-white" title={s.projectTitle}>
                      {s.clientName} <span className="text-white/45">with</span> {s.expertName}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-white/45">
                      <CopyButton variant="badge" value={s.projectIntakeId} label={s.projectIntakeId} />
                      <span className="truncate">{s.projectTitle}</span>
                    </div>
                    {s.rescheduleReason ? <p className="mt-1 text-[12px] text-white/50">Moved: {s.rescheduleReason}</p> : null}
                    {s.penaltyApplied ? (
                      <p className="mt-1 text-[12px] text-white/50">
                        Fee{s.penaltyAmount ? (
                          <>
                            {" "}
                            <Peso />
                            {s.penaltyAmount.toLocaleString("en-PH")}
                          </>
                        ) : null}
                        : {s.penaltyReason}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-[12px]">
                    <p className={open || s.status === "COMPLETED" ? "text-white/85" : "text-white/50"}>
                      {step ? <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#CC6600] align-middle" aria-hidden="true" /> : null}
                      {STATUS[s.status] ?? s.status}
                    </p>
                    {open ? (
                      s.meetingUrl ? (
                        <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-white/55 underline-offset-2 hover:text-white hover:underline">
                          Meeting link
                        </a>
                      ) : (
                        <p className="text-white/40">No meeting link yet</p>
                      )
                    ) : s.recordingUrl ? (
                      <a href={s.recordingUrl} target="_blank" rel="noopener noreferrer" className="text-white/55 underline-offset-2 hover:text-white hover:underline">
                        Recording
                      </a>
                    ) : s.status === "COMPLETED" ? (
                      <p className="text-white/40">No recording yet</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                    {step ? (
                      <Button variant="primary" size="sm" onClick={() => setDialog({ mode: step.mode, s })} className="active:scale-[0.97]">
                        {step.label}
                      </Button>
                    ) : null}
                    {open && s.meetingUrl && step?.mode !== "LINK" ? (
                      <Button variant="ghost" size="sm" onClick={() => setDialog({ mode: "LINK", s })}>
                        Change Link
                      </Button>
                    ) : null}
                    {s.status === "COMPLETED" && s.recordingUrl ? (
                      <Button variant="ghost" size="sm" onClick={() => setDialog({ mode: "RECORDING", s })}>
                        Change Recording
                      </Button>
                    ) : null}
                    {canFee ? (
                      <Button variant="ghost" size="sm" onClick={() => setDialog({ mode: "FEE", s })}>
                        Charge Fee
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {dialog ? (
        <SessionDialog
          mode={dialog.mode}
          s={dialog.s}
          onClose={() => setDialog(null)}
          onDone={(message, description) => {
            setDialog(null);
            setToast({ message, description, variant: "success" });
            router.refresh();
          }}
        />
      ) : null}
      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

function SessionDialog({ mode, s, onClose, onDone }: { mode: Mode; s: S; onClose: () => void; onDone: (message: string, description?: string) => void }) {
  const [link, setLink] = useState(mode === "LINK" ? (s.meetingUrl ?? "") : (s.recordingUrl ?? ""));
  const [notes, setNotes] = useState(s.notes ?? "");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const titles: Record<Mode, string> = {
    LINK: s.meetingUrl ? "Change the meeting link" : "Add the meeting link",
    DONE: "Mark the session done",
    RECORDING: s.recordingUrl ? "Change the recording link" : "Add the recording",
    FEE: "Charge a late-change fee",
  };
  const help: Record<Mode, string> = {
    LINK: "Google Meet, Zoom or Teams. The client and the analyst are told.",
    DONE: "The client is told. Add the recording now or later.",
    RECORDING: "A link the client can open, like Google Drive or Dropbox. The client is told.",
    FEE: "For a session the client changed or missed too late. Kept in the activity log; once per session.",
  };
  const button: Record<Mode, string> = { LINK: "Save Link", DONE: "Mark Done", RECORDING: "Save Recording", FEE: "Charge Fee" };

  const submit = () => {
    setError(null);
    start(async () => {
      if (mode === "LINK") {
        const r = await updateDefenseLabMeetingLink({ sessionId: s.id, meetingUrl: link.trim() });
        return r.success ? onDone("Meeting link saved", `${s.clientName} and ${s.expertName} were told.`) : setError(r.error?.message ?? "That didn't go through. Please try again.");
      }
      if (mode === "DONE") {
        const r = await completeDefenseLabSession({ sessionId: s.id, recordingUrl: link.trim() || undefined, notes: notes.trim() || undefined });
        return r.success ? onDone("Marked done", link.trim() ? "The client can watch the recording." : "Add the recording when you have it.") : setError(r.error?.message ?? "That didn't go through. Please try again.");
      }
      if (mode === "RECORDING") {
        const r = await uploadDefenseLabRecording({ sessionId: s.id, recordingUrl: link.trim() });
        return r.success ? onDone("Recording saved", "The client can watch it from their DefenseLab page.") : setError(r.error?.message ?? "That didn't go through. Please try again.");
      }
      if (reason.trim().length < 5) return setError("Say why (at least 5 characters).");
      const r = await applyDefenseLabPenalty({ sessionId: s.id, penaltyReason: reason.trim(), penaltyAmount: amount ? Number(amount) : undefined });
      return r.success ? onDone("Fee recorded", s.clientName) : setError(r.error?.message ?? "That didn't go through. Please try again.");
    });
  };

  return (
    <Modal
      open
      onClose={() => (busy ? undefined : onClose())}
      title={titles[mode]}
      description={`${s.clientName} with ${s.expertName} · ${when(s.scheduledAt)}`}
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={mode === "FEE" ? "danger" : "primary"} size="sm" onClick={submit} loading={busy}>
            {button[mode]}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 font-sans text-[13px]">
        <p className="text-white/60">{help[mode]}</p>
        {mode !== "FEE" ? (
          <label className="flex flex-col gap-1.5 text-white/70">
            {mode === "LINK" ? "Meeting link" : mode === "DONE" ? "Recording link (optional)" : "Recording link"}
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder={mode === "LINK" ? "https://meet.google.com/abc-defg-hij" : "https://drive.google.com/…"}
              className={`${FIELD} h-10`}
            />
          </label>
        ) : (
          <>
            <label className="flex flex-col gap-1.5 text-white/70">
              Why
              <textarea
                rows={3}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="For example: moved the session 2 hours before it started."
                className={`${FIELD} resize-none py-2.5`}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-white/70">
              Amount (optional)
              <input
                type="number"
                min={0}
                max={50000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className={`${FIELD} h-10 font-mono`}
              />
            </label>
          </>
        )}
        {mode === "DONE" ? (
          <label className="flex flex-col gap-1.5 text-white/70">
            Notes (optional)
            <textarea rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${FIELD} resize-none py-2.5`} />
          </label>
        ) : null}
        {error ? (
          <p role="alert" className="flex items-start gap-2 text-red-300">
            <Warning size={15} weight="fill" className="mt-0.5 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
