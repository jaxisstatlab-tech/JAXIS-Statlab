"use client";

import React, { useState, useTransition } from "react";
import { Button, Toast } from "@repo/ui";
import { PencilSimple, Star } from "@phosphor-icons/react";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";
import { submitStudyFeedback } from "../actions";
import { RATING_LABEL, type ClientFeedbackState, type NameStyle } from "../schemas";

// The client's "How did we do?" card on a finished study: a 1–5 rating, two short optional questions, and whether
// (and how) their words may appear on the website. After sending it shows their answer, which they can change for 7
// days. Anchored at #feedback (the request email and notification link here).

const FIELD =
  "w-full rounded-[2px] border border-white/10 bg-[#050513] px-3 py-2.5 font-sans text-[14px] leading-relaxed text-white outline-none placeholder:text-white/30 transition-colors focus:border-[#CC6600]/60";
/** What the client chose about the website, in their words. */
const WEBSITE_CHOICE: Record<NameStyle, string> = {
  NAMES: "Shown with your names",
  PROGRAM: "Shown anonymously (program and school only)",
  HIDDEN: "Not shown",
};

/** Two-option toggle (Yes/No, names/anonymous). */
function Choice<T extends string>({ value, options, onChange, label }: { value: T; options: Array<[T, string]>; onChange: (v: T) => void; label: string }) {
  return (
    <div className="mt-2.5 grid grid-cols-2 gap-2 sm:max-w-md" role="radiogroup" aria-label={label}>
      {options.map(([key, text]) => {
        const on = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(key)}
            className={`rounded-[2px] border px-3 py-2.5 text-left font-sans text-[13px] transition-colors duration-150 ${
              on ? "border-[#CC6600]/60 bg-[#CC6600]/[0.06] text-white" : "border-white/10 text-white/70 hover:border-white/25"
            }`}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

const date = (iso: string) => new Date(iso).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "long", day: "numeric" });

export function ClientFeedbackCard({ projectId, initial }: { projectId: string; initial: ClientFeedbackState }) {
  const [state, setState] = useState(initial);
  const [editing, setEditing] = useState(!initial.feedback);
  const [rating, setRating] = useState(initial.feedback?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [wentWell, setWentWell] = useState(initial.feedback?.wentWell ?? "");
  const [couldImprove, setCouldImprove] = useState(initial.feedback?.couldImprove ?? "");
  const [nameStyle, setNameStyle] = useState<NameStyle>(initial.feedback?.nameStyle ?? "HIDDEN");
  const [displayNames, setDisplayNames] = useState(initial.feedback?.displayNames ?? "");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; description?: string; variant: "success" | "danger" } | null>(null);
  const [busy, start] = useTransition();

  if (!state.eligible && !state.feedback) return null;

  const send = () => {
    setError(null);
    if (!rating) {
      setError("Pick a rating from 1 to 5.");
      return;
    }
    if (nameStyle === "NAMES" && !displayNames.trim()) {
      setError("Type the names you want shown, or pick another option.");
      return;
    }
    start(async () => {
      const res = await submitStudyFeedback({ projectId, rating, wentWell, couldImprove, nameStyle, displayNames });
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      const createdAt = state.feedback?.createdAt ?? new Date().toISOString();
      setState({
        eligible: true,
        feedback: { rating, wentWell: wentWell.trim() || null, couldImprove: couldImprove.trim() || null, nameStyle, displayNames: displayNames.trim() || null, createdAt },
        editableUntil: state.editableUntil ?? new Date(Date.now() + 7 * 86_400_000).toISOString(),
      });
      setEditing(false);
      setToast({
        message: res.data.created ? "Thank you for your feedback" : "Feedback updated",
        description: res.data.created ? "It goes straight to our team." : "We've saved your changes.",
        variant: "success",
      });
    });
  };

  const shown = hover || rating;

  return (
    <Panel aria-label="Your feedback">
      <div id="feedback" className="scroll-mt-24" />
      <PanelHeader
        title={editing ? "How did we do?" : "Your feedback"}
        subtitle={
          editing
            ? "Your study is finished. One rating and two short, optional questions. It helps us do better for the next students."
            : state.editableUntil
              ? `Thank you. You can change your answer until ${date(state.editableUntil)}.`
              : "Thank you for telling us how it went."
        }
        aside={
          !editing && state.editableUntil ? (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
              <PencilSimple size={14} weight="fill" />
              Change My Answer
            </Button>
          ) : null
        }
      />

      {editing ? (
        <div className="flex flex-col gap-5 px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
          <fieldset>
            <legend className="font-sans text-[13px] font-medium text-white">How happy are you with your study?</legend>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Rating from 1 to 5" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => {
                const lit = n <= shown;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n} out of 5: ${RATING_LABEL[n]}`}
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHover(n)}
                    className={`flex h-11 w-11 items-center justify-center rounded-[2px] border transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.94] ${
                      lit ? "border-[#CC6600]/60 bg-[#CC6600]/10" : "border-white/10 bg-white/[0.02] hover:border-white/25"
                    }`}
                  >
                    <Star size={20} weight="fill" className={lit ? "text-[#CC6600]" : "text-white/20"} />
                  </button>
                );
              })}
              <span className="mt-1 basis-full whitespace-nowrap font-sans text-[13px] text-white/60 sm:ml-2 sm:mt-0 sm:basis-auto" aria-live="polite">
                {shown ? RATING_LABEL[shown] : "Pick 1 to 5"}
              </span>
            </div>
          </fieldset>

          <label className="flex flex-col gap-1.5">
            <span className="font-sans text-[13px] font-medium text-white">
              What did we do well? <span className="font-normal text-white/45">(optional)</span>
            </span>
            <textarea
              rows={3}
              maxLength={1500}
              value={wentWell}
              onChange={(e) => setWentWell(e.target.value)}
              placeholder="For example: the explanations made our defense easy."
              className={`${FIELD} resize-none`}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-sans text-[13px] font-medium text-white">
              What could we do better? <span className="font-normal text-white/45">(optional)</span>
            </span>
            <textarea
              rows={3}
              maxLength={1500}
              value={couldImprove}
              onChange={(e) => setCouldImprove(e.target.value)}
              placeholder="Anything that was slow, unclear, or missing."
              className={`${FIELD} resize-none`}
            />
          </label>

          <fieldset>
            <legend className="font-sans text-[13px] font-medium text-white">Can we show what you said on our website?</legend>
            <p className="mt-0.5 font-sans text-xs text-white/50">Only &ldquo;What did we do well&rdquo; is shown, and only after our team checks it.</p>
            <Choice
              label="Show it on the website"
              value={nameStyle === "HIDDEN" ? "NO" : "YES"}
              options={[
                ["YES", "Yes"],
                ["NO", "No"],
              ]}
              onChange={(v) => setNameStyle(v === "NO" ? "HIDDEN" : nameStyle === "HIDDEN" ? "PROGRAM" : nameStyle)}
            />
          </fieldset>

          {nameStyle !== "HIDDEN" ? (
            <fieldset>
              <legend className="font-sans text-[13px] font-medium text-white">How should we name you?</legend>
              <p className="mt-0.5 font-sans text-xs text-white/50">
                {nameStyle === "PROGRAM"
                  ? "Anonymous: no names, just “Thesis group” with your program and school."
                  : "Your names appear under what you said."}
              </p>
              <Choice
                label="How to name you"
                value={nameStyle}
                options={[
                  ["PROGRAM", "Stay anonymous"],
                  ["NAMES", "Use our names"],
                ]}
                onChange={setNameStyle}
              />
              {nameStyle === "NAMES" ? (
                <label className="mt-3 flex flex-col gap-1.5">
                  <span className="font-sans text-xs text-white/60">Names as you want them shown</span>
                  <input
                    value={displayNames}
                    onChange={(e) => setDisplayNames(e.target.value)}
                    maxLength={300}
                    placeholder="For example: Ana Cruz, Ben Reyes, Carla Lim"
                    className={FIELD}
                  />
                </label>
              ) : null}
            </fieldset>
          ) : null}

          {error ? (
            <p role="alert" className="font-sans text-[13px] text-red-300">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={send} loading={busy} disabled={busy}>
              {state.feedback ? "Save Changes" : "Send Feedback"}
            </Button>
            {state.feedback ? (
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={busy}>
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      ) : state.feedback ? (
        <div className="flex flex-col gap-3 px-5 pb-5 pt-4 font-sans text-[14px] sm:px-6 sm:pb-6">
          <div className="flex items-center gap-1" aria-label={`${state.feedback.rating} out of 5`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} size={16} weight="fill" className={n <= state.feedback!.rating ? "text-[#CC6600]" : "text-white/15"} />
            ))}
            <span className="ml-2 text-[13px] text-white/60">{RATING_LABEL[state.feedback.rating]}</span>
          </div>
          {state.feedback.wentWell ? <p className="leading-relaxed text-white/80">&ldquo;{state.feedback.wentWell}&rdquo;</p> : null}
          {state.feedback.couldImprove ? (
            <p className="leading-relaxed text-white/60">
              <span className="text-white/45">Could be better: </span>
              {state.feedback.couldImprove}
            </p>
          ) : null}
          <p className="text-xs text-white/45">
            Website: {WEBSITE_CHOICE[state.feedback.nameStyle]}
            {state.feedback.nameStyle === "NAMES" && state.feedback.displayNames ? ` (${state.feedback.displayNames})` : ""}
          </p>
        </div>
      ) : null}

      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </Panel>
  );
}
