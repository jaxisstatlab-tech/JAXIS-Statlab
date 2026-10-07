"use client";

import React, { useState } from "react";
import { Button, CopyButton, KpiCard, LoadingState, Modal, Peso } from "@repo/ui";
import { ArrowSquareOut, CheckCircle, Clock, DownloadSimple, FileText, Receipt, Wallet } from "@phosphor-icons/react";
import { Meter, Panel, PanelBody, PanelHeader } from "@/components/dashboard/Panel";
import type { PaymentItem } from "../schemas";
import type { ProjectPaymentSummary } from "@/lib/payment-rules";
import { triggerFileDownload, getFilePreviewUrl } from "@/lib/file-utils";

// A study's money for staff: what it costs, what's paid, and every payment the client sent with its receipt.

const TYPE: Record<string, string> = { DOWNPAYMENT: "Deposit", INSTALLMENT: "Part payment", BALANCE: "Balance", FULL: "Full payment" };
const STATUS: Record<string, string> = {
  AWAITING_PAYMENT: "Not paid yet",
  PROOF_SUBMITTED: "Needs checking",
  VERIFIED: "Confirmed",
  REJECTED: "Rejected",
  FULLY_PAID: "Confirmed",
};
const IMAGE = /\.(png|jpe?g|webp)$/i;

const money = (n: number) => n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const dateTime = (d: string) =>
  new Date(d).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const amount = (n: number) => (
  <span className="whitespace-nowrap">
    <Peso />
    {money(n)}
  </span>
);

interface PaymentLedgerCardProps {
  summary: ProjectPaymentSummary;
  payments: PaymentItem[];
  /** Staff who can confirm payments get a "Check" button on payments waiting to be checked. */
  onVerify?: (payment: PaymentItem) => void;
  onOpenUploadModal?: () => void;
  canUpload?: boolean;
}

export function PaymentLedgerCard({ summary, payments, onVerify, onOpenUploadModal, canUpload = false }: PaymentLedgerCardProps) {
  const [receipt, setReceipt] = useState<PaymentItem | null>(null);

  // No price yet (no accepted quote): nothing to show but that.
  if (summary.totalAmount <= 0 && payments.length === 0) {
    return (
      <Panel as="div" className="font-sans">
        <PanelBody>
          <p className="text-sm font-medium text-white">No price yet</p>
          <p className="mt-0.5 text-[13px] text-white/55">The price and deposit come from the quote once the client accepts it.</p>
        </PanelBody>
      </Panel>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 font-sans">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Price" description="In the signed agreement" icon={<Wallet size={18} weight="fill" />} value={amount(summary.totalAmount)} />
        <KpiCard
          label="Deposit"
          description="Needed before work starts"
          icon={<Clock size={18} weight="fill" />}
          value={amount(summary.downpaymentRequired)}
          badge={summary.isDownpaymentCleared ? "Confirmed" : "Not confirmed yet"}
        />
        <KpiCard
          label="Paid"
          description="Confirmed payments"
          icon={<CheckCircle size={18} weight="fill" />}
          value={amount(summary.verifiedPaid)}
          badge={summary.pendingVerification > 0 ? "A payment needs checking" : undefined}
        />
        <KpiCard
          label="Left to pay"
          description={summary.remainingBalance === 0 ? "Paid in full" : "Due before the final files"}
          icon={<Receipt size={18} weight="fill" />}
          value={amount(summary.remainingBalance)}
        />
      </div>

      <Panel>
        <PanelHeader
          title="Payments"
          count={payments.length}
          subtitle={
            summary.isFullyPaid
              ? "Paid in full."
              : summary.isDownpaymentCleared
                ? "Deposit confirmed. The balance is due before the final files are released."
                : "Work starts once the deposit is confirmed."
          }
          aside={
            canUpload && onOpenUploadModal && !summary.isFullyPaid ? (
              <Button variant="primary" size="sm" onClick={onOpenUploadModal}>
                Send Payment
              </Button>
            ) : null
          }
        />
        <div className="px-5 pt-4 sm:px-6">
          <div className="flex items-baseline justify-between text-[12px] text-white/45">
            <span>Paid so far</span>
            <span className="font-mono text-white/70">{summary.totalPaidPercentage}%</span>
          </div>
          <Meter value={summary.totalPaidPercentage} max={100} label="Share of the price paid" className="mt-1.5" />
        </div>

        {payments.length === 0 ? (
          <PanelBody>
            <p className="text-[13px] text-white/45">The client hasn&apos;t sent a payment yet.</p>
          </PanelBody>
        ) : (
          <ul className="mt-5 divide-y divide-white/[0.05] border-t border-white/[0.06]">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold text-white">{amount(p.amountSubmitted)}</span>
                    <span className="text-[13px] text-white/70">
                      {TYPE[p.paymentType] ?? p.paymentType} · {p.paymentMethod === "GCASH" ? "GCash" : p.paymentMethod ? "Bank transfer" : "—"}
                    </span>
                    <span
                      className={`rounded-[2px] border px-1.5 py-0.5 text-[11px] ${
                        p.paymentStatus === "PROOF_SUBMITTED"
                          ? "border-[#CC6600]/50 text-white"
                          : p.paymentStatus === "REJECTED"
                            ? "border-red-400/30 text-red-300"
                            : "border-white/15 bg-white/[0.05] text-white/75"
                      }`}
                    >
                      {STATUS[p.paymentStatus] ?? p.paymentStatus}
                    </span>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-white/45">
                    <span>Sent {dateTime(p.createdAt)}</span>
                    {p.referenceNumber ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <CopyButton variant="badge" value={p.referenceNumber} label={p.referenceNumber} />
                      </>
                    ) : null}
                    {p.verifiedAt ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Confirmed {dateTime(p.verifiedAt)}</span>
                      </>
                    ) : null}
                  </p>
                  {p.rejectionReason ? <p className="mt-1 text-[12px] text-red-300/90">Why it was rejected: {p.rejectionReason}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {p.proofs[0] ? (
                    <Button variant="ghost" size="sm" onClick={() => setReceipt(p)} className="gap-1.5">
                      <FileText size={14} weight="fill" />
                      Receipt
                    </Button>
                  ) : null}
                  {onVerify && p.paymentStatus === "PROOF_SUBMITTED" ? (
                    <Button variant="outline" size="sm" onClick={() => onVerify(p)} className="active:scale-[0.97]">
                      Check Payment
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {receipt ? <ReceiptWindow payment={receipt} onClose={() => setReceipt(null)} /> : null}
    </div>
  );
}

function ReceiptWindow({ payment, onClose }: { payment: PaymentItem; onClose: () => void }) {
  const proof = payment.proofs[0];
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const isImage = !!proof && (IMAGE.test(proof.filePath) || IMAGE.test(proof.fileName));

  return (
    <Modal
      open
      onClose={onClose}
      title="Receipt"
      description={`${TYPE[payment.paymentType] ?? payment.paymentType} of ₱${money(payment.amountSubmitted)}, sent ${dateTime(payment.createdAt)}`}
      size="2xl"
      footer={
        proof ? (
          <div className="flex w-full flex-wrap justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(getFilePreviewUrl(proof.filePath), "_blank", "noopener,noreferrer")}
              className="gap-1.5"
            >
              <ArrowSquareOut size={14} weight="fill" />
              Open in New Tab
            </Button>
            <Button
              variant="outline"
              size="sm"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await triggerFileDownload(proof.filePath, proof.fileName);
                } finally {
                  setBusy(false);
                }
              }}
              className="gap-1.5"
            >
              {busy ? null : <DownloadSimple size={14} weight="fill" />}
              Download
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4 font-sans">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-3">
          <div>
            <dt className="text-[12px] text-white/45">Amount</dt>
            <dd className="mt-0.5 font-semibold text-white">{amount(payment.amountSubmitted)}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-white/45">Paid with</dt>
            <dd className="mt-0.5 text-white">{payment.paymentMethod === "GCASH" ? "GCash" : payment.paymentMethod ? "Bank transfer" : "—"}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-white/45">Reference</dt>
            <dd className="mt-0.5 font-mono text-white">{payment.referenceNumber || "—"}</dd>
          </div>
        </dl>
        {payment.rejectionReason ? <p className="text-[13px] text-red-300">Why it was rejected: {payment.rejectionReason}</p> : null}
        {!proof ? (
          <p className="text-[13px] text-white/45">No receipt was attached.</p>
        ) : (
          <div className="flex min-h-[220px] items-center justify-center overflow-auto rounded-[2px] border border-white/10 bg-[#050513] p-3">
            {isImage && !failed ? (
              <>
                {loading ? <LoadingState variant="inline" label="Loading the receipt" /> : null}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getFilePreviewUrl(proof.filePath)}
                  alt={`Receipt: ${proof.fileName}`}
                  onLoad={() => setLoading(false)}
                  onError={() => {
                    setLoading(false);
                    setFailed(true);
                  }}
                  className={`max-h-[420px] w-auto max-w-full rounded-[2px] object-contain ${loading ? "hidden" : ""}`}
                />
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <FileText size={32} weight="fill" className="text-white/40" />
                <p className="text-[13px] text-white">{proof.fileName}</p>
                <p className="text-[12px] text-white/45">{failed ? "The picture didn't load. Download it instead." : "Open or download it to see it."}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
