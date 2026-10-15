"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Button, Modal, Toast } from "@repo/ui";
import { Star } from "@phosphor-icons/react";
import { submitStudyFeedback } from "../actions";
import { RATING_LABEL, type ClientFeedbackState, type NameStyle } from "../schemas";

// The client's "How did we do?" on a finished study, as a modal only (nothing is added to the page): a 1–5 rating,
// two short optional questions, and whether (and how) their words may appear on the website. It opens by itself once
// per study, and whenever they arrive through a #feedback link (the request email, notification and the study list's
// "Rate Your Study"); through that link they can also change their answer for 7 days.

const FIELD =
  "w-full rounded-[2px] border border-white/10 bg-[#050513] px-3 py-2.5 font-sans text-[14px] leading-relaxed text-white outline-none placeholder:text-white/30 transition-colors focus:border-[#CC6600]/60";
/** Two-option toggle (Yes/No, names/anonymous). */
function Choice<T extends string>({ value, options, onChange, label }: { value: T; options: Array<[T, string]>; onChange: (v: T) => void; label: string }) {
  return (
    <div className="mt-2.5 grid grid-cols-2 gap-2" role="radiogroup" aria-label={label}>
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

export function ClientFeedbackCard({ projectId, initial }: { projectId: string; initial: ClientFeedbackState }) {
  const [state, setState] = useState(initial);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [wentWell, setWentWell] = useState("");
  const [couldImprove, setCouldImprove] = useState("");
  const [nameStyle, setNameStyle] = useState<NameStyle>("HIDDEN");
  const [displayNames, setDisplayNames] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; description?: string; variant: "success" | "danger" } | null>(null);
  const [busy, start] = useTransition();

  const show = state.eligible || Boolean(state.feedback);
  const canAnswer = !state.feedback || Boolean(state.editableUntil);

  // Fill the form from their last answer (or blank) each time the modal opens.
  const openForm = () => {
    const f = state.feedback;
    setRating(f?.rating ?? 0);
    setWentWell(f?.wentWell ?? "");
    setCouldImprove(f?.couldImprove ?? "");
    setNameStyle(f?.nameStyle ?? "HIDDEN");
    setDisplayNames(f?.displayNames ?? "");
    setError(null);
    setOpen(true);
  };

  // Open by itself once per study, and whenever they arrive through a #feedback link.
  useEffect(() => {
    if (!show || !canAnswer) return;
    const viaLink = window.location.hash === "#feedback";
    const key = `jx-feedback-asked:${projectId}`;
    let asked = true;
    try {
      asked = Boolean(window.localStorage.getItem(key));
    } catch {
      // storage blocked: don't pop up by itself
    }
    if (!viaLink && (state.feedback || asked)) return;
    const timer = window.setTimeout(() => {
      openForm();
      try {
        window.localStorage.setItem(key, "1");
      } catch {
        // ignore
      }
    }, viaLink ? 300 : 900);
    return () => window.clearTimeout(timer);
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!show) return null;

  const chooseStyle = (style: NameStyle) => {
    setNameStyle(style);
    // Named: start from their profile name; they can add groupmates.
    if (style === "NAMES" && !displayNames.trim()) setDisplayNames(state.clientName);
  };

  const send = () => {
    setError(null);
    if (!rating) {
      setError("Pick a rating from 1 to 5.");
      return;
    }
    start(async () => {
      const names = nameStyle === "NAMES" ? displayNames.trim() || state.clientName : "";
      const res = await submitStudyFeedback({ projectId, rating, wentWell, couldImprove, nameStyle, displayNames: names });
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      const createdAt = state.feedback?.createdAt ?? new Date().toISOString();
      setState({
        ...state,
        eligible: true,
        feedback: { rating, wentWell: wentWell.trim() || null, couldImprove: couldImprove.trim() || null, nameStyle, displayNames: names || null, createdAt },
        editableUntil: state.editableUntil ?? new Date(Date.now() + 7 * 86_400_000).toISOString(),
      });
      setOpen(false);
      setToast({
        message: res.data.created ? "Thank you for your feedback" : "Feedback updated",
        description: res.data.created ? "It goes straight to our team." : "We've saved your changes.",
        variant: "success",
      });
    });
  };

  const shown = hover || rating;
  const f = state.feedback;

  return (
    <>
      <Modal
        open={open}
        onClose={() => (busy ? undefined : setOpen(false))}
        title="How did we do?"
        description="One rating and two short, optional questions. It helps us do better for the next students."
        size="lg"
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>
              {f ? "Cancel" : "Not Now"}
            </Button>
            <Button variant="primary" size="sm" onClick={send} loading={busy} disabled={busy}>
              {f ? "Save Changes" : "Send Feedback"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5 font-sans">
          <fieldset>
            <legend className="text-[13px] font-medium text-white">How happy are you with your study?</legend>
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
              <span className="mt-1 basis-full whitespace-nowrap text-[13px] text-white/60 sm:ml-2 sm:mt-0 sm:basis-auto" aria-live="polite">
                {shown ? RATING_LABEL[shown] : "Pick 1 to 5"}
              </span>
            </div>
          </fieldset>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-white">
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
            <span className="text-[13px] font-medium text-white">
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
            <legend className="text-[13px] font-medium text-white">Can we show what you said on our website?</legend>
            <p className="mt-0.5 text-xs text-white/50">Only &ldquo;What did we do well&rdquo; is shown, and only after our team checks it.</p>
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
              <legend className="text-[13px] font-medium text-white">How should we name you?</legend>
              <p className="mt-0.5 text-xs text-white/50">
                {nameStyle === "PROGRAM" ? "Anonymous: no names, just “Thesis group” with your program and school." : "Your name appears under what you said."}
              </p>
              <Choice
                label="How to name you"
                value={nameStyle}
                options={[
                  ["PROGRAM", "Stay anonymous"],
                  ["NAMES", "Use my name"],
                ]}
                onChange={chooseStyle}
              />
              {nameStyle === "NAMES" ? (
                <label className="mt-3 flex flex-col gap-1.5">
                  <span className="text-xs text-white/60">Shown as (from your profile; add your groupmates if you like)</span>
                  <input
                    value={displayNames}
                    onChange={(e) => setDisplayNames(e.target.value)}
                    maxLength={300}
                    placeholder={state.clientName || "Your name"}
                    className={FIELD}
                  />
                </label>
              ) : null}
            </fieldset>
          ) : null}

          {error ? (
            <p role="alert" className="text-[13px] text-red-300">
              {error}
            </p>
          ) : null}
        </div>
      </Modal>

      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </>
  );
}
