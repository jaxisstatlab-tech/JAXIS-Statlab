"use client";

import React, { useEffect, useState } from "react";
import { Modal, Button } from "@repo/ui";
import { Bank, DeviceMobile, WarningCircle } from "@phosphor-icons/react";
import { saveStaffCompensationOverride, deleteStaffCompensationOverride } from "../actions";
import type { InternalStaffMember } from "../actions";
import { PAY_MODEL_OPTIONS, payModelSummary, type CompensationType } from "../schemas";

// "Their own pay": pay for one person that differs from their role. The role's pay stays as it is.

interface SpecialistOverrideModalProps {
  staff: InternalStaffMember | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ROLE_SHORT: Record<string, string> = {
  STATISTICIAN: "analysts",
  SENIOR_QA_LEAD: "reviewers",
  FINANCE_OFFICER: "finance",
  ADMIN: "admins",
};

const CHANNEL: Record<string, string> = { GCASH: "GCash", MAYA: "Maya", BANK_TRANSFER: "Bank", CASH: "Cash" };

export function SpecialistOverrideModal({ staff, open, onClose, onSuccess }: SpecialistOverrideModalProps) {
  const [compensationType, setCompensationType] = useState<CompensationType>("TIER_DELIVERABLE");
  const [baseSalary, setBaseSalary] = useState(0);
  const [commissionPct, setCommissionPct] = useState(0);
  const [hourlyRate, setHourlyRate] = useState(0);
  const [fixedBonus, setFixedBonus] = useState(0);
  const [allowances, setAllowances] = useState(0);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!staff) return;
    const cfg = staff.effectiveConfig;
    setCompensationType(cfg.compensationType);
    setBaseSalary(cfg.baseSalaryMonthly || 0);
    setCommissionPct(cfg.commissionPercentagePerStudy || 0);
    setHourlyRate(cfg.hourlyDutyRate || 0);
    setFixedBonus(cfg.fixedPerStudyBonus || 0);
    setAllowances(cfg.allowancesMonthly || 0);
    setNotes(staff.overrideConfig?.notes || "");
    setConfirmReset(false);
    setErrorMsg("");
  }, [staff]);

  if (!staff) return null;
  const roleWord = ROLE_SHORT[staff.role] ?? "their role";

  const save = async () => {
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const res = await saveStaffCompensationOverride({
        userId: staff.id,
        staffName: staff.fullName,
        staffEmail: staff.email,
        roleName: staff.role as "STATISTICIAN" | "SENIOR_QA_LEAD" | "FINANCE_OFFICER" | "ADMIN",
        compensationType,
        baseSalaryMonthly: Number(baseSalary),
        commissionPercentagePerStudy: Number(commissionPct),
        hourlyDutyRate: Number(hourlyRate),
        fixedPerStudyBonus: Number(fixedBonus),
        allowancesMonthly: Number(allowances),
        notes: notes.trim(),
      });
      if (res.success) {
        onSuccess();
        onClose();
      } else setErrorMsg(res.error?.message || "Couldn't save their pay. Please try again.");
    } catch {
      setErrorMsg("Couldn't save their pay. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const useRolePay = async () => {
    if (!confirmReset) return setConfirmReset(true);
    setIsSubmitting(true);
    try {
      await deleteStaffCompensationOverride(staff.id);
      onSuccess();
      onClose();
    } catch {
      setErrorMsg("Couldn't switch back to the role's pay. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pickModel = (type: CompensationType) => {
    setCompensationType(type);
    if (type === "TIER_DELIVERABLE" || type === "PERCENTAGE_PER_STUDY") {
      setBaseSalary(0);
      setHourlyRate(0);
      setCommissionPct(0);
    } else if (type === "FIXED_SALARY") {
      setCommissionPct(0);
      setHourlyRate(0);
      setFixedBonus(0);
      if (!baseSalary) setBaseSalary(35000);
    } else if (type === "HOURLY_DUTY") {
      setBaseSalary(0);
      setCommissionPct(0);
      setFixedBonus(0);
      if (!hourlyRate) setHourlyRate(450);
    } else if (type === "HYBRID") {
      setHourlyRate(0);
      setFixedBonus(0);
      if (!baseSalary) setBaseSalary(12000);
    }
  };

  const field = "h-9 w-full rounded-[2px] border border-white/10 bg-[#050513] font-mono text-[13px] text-white outline-none focus:border-[#CC6600]/60";
  const amount = (label: string, value: number, set: (n: number) => void, step: number, hint?: string) => (
    <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
      {label}
      <span className="relative flex items-center">
        <span className="pointer-events-none absolute left-3 text-white/45">₱</span>
        <input type="number" min={0} step={step} value={value} onChange={(e) => set(Number(e.target.value))} className={`${field} pl-7 pr-3`} />
      </span>
      {hint ? <span className="text-[12px] text-white/40">{hint}</span> : null}
    </label>
  );

  const summary = payModelSummary({
    compensationType,
    baseSalaryMonthly: baseSalary,
    commissionPercentagePerStudy: commissionPct,
    hourlyDutyRate: hourlyRate,
    fixedPerStudyBonus: fixedBonus,
    allowancesMonthly: allowances,
  });

  return (
    <Modal
      open={open}
      onClose={() => (isSubmitting ? undefined : onClose())}
      title={`${staff.fullName}'s own pay`}
      description={`Only for ${staff.fullName}. Pay for ${roleWord} stays the same.`}
      size="md"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          {staff.overrideConfig ? (
            <Button variant="ghost" size="sm" onClick={useRolePay} disabled={isSubmitting}>
              {confirmReset ? "Click Again to Confirm" : `Use Their Role's Pay`}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={save} loading={isSubmitting} className="active:scale-[0.97]">
              Save Their Pay
            </Button>
          </div>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex flex-col gap-4 font-sans"
      >
        <p className="flex items-center gap-2 rounded-[2px] border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-[13px] text-white/70">
          {staff.payoutDetails?.payoutChannel === "BANK_TRANSFER" ? <Bank size={15} weight="fill" className="shrink-0 text-white/45" /> : <DeviceMobile size={15} weight="fill" className="shrink-0 text-white/45" />}
          {staff.payoutDetails ? (
            <span className="min-w-0 truncate">
              Paid to {CHANNEL[staff.payoutDetails.payoutChannel] ?? staff.payoutDetails.payoutChannel}
              {staff.payoutDetails.bankName ? ` (${staff.payoutDetails.bankName})` : ""}{" "}
              <span className="font-mono text-white">{staff.payoutDetails.accountNumber}</span> · {staff.payoutDetails.accountName}
            </span>
          ) : (
            <span>No payout details yet. They add them under My HR.</span>
          )}
        </p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PAY_MODEL_OPTIONS.map((item) => {
            const on = compensationType === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => pickModel(item.id)}
                aria-pressed={on}
                className={`rounded-[2px] border px-3.5 py-2.5 text-left transition-colors ${
                  on ? "border-[#CC6600]/70 bg-[#CC6600]/[0.06]" : "border-white/10 hover:border-white/25"
                }`}
              >
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="mt-0.5 text-[12px] text-white/50">{item.subtitle}</p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {compensationType === "FIXED_SALARY" || compensationType === "HYBRID"
            ? amount("Monthly salary", baseSalary, setBaseSalary, 500, `Paid as ₱${Math.round(baseSalary / 2).toLocaleString("en-PH")} each payday when paid twice a month.`)
            : null}
          {compensationType === "HOURLY_DUTY" ? amount("Hourly wage", hourlyRate, setHourlyRate, 25) : null}
          {compensationType !== "FIXED_SALARY" && compensationType !== "HOURLY_DUTY" ? (
            <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
              Share of each study (%)
              <input type="number" min={0} max={100} value={commissionPct} onChange={(e) => setCommissionPct(Number(e.target.value))} className={`${field} px-3`} />
              <span className="text-[12px] text-white/40">0 uses the package rate.</span>
            </label>
          ) : null}
          {compensationType === "TIER_DELIVERABLE" || compensationType === "PERCENTAGE_PER_STUDY" ? amount("Extra per study (optional)", fixedBonus, setFixedBonus, 100) : null}
          {amount("Monthly allowance (optional)", allowances, setAllowances, 250)}
        </div>

        <p className="rounded-[2px] border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-[13px] leading-relaxed text-white/75">
          <span className="text-white/45">They get: </span>
          {compensationType === "TIER_DELIVERABLE" && commissionPct > 0 ? summary.replace("at the package rates on Money & Pay Rates", `at ${commissionPct}%`) : summary}
        </p>

        <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
          Why they have their own pay (optional)
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="For example: senior analyst, agreed on a higher share"
            className="w-full rounded-[2px] border border-white/10 bg-[#050513] p-2.5 text-[13px] text-white outline-none placeholder:text-white/30 focus:border-[#CC6600]/60"
          />
        </label>

        {errorMsg ? (
          <p role="alert" className="flex items-start gap-2 text-[13px] text-red-300">
            <WarningCircle size={15} weight="fill" className="mt-0.5 shrink-0" />
            {errorMsg}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
