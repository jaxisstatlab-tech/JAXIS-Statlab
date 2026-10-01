"use client";

import React, { useEffect, useState } from "react";
import { Modal, Button, FileDropzone } from "@repo/ui";
import { Peso } from "@repo/ui/MoneyDisplay";
import { Bank, Check, Copy, DeviceMobile, WarningCircle } from "@phosphor-icons/react";
import { uploadFileToR2 } from "@/lib/storage-client";
import { submitPaymentProof, getPaymentChannels } from "../actions";
import type { PaymentItem } from "../schemas";
import { OFFICIAL_PAYMENT_CHANNELS, type PaymentChannelDetails } from "@/lib/payment-rules";
import type { PaymentMethod, PaymentType } from "@prisma/client";
import { resolveStoredFileUrl } from "@/lib/file-utils";

// "Upload your receipt": 1) what you're paying (only what's actually due), 2) where to send it,
// 3) the reference number and a screenshot. The amount is fixed to the agreement.

interface PaymentProofUploadModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectIntakeId: string;
  quotationId: string;
  totalAmount?: number;
  downpaymentRequired: number;
  remainingBalance: number;
  /** Once the deposit is confirmed, the only thing left to pay is the rest. */
  isDownpaymentCleared?: boolean;
  onSuccess: (payment: PaymentItem) => void;
}

type Option = { type: PaymentType; label: string; hint: string; amount: number };

const money = (n: number) => n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export function PaymentProofUploadModal({
  open,
  onClose,
  projectId,
  projectIntakeId,
  quotationId,
  totalAmount,
  downpaymentRequired,
  remainingBalance,
  isDownpaymentCleared = false,
  onSuccess,
}: PaymentProofUploadModalProps) {
  const total = totalAmount && totalAmount > 0 ? totalAmount : remainingBalance;
  // Amounts match what the server accepts: what's left of the deposit, or everything that's left.
  const left = remainingBalance > 0 ? remainingBalance : total;
  const depositLeft = Math.max(0, downpaymentRequired - (total - left));
  const options: Option[] = isDownpaymentCleared
    ? [{ type: "BALANCE", label: "The rest", hint: "What's left to pay on your agreement", amount: left }]
    : [
        ...(depositLeft > 0 && downpaymentRequired < total
          ? [{ type: "DOWNPAYMENT" as PaymentType, label: "Deposit", hint: "Starts your analysis", amount: depositLeft }]
          : []),
        { type: "FULL", label: "Pay in full", hint: "Nothing left to pay later", amount: left },
      ];

  const [channels, setChannels] = useState<PaymentChannelDetails[]>(OFFICIAL_PAYMENT_CHANNELS);
  const [method, setMethod] = useState<PaymentMethod>("GCASH");
  const [choice, setChoice] = useState<PaymentType>(options[0]!.type);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const selected = options.find((o) => o.type === choice) ?? options[0]!;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getPaymentChannels()
      .then((res) => {
        if (!cancelled && res.success && res.data && res.data.length > 0) setChannels(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const shown = channels.filter((c) => c.id === method && c.isEnabled !== false);

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(text);
    setTimeout(() => setCopied((c) => (c === text ? null : c)), 2000);
  };

  const pickFile = (f: File) => {
    setFile(f);
    setPreviewUrl(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!(selected.amount > 0)) {
      setError("There's nothing left to pay on this study.");
      return;
    }
    if (referenceNumber.trim().length < 3) {
      setError("Add the reference number from your GCash or bank confirmation.");
      return;
    }
    if (!file) {
      setError("Add a screenshot or PDF of your receipt.");
      return;
    }
    setIsSubmitting(true);
    try {
      const up = await uploadFileToR2(file, "PAYMENT_PROOF", projectIntakeId);
      if (!up.success || !up.data) throw new Error(up.error?.message || "The upload didn't finish. Please try again.");
      const res = await submitPaymentProof({
        projectId,
        quotationId,
        paymentType: selected.type,
        paymentMethod: method,
        amountSubmitted: selected.amount,
        referenceNumber: referenceNumber.trim(),
        receiptFilePath: up.data.publicUrl,
        receiptFileName: up.data.fileName,
        receiptFileSize: up.data.fileSize,
      });
      if (!res.success) throw new Error(res.error.message || "We couldn't save your receipt. Please try again.");
      onSuccess(res.data);
      onClose();
    } catch (err) {
      setError((err as Error).message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title="Upload your receipt"
      description={`Send the payment, then upload the receipt here. We'll confirm it within one working day.`}
      size="xl"
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="payment-proof-form" variant="primary" size="sm" loading={isSubmitting} disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Receipt"}
          </Button>
        </div>
      }
    >
      <form id="payment-proof-form" onSubmit={submit} className="flex flex-col gap-6 font-sans">
        {/* 1. What you're paying */}
        <fieldset>
          <legend className="text-xs font-medium text-white/55">1. What are you paying?</legend>
          <div className={`mt-2 grid grid-cols-1 gap-2 ${options.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {options.map((o) => {
              const on = o.type === selected.type;
              return (
                <label
                  key={o.type}
                  className={`flex cursor-pointer items-start justify-between gap-3 rounded-[2px] border px-3.5 py-3 transition-colors ${
                    on ? "border-[#CC6600]/70 bg-[#CC6600]/[0.06]" : "border-white/[0.08] hover:border-white/20"
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="pay-what"
                      value={o.type}
                      checked={on}
                      onChange={() => setChoice(o.type)}
                      className="mt-0.5 accent-[#CC6600]"
                    />
                    <span>
                      <span className="block text-sm font-medium text-white">{o.label}</span>
                      <span className="block text-xs text-white/50">{o.hint}</span>
                    </span>
                  </span>
                  <span className="font-mono text-sm font-semibold text-white">
                    <Peso />
                    {money(o.amount)}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* 2. Where to send it */}
        <div>
          <p className="text-xs font-medium text-white/55">
            2. Send{" "}
            <span className="font-mono text-white">
              <Peso />
              {money(selected.amount)}
            </span>{" "}
            to one of these
          </p>
          <div role="tablist" aria-label="Payment method" className="mt-2 inline-flex rounded-[2px] border border-white/10 p-0.5">
            {(
              [
                { id: "GCASH", label: "GCash", icon: <DeviceMobile size={14} weight="fill" /> },
                { id: "BANK_TRANSFER", label: "Bank transfer", icon: <Bank size={14} weight="fill" /> },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={method === m.id}
                onClick={() => setMethod(m.id)}
                className={`inline-flex items-center gap-1.5 rounded-[2px] px-3 py-1.5 text-[13px] transition-colors ${
                  method === m.id ? "bg-white/[0.1] font-medium text-white" : "text-white/55 hover:text-white"
                }`}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>

          <ul className="mt-3 flex flex-col gap-2">
            {shown.length === 0 ? (
              <li className="rounded-[2px] border border-white/[0.08] px-4 py-3 text-[13px] text-white/55">
                This option isn&apos;t available right now. Please use the other one.
              </li>
            ) : (
              shown.map((c) => (
                <li key={`${c.id}-${c.accountNumber}`} className="flex flex-col gap-3 rounded-[2px] border border-white/[0.08] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-white/50">{method === "GCASH" ? "GCash" : c.institution || c.name}</p>
                    <p className="mt-0.5 text-[13px] font-medium text-white">{c.accountName}</p>
                    <p className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-base font-semibold text-white">{c.accountNumber}</span>
                      <button
                        type="button"
                        onClick={() => copy(c.accountNumber)}
                        className="inline-flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 text-xs text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white"
                        aria-label={`Copy account number ${c.accountNumber}`}
                      >
                        {copied === c.accountNumber ? <Check size={13} weight="bold" /> : <Copy size={13} weight="bold" />}
                        {copied === c.accountNumber ? "Copied" : "Copy"}
                      </button>
                    </p>
                    <p className="mt-1 text-xs text-white/45">Put your study ID ({projectIntakeId}) in the message so we can match it.</p>
                  </div>
                  {c.qrImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resolveStoredFileUrl(c.qrImageUrl) ?? c.qrImageUrl} alt={`QR code for ${c.accountName}`} className="h-24 w-24 shrink-0 rounded-[2px] bg-white object-contain p-1.5" />
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>

        {/* 3. Proof */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-medium text-white/55">3. Tell us about the payment</p>
          <div>
            <label htmlFor="pay-ref" className="text-[13px] text-white/75">
              Reference number
            </label>
            <input
              id="pay-ref"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. 1002 984 182 91"
              className="mt-1.5 h-10 w-full rounded-[2px] border border-white/15 bg-white/[0.03] px-3 font-mono text-base text-white placeholder:text-white/25 focus:border-white/35 focus:outline-none sm:text-sm"
            />
            <p className="mt-1 text-xs text-white/45">It&apos;s in your GCash or bank confirmation (text, email or the app).</p>
          </div>
          <div>
            <p className="text-[13px] text-white/75">Receipt screenshot or PDF</p>
            <FileDropzone
              className="mt-1.5"
              onFileSelect={pickFile}
              onRemove={() => {
                setFile(null);
                setPreviewUrl(null);
              }}
              maxSizeMB={10}
              accept=".pdf,.png,.jpg,.jpeg"
              title="Choose a file or drop it here"
              hint="PDF, PNG or JPG, up to 10 MB"
              uploadedFile={file ? { name: file.name, size: file.size, previewUrl } : null}
            />
          </div>
        </div>

        {error ? (
          <p role="alert" className="flex items-start gap-1.5 text-[13px] text-[#FFA040]">
            <WarningCircle size={15} weight="fill" className="mt-0.5 shrink-0" />
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
