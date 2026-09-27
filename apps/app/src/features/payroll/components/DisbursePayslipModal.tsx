"use client";

import React, { useState, useEffect } from "react";
import { Modal, Button, Badge } from "@repo/ui";
import { IconLoader2, IconCheck, IconCopy, IconBuildingBank, IconDeviceMobile } from "@tabler/icons-react";
import { disbursePayslip } from "../actions";
import type { StaffPayslipDTO, DisbursementMethod } from "../schemas";

interface DisbursePayslipModalProps {
  payslip: StaffPayslipDTO | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DisbursePayslipModal({
  payslip,
  open,
  onClose,
  onSuccess,
}: DisbursePayslipModalProps) {
  const [method, setMethod] = useState<DisbursementMethod>("GCASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (payslip?.payoutDetails) {
      const channel = payslip.payoutDetails.payoutChannel;
      if (channel === "BANK_TRANSFER" || channel === "CASH" || channel === "MAYA" || channel === "GCASH") {
        setMethod(channel);
      }
    }
  }, [payslip]);

  if (!payslip) return null;

  const handleCopyAccount = () => {
    if (!payslip.payoutDetails?.accountNumber) return;
    navigator.clipboard.writeText(payslip.payoutDetails.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference.trim()) {
      setErrorMsg("Please enter the transaction / settlement reference number.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await disbursePayslip({
        payslipId: payslip.id,
        disbursementMethod: method,
        disbursementReference: reference.trim(),
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.error?.message || "Failed to disburse payslip.");
      }
    } catch {
      setErrorMsg("Network error occurred while disbursing payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const payout = payslip.payoutDetails;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Disburse Staff Compensation"
      description={`Disbursement for ${payslip.staffName} (${payslip.staffRole}) — ${payslip.payslipNumber}`}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || !reference.trim()}
            className="gap-1.5 font-sans font-semibold cursor-pointer rounded-[2px]"
          >
            {isSubmitting ? (
              <IconLoader2 size={16} stroke={2.5} className="animate-spin text-white/90" />
            ) : (
              <IconCheck size={16} stroke={2} />
            )}
            <span>Confirm Disbursement</span>
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-xs text-white font-sans">
        {errorMsg && (
          <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-[2px] text-red-300 font-mono text-xs">
            {errorMsg}
          </div>
        )}

        {/* Payout Summary Box */}
        <div className="p-4 bg-[#050513] border border-white/10 rounded-[2px] flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-mono text-white/50 block font-semibold">Net Payable Amount</span>
            <span className="text-2xl font-mono font-bold text-emerald-400">
              ₱{payslip.netPay.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <Badge variant="sky" className="text-xs font-mono">
            {payslip.payPeriodMonth}
          </Badge>
        </div>

        {/* Registered Payout Destination Callout */}
        <div className="p-3.5 bg-[#0A0A18] border border-[#CC6600]/30 rounded-[2px] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#FFA040] flex items-center gap-1.5">
              {payout?.payoutChannel === "BANK_TRANSFER" ? (
                <IconBuildingBank size={14} stroke={1.5} className="text-[#CC6600]" />
              ) : (
                <IconDeviceMobile size={14} stroke={1.5} className="text-[#CC6600]" />
              )}
              <span>Staff Registered Payout Destination</span>
            </span>
            {payout && (
              <Badge variant="amber" className="text-[0.625rem] font-mono">
                {payout.payoutChannel.replace(/_/g, " ")}
              </Badge>
            )}
          </div>

          {payout ? (
            <div className="flex items-center justify-between bg-[#050513] p-2.5 rounded-[2px] border border-white/10">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-white tracking-wide">
                    {payout.accountNumber}
                  </span>
                  {payout.bankName && (
                    <span className="text-[0.688rem] font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded-[2px] border border-sky-500/20">
                      {payout.bankName}
                    </span>
                  )}
                </div>
                <span className="text-xs text-white/60 font-sans mt-0.5">
                  Account Name: <strong className="text-white/90 font-medium">{payout.accountName}</strong>
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyAccount}
                className="cursor-pointer text-xs flex items-center gap-1 py-1 px-2.5 rounded-[2px]"
              >
                {copied ? (
                  <>
                    <IconCheck size={14} stroke={2} className="text-emerald-400" />
                    <span className="text-emerald-400 font-mono">Copied</span>
                  </>
                ) : (
                  <>
                    <IconCopy size={14} stroke={1.5} />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="text-xs text-white/50 italic py-1">
              No custom e-wallet or bank account registered yet. Defaulting to manual settlement.
            </div>
          )}
        </div>

        {/* Channel Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono uppercase text-white/60 font-semibold">
            Disbursement Channel
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(["GCASH", "MAYA", "BANK_TRANSFER", "CASH"] as DisbursementMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`py-2.5 px-2 rounded-[2px] border text-center font-mono text-xs cursor-pointer transition-colors ${
                  method === m
                    ? "bg-[#CC6600]/15 border-[#CC6600] text-white font-bold"
                    : "bg-[#050513] border-white/10 text-white/60 hover:text-white"
                }`}
              >
                {m.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Reference Number */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono uppercase text-white/60 font-semibold">
            Transaction / Reference Number *
          </label>
          <input
            type="text"
            required
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. GCASH-202608-99214 or BDO-REF-441029"
            className="w-full bg-[#050513] border border-white/10 rounded-[2px] p-2.5 text-xs text-white font-mono placeholder-white/30 outline-none focus:border-[#CC6600]"
          />
          <span className="text-xs text-white/40">
            Official proof reference entered into the JAXIS Treasury ledger.
          </span>
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono uppercase text-white/60 font-semibold">
            Settlement Notes (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Released via GCash merchant payout API"
            className="w-full bg-[#050513] border border-white/10 rounded-[2px] p-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-[#CC6600]"
          />
        </div>
      </form>
    </Modal>
  );
}
