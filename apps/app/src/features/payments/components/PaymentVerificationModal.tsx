import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalFooter,
  Button,
  MoneyDisplay,
  FormTextarea,
  StatusBadge,
  LoadingState,
  CopyButton,
} from "@repo/ui";
import {
  IconCheck,
  IconX,
  IconLoader2,
  IconAlertCircle,
  IconDownload,
  IconReceipt,
  IconExternalLink,
} from "@tabler/icons-react";
import { verifyPayment, rejectPayment } from "../actions";
import type { PaymentItem } from "../schemas";
import { getFilePreviewUrl, triggerFileDownload, formatBytes } from "@/lib/file-utils";

interface PaymentVerificationModalProps {
  open: boolean;
  onClose: () => void;
  payment: PaymentItem | null;
  onSuccess: () => void;
}

export function PaymentVerificationModal({
  open,
  onClose,
  payment,
  onSuccess,
}: PaymentVerificationModalProps) {
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
  const isImage =
    proof?.filePath &&
    (proof.filePath.toLowerCase().endsWith(".png") ||
      proof.filePath.toLowerCase().endsWith(".jpg") ||
      proof.filePath.toLowerCase().endsWith(".jpeg") ||
      proof.filePath.toLowerCase().endsWith(".webp") ||
      proof.fileName.toLowerCase().match(/\.(png|jpe?g|webp|svg)$/));

  const handleVerify = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await verifyPayment({ paymentId: payment.id });
      if (!res.success) {
        throw new Error(res.error.message || "Failed to verify payment deposit.");
      }
      onSuccess();
      onClose();
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
      setErrorMessage("Please provide an explanatory reason for rejection (min 5 characters).");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await rejectPayment({
        paymentId: payment.id,
        rejectionReason: rejectionReason.trim(),
      });
      if (!res.success) {
        throw new Error(res.error.message || "Failed to reject payment proof.");
      }
      onSuccess();
      onClose();
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadOnly = payment.paymentStatus !== "PROOF_SUBMITTED";
  const sentAt = new Date(payment.createdAt).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const REJECT_REASONS = [
    "We couldn't find this payment in our account. Please check the reference number and send it again.",
    "The amount we received doesn't match. Please message us so we can sort it out.",
    "This reference number belongs to a different payment. Please check your GCash or bank text.",
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isReadOnly ? "Payment details" : "Check this payment"}
      description={payment.project?.intakeId ? `Study ${payment.project.intakeId}` : undefined}
      size="2xl"
    >
      <div className="flex flex-col gap-6 w-full">
        {/* ── What was sent ── */}
        <dl className="grid grid-cols-2 gap-4 rounded-[2px] border border-white/10 bg-[#0A0A18] p-4 font-sans text-[13px] sm:grid-cols-4">
          {payment.project ? (
            <div className="col-span-2 min-w-0">
              <dt className="text-white/45">Study</dt>
              <dd className="mt-0.5 truncate text-white">
                <span className="font-mono">{payment.project.intakeId}</span>
                {payment.project.client?.fullName ? <span className="text-white/60">{` · ${payment.project.client.fullName}`}</span> : null}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-white/45">Paying</dt>
            <dd className="mt-0.5 text-white">
              {payment.paymentType === "DOWNPAYMENT" ? "Deposit" : payment.paymentType === "BALANCE" ? "The rest" : "In full"}
              {" by "}
              {payment.paymentMethod === "GCASH" ? "GCash" : "bank transfer"}
            </dd>
          </div>
          <div>
            <dt className="text-white/45">Status</dt>
            <dd className="mt-1">
              <StatusBadge status={payment.paymentStatus} />
            </dd>
          </div>
          {isReadOnly ? (
            <>
              <div>
                <dt className="text-white/45">Amount</dt>
                <dd className="mt-0.5 font-semibold text-white">
                  <MoneyDisplay amount={payment.amountSubmitted} />
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-white/45">Reference number</dt>
                <dd className="mt-0.5 truncate font-mono text-white">{payment.referenceNumber || "—"}</dd>
              </div>
            </>
          ) : null}
        </dl>

        {/* ── Status Notice Banner ── */}
        {(payment.paymentStatus === "VERIFIED" || payment.paymentStatus === "FULLY_PAID") && (
          <div className="p-3.5 rounded-[2px] bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-400 font-sans text-xs">
            <IconCheck size={16} stroke={2.5} className="flex-shrink-0" />
            <span>
              Authorized &amp; Cleared by {payment.verifiedBy || "Finance Officer"} on{" "}
              {new Date(payment.verifiedAt || payment.updatedAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              .
            </span>
          </div>
        )}

        {payment.paymentStatus === "REJECTED" && (
          <div className="p-3.5 rounded-[2px] bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-red-400 font-sans text-xs">
            <IconAlertCircle size={16} stroke={2} className="flex-shrink-0" />
            <span>
              Rejection Reason: {payment.rejectionReason || "Proof does not match official records."}
            </span>
          </div>
        )}

        {/* ── How to confirm (only while waiting) ── */}
        {!isReadOnly && (
          <div className="flex flex-col gap-3 rounded-[2px] border border-white/10 bg-white/[0.02] p-4 font-sans text-[13px] text-white/75">
            <p className="text-sm font-semibold text-white">Before you confirm, find this payment in the JAXIS account</p>
            <ol className="flex list-decimal flex-col gap-1.5 pl-5">
              <li>
                Open the {payment.paymentMethod === "GCASH" ? "JAXIS GCash app (Transactions)" : "JAXIS bank account history"}.
                Don&apos;t go by the screenshot alone; it can be edited.
              </li>
              <li>
                <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 align-middle">
                  Reference number matches:
                  {payment.referenceNumber ? (
                    <CopyButton value={payment.referenceNumber} label={payment.referenceNumber} copiedLabel="Copied" variant="badge" />
                  ) : (
                    <span className="text-white/45">none given</span>
                  )}
                </span>
              </li>
              <li>
                Amount is exactly{" "}
                <span className="font-semibold text-white">
                  <MoneyDisplay amount={payment.amountSubmitted} />
                </span>
                , received around {sentAt}.
              </li>
              <li>
                From another bank into GCash, the reference can differ. Then match the amount, time, sender name, and the
                study ID {payment.project?.intakeId ? <span className="font-mono text-white">{payment.project.intakeId}</span> : null} in the message.
              </li>
            </ol>
            <label className="mt-1 flex cursor-pointer items-start gap-2.5 rounded-[2px] border border-white/10 px-3 py-2.5 text-white/85">
              <input
                type="checkbox"
                checked={foundInAccount}
                onChange={(e) => setFoundInAccount(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#CC6600]"
              />
              <span>I found this payment in the JAXIS account and it matches.</span>
            </label>
          </div>
        )}

        {/* ── Receipt Preview Canvas ── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-sans text-xs text-white/60">
              Client&apos;s screenshot (optional)
            </span>
            {proof && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => triggerFileDownload(proof.filePath, proof.fileName)}
                  className="text-xs font-sans text-white/70 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <IconDownload size={13} stroke={1.5} />
                  <span>Download</span>
                </button>
                <a
                  href={getFilePreviewUrl(proof.filePath)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:text-sky-300 font-sans text-xs flex items-center gap-1"
                >
                  <IconExternalLink size={13} stroke={1.5} />
                  <span>Open in New Window</span>
                </a>
              </div>
            )}
          </div>

          {proof ? (
            <div className="p-4 rounded-[2px] bg-[#030311] border border-white/10 flex flex-col items-center justify-center min-h-[220px] max-h-[420px] overflow-auto">
              {isImage && !imageError ? (
                <div className="relative flex items-center justify-center w-full min-h-[200px]">
                  {imageLoading && (
                    <div className="w-full py-10 flex flex-col items-center justify-center animate-content-fade">
                      <LoadingState
                        variant="card"
                        size="md"
                        label="Loading receipt..."
                        description="Fetching uploaded proof of payment image"
                      />
                    </div>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getFilePreviewUrl(proof.filePath)}
                    alt={proof.fileName}
                    onLoad={() => setImageLoading(false)}
                    onError={() => {
                      setImageLoading(false);
                      setImageError(true);
                    }}
                    className={`max-h-[380px] w-auto max-w-full object-contain rounded-[2px] shadow-lg border border-white/10 transition-opacity duration-300 ${
                      imageLoading ? "opacity-0 absolute pointer-events-none" : "opacity-100 relative"
                    }`}
                  />
                </div>
              ) : (
                <div className="p-6 text-center flex flex-col items-center gap-3 max-w-md">
                  <div className="w-14 h-14 rounded-[2px] bg-[#CC6600]/15 border border-[#CC6600]/30 flex items-center justify-center">
                    <IconReceipt size={30} stroke={1.5} className="text-[#FFA040]" />
                  </div>
                  <div className="space-y-1">
                    <span className="font-sans text-sm font-bold text-white block">
                      {proof.fileName}
                    </span>
                    <span className="font-mono text-xs text-white/50 block">
                      Size: {formatBytes(proof.fileSize || 0)} · Uploaded: {new Date(proof.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 mt-2 flex-wrap justify-center">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => triggerFileDownload(proof.filePath, proof.fileName)}
                      className="font-sans text-xs gap-1.5 font-semibold bg-[#CC6600] hover:bg-[#FFA040] text-white"
                    >
                      <IconDownload size={14} stroke={2} />
                      <span>Download Receipt</span>
                    </Button>
                    <a
                      href={getFilePreviewUrl(proof.filePath)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="font-sans text-xs gap-1.5">
                        <IconExternalLink size={14} stroke={1.5} />
                        <span>Direct View</span>
                      </Button>
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-white/50 font-sans text-xs border border-white/10 rounded-[2px]">
              No screenshot sent. Check the reference number in the JAXIS {payment.paymentMethod === "GCASH" ? "GCash" : "bank"} history.
            </div>
          )}
        </div>

        {/* ── Rejection Reason Drawer ── */}
        {isRejecting && (
          <div className="flex flex-col gap-2 p-4 rounded-[2px] bg-red-500/[0.06] border border-red-500/20">
            <div className="flex flex-wrap gap-1.5">
              {REJECT_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRejectionReason(r)}
                  className={`rounded-[2px] border px-2.5 py-1 text-left font-sans text-[12px] transition-colors ${
                    rejectionReason === r ? "border-white/40 bg-white/[0.08] text-white" : "border-white/10 text-white/65 hover:border-white/25 hover:text-white"
                  }`}
                >
                  {r.split(".")[0]}
                </button>
              ))}
            </div>
            <FormTextarea
              label="Why it wasn't confirmed"
              placeholder="Pick a reason above or write your own"
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              helper="The client sees this and can send their payment details again."
            />
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-[2px] bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-red-400 font-sans text-xs">
            <IconAlertCircle size={16} stroke={2} className="flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ── Modal Footer Controls ── */}
        <ModalFooter>
          {isReadOnly ? (
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isRejecting) {
                    setIsRejecting(false);
                    setRejectionReason("");
                  } else {
                    onClose();
                  }
                }}
                disabled={isSubmitting}
              >
                {isRejecting ? "Cancel Rejection" : "Close"}
              </Button>

              {!isRejecting ? (
                <div className="flex items-center gap-2.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsRejecting(true)}
                    disabled={isSubmitting}
                    className="text-red-400 hover:text-red-300"
                  >
                    <IconX size={14} stroke={2} />
                    <span>Not Found</span>
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleVerify}
                    disabled={isSubmitting || !foundInAccount}
                    title={foundInAccount ? undefined : "Tick the box once you've found the payment in the JAXIS account"}
                    className="gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <IconLoader2 size={16} stroke={2.5} className="animate-spin text-white/90" />
                        <span>Confirming...</span>
                      </>
                    ) : (
                      <>
                        <IconCheck size={16} stroke={2.5} />
                        <span>Confirm Payment</span>
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleReject}
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-500 text-white gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <IconLoader2 size={16} stroke={2.5} className="animate-spin text-white/90" />
                      <span>Rejecting...</span>
                    </>
                  ) : (
                    <>
                      <IconX size={16} stroke={2} />
                      <span>Send Back to Client</span>
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </ModalFooter>
      </div>
    </Modal>
  );
}
