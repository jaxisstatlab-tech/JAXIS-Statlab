"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader, Button, LoadingState, Modal, Pagination, Toast, CopyButton, Peso } from "@repo/ui";
import { getClientEligibleDisputesAction, submitDisputeAction } from "@/features/disputes/actions";
import type { DisputeDTO, ClientDisputeEligibilityDTO, DisputeGrounds, DisputeStatus } from "@/features/disputes/schemas";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";
import {
  ArrowCounterClockwise,
  ArrowRight,
  ChatsCircle,
  Check,
  Link as LinkIcon,
  Scales,
  ShieldCheck,
  X,
} from "@phosphor-icons/react";

interface ClientDisputesClientProps {
  initialData?: {
    eligibleProjects: ClientDisputeEligibilityDTO[];
    clientDisputes: DisputeDTO[];
  } | null;
}

// ─── Plain-English labels ──────────────────────────────────────────────────────

const REASONS: Record<DisputeGrounds, { title: string; body: string }> = {
  METHODOLOGY_DEVIATION: {
    title: "Wrong test or method",
    body: "We used a different test or model than your agreement says, or left out a variable you asked for.",
  },
  MATHEMATICAL_ERROR: {
    title: "Wrong numbers",
    body: "A calculation, p-value, count or table in your files is incorrect.",
  },
  SLA_BREACH: {
    title: "Late delivery",
    body: "You paid for Rush, Express or Emergency and we delivered after the promised date.",
  },
};

const STATUS: Record<DisputeStatus, { label: string; tone: "wait" | "done" | "stopped" }> = {
  OPEN: { label: "Sent", tone: "wait" },
  UNDER_REVIEW: { label: "Being reviewed", tone: "wait" },
  RESOLVED_REFUND: { label: "Refund approved", tone: "done" },
  RESOLVED_NO_REFUND: { label: "Reviewed", tone: "done" },
  CHARGEBACK: { label: "Study stopped", tone: "stopped" },
};

const OUTCOME: Record<string, string> = {
  FULL_REFUND: "Full refund",
  TURNAROUND_UPGRADE_REFUND_ONLY: "Speed fee refunded",
  NO_REFUND: "No refund. The work matched your agreement.",
  CHARGEBACK: "Payment reversed and the study stopped",
};

const TZ = "Asia/Manila";
const day = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-PH", { timeZone: TZ, month: "short", day: "numeric", year: "numeric" }) : "—";

const MIN = 20;
const MAX = 3000;

export function ClientDisputesClient({ initialData }: ClientDisputesClientProps) {
  const [eligibleProjects, setEligibleProjects] = useState<ClientDisputeEligibilityDTO[]>(initialData?.eligibleProjects || []);
  const [disputes, setDisputes] = useState<DisputeDTO[]>(initialData?.clientDisputes || []);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedDispute, setSelectedDispute] = useState<DisputeDTO | null>(null);

  // Claim form
  const [isFilingModalOpen, setIsFilingModalOpen] = useState<boolean>(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedGrounds, setSelectedGrounds] = useState<DisputeGrounds>("METHODOLOGY_DEVIATION");
  const [description, setDescription] = useState<string>("");
  const [evidenceLink, setEvidenceLink] = useState<string>("");
  const [evidenceList, setEvidenceList] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [toast, setToast] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getClientEligibleDisputesAction();
      if (res.success && res.data) {
        setEligibleProjects(res.data.eligibleProjects);
        setDisputes(res.data.clientDisputes);
      } else {
        setToast({
          message: "Couldn't load this page",
          description: res.error?.message || "Please refresh and try again.",
          variant: "danger",
        });
      }
    } catch {
      setToast({ message: "Couldn't load this page", description: "Please check your connection and try again.", variant: "danger" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialData) loadData();
  }, [initialData, loadData]);

  const openEligibleProjects = eligibleProjects.filter((p) => p.isEligible && !p.existingDispute);
  const paginatedDisputes = disputes.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const firstDelivered = eligibleProjects[0] ?? null;

  const handleOpenFilingModal = (projectId?: string) => {
    if (projectId) setSelectedProjectId(projectId);
    else if (openEligibleProjects.length > 0) setSelectedProjectId(openEligibleProjects[0]?.projectId || "");
    setSelectedGrounds("METHODOLOGY_DEVIATION");
    setDescription("");
    setEvidenceLink("");
    setEvidenceList([]);
    setFormError(null);
    setIsFilingModalOpen(true);
  };

  const handleAddEvidence = () => {
    const link = evidenceLink.trim();
    if (!link) return;
    if (!link.startsWith("http://") && !link.startsWith("https://")) {
      setFormError("Links need to start with https://");
      return;
    }
    setEvidenceList([...evidenceList, link]);
    setEvidenceLink("");
    setFormError(null);
  };

  const handleSubmitDispute = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedProjectId) {
      setFormError("Please choose a study.");
      return;
    }
    if (description.trim().length < MIN) {
      setFormError(`Please explain the problem in at least ${MIN} characters.`);
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await submitDisputeAction({
        projectId: selectedProjectId,
        grounds: selectedGrounds,
        description: description.trim(),
        evidenceFilePaths: evidenceList,
      });
      if (res.success) {
        setToast({ variant: "success", message: "Claim sent", description: "Our team will review it and message you with the decision." });
        setIsFilingModalOpen(false);
        loadData();
      } else {
        setFormError(res.error?.message || "We couldn't send your claim. Please try again.");
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copied = (id: string) => setToast({ variant: "info", message: "Study ID copied", description: `${id} is on your clipboard.` });

  if (isLoading && eligibleProjects.length === 0 && disputes.length === 0) {
    return (
      <div className="my-auto flex min-h-full w-full flex-1 items-center justify-center font-sans animate-content-fade">
        <LoadingState variant="page" label="Loading your studies..." />
      </div>
    );
  }

  return (
    <div data-portal="client" className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-24 font-sans animate-content-fade">
      <PageHeader
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "My Studies", href: "/dashboard/client" },
          { label: "Revisions & help" },
        ]}
        title="Revisions & help"
        description="Something not right with your files? Here's how we fix it."
      />

      {/* Which one do you need? */}
      <section aria-label="Ways to get help" className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <HelpOption
          icon={<ChatsCircle size={18} weight="fill" />}
          title="Ask a question"
          body="Not sure about a result, or need something explained? Ask your team in chat."
          action={
            <Link href="/dashboard/client/messages" className={linkButton}>
              Open Messages <ArrowRight size={13} weight="fill" />
            </Link>
          }
        />
        <HelpOption
          icon={<ArrowCounterClockwise size={18} weight="fill" />}
          title="Request changes"
          body="Free fixes within your agreed scope, like a table format or a missing label. Open for 3 working days after delivery."
          action={
            firstDelivered ? (
              <Link href={`/dashboard/client/projects/${firstDelivered.projectId}/deliverables`} className={linkButton}>
                Go to Your Files <ArrowRight size={13} weight="fill" />
              </Link>
            ) : (
              <span className="text-xs text-white/40">Available once your files are delivered.</span>
            )
          }
        />
        <HelpOption
          icon={<Scales size={18} weight="fill" />}
          title="File a claim"
          body="For serious problems: the wrong test was used, the numbers are wrong, or a rush order was late. Within 7 days of delivery."
          action={
            openEligibleProjects.length > 0 ? (
              <button type="button" onClick={() => handleOpenFilingModal()} className={linkButton}>
                File a Claim <ArrowRight size={13} weight="fill" />
              </button>
            ) : (
              <span className="text-xs text-white/40">
                {eligibleProjects.length ? "No studies are inside the 7-day window." : "Available once your files are delivered."}
              </span>
            )
          }
        />
      </section>

      {/* Delivered studies */}
      <Panel aria-label="Your delivered studies">
        <PanelHeader title="Your delivered studies" subtitle="Claims can be filed up to 7 days after delivery." count={eligibleProjects.length} />
        {isLoading ? (
          <div className="py-10">
            <LoadingState variant="inline" label="Checking delivery dates..." />
          </div>
        ) : eligibleProjects.length === 0 ? (
          <Empty
            icon={<ShieldCheck size={20} weight="fill" />}
            title="No delivered studies yet"
            body="Once your files are ready, you can ask for changes or file a claim here."
          />
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {eligibleProjects.map((p) => {
              const claim = p.existingDispute;
              return (
                <li key={p.projectId} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/client/projects/${p.projectId}`}
                      className="line-clamp-1 text-sm font-semibold text-white underline-offset-4 hover:underline"
                    >
                      {p.researchTitle}
                    </Link>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/50">
                      <span className="font-mono">{p.intakeId}</span>
                      <span className="text-white/20">·</span>
                      <span>Delivered {day(p.deliveredAt)}</span>
                      <span className="text-white/20">·</span>
                      {claim ? (
                        <StatusTag status={claim.status} />
                      ) : p.isEligible ? (
                        <span className="text-white/75">
                          {p.remainingDays} {p.remainingDays === 1 ? "day" : "days"} left to file a claim
                        </span>
                      ) : (
                        <span>Claim window closed {day(p.windowExpiresAt)}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/client/projects/${p.projectId}/deliverables`}>View Files</Link>
                    </Button>
                    {claim ? (
                      <Button variant="outline" size="sm" onClick={() => setSelectedDispute(claim)}>
                        View Claim
                      </Button>
                    ) : p.isEligible ? (
                      <Button variant="secondary" size="sm" onClick={() => handleOpenFilingModal(p.projectId)}>
                        File a Claim
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* Claims */}
      <Panel aria-label="Your claims">
        <PanelHeader title="Your claims" subtitle="Every claim you've sent and what we decided." count={disputes.length} />
        {isLoading ? (
          <div className="py-10">
            <LoadingState variant="inline" label="Loading your claims..." />
          </div>
        ) : disputes.length === 0 ? (
          <Empty
            icon={<Check size={20} weight="fill" />}
            title="No claims"
            body="You haven't filed any claims. If something is wrong with your files, start with Request changes or ask in Messages."
          />
        ) : (
          <>
            <ul className="divide-y divide-white/[0.06]">
              {paginatedDisputes.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedDispute(d)}
                    className="flex w-full flex-col gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.02] sm:px-6"
                  >
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white">{REASONS[d.grounds]?.title ?? d.grounds}</span>
                      <StatusTag status={d.status} />
                    </span>
                    <span className="line-clamp-1 text-xs text-white/55">
                      <span className="font-mono">{d.projectIntakeId}</span> · {d.projectTitle}
                    </span>
                    <ClaimTracker status={d.status} />
                    <span className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/45">
                      <span>Sent {day(d.createdAt)}</span>
                      <span className="inline-flex items-center gap-1 text-white/70">
                        {d.resolutionType ? "See the decision" : "See details"} <ArrowRight size={12} weight="fill" />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {disputes.length > 10 ? (
              <div className="border-t border-white/[0.06] px-5 py-4 sm:px-6">
                <Pagination
                  currentPage={currentPage}
                  totalItems={disputes.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(n) => {
                    setPageSize(n);
                    setCurrentPage(1);
                  }}
                  pageSizeOptions={[5, 10, 20, 50]}
                  itemLabel="claims"
                />
              </div>
            ) : null}
          </>
        )}
      </Panel>

      {/* File a claim */}
      {isFilingModalOpen ? (
        <Modal
          open={isFilingModalOpen}
          onClose={() => !isSubmitting && setIsFilingModalOpen(false)}
          title="File a claim"
          description="Tell us what's wrong. Our team reviews every claim and messages you with the decision."
          size="lg"
          footer={
            <div className="flex w-full items-center justify-end gap-3">
              <Button variant="outline" size="sm" disabled={isSubmitting} onClick={() => setIsFilingModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" loading={isSubmitting} disabled={isSubmitting} onClick={() => handleSubmitDispute()}>
                {isSubmitting ? "Sending..." : "Send Claim"}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSubmitDispute} className="flex flex-col gap-5 text-sm text-white/85">
            {formError ? (
              <p role="alert" className="rounded-[2px] border border-red-500/30 bg-red-500/[0.06] p-3 text-[13px] text-red-200">
                {formError}
              </p>
            ) : null}

            <Field label="Study">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className={INPUT}
                required
              >
                {openEligibleProjects.map((p) => (
                  <option key={p.projectId} value={p.projectId} className="bg-[#0A0A18] text-white">
                    {p.researchTitle} ({p.remainingDays} {p.remainingDays === 1 ? "day" : "days"} left)
                  </option>
                ))}
              </select>
            </Field>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1.5 text-xs font-medium text-white/70">What went wrong?</legend>
              {(Object.keys(REASONS) as DisputeGrounds[]).map((g) => {
                const on = selectedGrounds === g;
                return (
                  <label
                    key={g}
                    className={`flex cursor-pointer gap-3 rounded-[2px] border p-3 transition-colors ${
                      on ? "border-[#CC6600]/60 bg-[#CC6600]/[0.06]" : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="grounds"
                      value={g}
                      checked={on}
                      onChange={() => setSelectedGrounds(g)}
                      className="mt-0.5 accent-[#CC6600]"
                    />
                    <span>
                      <span className="block text-sm font-medium text-white">{REASONS[g].title}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-white/55">{REASONS[g].body}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>

            <Field label="Explain the problem">
              <textarea
                rows={5}
                value={description}
                maxLength={MAX}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Which table, figure or section is wrong, and what did you expect instead?"
                className={`${INPUT} resize-none leading-relaxed`}
                required
              />
              <span className="text-[11px] text-white/40">
                {description.trim().length < MIN
                  ? `At least ${MIN} characters (${description.trim().length} so far)`
                  : `${description.length.toLocaleString()} / ${MAX.toLocaleString()}`}
              </span>
            </Field>

            <Field label="Links to screenshots or files (optional)">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={evidenceLink}
                  onChange={(e) => setEvidenceLink(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddEvidence();
                    }
                  }}
                  placeholder="https://drive.google.com/..."
                  className={`${INPUT} min-w-0 flex-1`}
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddEvidence} className="shrink-0">
                  Add Link
                </Button>
              </div>
              {evidenceList.length > 0 ? (
                <ul className="mt-1 flex flex-col gap-1.5">
                  {evidenceList.map((link, idx) => (
                    <li
                      key={`${link}-${idx}`}
                      className="flex items-center justify-between gap-2 rounded-[2px] border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs"
                    >
                      <span className="flex min-w-0 items-center gap-1.5 text-white/75">
                        <LinkIcon size={13} weight="fill" className="shrink-0 text-white/40" />
                        <span className="truncate">{link}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setEvidenceList(evidenceList.filter((_, i) => i !== idx))}
                        className="shrink-0 text-white/45 hover:text-white"
                        aria-label="Remove link"
                      >
                        <X size={13} weight="fill" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Field>
          </form>
        </Modal>
      ) : null}

      {/* Claim details */}
      {selectedDispute ? (
        <Modal
          open={Boolean(selectedDispute)}
          onClose={() => setSelectedDispute(null)}
          title={REASONS[selectedDispute.grounds]?.title ?? "Claim"}
          description={selectedDispute.projectTitle}
          size="lg"
          footer={
            <div className="flex w-full justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedDispute(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-5 text-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-white/55">
              <CopyButton
                variant="badge"
                value={selectedDispute.projectIntakeId}
                label={selectedDispute.projectIntakeId}
                onCopy={() => copied(selectedDispute.projectIntakeId)}
              />
              <span>Sent {day(selectedDispute.createdAt)}</span>
              {selectedDispute.grossAmount ? (
                <span>
                  Study price <Peso />
                  {selectedDispute.grossAmount.toLocaleString("en-PH")}
                </span>
              ) : null}
            </div>

            <ClaimTracker status={selectedDispute.status} />

            <div>
              <p className="text-xs font-medium text-white/50">What you told us</p>
              <p className="mt-1.5 whitespace-pre-wrap rounded-[2px] border border-white/[0.07] bg-white/[0.02] p-3 leading-relaxed text-white/85">
                {selectedDispute.description}
              </p>
            </div>

            {selectedDispute.evidenceFilePaths?.length ? (
              <div>
                <p className="text-xs font-medium text-white/50">Your links</p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {selectedDispute.evidenceFilePaths.map((f, i) => (
                    <li key={i}>
                      <a href={f} target="_blank" rel="noreferrer" className="block truncate text-white/80 underline-offset-4 hover:underline">
                        {f}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {selectedDispute.resolutionType ? (
              <div className="rounded-[2px] border border-white/10 bg-white/[0.03] p-4">
                <p className="flex items-center justify-between gap-2 text-xs text-white/50">
                  <span className="font-medium">Our decision</span>
                  <span>{day(selectedDispute.resolvedAt)}</span>
                </p>
                <p className="mt-1.5 font-semibold text-white">
                  {OUTCOME[selectedDispute.resolutionType] ?? selectedDispute.resolutionType}
                </p>
                <p className="mt-2 whitespace-pre-wrap leading-relaxed text-white/75">
                  {selectedDispute.resolutionNotes || "No extra notes."}
                </p>
              </div>
            ) : (
              <p className="rounded-[2px] border border-white/10 bg-white/[0.03] p-4 leading-relaxed text-white/70">
                We&apos;re reviewing your claim. We&apos;ll message you as soon as there&apos;s a decision.
              </p>
            )}
          </div>
        </Modal>
      ) : null}

      {toast ? <Toast variant={toast.variant} message={toast.message} description={toast.description} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

// ─── Pieces ─────────────────────────────────────────────────────────────────────

const INPUT =
  "w-full rounded-[2px] border border-white/15 bg-[#050513] px-3 py-2.5 text-base text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#CC6600] sm:text-sm";

const linkButton =
  "inline-flex items-center gap-1.5 text-sm font-medium text-white underline-offset-4 hover:underline";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-white/70">{label}</span>
      {children}
    </label>
  );
}

function HelpOption({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <Panel as="div" className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-2 px-5 py-5">
        <p className="flex items-center gap-2 text-base font-semibold text-white">
          <span className="text-[#CC6600]">{icon}</span>
          {title}
        </p>
        <p className="flex-1 text-[13px] leading-relaxed text-white/60">{body}</p>
        <div className="pt-2">{action}</div>
      </div>
    </Panel>
  );
}

function StatusTag({ status }: { status: DisputeStatus }) {
  const s = STATUS[status] ?? { label: status, tone: "wait" as const };
  const tone =
    s.tone === "done"
      ? "border-white/20 bg-white/[0.06] text-white"
      : s.tone === "stopped"
        ? "border-white/10 text-white/50"
        : "border-white/10 bg-white/[0.04] text-white/75";
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-[2px] border px-2 py-0.5 text-xs font-medium ${tone}`}>
      {s.label}
    </span>
  );
}

/** Sent → Being reviewed → Decision. */
function ClaimTracker({ status }: { status: DisputeStatus }) {
  const step = status === "OPEN" ? 0 : status === "UNDER_REVIEW" ? 1 : 2;
  const decided = step === 2;
  const steps = ["Sent", "Being reviewed", "Decision"];
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Claim progress">
      {steps.map((name, i) => {
        const done = i < step || (decided && i === step);
        const current = i === step && !decided;
        return (
          <li key={name} className="flex min-w-0 flex-col gap-1.5" aria-current={current ? "step" : undefined}>
            <span className={`h-1 rounded-[1px] ${current ? "bg-[#CC6600]" : done ? "bg-white/45" : "bg-white/[0.08]"}`} />
            <span className={`truncate text-[11px] ${current ? "font-semibold text-white" : done ? "text-white/65" : "text-white/35"}`}>
              {name}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Empty({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-[2px] bg-white/[0.05] text-white/45">{icon}</span>
      <p className="mt-3 text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 max-w-md text-[13px] leading-relaxed text-white/55">{body}</p>
    </div>
  );
}
