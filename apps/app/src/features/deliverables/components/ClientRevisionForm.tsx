"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Toast } from "@repo/ui";
import { ArrowLeft, ChatCenteredText, Check, Clock, WarningCircle, X } from "@phosphor-icons/react";
import type { ClientDeliverablesDTO } from "../schemas";
import { submitClientRevision } from "../actions";
import { StudySection } from "@/features/projects/components/StudySection";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";

// "Request changes": one plain form (which parts, what to change, a scope check) with the
// free-change window and what's free vs. extra on the side. Same rules as before: 10–3,000
// characters, one active request, only while the window is open.

const MIN = 10;
const MAX = 3000;

const FREE = [
  "Fixing formatting, table numbers or APA style",
  "Re-running a test with the data and variables you already sent",
  "Explaining or rewording how a result is written",
];
const EXTRA = [
  "New research questions or hypotheses",
  "New data, more respondents or a different dataset",
  "A different kind of analysis than the one agreed",
];

function timeLeft(days: number, hours: number) {
  const parts = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  if (hours > 0 || days === 0) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  return `${parts.join(" ")} left`;
}

function plainError(err: unknown) {
  const msg = err instanceof Error ? err.message : "";
  if (!msg || msg.length > 160 || /prisma|invocation|database|ECONN|fetch failed|timeout/i.test(msg)) {
    return "We couldn't send your request. Please try again in a moment.";
  }
  return msg;
}

interface ClientRevisionFormProps {
  data: ClientDeliverablesDTO;
}

export function ClientRevisionForm({ data }: ClientRevisionFormProps) {
  const router = useRouter();
  const { project, isReleased, revisionWindow, hasPendingRevision, revisions } = data;
  const base = `/dashboard/client/projects/${project.id}`;

  const [sections, setSections] = useState("");
  const [description, setDescription] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [tried, setTried] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; description: string; variant: "info" | "success" | "danger" } | null>(null);

  const length = description.trim().length;
  const descError = length < MIN ? `Tell us what to change (at least ${MIN} characters).` : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (descError || !agreed) return;
    try {
      setIsSubmitting(true);
      await submitClientRevision({
        projectId: project.id,
        description: description.trim(),
        requestedSections: sections.trim() || undefined,
      });
      window.dispatchEvent(new Event("jaxis:study-updated"));
      setToast({ message: "Request sent", description: "We'll review it and reply on your Files tab.", variant: "success" });
      setTimeout(() => router.push(`${base}/deliverables`), 1200);
    } catch (err: unknown) {
      setToast({ message: "Your request wasn't sent", description: plainError(err), variant: "danger" });
      setIsSubmitting(false);
    }
  };

  const backToFiles = (
    <Button asChild variant="outline" size="sm" className="gap-1.5">
      <Link href={`${base}/deliverables`}>
        <ArrowLeft size={14} weight="bold" />
        Back to Files
      </Link>
    </Button>
  );
  const messageTeam = (
    <Button asChild variant="outline" size="sm" className="gap-1.5">
      <Link href={`${base}/messages`}>
        <ChatCenteredText size={14} weight="fill" />
        Message Your Team
      </Link>
    </Button>
  );

  // ── Can't ask right now ──
  if (!isReleased || !revisionWindow.isActive || hasPendingRevision) {
    const pending = revisions.find((r) => r.status === "PENDING_REVIEW" || r.status === "INCLUDED");
    const title = !isReleased
      ? "Your files aren't ready yet"
      : hasPendingRevision
        ? "We're working on your change request"
        : "The free-change window has closed";
    const body = !isReleased
      ? "You can ask for changes once your files are released, for a short time after delivery."
      : hasPendingRevision
        ? "One change request per study is included, and yours is already with us. We'll reply on your Files tab."
        : "Free changes can be asked for within 3 days of delivery. For more changes, message your team and we'll price them for you.";
    return (
      <div className="flex flex-col gap-6 pb-24">
        <StudySection title="Request changes" description="Ask us to fix something in your files, within what we agreed." />
        <Panel as="div">
          <div className="flex flex-col gap-4 px-5 py-6 sm:px-6">
            <div className="flex items-start gap-3">
              <Clock size={20} weight="fill" className="mt-0.5 shrink-0 text-white/40" />
              <div>
                <h2 className="text-base font-semibold text-white">{title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-white/65">{body}</p>
              </div>
            </div>
            {pending ? (
              <div className="rounded-[2px] border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                <p className="text-xs font-medium text-white/50">What you asked</p>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-white/80">{pending.description}</p>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
              {backToFiles}
              {!hasPendingRevision ? messageTeam : null}
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  // ── The form ──
  return (
    <div className="flex flex-col gap-6 pb-24">
      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}

      <StudySection title="Request changes" description="Tell us what to fix. Changes within what we agreed are free, once per study." />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <form onSubmit={handleSubmit} noValidate className="min-w-0 lg:col-span-8">
          <Panel aria-label="Your change request">
            <PanelHeader title="What should we change?" subtitle="Be specific: which table or part, and what it should say or show." />
            <div className="flex flex-col gap-5 px-5 pb-6 pt-5 sm:px-6">
              <div>
                <label htmlFor="rev-sections" className="text-[13px] font-medium text-white/80">
                  Which parts? <span className="font-normal text-white/40">(optional)</span>
                </label>
                <input
                  id="rev-sections"
                  value={sections}
                  onChange={(e) => setSections(e.target.value)}
                  placeholder="e.g. Table 3, Chapter 4 section 4.2"
                  className="mt-1.5 h-10 w-full rounded-[2px] border border-white/15 bg-white/[0.03] px-3 font-sans text-base text-white placeholder:text-white/25 focus:border-white/35 focus:outline-none sm:text-sm"
                />
              </div>

              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor="rev-description" className="text-[13px] font-medium text-white/80">
                    What should we change?
                  </label>
                  <span className={`font-mono text-[11px] ${length > MAX - 100 ? "text-[#FFA040]" : "text-white/40"}`}>
                    {description.length.toLocaleString()} / {MAX.toLocaleString()}
                  </span>
                </div>
                <textarea
                  id="rev-description"
                  rows={7}
                  maxLength={MAX}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Please add the effect size next to each t-test in Table 4, and write the results in past tense like my adviser asked."
                  aria-invalid={tried && !!descError}
                  aria-describedby={tried && descError ? "rev-description-error" : undefined}
                  className={`mt-1.5 w-full resize-y rounded-[2px] border bg-white/[0.03] px-3 py-2.5 font-sans text-base leading-relaxed text-white placeholder:text-white/25 focus:outline-none sm:text-sm ${
                    tried && descError ? "border-[#CC6600]/70" : "border-white/15 focus:border-white/35"
                  }`}
                />
                {tried && descError ? (
                  <p id="rev-description-error" className="mt-1.5 flex items-center gap-1.5 text-[13px] text-[#FFA040]">
                    <WarningCircle size={14} weight="fill" />
                    {descError}
                  </p>
                ) : null}
              </div>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-[2px] border px-3.5 py-3 ${
                  tried && !agreed ? "border-[#CC6600]/60" : "border-white/[0.08]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#CC6600]"
                />
                <span className="text-[13px] leading-relaxed text-white/75">
                  These changes stay within what we agreed: the same research questions, data and kind of analysis.
                  {tried && !agreed ? <span className="mt-1 block text-[#FFA040]">Tick this to send your request.</span> : null}
                </span>
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-white/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-end">
                <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                  <Link href={`${base}/deliverables`}>Cancel</Link>
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={isSubmitting} disabled={isSubmitting} className="w-full sm:w-auto">
                  {isSubmitting ? "Sending..." : "Send Request"}
                </Button>
              </div>
            </div>
          </Panel>
        </form>

        <aside className="flex min-w-0 flex-col gap-6 lg:col-span-4" aria-label="About free changes">
          <Panel aria-label="Free changes">
            <PanelHeader title="Free changes" subtitle="One round of changes is included." />
            <div className="flex flex-col gap-1.5 px-5 pb-5 pt-4 sm:px-6">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <Clock size={16} weight="fill" className="text-white/50" />
                {timeLeft(revisionWindow.remainingDays, revisionWindow.remainingHours)}
              </p>
              {revisionWindow.expiresAtFormatted ? <p className="text-[13px] text-white/55">Ask by {revisionWindow.expiresAtFormatted}.</p> : null}
            </div>
          </Panel>

          <Panel aria-label="What's free">
            <PanelHeader title="What's free and what isn't" />
            <div className="flex flex-col gap-4 px-5 pb-5 pt-4 sm:px-6">
              <ListBlock title="Free" icon={<Check size={13} weight="bold" className="mt-1 shrink-0 text-white/60" />} items={FREE} />
              <ListBlock title="Needs a new price" icon={<X size={13} weight="bold" className="mt-1 shrink-0 text-white/40" />} items={EXTRA} />
              <p className="border-t border-white/[0.06] pt-3 text-[13px] leading-relaxed text-white/50">
                Not sure? Send it anyway. We&apos;ll tell you if it&apos;s free or needs a new price before we start.
              </p>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function ListBlock({ title, icon, items }: { title: string; icon: React.ReactNode; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium text-white/50">{title}</p>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {items.map((it) => (
          <li key={it} className="flex gap-2 text-[13px] leading-relaxed text-white/75">
            {icon}
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
