"use client";

import React, { useEffect, useState } from "react";
import { Modal, Button } from "@repo/ui";
import { Peso } from "@repo/ui/MoneyDisplay";
import { Bank, DeviceMobile, Paperclip, WarningCircle } from "@phosphor-icons/react";
import { uploadFileToR2 } from "@/lib/storage-client";
import { submitPaymentProof, getPaymentChannels } from "../actions";
import type { PaymentItem } from "../schemas";
import { referenceProblem, type PaymentChannelDetails } from "@/lib/payment-rules";
import type { PaymentMethod, PaymentType } from "@prisma/client";

// "Tell us about your payment": 1) what you're paying (only what's actually due), 2) where to send it,
// 3) the reference number (required; finance finds it in the JAXIS GCash or bank history) and an optional
// screenshot. The amount is fixed to the agreement.

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
  /** JAXIS accounts already loaded by the page; without them the window loads its own. */
  initialChannels?: PaymentChannelDetails[] | null;
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
  initialChannels = null,
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

  // Only the saved accounts are shown (never built-in samples), so nobody sends money to a wrong number.
  const [channels, setChannels] = useState<PaymentChannelDetails[] | null>(initialChannels);
  const [method, setMethod] = useState<PaymentMethod>(
    initialChannels?.find((c) => c.isEnabled !== false)?.id ?? "GCASH"
  );
  const [choice, setChoice] = useState<PaymentType>(options[0]!.type);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refTouched, setRefTouched] = useState(false);
  const refError = refTouched ? referenceProblem(referenceNumber) : null;

  const selected = options.find((o) => o.type === choice) ?? options[0]!;

  useEffect(() => {
    if (!open || initialChannels) return;
    let cancelled = false;
    getPaymentChannels()
      .then((res) => {
        if (cancelled) return;
        const list = res.success && res.data ? res.data : [];
        setChannels(list);
        const first = list.find((c) => c.isEnabled !== false);
        if (first) setMethod(first.id);
      })
      .catch(() => {
        if (!cancelled) setChannels([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, initialChannels]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Only the ways clients can actually pay right now (both while the accounts are loading).
  const enabled = (channels ?? []).filter((c) => c.isEnabled !== false);
  const methods = (
    [
      { id: "GCASH", label: "GCash" },
      { id: "BANK_TRANSFER", label: "Bank transfer" },
    ] as const
  ).filter((m) => channels === null || enabled.length === 0 || enabled.some((c) => c.id === m.id));

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
    const refProblem = referenceProblem(referenceNumber);
    if (refProblem) {
      setRefTouched(true);
      setError(refProblem);
      return;
    }
    setIsSubmitting(true);
    try {
      // The screenshot is optional; when there is one, it's uploaded first.
      let receipt: { receiptFilePath: string; receiptFileName: string; receiptFileSize: number } | null = null;
      if (file) {
        const up = await uploadFileToR2(file, "PAYMENT_PROOF", projectIntakeId);
        if (!up.success || !up.data) {
          throw new Error(up.error?.message || "The screenshot didn't upload. Try again, or send without it.");
        }
        receipt = { receiptFilePath: up.data.publicUrl, receiptFileName: up.data.fileName, receiptFileSize: up.data.fileSize };
      }
      const res = await submitPaymentProof({
        projectId,
        quotationId,
        paymentType: selected.type,
        paymentMethod: method,
        amountSubmitted: selected.amount,
        referenceNumber: referenceNumber.trim(),
        ...(receipt ?? {}),
      });
      if (!res.success) throw new Error(res.error.message || "We couldn't save your payment details. Please try again.");
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
      title="Tell us about your payment"
      description="We'll check it and confirm within one working day."
      size="xl"
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="payment-proof-form" variant="primary" size="sm" loading={isSubmitting} disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Payment Details"}
          </Button>
        </div>
      }
    >
      <form id="payment-proof-form" onSubmit={submit} className="flex flex-col gap-6 font-sans">
        {/* 1. What you're paying */}
        <fieldset>
          <legend className="text-xs font-medium text-white/55">1. What did you pay?</legend>
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

        {/* 2. How it was sent (the accounts themselves are on the Payment page) */}
        <fieldset>
          <legend className="text-xs font-medium text-white/55">2. How did you send it?</legend>
          <div role="radiogroup" aria-label="Payment method" className="mt-2 inline-flex rounded-[2px] border border-white/10 p-0.5">
            {methods.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={method === m.id}
                onClick={() => setMethod(m.id)}
                className={`inline-flex items-center gap-1.5 rounded-[2px] px-3 py-1.5 text-[13px] transition-colors ${
                  method === m.id ? "bg-white/[0.1] font-medium text-white" : "text-white/55 hover:text-white"
                }`}
              >
                {m.id === "GCASH" ? <DeviceMobile size={14} weight="fill" /> : <Bank size={14} weight="fill" />}
                {m.label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* 3. The reference number (required) and a screenshot (optional) */}
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="pay-ref" className="text-xs font-medium text-white/55">
              3. Reference number
            </label>
            <input
              id="pay-ref"
              value={referenceNumber}
              onChange={(e) => {
                setReferenceNumber(e.target.value);
                setError(null);
              }}
              onBlur={() => referenceNumber.trim() && setRefTouched(true)}
              placeholder="e.g. 1002 984 182 91"
              autoComplete="off"
              inputMode="text"
              aria-invalid={Boolean(refError)}
              aria-describedby="pay-ref-help"
              className={`mt-2 h-10 w-full rounded-[2px] border bg-white/[0.03] px-3 font-mono text-base text-white placeholder:text-white/25 focus:outline-none sm:text-sm ${
                refError ? "border-[#FFA040]/70 focus:border-[#FFA040]" : "border-white/15 focus:border-white/35"
              }`}
            />
            <p id="pay-ref-help" className={`mt-1 text-xs ${refError ? "text-[#FFA040]" : "text-white/45"}`}>
              {refError ??
                (method === "GCASH"
                  ? "In the GCash text (\"Ref. No. ...\") or on the receipt screen in GCash."
                  : "On your bank's confirmation (the InstaPay or PESONet reference).")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {file ? (
              <>
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="" className="h-10 w-10 rounded-[2px] border border-white/10 object-cover" />
                ) : null}
                <span className="min-w-0 max-w-[260px] truncate text-[13px] text-white/80" title={file.name}>
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                  }}
                  className="text-[13px] text-white/50 underline-offset-4 hover:text-white hover:underline"
                >
                  Remove
                </button>
              </>
            ) : (
              <>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] border border-white/15 px-3 py-1.5 text-[13px] text-white/80 transition-colors hover:border-white/30 hover:text-white">
                  <Paperclip size={14} weight="bold" />
                  Add Screenshot
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      if (f.size > 10 * 1024 * 1024) return setError("That file is over 10 MB. Use a smaller screenshot.");
                      if (!/\.(pdf|png|jpe?g)$/i.test(f.name)) return setError("Use a PNG, JPG or PDF.");
                      pickFile(f);
                    }}
                  />
                </label>
                <span className="text-xs text-white/45">Optional. It helps us find your payment faster.</span>
              </>
            )}
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
