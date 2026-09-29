"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button, Toast } from "@repo/ui";
import { Peso } from "@repo/ui/MoneyDisplay";
import {
  ArrowCounterClockwise,
  ArrowRight,
  ChatCenteredText,
  CheckCircle,
  Clock,
  DownloadSimple,
  Eye,
  SealCheck,
  ShieldCheck,
} from "@phosphor-icons/react";
import type { ClientDeliverablesDTO, DeliverableDTO, RevisionRequestDTO } from "../schemas";
import { getDeliverableDownloadUrl } from "../actions";
import { downloadCertificatePdf } from "../utils/generateCertificatePdf";
import { StudySection } from "@/features/projects/components/StudySection";
import { getFileMeta } from "@/lib/file-utils";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";

// The Files tab: whether your files are ready (or what's left: pay the rest, or we're still
// checking), the files to download, your change requests, and the free-change window on the side.

// Plain names for each kind of file we deliver.
const FILE_KIND: Record<string, { label: string; detail: string }> = {
  PDF_REPORT: { label: "Results write-up", detail: "Your results explained, with APA tables, ready for Chapter 4." },
  STATISTICAL_OUTPUT: { label: "Tables and output", detail: "The tables and the software output behind them." },
  RAW_DATA_CLEANED: { label: "Cleaned data", detail: "Your data after cleaning, as used in the analysis." },
  APPENDIX: { label: "Supplementary tables & charts", detail: "Additional summary tables and diagnostic charts." },
  OTHER: { label: "Other file", detail: "" },
};

const REVISION_STATUS: Record<string, { label: string; tone: "wait" | "done" | "action" | "stopped" }> = {
  PENDING_REVIEW: { label: "We're reviewing it", tone: "wait" },
  INCLUDED: { label: "Free change: we're on it", tone: "wait" },
  METHODOLOGY_CHANGE: { label: "Needs a new agreement", tone: "action" },
  NEW_PAID_WORK: { label: "New work: needs a new price", tone: "action" },
  RESOLVED: { label: "Done", tone: "done" },
  CANCELLED: { label: "Cancelled", tone: "stopped" },
};

const TONE_CLASS: Record<string, string> = {
  action: "border-[#CC6600]/50 bg-[#CC6600]/10 text-[#FFA040]",
  done: "border-white/20 bg-white/[0.06] text-white",
  stopped: "border-white/10 bg-transparent text-white/50",
  wait: "border-white/10 bg-white/[0.04] text-white/70",
};

const money = (n: number) => n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function formatDate(value?: string | null, withTime = false) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

function formatSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "1 day 18 hours left" from the window numbers. */
function timeLeft(days: number, hours: number) {
  const parts = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  if (hours > 0 || days === 0) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  return `${parts.join(" ")} left`;
}

/** Server messages are shown only when they're written for people; anything technical gets a plain line. */
function plainError(err: unknown) {
  const msg = err instanceof Error ? err.message : "";
  if (!msg || msg.length > 140 || /prisma|invocation|database|ECONN|fetch failed|timeout|undefined|null/i.test(msg)) {
    return "We couldn't get the file ready. Please try again in a moment.";
  }
  return msg;
}

function clickDownload(url: string, fileName: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.position = "fixed";
  link.style.left = "-9999px";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => link.remove(), 2000);
}

type ToastState = { message: string; description: string; variant: "info" | "success" | "danger" } | null;

interface ClientDeliverablesDeskProps {
  data: ClientDeliverablesDTO;
}

export function ClientDeliverablesDesk({ data }: ClientDeliverablesDeskProps) {
  const { project, isReleased, paymentLock, revisionWindow, deliverables, revisions, hasPendingRevision, qaCertificate } = data;
  const base = `/dashboard/client/projects/${project.id}`;
  const canRequestChanges = isReleased && revisionWindow.isActive && !hasPendingRevision;
  // The server marks files "locked" whenever money is owed; only say "pay the rest" once they're actually done.
  const filesFinished =
    ["DELIVERED", "REVISION_REQUESTED", "CLOSED", "DISPUTED"].includes(project.masterStatus) || Boolean(project.deliveredAt);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const downloadFile = async (item: DeliverableDTO, quiet = false) => {
    setDownloadingId(item.id);
    try {
      const { url, fileName } = await getDeliverableDownloadUrl(item.id);
      clickDownload(url, fileName);
      if (!quiet) setToast({ message: "Download started", description: `Downloading ${item.fileName}.`, variant: "info" });
      return true;
    } catch (err: unknown) {
      setToast({ message: "Couldn't download the file", description: plainError(err), variant: "danger" });
      return false;
    } finally {
      setDownloadingId(null);
    }
  };

  const downloadCertificate = async () => {
    if (!qaCertificate) return;
    setDownloadingId("certificate");
    try {
      const rawId = (qaCertificate.certificateId || "JAXIS-CERTIFICATE").trim();
      const cleanId = rawId.replace(/[^\w.-]/g, "_");
      clickDownload(`/api/deliverables/certificate?studyId=${project.id}`, cleanId.toLowerCase().endsWith(".pdf") ? cleanId : `${cleanId}.pdf`);
      setToast({ message: "Download started", description: "Downloading your certificate (PDF).", variant: "info" });
    } catch {
      try {
        await downloadCertificatePdf(qaCertificate);
        setToast({ message: "Download started", description: "Downloading your certificate (PDF).", variant: "info" });
      } catch (clientErr: unknown) {
        setToast({
          message: "Couldn't download the certificate",
          description: clientErr instanceof Error ? clientErr.message : "Please try again in a moment.",
          variant: "danger",
        });
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const downloadAll = async () => {
    if (downloadingAll) return;
    setDownloadingAll(true);
    const count = deliverables.length + (qaCertificate ? 1 : 0);
    setToast({ message: "Download started", description: `Downloading ${count} ${count === 1 ? "file" : "files"}.`, variant: "info" });
    for (const item of deliverables) {
      await downloadFile(item, true);
      await new Promise((r) => setTimeout(r, 600));
    }
    if (qaCertificate) await downloadCertificate();
    setDownloadingAll(false);
  };

  // ── What's happening ──
  let eyebrow = "What's happening";
  let title: string;
  let body: React.ReactNode;
  let yourTurn = false;
  let action: React.ReactNode = null;

  if (isReleased) {
    eyebrow = "Ready";
    title = "Your files are ready";
    body = "Download them below. A second statistical analyst checked everything before we released it.";
    if (canRequestChanges) {
      action = (
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={`${base}/revision`}>
            <ArrowCounterClockwise size={14} weight="bold" />
            Request Changes
          </Link>
        </Button>
      );
    }
  } else if (paymentLock?.isLocked && filesFinished) {
    yourTurn = true;
    title = "Pay the rest to get your files";
    body = (
      <>
        Your files are finished and checked. Pay the remaining{" "}
        <span className="whitespace-nowrap font-mono font-semibold text-white">
          <Peso />
          {money(paymentLock.remainingBalance)}
        </span>{" "}
        and the downloads open here as soon as we confirm it.
      </>
    );
    action = (
      <Button asChild variant="primary" size="sm" className="gap-1.5">
        <Link href={`${base}/payment`}>
          Pay the Rest
          <ArrowRight size={13} weight="bold" />
        </Link>
      </Button>
    );
  } else if (filesFinished && !paymentLock?.isLocked) {
    // Finished study but nothing to show: removed after the 90 days, or not released here yet.
    const purged = project.filesPurgeAt ? new Date(project.filesPurgeAt).getTime() < Date.now() : false;
    title = purged ? "Your files were removed" : "No files here yet";
    body = purged
      ? `We keep files for 90 days after delivery; this study's were removed on ${formatDate(project.filesPurgeAt)}. Message your team if you need them.`
      : "Your study is finished, but no files are showing here. Message your team and we'll sort it out.";
    action = (
      <Button asChild variant="outline" size="sm" className="gap-1.5">
        <Link href={`${base}/messages`}>
          <ChatCenteredText size={14} weight="fill" />
          Message Your Team
        </Link>
      </Button>
    );
  } else {
    const checking = project.masterStatus === "FOR_QA" || project.masterStatus === "QA_REVISION";
    title = checking ? "We're checking your files" : "Your files aren't ready yet";
    body = checking
      ? "Your statistical analyst has finished. A second statistical analyst is checking the results and tables before we release them to you here."
      : "Your statistical analyst is still working on your analysis. Your files appear here once it's done and checked.";
    action = (
      <Button asChild variant="outline" size="sm" className="gap-1.5">
        <Link href={`${base}/messages`}>
          <ChatCenteredText size={14} weight="fill" />
          Message Your Team
        </Link>
      </Button>
    );
  }

  const fileCount = deliverables.length + (qaCertificate ? 1 : 0);

  return (
    <div className="flex flex-col gap-6 pb-24">
      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}

      <StudySection title="Your files" description="Your write-up, tables, cleaned data and code, checked before release." />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
          <Panel aria-label="What's happening" className={yourTurn ? "border-[#CC6600]/35" : ""}>
            <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6">
              <div>
                <p className="flex items-center gap-2 text-xs font-medium text-white/45">
                  {yourTurn ? <span className="h-1.5 w-1.5 rounded-full bg-[#CC6600]" aria-hidden="true" /> : null}
                  {yourTurn ? "Your turn" : eyebrow}
                </p>
                <h2 className="mt-1.5 font-sans text-lg font-semibold tracking-[-0.01em] text-white">{title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-white/70">{body}</p>
              </div>
              {hasPendingRevision ? (
                <p className="text-[13px] text-white/60">We&apos;re reviewing the changes you asked for. You&apos;ll see our answer below.</p>
              ) : null}
              {action ? <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">{action}</div> : null}
            </div>
          </Panel>

          {isReleased ? (
            <Panel aria-label="Files to download">
              <PanelHeader
                title="Files to download"
                count={fileCount}
                aside={
                  fileCount > 1 ? (
                    <Button variant="outline" size="sm" onClick={downloadAll} loading={downloadingAll} className="gap-1.5">
                      <DownloadSimple size={14} weight="bold" />
                      Download All
                    </Button>
                  ) : undefined
                }
              />
              {fileCount === 0 ? (
                <p className="mx-5 mb-6 mt-4 rounded-[2px] border border-dashed border-white/10 px-4 py-6 text-center text-[13px] text-white/45 sm:mx-6">
                  No files here yet. Message your team if you expected some.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-white/[0.06] border-t border-white/[0.06]">
                  {deliverables.map((file) => {
                    const kind = FILE_KIND[file.category] ?? FILE_KIND.OTHER!;
                    const meta = getFileMeta(file.fileName, file.fileType);
                    return (
                      <FileRow
                        key={file.id}
                        badge={<span className="font-mono text-[10px] font-semibold text-white/70">{meta.ext}</span>}
                        name={file.fileName}
                        kind={kind.label}
                        detail={kind.detail}
                        meta={[formatSize(file.fileSize), file.releasedAt || file.createdAt ? `Released ${formatDate(file.releasedAt || file.createdAt)}` : ""]}
                        loading={downloadingId === file.id}
                        onDownload={() => downloadFile(file)}
                      />
                    );
                  })}
                  {qaCertificate ? (
                    <FileRow
                      badge={<SealCheck size={18} weight="fill" className="text-white/70" />}
                      name="Certificate of Statistical Audit"
                      kind="Certificate"
                      detail={`Shows your analysis was checked by a second statistical analyst. Signed by ${qaCertificate.qaLeadName}.`}
                      meta={["PDF", qaCertificate.completionDate ? `Checked ${qaCertificate.completionDate}` : ""]}
                      loading={downloadingId === "certificate"}
                      onDownload={downloadCertificate}
                      viewHref={`${base}/deliverables/certificate`}
                    />
                  ) : null}
                </ul>
              )}
            </Panel>
          ) : null}

          {revisions.length > 0 ? (
            <Panel aria-label="Your change requests">
              <PanelHeader title="Your change requests" count={revisions.length} subtitle="What you asked us to change and our answer." />
              <ul className="mt-4 divide-y divide-white/[0.06] border-t border-white/[0.06]">
                {revisions.map((rev) => (
                  <RevisionRow key={rev.id} rev={rev} />
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-6 lg:col-span-4" aria-label="About your files">
          {isReleased ? (
            <Panel aria-label="Free changes">
              <PanelHeader title="Free changes" subtitle="One round of changes within your agreed scope is included." />
              <div className="flex flex-col gap-3 px-5 pb-5 pt-4 sm:px-6">
                {revisionWindow.isActive ? (
                  <>
                    <p className="flex items-center gap-2 text-sm font-medium text-white">
                      <Clock size={16} weight="fill" className="text-white/50" />
                      {timeLeft(revisionWindow.remainingDays, revisionWindow.remainingHours)}
                    </p>
                    {revisionWindow.expiresAtFormatted ? (
                      <p className="text-[13px] text-white/55">Ask by {revisionWindow.expiresAtFormatted}.</p>
                    ) : null}
                    {canRequestChanges ? (
                      <Button asChild variant="outline" size="sm" className="mt-1 w-full gap-1.5">
                        <Link href={`${base}/revision`}>
                          <ArrowCounterClockwise size={14} weight="bold" />
                          Request Changes
                        </Link>
                      </Button>
                    ) : (
                      <p className="text-[13px] text-white/55">You already sent a change request for this study.</p>
                    )}
                  </>
                ) : (
                  <p className="text-[13px] leading-relaxed text-white/60">
                    The free-change window has closed. For more changes, message your team and we&apos;ll price them for you.
                  </p>
                )}
              </div>
            </Panel>
          ) : null}

          {isReleased ? (
            <Panel aria-label="Keep a copy">
              <PanelHeader title="Keep a copy" />
              <p className="px-5 pb-5 pt-3 text-[13px] leading-relaxed text-white/60 sm:px-6">
                We keep your files for 90 days after delivery
                {project.filesPurgeAt ? `, until ${formatDate(project.filesPurgeAt)}` : ""}. Download a copy to your computer or
                Google Drive before then.
              </p>
            </Panel>
          ) : null}

          <Panel aria-label="Need help">
            <PanelHeader title="Need help?" subtitle="Our team replies in your study's messages." />
            <div className="flex flex-col gap-2 px-5 pb-5 pt-4 sm:px-6">
              <Button asChild variant="outline" size="sm" className="w-full gap-1.5">
                <Link href={`${base}/messages`}>
                  <ChatCenteredText size={14} weight="fill" />
                  Message Your Team
                </Link>
              </Button>
              {isReleased ? (
                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link href="/dashboard/client/disputes">Revisions &amp; Help</Link>
                </Button>
              ) : null}
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function FileRow({
  badge,
  name,
  kind,
  detail,
  meta,
  loading,
  onDownload,
  viewHref,
}: {
  badge: React.ReactNode;
  name: string;
  kind: string;
  detail: string;
  meta: string[];
  loading: boolean;
  onDownload: () => void;
  /** Optional page to view (and print) this item. */
  viewHref?: string;
}) {
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[2px] border border-white/10 bg-white/[0.04]">{badge}</span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="truncate text-sm font-medium text-white" title={name}>
              {name}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-white/55">
            <span className="text-white/75">{kind}</span>
            {meta.filter(Boolean).map((m) => (
              <span key={m}>{" · " + m}</span>
            ))}
          </p>
          {detail ? <p className="mt-1 text-[13px] leading-relaxed text-white/50">{detail}</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
        {viewHref ? (
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link href={viewHref} aria-label={`View ${name}`}>
              <Eye size={14} weight="fill" />
              View
            </Link>
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          onClick={onDownload}
          loading={loading}
          disabled={loading}
          className="gap-1.5"
          aria-label={`Download ${name}`}
        >
          <DownloadSimple size={14} weight="bold" />
          {loading ? "Preparing..." : "Download"}
        </Button>
      </div>
    </li>
  );
}

function RevisionRow({ rev }: { rev: RevisionRequestDTO }) {
  const status = REVISION_STATUS[rev.status] ?? { label: "In review", tone: "wait" as const };
  return (
    <li className="flex flex-col gap-2 px-5 py-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`inline-flex items-center gap-1.5 rounded-[2px] border px-2 py-0.5 text-xs font-medium ${TONE_CLASS[status.tone]}`}>
          {status.tone === "done" ? <CheckCircle size={12} weight="fill" /> : status.tone === "wait" ? <ShieldCheck size={12} weight="fill" /> : null}
          {status.label}
        </span>
        <span className="text-xs text-white/45">{"Sent " + formatDate(rev.createdAt)}</span>
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-white/80">{rev.description}</p>
      {rev.requestedSections ? (
        <p className="text-[13px] text-white/55">
          <span className="text-white/75">Parts to change: </span>
          {rev.requestedSections}
        </p>
      ) : null}
      {rev.classificationNotes ? (
        <div className="rounded-[2px] border border-white/[0.08] border-l-2 border-l-white/30 bg-white/[0.02] px-4 py-3">
          <p className="text-xs font-medium text-white/50">Our note</p>
          <p className="mt-1 text-[13px] leading-relaxed text-white/80">{rev.classificationNotes}</p>
        </div>
      ) : null}
    </li>
  );
}
