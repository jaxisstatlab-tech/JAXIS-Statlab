"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button, CopyButton, LoadingState, Modal, Toast } from "@repo/ui";
import { Peso } from "@repo/ui/MoneyDisplay";
import { ArrowRight, ArrowSquareOut, ChatCenteredText, DownloadSimple, FileText, Receipt, WarningCircle } from "@phosphor-icons/react";
import { getPaymentsByProject } from "@/features/payments/actions";
import { getProjectById } from "@/features/projects/actions";
import { StudySection } from "@/features/projects/components/StudySection";
import { PAYMENT_TYPE_LABEL, receiptNumber } from "@/features/payments/components/PaymentReceiptDocument";
import { PAYMENT_TONE_LABEL, isConfirmed, paymentTone } from "@/features/payments/client-payments";
import { getFilePreviewUrl, triggerFileDownload } from "@/lib/file-utils";
import { Meter, Panel, PanelHeader } from "@/components/dashboard/Panel";
import type { PaymentItem, ProjectPaymentsData } from "@/features/payments/schemas";
import type { ProjectDetailItem } from "@/features/projects/schemas";

// The Payment tab, like a checkout's order summary: what to pay now (one button), your payments
// with a printable receipt for each confirmed one, and the totals and how to pay on the side.

const PaymentProofUploadModal = dynamic(
  () => import("@/features/payments/components/PaymentProofUploadModal").then((m) => m.PaymentProofUploadModal),
  { ssr: false }
);

const money = (n: number) => n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function shortDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" });
}

type ToastState = { message: string; description?: string; variant: "info" | "success" | "danger" } | null;

export interface ClientPaymentViewProps {
  projectId: string;
  /** Loaded on the server so the tab opens with its content; refreshed here after an upload. */
  initialProject: ProjectDetailItem | null;
  initialData: ProjectPaymentsData | null;
}

export function ClientPaymentView({ projectId, initialProject, initialData }: ClientPaymentViewProps) {
  const preloaded = Boolean(initialProject && initialData);
  const [project, setProject] = useState<ProjectDetailItem | null>(initialProject);
  const [data, setData] = useState<ProjectPaymentsData | null>(initialData);
  const [isLoading, setIsLoading] = useState(!preloaded);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [viewing, setViewing] = useState<PaymentItem | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const loadData = useCallback(async () => {
    try {
      const [projRes, payRes] = await Promise.all([getProjectById(projectId), getPaymentsByProject(projectId)]);
      if (projRes.success) setProject(projRes.data);
      if (payRes.success) setData(payRes.data);
    } catch {
      setToast({ message: "Couldn't load your payments", description: "Check your connection and refresh the page.", variant: "danger" });
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (preloaded) return;
    loadData();
  }, [loadData, preloaded]);

  const handleUploaded = (payment: PaymentItem) => {
    setToast({
      message: "Receipt sent",
      description: `We got your receipt${payment.referenceNumber ? ` (ref ${payment.referenceNumber})` : ""}. We'll confirm it within one working day.`,
      variant: "success",
    });
    setData((prev) => (prev ? { ...prev, payments: [payment, ...prev.payments.filter((p) => p.id !== payment.id)] } : prev));
    window.dispatchEvent(new Event("jaxis:study-updated"));
    loadData();
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <LoadingState variant="page" label="Loading your payments..." />
      </div>
    );
  }

  if (!project || !data) {
    return (
      <Panel as="div">
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <WarningCircle size={28} weight="fill" className="text-white/30" />
          <p className="mt-4 text-sm font-medium text-white">We couldn&apos;t open your payments</p>
          <p className="mt-1 max-w-md text-[13px] text-white/55">Please refresh the page. If it keeps happening, message your team.</p>
          <Button asChild variant="outline" size="sm" className="mt-5">
            <Link href={`/dashboard/client/projects/${projectId}`}>Back to Overview</Link>
          </Button>
        </div>
      </Panel>
    );
  }

  const { summary, payments } = data;
  const quotationId = data.quotationId || payments[0]?.quotationId || project.id;
  const sorted = [...payments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const base = `/dashboard/client/projects/${project.id}`;

  return (
    <div className="flex flex-col gap-6 pb-24">
      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}

      <StudySection title="Payment" description="Pay by GCash or bank transfer, then upload your receipt. Every confirmed payment gets a receipt you can print." />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
          <PayNowPanel project={project} data={data} latest={sorted[0] ?? null} onUpload={() => setIsUploadOpen(true)} />

          <Panel aria-label="Your payments">
            <PanelHeader
              title="Your payments"
              count={payments.length}
              subtitle="Receipts you've sent and what we've confirmed."
            />
            {sorted.length === 0 ? (
              <p className="mx-5 mb-6 mt-4 rounded-[2px] border border-dashed border-white/10 px-4 py-6 text-center text-[13px] text-white/45 sm:mx-6">
                No payments yet. They&apos;ll show up here after you upload a receipt.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-white/[0.06] border-t border-white/[0.06]">
                {sorted.map((p) => (
                  <PaymentRow
                    key={p.id}
                    payment={p}
                    receiptHref={`${base}/payment/receipt/${p.id}`}
                    onViewUpload={() => setViewing(p)}
                    onCopy={(ref) => setToast({ message: "Reference copied", description: `${ref} is on your clipboard.`, variant: "info" })}
                  />
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <aside className="flex min-w-0 flex-col gap-6 lg:col-span-4" aria-label="Payment summary">
          <Panel aria-label="Summary">
            <PanelHeader
              title="Summary"
              aside={
                <Link href={`${base}/sow`} className="text-xs text-white/55 underline-offset-4 hover:text-white hover:underline">
                  View agreement
                </Link>
              }
            />
            <div className="px-5 pb-5 pt-3 sm:px-6">
              <p className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] text-white/45">{summary.isFullyPaid ? "Paid in full" : "Paid so far"}</span>
                <span className="font-mono text-sm text-white">
                  <Peso />
                  {money(summary.verifiedPaid)}
                  <span className="text-white/40">
                    {" of "}
                    <Peso />
                    {money(summary.totalAmount)}
                  </span>
                </span>
              </p>
              <Meter value={summary.verifiedPaid} max={summary.totalAmount || 1} label="Paid so far" className="mt-2" />
              <dl className="mt-4 flex flex-col text-[13px]">
                <SumRow label="Total price" value={summary.totalAmount} />
                <SumRow label="Deposit" value={summary.downpaymentRequired} note={summary.isDownpaymentCleared ? "Confirmed" : "Not paid yet"} />
                {summary.pendingVerification > 0 ? <SumRow label="Being checked" value={summary.pendingVerification} /> : null}
                <SumRow label="Left to pay" value={summary.remainingBalance} strong />
              </dl>
            </div>
          </Panel>

          <Panel aria-label="How to pay">
            <PanelHeader title="How to pay" />
            <ol className="flex flex-col gap-3 px-5 pb-5 pt-4 text-[13px] text-white/65 sm:px-6">
              {[
                "Send the amount by GCash or bank transfer. The accounts are in the upload window.",
                "Put your study ID in the message so we can match it.",
                "Upload a screenshot of your receipt with the reference number.",
                "We confirm it within one working day, and your receipt appears here.",
              ].map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[2px] bg-white/[0.07] font-mono text-[11px] text-white/70">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
            <div className="border-t border-white/[0.06] px-5 py-3 text-[13px] text-white/55 sm:px-6">
              Questions?{" "}
              <Link href={`${base}/messages`} className="inline-flex items-center gap-1 text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
                <ChatCenteredText size={13} weight="fill" />
                Message your team
              </Link>
            </div>
          </Panel>
        </aside>
      </div>

      {isUploadOpen ? (
        <PaymentProofUploadModal
          open
          onClose={() => setIsUploadOpen(false)}
          projectId={project.id}
          projectIntakeId={project.intakeId}
          quotationId={quotationId}
          totalAmount={summary.totalAmount}
          downpaymentRequired={summary.downpaymentRequired}
          remainingBalance={summary.remainingBalance}
          isDownpaymentCleared={summary.isDownpaymentCleared}
          onSuccess={handleUploaded}
        />
      ) : null}

      {viewing ? <UploadViewer payment={viewing} onClose={() => setViewing(null)} onToast={setToast} /> : null}
    </div>
  );
}

// ─── What to pay now ─────────────────────────────────────────────────────────

function PayNowPanel({
  project,
  data,
  latest,
  onUpload,
}: {
  project: ProjectDetailItem;
  data: ProjectPaymentsData;
  latest: PaymentItem | null;
  onUpload: () => void;
}) {
  const s = data.summary;
  const delivered = project.masterStatus === "DELIVERED" || project.masterStatus === "REVISION_REQUESTED";
  const rejected = latest?.paymentStatus === "REJECTED" ? latest : null;
  const depositDue = Math.max(0, s.downpaymentRequired - s.verifiedPaid);

  let eyebrow = "What to pay now";
  let title: string;
  let body: React.ReactNode;
  let action: React.ReactNode = null;
  let yourTurn = false;

  const uploadButton = (label: string, primary: boolean) => (
    <Button variant={primary ? "primary" : "outline"} size="sm" onClick={onUpload} className="gap-1.5">
      <Receipt size={14} weight="fill" />
      {label}
    </Button>
  );

  if (s.isFullyPaid) {
    eyebrow = "All set";
    title = "Paid in full";
    body = "Thank you. Nothing is left to pay. Your receipts are below.";
  } else if (s.pendingVerification > 0) {
    title = "We're checking your receipt";
    body = (
      <>
        You sent{" "}
        <Amount n={s.pendingVerification} />. We usually confirm payments within one working day, and your receipt appears here
        once we do.
      </>
    );
  } else if (!s.isDownpaymentCleared) {
    yourTurn = true;
    title = "Pay your deposit";
    body = (
      <>
        Send <Amount n={depositDue} /> by GCash or bank transfer, then upload your receipt. Your analysis starts once we confirm it.
      </>
    );
    action = uploadButton("Upload Receipt", true);
  } else if (delivered) {
    yourTurn = true;
    title = "Pay the rest to get your files";
    body = (
      <>
        Your files are ready. Send the remaining <Amount n={s.remainingBalance} />, then upload your receipt to unlock the downloads.
      </>
    );
    action = uploadButton("Upload Receipt", true);
  } else {
    eyebrow = "Deposit confirmed";
    title = "Nothing to pay right now";
    body = (
      <>
        The rest, <Amount n={s.remainingBalance} />, is due when your files are ready. You can pay it early if you like.
      </>
    );
    action = uploadButton("Pay the Rest Early", false);
  }

  return (
    <Panel aria-label="What to pay now" className={yourTurn ? "border-[#CC6600]/35" : ""}>
      <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium text-white/45">
            {yourTurn ? <span className="h-1.5 w-1.5 rounded-full bg-[#CC6600]" aria-hidden="true" /> : null}
            {yourTurn ? "Your turn" : eyebrow}
          </p>
          <h2 className="mt-1.5 font-sans text-lg font-semibold tracking-[-0.01em] text-white">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-white/70">{body}</p>
        </div>
        {rejected && !s.isFullyPaid ? (
          <div className="rounded-[2px] border border-white/[0.08] border-l-2 border-l-[#CC6600] bg-white/[0.02] px-4 py-3">
            <p className="text-xs font-medium text-white/50">We couldn&apos;t accept your last receipt</p>
            <p className="mt-1 text-sm leading-relaxed text-white/85">{rejected.rejectionReason || "Please check the amount and reference number, then send it again."}</p>
          </div>
        ) : null}
        {action ? <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">{action}</div> : null}
      </div>
    </Panel>
  );
}

function Amount({ n }: { n: number }) {
  return (
    <span className="whitespace-nowrap font-mono font-semibold text-white">
      <Peso />
      {money(n)}
    </span>
  );
}

function SumRow({ label, value, note, strong = false }: { label: string; value: number; note?: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-2 ${strong ? "border-t border-white/[0.08] pt-3" : "border-b border-white/[0.05]"}`}>
      <dt className={strong ? "font-medium text-white" : "text-white/45"}>
        {label}
        {note ? <span className="ml-1.5 text-xs text-white/35">{note}</span> : null}
      </dt>
      <dd className={`font-mono ${strong ? "font-semibold text-white" : "text-white/80"}`}>
        <Peso />
        {money(value)}
      </dd>
    </div>
  );
}

// ─── Payment history ─────────────────────────────────────────────────────────

const TONE_CLASS: Record<string, string> = {
  confirmed: "border-white/20 bg-white/[0.06] text-white",
  checking: "border-white/10 bg-white/[0.04] text-white/70",
  rejected: "border-[#CC6600]/50 bg-[#CC6600]/10 text-[#FFA040]",
  waiting: "border-white/10 bg-transparent text-white/50",
};

function PaymentRow({
  payment: p,
  receiptHref,
  onViewUpload,
  onCopy,
}: {
  payment: PaymentItem;
  receiptHref: string;
  onViewUpload: () => void;
  onCopy: (ref: string) => void;
}) {
  const tone = paymentTone(p);
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-[15px] font-semibold text-white">
            <Peso />
            {money(p.amountSubmitted)}
          </span>
          <span className="text-sm text-white/80">{PAYMENT_TYPE_LABEL[p.paymentType] ?? "Payment"}</span>
          <span className={`inline-flex items-center rounded-[2px] border px-2 py-0.5 text-xs font-medium ${TONE_CLASS[tone]}`}>
            {PAYMENT_TONE_LABEL[tone]}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-white/45">
          <span>{p.paymentMethod === "BANK_TRANSFER" ? "Bank transfer" : p.paymentMethod === "GCASH" ? "GCash" : "Payment"}</span>
          <span aria-hidden="true">·</span>
          <span>{"Sent " + shortDate(p.createdAt)}</span>
          {p.referenceNumber ? (
            <>
              <span aria-hidden="true">·</span>
              <CopyButton variant="ghost" value={p.referenceNumber} label={p.referenceNumber} onCopy={() => onCopy(p.referenceNumber!)} className="-ml-1.5 text-[11px]" />
            </>
          ) : null}
        </div>
        {tone === "rejected" && p.rejectionReason ? <p className="mt-1.5 text-[13px] text-white/65">Why: {p.rejectionReason}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {p.proofs[0] ? (
          <Button variant="ghost" size="sm" onClick={onViewUpload} className="gap-1.5">
            <FileText size={14} weight="fill" />
            Your Upload
          </Button>
        ) : null}
        {isConfirmed(p) ? (
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={receiptHref} aria-label={`Receipt ${receiptNumber(p.id)}`}>
              <Receipt size={14} weight="fill" />
              Receipt
              <ArrowRight size={12} weight="bold" />
            </Link>
          </Button>
        ) : null}
      </div>
    </li>
  );
}

/** The screenshot or PDF the client uploaded, with download and open-in-new-tab. */
function UploadViewer({ payment, onClose, onToast }: { payment: PaymentItem; onClose: () => void; onToast: (t: ToastState) => void }) {
  const proof = payment.proofs[0]!;
  const [imgState, setImgState] = useState<"loading" | "ok" | "error">("loading");
  const [downloading, setDownloading] = useState(false);
  const name = proof.fileName.toLowerCase();
  const isImage = /\.(png|jpe?g|webp)$/.test(name) || /\.(png|jpe?g|webp)$/.test(proof.filePath.toLowerCase());
  const url = getFilePreviewUrl(proof.filePath);

  return (
    <Modal
      open
      onClose={onClose}
      title="Your uploaded receipt"
      description={`${PAYMENT_TYPE_LABEL[payment.paymentType] ?? "Payment"} · sent ${shortDate(payment.createdAt)}`}
      size="lg"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>
              <ArrowSquareOut size={14} weight="bold" />
              Open in New Tab
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={downloading}
              className="gap-1.5"
              onClick={async () => {
                setDownloading(true);
                onToast({ message: "Download started", description: `Downloading ${proof.fileName}.`, variant: "info" });
                try {
                  await triggerFileDownload(proof.filePath, proof.fileName);
                } finally {
                  setDownloading(false);
                }
              }}
            >
              <DownloadSimple size={14} weight="bold" />
              Download
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3 font-sans">
        <p className="truncate text-[13px] text-white/70" title={proof.fileName}>
          {proof.fileName}
          {proof.fileSize ? <span className="text-white/40">{` · ${(proof.fileSize / 1024).toFixed(0)} KB`}</span> : null}
        </p>
        <div className="flex min-h-[220px] items-center justify-center overflow-auto rounded-[2px] border border-white/10 bg-[#050513] p-3">
          {isImage && imgState !== "error" ? (
            <>
              {imgState === "loading" ? <LoadingState variant="inline" label="Loading..." /> : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Receipt ${proof.fileName}`}
                onLoad={() => setImgState("ok")}
                onError={() => setImgState("error")}
                className={`max-h-[420px] w-auto max-w-full object-contain ${imgState === "ok" ? "" : "hidden"}`}
              />
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <FileText size={36} weight="fill" className="text-white/40" />
              <p className="text-[13px] text-white/60">{isImage ? "The preview didn't load. You can still download it." : "Preview isn't available for this file. Download it to open it."}</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
