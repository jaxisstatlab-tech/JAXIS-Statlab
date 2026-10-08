import React, { useState, useEffect } from "react";
import { Modal, Button, FormTextarea, LoadingState, CopyButton, Peso } from "@repo/ui";
import { ArrowSquareOut, CheckCircle, DownloadSimple, Receipt, Warning, XCircle } from "@phosphor-icons/react";
import { verifyPayment, rejectPayment } from "../actions";
import type { PaymentItem } from "../schemas";
import { paymentKind, paymentMethod } from "../labels";
import { getFilePreviewUrl, triggerFileDownload, formatBytes } from "@/lib/file-utils";

// "Check this payment": what the client says they paid, the steps to find it in the JAXIS account, their screenshot
// (optional), then Confirm Payment or Not Found (sent back with a reason the client sees). Payments already checked
// open read-only with who checked them and when.

interface PaymentVerificationModalProps {
  open: boolean;
  onClose: () => void;
  payment: PaymentItem | null;
  /** Called after a confirm or a send-back, with which one it was. */
  onSuccess: (outcome?: "confirmed" | "rejected") => void;
}

const REJECT_REASONS = [
  "We couldn't find this payment in our account. Please check the reference number and send it again.",
  "The amount we received doesn't match. Please message us so we can sort it out.",
  "This reference number belongs to a different payment. Please check your GCash or bank text.",
];

const money = (n: number) => n.toLocaleString("en-PH", { maximumFractionDigits: 2 });
const when = (d: string) =>
  new Date(d).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function PaymentVerificationModal({ open, onClose, payment, onSuccess }: PaymentVerificationModalProps) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  // Confirming needs the payment to be seen in the JAXIS account, not just on a screenshot.
  const [foundInAccount, setFoundInAccount] = useState(false);

  useEffect(() => {
    setImageError(false);
    setImageLoading(true);
    setIsRejecting(false);
    setRejectionReason("");
    setErrorMessage(null);
    setFoundInAccount(false);
  }, [payment, open]);

  if (!payment) return null;

  const proof = payment.proofs[0];
  const isImage = !!proof && /\.(png|jpe?g|webp)$/i.test(proof.fileName || proof.filePath);
  const isReadOnly = payment.paymentStatus !== "PROOF_SUBMITTED";
  const confirmed = payment.paymentStatus === "VERIFIED" || payment.paymentStatus === "FULLY_PAID";
  const account = payment.paymentMethod === "GCASH" ? "JAXIS GCash" : "JAXIS bank";

  const handleVerify = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await verifyPayment({ paymentId: payment.id });
      if (!res.success) throw new Error(res.error.message || "The payment wasn't confirmed. Please try again.");
      onSuccess("confirmed");
      onClose();
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (rejectionReason.trim().length < 5) {
      setErrorMessage("Tell the client why, so they know what to fix (pick a reason or write one).");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await rejectPayment({ paymentId: payment.id, rejectionReason: rejectionReason.trim() });
      if (!res.success) throw new Error(res.error.message || "The payment wasn't sent back. Please try again.");
      onSuccess("rejected");
      onClose();
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = isReadOnly ? (
    <div className="flex w-full justify-end">
      <Button variant="outline" size="sm" onClick={onClose}>
        Close
      </Button>
    </div>
  ) : isRejecting ? (
    <div className="flex w-full justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        disabled={isSubmitting}
        onClick={() => {
          setIsRejecting(false);
          setRejectionReason("");
          setErrorMessage(null);
        }}
      >
        Back
      </Button>
      <Button variant="primary" size="sm" onClick={handleReject} loading={isSubmitting} className="gap-1.5">
        <XCircle size={15} weight="fill" />
        Send Back to Client
      </Button>
    </div>
  ) : (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
        Close
      </Button>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setIsRejecting(true)} disabled={isSubmitting}>
          Not Found
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleVerify}
          loading={isSubmitting}
          disabled={!foundInAccount}
          title={foundInAccount ? undefined : "Tick the box once you've found the payment in the JAXIS account"}
          className="gap-1.5"
        >
          <CheckCircle size={15} weight="fill" />
          Confirm Payment
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isReadOnly ? "Payment details" : "Check this payment"}
      description={[payment.project?.intakeId, payment.project?.client?.fullName].filter(Boolean).join(" · ") || undefined}
      size="2xl"
      footer={footer}
    >
      <div className="flex w-full flex-col gap-6 font-sans">
        {/* What the client says they paid */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-[2px] border border-white/[0.08] bg-[#0A0A18] p-4 text-[13px] sm:grid-cols-4">
          <div>
            <dt className="text-white/45">Paying</dt>
            <dd className="mt-0.5 text-white">{paymentKind(payment.paymentType)}</dd>
          </div>
          <div>
            <dt className="text-white/45">Amount</dt>
            <dd className="mt-0.5 font-semibold text-white">
              <Peso />
              {money(payment.amountSubmitted)}
            </dd>
          </div>
          <div>
            <dt className="text-white/45">Sent by</dt>
            <dd className="mt-0.5 text-white">{paymentMethod(payment.paymentMethod)}</dd>
          </div>
          <div>
            <dt className="text-white/45">Sent</dt>
            <dd className="mt-0.5 text-white">{when(payment.createdAt)}</dd>
          </div>
          <div className="col-span-2 sm:col-span-4">
            <dt className="text-white/45">Reference number</dt>
            <dd className="mt-1">
              {payment.referenceNumber ? (
                <CopyButton value={payment.referenceNumber} label={payment.referenceNumber} copiedLabel="Copied" variant="badge" />
              ) : (
                <span className="text-white/50">None given</span>
              )}
            </dd>
          </div>
        </dl>

        {confirmed ? (
          <p className="flex items-start gap-2 rounded-[2px] border border-white/[0.08] px-3.5 py-2.5 text-[13px] text-white/75">
            <CheckCircle size={16} weight="fill" className="mt-px shrink-0 text-white/60" />
            <span>
              Confirmed{payment.verifiedByName ? ` by ${payment.verifiedByName}` : ""}
              {payment.verifiedAt ? ` on ${when(payment.verifiedAt)}` : ""}.
            </span>
          </p>
        ) : null}
        {payment.paymentStatus === "REJECTED" ? (
          <div className="rounded-[2px] border border-white/[0.08] px-3.5 py-2.5 text-[13px]">
            <p className="flex items-center gap-2 text-white/75">
              <XCircle size={16} weight="fill" className="shrink-0 text-white/60" />
              Sent back{payment.verifiedByName ? ` by ${payment.verifiedByName}` : ""}
              {payment.verifiedAt ? ` on ${when(payment.verifiedAt)}` : ""}. The client was told:
            </p>
            <p className="mt-1.5 pl-6 text-white/60">&ldquo;{payment.rejectionReason || "No reason given."}&rdquo;</p>
          </div>
        ) : null}

        {/* How to confirm (only while waiting) */}
        {!isReadOnly && !isRejecting ? (
          <section className="flex flex-col gap-3 rounded-[2px] border border-white/[0.08] p-4 text-[13px] text-white/70">
            <h3 className="text-sm font-semibold text-white">Find it in the {account} account first</h3>
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 leading-relaxed">
              <li>
                Open the {payment.paymentMethod === "GCASH" ? "JAXIS GCash app (Transactions)" : "JAXIS bank account history"}. Don&apos;t go by
                the screenshot alone; it can be edited.
              </li>
              <li>Look for the reference number above and an amount of exactly ₱{money(payment.amountSubmitted)}, around {when(payment.createdAt)}.</li>
              <li>
                No match? Transfers between a bank and GCash can show a different reference. Then match the amount, the time, the sender&apos;s
                name and the study ID
                {payment.project?.intakeId ? <span className="font-mono text-white/85"> {payment.project.intakeId}</span> : null} in the message.
              </li>
            </ol>
            <label className="mt-1 flex cursor-pointer items-start gap-2.5 rounded-[2px] border border-white/10 px-3 py-2.5 text-white/85 transition-colors hover:border-white/20">
              <input
                type="checkbox"
                checked={foundInAccount}
                onChange={(e) => setFoundInAccount(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#CC6600]"
              />
              <span>I found this payment in the {account} account and it matches.</span>
            </label>
          </section>
        ) : null}

        {/* Why it's sent back */}
        {isRejecting ? (
          <section className="flex flex-col gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Why wasn&apos;t it confirmed?</h3>
              <p className="mt-0.5 text-[13px] text-white/50">The client sees this and can send their payment details again.</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {REJECT_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRejectionReason(r)}
                  className={`rounded-[2px] border px-2.5 py-1 text-left text-[12px] transition-colors ${
                    rejectionReason === r ? "border-white/40 bg-white/[0.08] text-white" : "border-white/10 text-white/65 hover:border-white/25 hover:text-white"
                  }`}
                >
                  {r.split(".")[0]}
                </button>
              ))}
            </div>
            <FormTextarea
              label="Message to the client"
              placeholder="Pick a reason above or write your own"
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </section>
        ) : null}

        {/* The client's screenshot */}
        {!isRejecting ? (
          <section className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[13px] font-medium text-white">
                Client&apos;s screenshot <span className="font-normal text-white/40">(optional)</span>
              </h3>
              {proof ? (
                <div className="flex items-center gap-4 text-[12px]">
                  <button
                    type="button"
                    onClick={() => triggerFileDownload(proof.filePath, proof.fileName)}
                    className="flex items-center gap-1 text-white/60 transition-colors hover:text-white"
                  >
                    <DownloadSimple size={13} weight="bold" />
                    Download
                  </button>
                  <a
                    href={getFilePreviewUrl(proof.filePath)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-white/60 transition-colors hover:text-white"
                  >
                    <ArrowSquareOut size={13} weight="bold" />
                    Open in a new tab
                  </a>
                </div>
              ) : null}
            </div>

            {proof ? (
              <div className="flex max-h-[420px] min-h-[200px] items-center justify-center overflow-auto rounded-[2px] border border-white/[0.08] bg-[#030311] p-4">
                {isImage && !imageError ? (
                  <>
                    {imageLoading ? <LoadingState variant="inline" label="Loading the screenshot..." /> : null}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getFilePreviewUrl(proof.filePath)}
                      alt={`Screenshot sent with the payment: ${proof.fileName}`}
                      onLoad={() => setImageLoading(false)}
                      onError={() => {
                        setImageLoading(false);
                        setImageError(true);
                      }}
                      className={`max-h-[380px] w-auto max-w-full rounded-[2px] border border-white/10 object-contain ${imageLoading ? "hidden" : ""}`}
                    />
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Receipt size={28} weight="fill" className="text-white/35" />
                    <p className="text-[13px] text-white">{proof.fileName}</p>
                    <p className="text-[12px] text-white/45">
                      {imageError ? "This screenshot couldn't be shown here. " : ""}
                      {formatBytes(proof.fileSize || 0)} · Download it or open it in a new tab.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="rounded-[2px] border border-white/[0.08] px-4 py-5 text-center text-[13px] text-white/50">
                No screenshot sent. Check the reference number in the {account} history.
              </p>
            )}
          </section>
        ) : null}

        {errorMessage ? (
          <p role="alert" className="flex items-start gap-2 text-[13px] text-red-300">
            <Warning size={15} weight="fill" className="mt-px shrink-0" />
            {errorMessage}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
