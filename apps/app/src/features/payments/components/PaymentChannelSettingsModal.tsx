"use client";

import React, { useEffect, useState } from "react";
import { Modal, Button, Switch, LoadingState } from "@repo/ui";
import { Bank, DeviceMobile, Plus, QrCode, Trash, UploadSimple, WarningCircle } from "@phosphor-icons/react";
import { formatBankAccountNumber, formatEWalletNumber } from "@/lib/formatters";
import { uploadFileToR2 } from "@/lib/storage-client";
import { resolveStoredFileUrl } from "@/lib/file-utils";
import {
  MAX_PAYMENT_ACCOUNTS,
  paymentAccountProblems,
  type PaymentAccountProblem,
  type PaymentChannelDetails,
} from "@/lib/payment-rules";
import { getPaymentChannels, updatePaymentChannels } from "../actions";

// "Payment accounts": the GCash numbers and bank accounts clients see on their Payment page. Only what a
// client needs is asked for; the same checks run here and on the server, so a typo can't be saved.

interface PaymentChannelSettingsModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful save with the accounts as saved. */
  onSuccess?: (channels: PaymentChannelDetails[]) => void;
}

type Draft = PaymentChannelDetails & { key: string };

let nextKey = 0;
const withKey = (c: PaymentChannelDetails): Draft => ({ ...c, key: `acct-${nextKey++}` });

function blank(id: "GCASH" | "BANK_TRANSFER"): Draft {
  return withKey({
    id,
    name: id === "GCASH" ? "GCash" : "",
    badge: "",
    accountName: "",
    accountNumber: "",
    institution: id === "GCASH" ? "GCash" : "",
    branchOrProvider: "",
    notes: "",
    qrImageUrl: null,
    isEnabled: true,
  });
}

const INPUT =
  "h-10 w-full rounded-[2px] border bg-[#050513] px-3 font-sans text-sm text-white outline-none placeholder:text-white/30 focus:border-[#CC6600]/60";

export function PaymentChannelSettingsModal({ open, onClose, onSuccess }: PaymentChannelSettingsModalProps) {
  const [accounts, setAccounts] = useState<Draft[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [problems, setProblems] = useState<PaymentAccountProblem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setAccounts(null);
    setLoadError(null);
    setSaveError(null);
    setProblems([]);
    getPaymentChannels()
      .then((res) => {
        if (cancelled) return;
        if (res.success) setAccounts(res.data.map(withKey));
        else setLoadError("We couldn't load the payment accounts. Close this and try again.");
      })
      .catch(() => !cancelled && setLoadError("We couldn't load the payment accounts. Close this and try again."));
    return () => {
      cancelled = true;
    };
  }, [open]);

  const update = (key: string, patch: Partial<PaymentChannelDetails>) => {
    setAccounts((prev) => prev?.map((a) => (a.key === key ? { ...a, ...patch } : a)) ?? prev);
    setProblems([]);
    setSaveError(null);
  };

  const remove = (key: string) => {
    setAccounts((prev) => prev?.filter((a) => a.key !== key) ?? prev);
    setProblems([]);
  };

  const add = (id: "GCASH" | "BANK_TRANSFER") => setAccounts((prev) => [...(prev ?? []), blank(id)]);

  const uploadQr = async (key: string, file: File) => {
    if (!/\.(png|jpe?g)$/i.test(file.name)) {
      setSaveError("The QR code has to be a PNG or JPG picture.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSaveError("That picture is over 5 MB. Use a smaller one.");
      return;
    }
    setUploadingKey(key);
    setSaveError(null);
    try {
      const res = await uploadFileToR2(file, "PAYMENT_PROOF", "SYSTEM_CONFIG");
      if (res.success && res.data) update(key, { qrImageUrl: res.data.publicUrl });
      else setSaveError(res.error?.message || "The QR code didn't upload. Please try again.");
    } catch {
      setSaveError("The QR code didn't upload. Please try again.");
    } finally {
      setUploadingKey(null);
    }
  };

  const save = async () => {
    if (!accounts || isSaving) return;
    const found = paymentAccountProblems(accounts);
    setProblems(found);
    if (found.length > 0) {
      setSaveError("Fix the highlighted fields first.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const res = await updatePaymentChannels({ channels: accounts.map(({ key, ...rest }) => rest) });
      if (!res.success) {
        setSaveError(res.error.message || "We couldn't save the payment accounts. Please try again.");
        return;
      }
      onSuccess?.(res.data);
      onClose();
    } catch {
      setSaveError("We couldn't save the payment accounts. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const shownCount = accounts?.filter((a) => a.isEnabled !== false).length ?? 0;
  const problemFor = (index: number, field: PaymentAccountProblem["field"]) =>
    problems.find((p) => p.index === index && p.field === field)?.message;

  return (
    <Modal
      open={open}
      onClose={() => (isSaving ? undefined : onClose())}
      title="Payment accounts"
      description="Clients see these on their Payment page and send money to them. Check every number before you save."
      size="xl"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-white/50">
            {accounts ? `${shownCount} of ${accounts.length} shown to clients` : ""}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={save}
              loading={isSaving}
              disabled={!accounts || isSaving || uploadingKey !== null}
              className="active:scale-[0.97]"
            >
              Save Accounts
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4 font-sans">
        {loadError ? (
          <p className="rounded-[2px] border border-white/10 bg-white/[0.03] px-4 py-3 text-[13px] text-white/75">{loadError}</p>
        ) : !accounts ? (
          <div className="py-10">
            <LoadingState variant="inline" label="Loading payment accounts..." />
          </div>
        ) : (
          <>
            {shownCount === 0 ? (
              <div className="flex items-start gap-2.5 rounded-[2px] border border-[#CC6600]/40 bg-[#CC6600]/[0.06] px-4 py-3 text-[13px] text-white/85">
                <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-[#CC6600]" />
                <span>No account is shown to clients. They won&apos;t see where to pay until you add one or switch one on.</span>
              </div>
            ) : null}

            {accounts.length === 0 ? (
              <p className="rounded-[2px] border border-dashed border-white/10 px-4 py-8 text-center text-[13px] text-white/50">
                No payment accounts yet. Add your GCash number or a bank account below.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {accounts.map((a, index) => {
                  const gcash = a.id === "GCASH";
                  const on = a.isEnabled !== false;
                  const numberError = problemFor(index, "accountNumber");
                  const nameError = problemFor(index, "accountName");
                  const bankError = problemFor(index, "institution");
                  return (
                    <li key={a.key} className={`rounded-[2px] border bg-[#0A0A18] p-4 ${on ? "border-white/10" : "border-white/[0.06] opacity-80"}`}>
                      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                        <p className="flex items-center gap-2 text-sm font-semibold text-white">
                          {gcash ? <DeviceMobile size={16} weight="fill" className="text-white/60" /> : <Bank size={16} weight="fill" className="text-white/60" />}
                          {gcash ? "GCash" : a.institution.trim() || "Bank account"}
                        </p>
                        <div className="flex items-center gap-3">
                          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-white/70">
                            <Switch checked={on} onCheckedChange={(v) => update(a.key, { isEnabled: v })} aria-label="Show to clients" />
                            {on ? "Shown to clients" : "Hidden"}
                          </label>
                          <button
                            type="button"
                            onClick={() => remove(a.key)}
                            className="rounded-[2px] p-1.5 text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-400"
                            aria-label={`Remove ${gcash ? "GCash" : a.institution || "bank"} account`}
                            title="Remove"
                          >
                            <Trash size={15} weight="fill" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {!gcash ? (
                          <Field label="Bank name" error={bankError}>
                            <input
                              value={a.institution}
                              onChange={(e) => update(a.key, { institution: e.target.value })}
                              placeholder="e.g. BDO"
                              className={`${INPUT} ${bankError ? "border-red-400/60" : "border-white/10"}`}
                            />
                          </Field>
                        ) : null}
                        <Field label={gcash ? "GCash number" : "Account number"} error={numberError}>
                          <input
                            value={a.accountNumber}
                            inputMode="numeric"
                            onChange={(e) =>
                              update(a.key, {
                                accountNumber: gcash ? formatEWalletNumber(e.target.value) : formatBankAccountNumber(e.target.value),
                              })
                            }
                            placeholder={gcash ? "09XX-XXX-XXXX" : "Account number"}
                            className={`${INPUT} font-mono ${numberError ? "border-red-400/60" : "border-white/10"}`}
                          />
                        </Field>
                        <Field
                          label={gcash ? "Name registered in GCash" : "Account name"}
                          hint={gcash ? "Clients see this name when they send. Write it the way GCash shows it." : undefined}
                          error={nameError}
                        >
                          <input
                            value={a.accountName}
                            onChange={(e) => update(a.key, { accountName: e.target.value })}
                            placeholder="Full name on the account"
                            className={`${INPUT} ${nameError ? "border-red-400/60" : "border-white/10"}`}
                          />
                        </Field>
                        {!gcash ? (
                          <Field label="Branch (optional)">
                            <input
                              value={a.branchOrProvider}
                              onChange={(e) => update(a.key, { branchOrProvider: e.target.value })}
                              placeholder="e.g. Malaybalay"
                              className={`${INPUT} border-white/10`}
                            />
                          </Field>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-col gap-3 border-t border-white/[0.06] pt-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          {a.qrImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={resolveStoredFileUrl(a.qrImageUrl) ?? a.qrImageUrl}
                              alt="QR code"
                              className="h-16 w-16 rounded-[2px] bg-white object-contain p-1"
                            />
                          ) : (
                            <span className="flex h-16 w-16 items-center justify-center rounded-[2px] border border-dashed border-white/15 text-white/30">
                              <QrCode size={22} weight="fill" />
                            </span>
                          )}
                          <div className="text-[13px]">
                            <p className="text-white/80">QR code (optional)</p>
                            <p className="text-white/45">PNG or JPG. Clients can scan or save it instead of typing the number.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label
                            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] border border-white/15 px-3 py-1.5 text-[13px] text-white/80 transition-colors hover:border-white/30 hover:text-white ${
                              uploadingKey === a.key ? "pointer-events-none opacity-60" : ""
                            }`}
                          >
                            <UploadSimple size={14} weight="bold" />
                            {uploadingKey === a.key ? "Uploading..." : a.qrImageUrl ? "Replace" : "Upload QR"}
                            <input
                              type="file"
                              accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                              className="sr-only"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                e.target.value = "";
                                if (f) uploadQr(a.key, f);
                              }}
                            />
                          </label>
                          {a.qrImageUrl ? (
                            <button
                              type="button"
                              onClick={() => update(a.key, { qrImageUrl: null })}
                              className="rounded-[2px] px-2 py-1.5 text-[13px] text-white/50 hover:text-white"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {problemFor(index, "qrImageUrl") ? (
                        <p className="mt-2 text-[12px] text-red-300">{problemFor(index, "qrImageUrl")}</p>
                      ) : null}

                      <Field label="Note to clients (optional)" className="mt-3">
                        <input
                          value={a.notes}
                          maxLength={300}
                          onChange={(e) => update(a.key, { notes: e.target.value })}
                          placeholder="e.g. InstaPay transfers arrive right away"
                          className={`${INPUT} border-white/10`}
                        />
                      </Field>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => add("GCASH")}
                disabled={accounts.length >= MAX_PAYMENT_ACCOUNTS}
                className="gap-1.5 active:scale-[0.97]"
              >
                <Plus size={14} weight="bold" />
                Add GCash
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => add("BANK_TRANSFER")}
                disabled={accounts.length >= MAX_PAYMENT_ACCOUNTS}
                className="gap-1.5 active:scale-[0.97]"
              >
                <Plus size={14} weight="bold" />
                Add Bank Account
              </Button>
            </div>

            {saveError ? (
              <p role="alert" className="flex items-start gap-2 text-[13px] text-red-300">
                <WarningCircle size={15} weight="fill" className="mt-0.5 shrink-0" />
                {saveError}
              </p>
            ) : null}
          </>
        )}
      </div>
    </Modal>
  );
}

function Field({
  label,
  hint,
  error,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[13px] text-white/70">{label}</span>
      {children}
      {error ? <span className="text-[12px] text-red-300">{error}</span> : hint ? <span className="text-[12px] text-white/40">{hint}</span> : null}
    </label>
  );
}
