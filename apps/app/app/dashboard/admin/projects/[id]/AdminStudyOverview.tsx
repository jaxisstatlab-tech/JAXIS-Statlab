"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, DropdownMenu, Modal, Peso, Toast } from "@repo/ui";
import { ArrowRight, Calculator, Copy, FileText, Question, SlidersHorizontal, Warning } from "@phosphor-icons/react";
import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/Panel";
import { StudySection } from "@/features/projects/components/StudySection";
import { ProjectFilesCard } from "@/features/projects/components/ProjectFilesCard";
import { FinalFilesCard } from "@/features/deliverables/components/FinalFilesCard";
import type { DeliverableDTO, QaCertificateDTO } from "@/features/deliverables/schemas";
import { AnalysisGoalsList } from "@/features/projects/components/AnalysisGoalsList";
import { clientPackageName } from "@/features/projects/client-packages";
import { markIntakeComplete, requestMissingInfo, updateProjectStatus } from "@/features/projects/actions";
import { QuotationBuilderModal } from "@/features/quotations/components/QuotationBuilderModal";
import { AssignmentModal } from "@/features/assignments/components/AssignmentModal";
import { ProjectAssignmentCard } from "@/features/assignments/components/ProjectAssignmentCard";
import { regionLabel } from "@/features/client-profile/regions";
import { MANUAL_STATUS_HELP, MISSING_INFO_TEMPLATES, PROJECT_STATUS_LABELS, VALID_TRANSITIONS, manualTransitionsFrom } from "@/lib/project-rules";
import type { CommercialCatalogData } from "@/lib/pricing-rules";
import type { ProjectDetailItem } from "@/features/projects/schemas";
import type { QuotationDetailItem } from "@/features/quotations/schemas";
import type { SOWDetailItem } from "@/features/sow/schemas";
import type { AssignmentDetailItem } from "@/features/assignments/schemas";
import type { ProjectStatus } from "@prisma/client";

// Admin study overview: what happens next (one orange button), the client's request and files, price and
// agreement, the team, and the client. Data comes from the server page; router.refresh() reloads it after a change.

type ToastState = { message: string; description?: string; variant: "info" | "success" | "warning" | "danger" } | null;

const DAY = 86_400_000;
const FIELD =
  "w-full rounded-[2px] border border-white/10 bg-[#050513] font-sans text-[13px] text-white outline-none placeholder:text-white/30 focus:border-[#CC6600]/60";

const QUIET_LINK = "text-[13px] text-white/70 underline-offset-2 transition-colors hover:text-white hover:underline";

const money = (n: number) => n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const date = (d?: Date | string | null) =>
  d ? new Date(d).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" }) : "—";
const dateTime = (d?: Date | string | null) =>
  d ? new Date(d).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

export function AdminStudyOverview({
  project,
  quotation = null,
  sow = null,
  assignment = null,
  catalog,
  finalFiles = [],
  certificate = null,
  loadError,
}: {
  project?: ProjectDetailItem;
  finalFiles?: DeliverableDTO[];
  certificate?: QaCertificateDTO | null;
  quotation?: QuotationDetailItem | null;
  sow?: SOWDetailItem | null;
  assignment?: AssignmentDetailItem | null;
  catalog?: CommercialCatalogData;
  loadError?: string;
}) {
  const router = useRouter();
  const [toast, setToast] = useState<ToastState>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [busy, start] = useTransition();

  if (!project) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 font-sans animate-content-fade">
        <Panel as="div">
          <PanelBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white">This study didn&apos;t load</p>
              <p className="mt-0.5 text-[13px] text-white/55">{loadError || "Try again in a moment."}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.refresh()}>
              Try Again
            </Button>
          </PanelBody>
        </Panel>
      </div>
    );
  }

  const s = project.masterStatus;
  const base = `/dashboard/admin/projects/${project.id}`;
  const analyst = assignment?.statistician.fullName;
  const reviewer = assignment?.qaLead.fullName;
  const manual = manualTransitionsFrom(s);
  const canAsk = s === "AWAITING_INFORMATION" || (VALID_TRANSITIONS[s] ?? []).includes("AWAITING_INFORMATION");

  const markReady = () =>
    start(async () => {
      const res = await markIntakeComplete(project.id);
      if (res.success) {
        setToast({ message: "Ready to price", description: "Build the quote next.", variant: "success" });
        router.refresh();
      } else setToast({ message: "Couldn't mark it ready", description: res.error.message, variant: "danger" });
    });

  // What happens next, and the one main button for it.
  const quoteButton = (primary: boolean) => (
    <Button variant={primary ? "primary" : "outline"} size="sm" onClick={() => setQuoteOpen(true)} className="gap-1.5 active:scale-[0.97]">
      <Calculator size={14} weight="fill" />
      {quotation ? (quotation.status === "DRAFT" ? "Edit Quote" : "View Quote") : "Build Quote"}
    </Button>
  );
  const linkButton = (href: string, label: string, primary = false) => (
    <Button asChild variant={primary ? "primary" : "outline"} size="sm" className="gap-1.5 active:scale-[0.97]">
      <Link href={href}>
        {label}
        <ArrowRight size={13} weight="bold" />
      </Link>
    </Button>
  );

  let next: { text: string; action: React.ReactNode } = { text: "", action: null };
  if (s === "NEW_REQUEST")
    next = {
      text: "Check the request and files. Mark it ready to price, or ask the client for what's missing.",
      action: (
        <Button variant="primary" size="sm" onClick={markReady} loading={busy} className="active:scale-[0.97]">
          Mark Ready to Price
        </Button>
      ),
    };
  else if (s === "AWAITING_INFORMATION")
    next = {
      text: "Waiting for the client to add what you asked for. Mark it ready to price once it's in.",
      action: (
        <Button variant="outline" size="sm" onClick={markReady} loading={busy} className="active:scale-[0.97]">
          Mark Ready to Price
        </Button>
      ),
    };
  else if (s === "UNDER_EVALUATION") next = { text: "Build the quote and send it to the client.", action: quoteButton(true) };
  else if (s === "QUOTE_SENT") next = { text: "Waiting for the client to accept the quote.", action: quoteButton(false) };
  else if (s === "CLIENT_APPROVED")
    next = { text: "The client accepted the quote. Draft the agreement for them to sign.", action: linkButton(`${base}/sow`, sow ? "Open Agreement" : "Draft Agreement", true) };
  else if (s === "SOW_PENDING") next = { text: "Waiting for the client to sign the agreement.", action: linkButton(`${base}/sow`, "View Agreement") };
  else if (s === "SOW_SIGNED" || s === "AWAITING_PAYMENT")
    next = {
      text: project.hasPendingPaymentVerification
        ? "The client sent a payment. Finance checks it; the study opens for assignment once it's confirmed."
        : "Signed. Waiting for the client's deposit.",
      action: linkButton(`${base}/payment`, "Payment"),
    };
  else if (s === "ACTIVE")
    next = {
      text: "Deposit confirmed. Assign an analyst and a reviewer.",
      action: (
        <Button variant="primary" size="sm" onClick={() => setAssignOpen(true)} className="active:scale-[0.97]">
          Assign Team
        </Button>
      ),
    };
  else if (s === "EXPERT_ASSIGNED") next = { text: `${analyst ?? "The analyst"} hasn't started yet.`, action: linkButton(`${base}/analysis`, "Analysis") };
  else if (s === "IN_PROGRESS") next = { text: `${analyst ?? "The analyst"} is working on it.`, action: linkButton(`${base}/analysis`, "Analysis") };
  else if (s === "SLA_PAUSED") next = { text: "The deadline is paused. Resume it on the Team card when the client answers.", action: null };
  else if (s === "SCOPE_CREEP_HALTED")
    next = { text: "On hold: the analyst flagged extra work. Price it with the client, then let the work continue.", action: linkButton(`${base}/analysis`, "Analysis") };
  else if (s === "FOR_QA") next = { text: `With ${reviewer ?? "the reviewer"} for checking.`, action: linkButton(`${base}/analysis`, "Analysis") };
  else if (s === "QA_REVISION") next = { text: `${reviewer ?? "The reviewer"} sent it back to ${analyst ?? "the analyst"} for changes.`, action: linkButton(`${base}/analysis`, "Analysis") };
  else if (s === "DELIVERED") next = { text: `Delivered ${date(project.deliveredAt)}.`, action: linkButton(`${base}/deliverables`, "Files") };
  else if (s === "REVISION_REQUESTED") next = { text: "The client asked for changes. Check the request on Files.", action: linkButton(`${base}/deliverables`, "Files", true) };
  else if (s === "DISPUTED") next = { text: "The client opened a claim. The CEO handles it.", action: null };
  else if (s === "ETHICAL_BREACH") next = { text: "Reported to the CEO by the reviewer. The study is locked.", action: null };
  else if (s === "REASSIGNMENT_NEEDED")
    next = {
      text: "Pick a new analyst or reviewer.",
      action: (
        <Button variant="primary" size="sm" onClick={() => setAssignOpen(true)} className="active:scale-[0.97]">
          Reassign Team
        </Button>
      ),
    };
  else next = { text: `${PROJECT_STATUS_LABELS[s] ?? s}.`, action: null };

  const menu = [
    ...(quotation ? [{ label: "Quote", subtitle: "Package, price and what's included", icon: <Calculator size={16} weight="fill" />, onClick: () => setQuoteOpen(true) }] : []),
    { label: "Agreement", subtitle: sow ? (sow.isLocked ? "Signed" : "Sent, not signed yet") : "Not drafted yet", icon: <FileText size={16} weight="fill" />, onClick: () => router.push(`${base}/sow`) },
    ...(canAsk
      ? [{ label: "Ask for missing info", subtitle: "Tell the client what to add", icon: <Question size={16} weight="fill" />, onClick: () => setAskOpen(true) }]
      : []),
    ...(manual.length > 0
      ? [{ label: "Change status", subtitle: "Cancel, close, back to pricing…", icon: <SlidersHorizontal size={16} weight="fill" />, onClick: () => setStatusOpen(true) }]
      : []),
    {
      label: "Copy study ID",
      subtitle: project.intakeId,
      dividerBefore: true,
      icon: <Copy size={16} weight="fill" />,
      onClick: () => {
        void navigator.clipboard?.writeText(project.intakeId).then(() => setToast({ message: "Study ID copied", description: project.intakeId, variant: "success" }));
      },
    },
  ];

  const due = new Date(project.deadlineRequested).getTime() - Date.now();
  // Payment proofs, results and claim evidence have their own tabs.
  const requestFiles = project.files.filter((f) => ["RESEARCH_DOCUMENT", "DATASET", "QUESTIONNAIRE"].includes(f.fileCategory));
  const fs = project.financialSummary;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 font-sans animate-content-fade">
      <StudySection
        title="Overview"
        description={next.text}
        actions={
          <>
            {next.action}
            <DropdownMenu items={menu} align="end" />
          </>
        }
      />

      {s === "AWAITING_INFORMATION" && project.missingInfoReason ? (
        <Notice title="You asked the client for">
          <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-white/75">&ldquo;{project.missingInfoReason}&rdquo;</p>
        </Notice>
      ) : null}
      {project.hasPendingPaymentVerification && s !== "SOW_SIGNED" && s !== "AWAITING_PAYMENT" ? (
        <Notice title="A payment is waiting to be checked">
          <p className="mt-0.5 text-[13px] text-white/55">
            Finance confirms it on the Payment tab.{" "}
            <Link href={`${base}/payment`} className="text-white underline underline-offset-2">
              Open Payment
            </Link>
          </p>
        </Notice>
      ) : null}
      {project.hasActiveDispute || project.hasPendingRefund ? (
        <Notice title={project.hasActiveDispute ? "The client opened a claim" : "A refund is pending"}>
          <p className="mt-0.5 text-[13px] text-white/55">Study pay waits until it&apos;s settled.</p>
        </Notice>
      ) : null}

      <Panel as="div">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4 sm:px-6 lg:grid-cols-4">
          <Fact label="Client" value={project.client.fullName} sub={project.client.clientProfile?.institutionSchool ?? null} />
          <Fact
            label="Client needs it by"
            value={
              <>
                {date(project.deadlineRequested)}
                {!["DELIVERED", "CLOSED", "CANCELLED", "EXPIRED"].includes(s) ? (
                  <span className="text-white/40"> · {due < 0 ? `${Math.ceil(-due / DAY)} days ago` : `in ${Math.ceil(due / DAY)} days`}</span>
                ) : null}
              </>
            }
          />
          <Fact
            label="Price"
            value={
              quotation ? (
                <>
                  <Peso />
                  {money(quotation.totalAmount)}
                </>
              ) : (
                <span className="text-white/40">No quote yet</span>
              )
            }
            sub={quotation ? `${clientPackageName(quotation.packageName) ?? quotation.packageName} · deposit ₱${money(quotation.downpaymentRequired)}` : null}
          />
          <Fact
            label="Paid"
            value={
              fs && fs.totalAmount > 0 ? (
                <>
                  <Peso />
                  {money(fs.verifiedPaid)}
                  <span className="text-white/40"> of {money(fs.totalAmount)}</span>
                </>
              ) : (
                <span className="text-white/40">—</span>
              )
            }
            sub={fs && fs.totalAmount > 0 ? (fs.isFullyPaid ? "Paid in full" : fs.isDownpaymentCleared ? `₱${money(fs.remainingBalance)} left` : "Deposit not confirmed yet") : null}
          />
        </dl>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          {finalFiles.length > 0 || certificate ? <FinalFilesCard projectId={project.id} files={finalFiles} certificate={certificate} /> : null}
          <Panel>
            <PanelHeader title="What the client asked" subtitle={`Sent ${dateTime(project.createdAt)}`} />
            <PanelBody className="flex flex-col gap-5">
              <Block title="Statement of the problem" text={project.researchQuestions} />
              <Block title="What the study wants to find out" text={project.researchObjectives} />
              {project.hypotheses?.trim() ? <Block title="Hypotheses" text={project.hypotheses} /> : null}
              <div>
                <p className="text-[12px] font-medium text-white/45">What they want the analysis to do</p>
                <div className="mt-1.5">
                  <AnalysisGoalsList codes={project.analysisGoals} />
                </div>
              </div>
            </PanelBody>
          </Panel>
          <ProjectFilesCard files={requestFiles} studyId={project.intakeId} />
        </div>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <Panel>
            <PanelHeader title="Price and agreement" />
            <PanelBody className="flex flex-col gap-4 text-[13px]">
              <div>
                <p className="text-[12px] text-white/45">Quote</p>
                {quotation ? (
                  <p className="mt-0.5 text-white">
                    {quotation.status === "CLIENT_APPROVED"
                      ? "Accepted by the client"
                      : quotation.status === "QUOTE_SENT"
                        ? quotation.isExpired
                          ? "Sent, expired"
                          : `Sent, valid until ${date(quotation.expiresAt)}`
                        : quotation.status === "DRAFT"
                          ? "Draft, not sent"
                          : quotation.status === "QUOTE_DECLINED"
                            ? "Declined by the client"
                            : quotation.status === "QUOTE_EXPIRED"
                            ? "Expired"
                            : "Replaced by a newer quote"}
                    {quotation.lineItems.length > 0 ? (
                      <span className="text-white/45">
                        {" "}
                        · {quotation.lineItems.length} {quotation.lineItems.length === 1 ? "item" : "items"}
                      </span>
                    ) : null}
                  </p>
                ) : (
                  <p className="mt-0.5 text-white/45">Not built yet</p>
                )}
              </div>
              <div>
                <p className="text-[12px] text-white/45">Agreement</p>
                <p className="mt-0.5 text-white">
                  {sow?.isLocked
                    ? `Signed by ${sow.signedByName || project.client.fullName}${sow.signedAt ? ` on ${date(sow.signedAt)}` : ""}`
                    : sow
                      ? "Sent, waiting for the client's signature"
                      : s === "CLIENT_APPROVED"
                        ? "Ready to draft"
                        : ["NEW_REQUEST", "AWAITING_INFORMATION", "UNDER_EVALUATION", "QUOTE_SENT"].includes(s)
                          ? "After the client accepts the quote"
                          : "None on file"}
                </p>
                {sow ? <p className="mt-0.5 text-white/45">{sow.turnaroundDays} working days to deliver</p> : null}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[0.06] pt-3">
                {quotation ? (
                  <button type="button" onClick={() => setQuoteOpen(true)} className={QUIET_LINK}>
                    Open quote
                  </button>
                ) : null}
                <Link href={`${base}/sow`} className={QUIET_LINK}>
                  Agreement
                </Link>
                <Link href={`${base}/payment`} className={QUIET_LINK}>
                  Payment
                </Link>
              </div>
            </PanelBody>
          </Panel>

          {assignment ? (
            <ProjectAssignmentCard assignment={assignment} onRefresh={() => router.refresh()} onReassign={() => setAssignOpen(true)} canManage />
          ) : (
            <Panel>
              <PanelHeader title="Team" />
              <PanelBody className="flex flex-col items-start gap-3">
                <p className="text-[13px] text-white/55">
                  {s === "ACTIVE" ? "No analyst or reviewer yet." : "Assigned after the deposit is confirmed."}
                </p>
                {s === "ACTIVE" ? (
                  <Button variant="outline" size="sm" onClick={() => setAssignOpen(true)}>
                    Assign Team
                  </Button>
                ) : null}
              </PanelBody>
            </Panel>
          )}

          <Panel>
            <PanelHeader title="Client" />
            <PanelBody>
              <dl className="flex flex-col gap-3 text-[13px]">
                <Row label="Name" value={project.client.fullName} />
                <Row label="Email" value={project.client.email} copy />
                {project.client.clientProfile ? (
                  <>
                    <Row label="School" value={project.client.clientProfile.institutionSchool} />
                    <Row label="Program" value={project.client.clientProfile.academicProgram} />
                    <Row label="Phone" value={project.client.clientProfile.contactNumber} copy />
                    <Row label="Region" value={regionLabel(project.client.clientProfile.region)} />
                  </>
                ) : (
                  <p className="text-white/45">The client hasn&apos;t filled in their school details yet.</p>
                )}
              </dl>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Record" />
            <PanelBody>
              <dl className="flex flex-col gap-3 text-[13px]">
                <Row label="Sent" value={dateTime(project.createdAt)} />
                <Row label="Last changed" value={dateTime(project.updatedAt)} />
                <Row label="Stage" value={PROJECT_STATUS_LABELS[s] ?? s} />
                {project.deliveredAt ? <Row label="Delivered" value={dateTime(project.deliveredAt)} /> : null}
              </dl>
            </PanelBody>
          </Panel>
        </div>
      </div>

      <AskInfoDialog
        open={askOpen}
        projectId={project.id}
        initial={project.missingInfoReason ?? ""}
        clientName={project.client.fullName}
        onClose={() => setAskOpen(false)}
        onSent={() => {
          setAskOpen(false);
          setToast({ message: "Request sent", description: `${project.client.fullName} will see what to add.`, variant: "success" });
          router.refresh();
        }}
      />
      <StatusDialog
        open={statusOpen}
        projectId={project.id}
        current={s}
        options={manual}
        onClose={() => setStatusOpen(false)}
        onDone={(to) => {
          setStatusOpen(false);
          setToast({ message: "Status changed", description: `Now: ${PROJECT_STATUS_LABELS[to] ?? to}.`, variant: "success" });
          router.refresh();
        }}
      />
      <QuotationBuilderModal
        isOpen={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        projectId={project.id}
        projectIntakeId={project.intakeId}
        projectTitle={project.researchTitle}
        clientName={project.client.fullName}
        analysisGoals={project.analysisGoals}
        existingQuotation={quotation}
        customCatalog={catalog}
        onSuccess={() => router.refresh()}
      />
      <AssignmentModal
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
        projectId={project.id}
        projectTitle={project.researchTitle}
        projectMethod={project.packageName?.replace(/_/g, " ")}
        turnaroundDays={sow?.turnaroundDays}
        existingAssignment={assignment}
        onSuccess={() => {
          setToast({
            message: assignment ? "Team changed" : "Team assigned",
            description: "The deadline countdown has started.",
            variant: "success",
          });
          router.refresh();
        }}
      />

      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

function Notice({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <Panel as="div">
      <PanelBody className="flex items-start gap-3">
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#CC6600]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">{title}</p>
          {children}
        </div>
      </PanelBody>
    </Panel>
  );
}

function Fact({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-white/45">{label}</dt>
      <dd className="mt-0.5 text-sm text-white sm:truncate">{value}</dd>
      {sub ? <dd className="text-[12px] text-white/45 sm:truncate">{sub}</dd> : null}
    </div>
  );
}

function Block({ title, text }: { title: string; text?: string | null }) {
  return (
    <div>
      <p className="text-[12px] font-medium text-white/45">{title}</p>
      <p className={`mt-1 whitespace-pre-line text-[13px] leading-relaxed ${text?.trim() ? "text-white/85" : "text-white/35"}`}>{text?.trim() || "Not given"}</p>
    </div>
  );
}

function Row({ label, value, copy }: { label: string; value?: string | null; copy?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-white/45">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1.5 text-right text-white">
        <span className="truncate">{value || "—"}</span>
        {copy && value ? (
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(value).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
            aria-label={`Copy ${label.toLowerCase()}`}
            className="shrink-0 rounded-[2px] p-0.5 text-[11px] text-white/40 hover:text-white"
          >
            {copied ? "Copied" : <Copy size={12} weight="fill" />}
          </button>
        ) : null}
      </dd>
    </div>
  );
}

function AskInfoDialog({
  open,
  projectId,
  initial,
  clientName,
  onClose,
  onSent,
}: {
  open: boolean;
  projectId: string;
  initial: string;
  clientName: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setText(initial);
      setError(null);
    }
  }
  if (!open) return null;
  const send = () => {
    if (text.trim().length < 5) return setError("Say what the client should add (at least 5 characters).");
    setError(null);
    start(async () => {
      const res = await requestMissingInfo({ projectId, reason: text.trim() });
      if (res.success) onSent();
      else setError(res.error.message);
    });
  };
  return (
    <Modal
      open
      onClose={() => (busy ? undefined : onClose())}
      title="Ask for missing info"
      description={`${clientName} sees exactly what you write here, and the study waits for them.`}
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={send} loading={busy}>
            Send Request
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 font-sans">
        <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
          Start from a common request (optional)
          <select
            value=""
            onChange={(e) => {
              const t = MISSING_INFO_TEMPLATES.find((x) => x.id === e.target.value);
              if (t) setText(t.text);
            }}
            className={`${FIELD} h-9 cursor-pointer px-2.5 [&>option]:bg-[#0A0A18]`}
          >
            <option value="">Pick one…</option>
            {MISSING_INFO_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
          What should the client add?
          <textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="For example: please upload the questionnaire and tell us how many respondents answered."
            className={`${FIELD} resize-none p-3 leading-relaxed`}
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
}

function StatusDialog({
  open,
  projectId,
  current,
  options,
  onClose,
  onDone,
}: {
  open: boolean;
  projectId: string;
  current: ProjectStatus;
  options: ProjectStatus[];
  onClose: () => void;
  onDone: (to: ProjectStatus) => void;
}) {
  const [to, setTo] = useState<ProjectStatus | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setTo(options[0] ?? null);
      setReason("");
      setError(null);
    }
  }
  if (!open) return null;
  const apply = () => {
    if (!to) return;
    setError(null);
    start(async () => {
      const res = await updateProjectStatus({ projectId, status: to, reason: reason.trim() || undefined });
      if (res.success) onDone(to);
      else setError(res.error.message);
    });
  };
  return (
    <Modal
      open
      onClose={() => (busy ? undefined : onClose())}
      title="Change status"
      description={`Now: ${PROJECT_STATUS_LABELS[current] ?? current}. Quote, agreement, payment, team and review each move the study on their own; this is for everything else.`}
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={to === "CANCELLED" ? "danger" : "primary"} size="sm" onClick={apply} loading={busy} disabled={!to}>
            Change Status
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 font-sans">
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="New status">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={to === o}
              onClick={() => setTo(o)}
              className={`rounded-[2px] border px-3.5 py-2.5 text-left transition-colors ${to === o ? "border-[#CC6600]/70 bg-[#CC6600]/[0.06]" : "border-white/10 hover:border-white/25"}`}
            >
              <p className="text-sm font-medium text-white">{PROJECT_STATUS_LABELS[o] ?? o}</p>
              {MANUAL_STATUS_HELP[o] ? <p className="mt-0.5 text-[12px] text-white/50">{MANUAL_STATUS_HELP[o]}</p> : null}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
          Why (optional, saved in the activity log)
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} className={`${FIELD} resize-none p-3`} />
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
}
