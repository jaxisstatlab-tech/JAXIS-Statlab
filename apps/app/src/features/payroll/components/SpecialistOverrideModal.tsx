"use client";

import React, { useState, useEffect } from "react";
import { Modal, Button, Badge, Peso } from "@repo/ui";
import { IconLoader2, IconCheck, IconBuildingBank, IconDeviceMobile } from "@tabler/icons-react";
import { saveStaffCompensationOverride, deleteStaffCompensationOverride } from "../actions";
import type { InternalStaffMember } from "../actions";
import type { CompensationType } from "../schemas";

interface SpecialistOverrideModalProps {
  staff: InternalStaffMember | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SpecialistOverrideModal({
  staff,
  open,
  onClose,
  onSuccess,
}: SpecialistOverrideModalProps) {
  const [compensationType, setCompensationType] = useState<CompensationType>("TIER_DELIVERABLE");
  const [baseSalary, setBaseSalary] = useState(0);
  const [commissionPct, setCommissionPct] = useState(50);
  const [hourlyRate, setHourlyRate] = useState(450);
  const [fixedBonus, setFixedBonus] = useState(1000);
  const [allowances, setAllowances] = useState(2500);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (staff) {
      const cfg = staff.effectiveConfig;
      setCompensationType(cfg.compensationType);
      setBaseSalary(cfg.baseSalaryMonthly || 0);
      setCommissionPct(cfg.commissionPercentagePerStudy || 0);
      setHourlyRate(cfg.hourlyDutyRate || 0);
      setFixedBonus(cfg.fixedPerStudyBonus || 0);
      setAllowances(cfg.allowancesMonthly || 0);
      setNotes(cfg.notes || "");
    }
  }, [staff]);

  if (!staff) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      } else {
        setErrorMsg(res.error?.message || "Failed to save override.");
      }
    } catch {
      setErrorMsg("Network error occurred while updating compensation override.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!confirm(`Revert ${staff.fullName} back to default ${staff.role} compensation policy?`)) return;
    setIsSubmitting(true);
    try {
      await deleteStaffCompensationOverride(staff.id);
      onSuccess();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectModelType = (type: CompensationType) => {
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
      if (!commissionPct) setCommissionPct(10);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Customize Staff Pay Rates"
      description={`Set custom pay rates for ${staff.fullName} (${staff.role})`}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {staff.overrideConfig && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToDefault}
                disabled={isSubmitting}
                className="text-red-400 border-red-500/30 hover:bg-red-950/40 text-xs cursor-pointer"
              >
                Reset to Role Default
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="gap-1.5 font-sans font-semibold cursor-pointer rounded-[2px]"
            >
              {isSubmitting ? (
                <IconLoader2 size={16} stroke={2.5} className="animate-spin text-white/90" />
              ) : (
                <IconCheck size={16} stroke={2} />
              )}
              <span>Save Custom Rates</span>
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs text-white font-sans">
        {errorMsg && (
          <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-[2px] text-red-300 font-mono text-xs">
            {errorMsg}
          </div>
        )}

        {/* Staff Payout Account Badge */}
        <div className="p-3 bg-[#010D1F] border border-white/10 rounded-[2px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {staff.payoutDetails?.payoutChannel === "BANK_TRANSFER" ? (
              <IconBuildingBank size={16} stroke={1.5} className="text-[#FFA040]" />
            ) : (
              <IconDeviceMobile size={16} stroke={1.5} className="text-[#FFA040]" />
            )}
            <div className="flex flex-col">
              <span className="text-[0.625rem] uppercase font-mono text-white/50">
                Registered Payout Account
              </span>
              {staff.payoutDetails ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="amber" className="text-[0.562rem] font-mono">
                    {staff.payoutDetails.payoutChannel.replace(/_/g, " ")}
                  </Badge>
                  <span className="font-mono text-xs font-bold text-white">
                    {staff.payoutDetails.accountNumber}
                  </span>
                  {staff.payoutDetails.bankName && (
                    <span className="text-xs text-sky-400 font-sans">
                      ({staff.payoutDetails.bankName})
                    </span>
                  )}
                  <span className="text-xs text-white/60 font-sans">
                    &bull; {staff.payoutDetails.accountName}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-amber-400 font-sans">
                  No e-wallet / bank account registered yet.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Model Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-[0.688rem] font-mono uppercase text-white/60 font-semibold">
            Select Compensation Model
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              { id: "TIER_DELIVERABLE", title: "Tier Deliverable Fee", subtitle: "SOW split via Package Key from Treasury" },
              { id: "FIXED_SALARY", title: "Fixed Monthly Base", subtitle: "Guaranteed monthly/semi-monthly rate" },
              { id: "HOURLY_DUTY", title: "Hourly Attendance Wage", subtitle: "Paid per verified platform hour" },
              { id: "HYBRID", title: "Hybrid (Base + Tier Fee)", subtitle: "Base monthly pay + SOW tier split" },
            ].map((item) => {
              const isSelected = compensationType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectModelType(item.id as CompensationType)}
                  className={`p-2.5 rounded-[2px] border text-left font-sans cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[#CC6600]/20 border-[#CC6600] text-white ring-1 ring-[#CC6600]"
                      : "bg-[#010D1F] border-white/10 text-white/70 hover:text-white"
                  }`}
                >
                  <div className="font-semibold text-xs text-white">{item.title}</div>
                  <div className="text-[0.688rem] text-white/40">{item.subtitle}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Model-Specific Inputs */}
        <div className="p-4 bg-[#010D1F] border border-white/10 rounded-[2px] flex flex-col gap-3.5">
          {(compensationType === "TIER_DELIVERABLE" || compensationType === "PERCENTAGE_PER_STUDY") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-mono text-white/80 block mb-1 font-semibold">
                  Custom Commission % (Optional)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={commissionPct}
                    onChange={(e) => setCommissionPct(Number(e.target.value))}
                    className="w-full bg-[#01142B] border border-white/15 rounded-[2px] px-3 py-2 text-sm text-white font-mono outline-none focus:border-[#CC6600]"
                    placeholder="0"
                  />
                  <span className="absolute right-3 text-xs font-mono text-white/50">% of study</span>
                </div>
                <span className="text-[0.625rem] text-white/40 font-sans mt-0.5 block">
                  Set 0 to automatically inherit the Treasury Package Key rate.
                </span>
              </div>

              <div>
                <label className="text-xs font-mono text-white/80 block mb-1 font-semibold">
                  Deliverable Bonus (₱)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3"><Peso className="text-xs text-white/50" /></span>
                  <input
                    type="number"
                    step={100}
                    min={0}
                    value={fixedBonus}
                    onChange={(e) => setFixedBonus(Number(e.target.value))}
                    className="w-full bg-[#01142B] border border-white/15 rounded-[2px] pl-7 pr-3 py-2 text-sm text-white font-mono outline-none focus:border-[#CC6600]"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}

          {compensationType === "FIXED_SALARY" && (
            <div>
              <label className="text-xs font-mono text-white/80 block mb-1 font-semibold">
                Monthly Base Salary (₱)
              </label>
              <div className="relative flex items-center max-w-sm">
                <span className="absolute left-3"><Peso className="text-sm text-white/50" /></span>
                <input
                  type="number"
                  step={500}
                  min={0}
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(Number(e.target.value))}
                  className="w-full bg-[#01142B] border border-white/15 rounded-[2px] pl-8 pr-3 py-2 text-sm text-white font-mono outline-none focus:border-[#CC6600]"
                />
              </div>
              <span className="text-[0.688rem] text-white/40 font-sans mt-1 block">
                Prorates to <Peso className="text-[0.688rem] text-white/40" />{(baseSalary / 2).toLocaleString()} per 15-day cut-off cycle.
              </span>
            </div>
          )}

          {compensationType === "HOURLY_DUTY" && (
            <div>
              <label className="text-xs font-mono text-white/80 block mb-1 font-semibold">
                Hourly Duty Rate (₱ / hr)
              </label>
              <div className="relative flex items-center max-w-sm">
                <span className="absolute left-3"><Peso className="text-sm text-white/50" /></span>
                <input
                  type="number"
                  step={25}
                  min={0}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="w-full bg-[#01142B] border border-white/15 rounded-[2px] pl-8 pr-14 py-2 text-sm text-white font-mono outline-none focus:border-[#CC6600]"
                />
                <span className="absolute right-3 text-xs font-mono text-white/50">/ hr</span>
              </div>
            </div>
          )}

          {compensationType === "HYBRID" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-mono text-white/80 block mb-1 font-semibold">
                  Monthly Base Retainer (₱)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3"><Peso className="text-sm text-white/50" /></span>
                  <input
                    type="number"
                    step={500}
                    min={0}
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(Number(e.target.value))}
                    className="w-full bg-[#01142B] border border-white/15 rounded-[2px] pl-8 pr-3 py-2 text-sm text-white font-mono outline-none focus:border-[#CC6600]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-white/80 block mb-1 font-semibold">
                  Commission % Per Study
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={commissionPct}
                    onChange={(e) => setCommissionPct(Number(e.target.value))}
                    className="w-full bg-[#01142B] border border-white/15 rounded-[2px] px-3 py-2 text-sm text-white font-mono outline-none focus:border-[#CC6600]"
                  />
                  <span className="absolute right-3 text-xs font-mono text-white/50">% of study</span>
                </div>
              </div>
            </div>
          )}

          {/* Optional Monthly Allowance */}
          <div className="pt-2.5 border-t border-white/[0.08] flex items-center justify-between gap-3">
            <span className="text-xs font-mono text-white/70">Monthly Allowance / Stipend (Optional)</span>
            <div className="relative flex items-center w-36 shrink-0">
              <span className="absolute left-3"><Peso className="text-xs text-white/50" /></span>
              <input
                type="number"
                step={250}
                min={0}
                value={allowances}
                onChange={(e) => setAllowances(Number(e.target.value))}
                className="w-full bg-[#01142B] border border-white/15 rounded-[2px] pl-7 pr-3 py-1.5 text-xs text-white font-mono outline-none focus:border-[#CC6600]"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Human Summary */}
        <div className="p-3 bg-[#010D1F] border border-emerald-500/20 rounded-[2px] text-xs font-sans text-white/90">
          <strong className="text-emerald-400">Effective Pay Agreement: </strong>
          {compensationType === "TIER_DELIVERABLE" && (
            <span>
              Earns <strong>{commissionPct > 0 ? `${commissionPct}%` : "active Treasury Package Key split"}</strong> of approved SOW contract price
              {fixedBonus > 0 && <span> + <Peso />{fixedBonus.toLocaleString()} bonus</span>}
              {allowances > 0 && <span> + <Peso />{allowances.toLocaleString()} monthly allowance</span>}.
            </span>
          )}
          {compensationType === "PERCENTAGE_PER_STUDY" && (
            <span>
              Earns <strong>{commissionPct}%</strong> of approved SOW contract price
              {fixedBonus > 0 && <span> + <Peso />{fixedBonus.toLocaleString()} bonus</span>}
              {allowances > 0 && <span> + <Peso />{allowances.toLocaleString()} monthly allowance</span>}.
            </span>
          )}
          {compensationType === "FIXED_SALARY" && (
            <span>{staff.fullName} earns a fixed <strong><Peso />{baseSalary.toLocaleString()} / month</strong> (<Peso />{(baseSalary / 2).toLocaleString()} every 15 days).</span>
          )}
          {compensationType === "HOURLY_DUTY" && (
            <span>{staff.fullName} is paid <strong><Peso />{hourlyRate.toLocaleString()} / hour</strong> for verified platform hours.</span>
          )}
          {compensationType === "HYBRID" && (
            <span>{staff.fullName} receives <strong><Peso />{baseSalary.toLocaleString()} monthly base</strong> + <strong>{commissionPct}% commission</strong> per study.</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[0.688rem] font-mono uppercase text-white/60 font-semibold">
            Specialist Contract Justification / Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Senior PhD retention tier; elevated commission due to high-stakes biostatistical trial design."
            className="w-full bg-[#010D1F] border border-white/10 rounded-[2px] p-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-[#CC6600]"
          />
        </div>
      </form>
    </Modal>
  );
}
