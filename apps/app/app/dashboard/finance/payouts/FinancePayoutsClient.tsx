"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  PageHeader,
  KpiCard,
  Card,
  Button,
  Badge,
  StatusBadge,
  Modal,
  LoadingState,
  Peso,
  Pagination,
} from "@repo/ui";
import {
  getFinancePayoutQueue,
  disbursePayoutAction,
  voidPayoutAction,
} from "@/features/finance/actions";
import type { PayoutDTO } from "@/features/finance/schemas";
import {
  IconAward,
  IconCheck,
  IconClock,
  IconShieldCheck,
  IconShieldX,
  IconSend,
  IconCopy,
  IconSearch,
  IconAlertCircle,
  IconFileText,
  IconBan,
  IconBuildingBank,
  IconDeviceMobile,
  IconCurrencyDollar,
} from "@tabler/icons-react";

interface FinancePayoutsClientProps {
  initialData?: {
    payouts: PayoutDTO[];
    summary: {
      pendingCount: number;
      readyCount: number;
      disbursedYtd: number;
      blockedCount: number;
    };
  } | null;
}

export function FinancePayoutsClient({
  initialData = null,
}: FinancePayoutsClientProps) {
  const [payouts, setPayouts] = useState<PayoutDTO[]>(initialData?.payouts || []);
  const [summary, setSummary] = useState(
    initialData?.summary || {
      pendingCount: 0,
      readyCount: 0,
      disbursedYtd: 0,
      blockedCount: 0,
    }
  );
  const [isLoading, setIsLoading] = useState<boolean>(!initialData);
  const [statusTab, setStatusTab] = useState<"ALL" | "READY" | "PENDING" | "DISBURSED" | "VOIDED">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modal States
  const [selectedPayout, setSelectedPayout] = useState<PayoutDTO | null>(null);
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState<boolean>(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState<boolean>(false);

  // Form States
  const [disbursementMethod, setDisbursementMethod] = useState<"GCASH" | "MAYA" | "BANK_TRANSFER" | "CASH">("GCASH");
  const [disbursementRef, setDisbursementRef] = useState<string>("");
  const [disbursementNotes, setDisbursementNotes] = useState<string>("");
  const [voidReason, setVoidReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isMountedRef = React.useRef(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getFinancePayoutQueue({
        status: statusTab === "READY" ? "APPROVED" : statusTab === "PENDING" ? "PENDING" : statusTab,
        search: searchQuery,
      });
      if (!isMountedRef.current) return;
      if (res.success && res.data) {
        setPayouts(res.data.payouts);
        setSummary(res.data.summary);
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error("Failed to load payout queue:", err);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [statusTab, searchQuery]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!initialData) {
      loadData();
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [initialData, loadData]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenDisburse = (payout: PayoutDTO) => {
    setSelectedPayout(payout);
    setActionError(null);
    setDisbursementRef("");
    setDisbursementNotes("");
    if (payout.registeredAccount) {
      const meth = payout.registeredAccount.payoutMethod.toUpperCase();
      if (meth === "GCASH" || meth === "MAYA" || meth === "BANK_TRANSFER" || meth === "CASH") {
        setDisbursementMethod(meth as any);
      }
    }
    setIsDisburseModalOpen(true);
  };

  const handleOpenVoid = (payout: PayoutDTO) => {
    setSelectedPayout(payout);
    setActionError(null);
    setVoidReason("");
    setIsVoidModalOpen(true);
  };

  const handleConfirmDisburse = async () => {
    if (!selectedPayout || !disbursementRef.trim()) {
      setActionError("Transaction reference number is required.");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await disbursePayoutAction({
        payoutId: selectedPayout.id,
        disbursementMethod,
        disbursementRef: disbursementRef.trim(),
        notes: disbursementNotes.trim() || undefined,
      });

      if (res.success) {
        setIsDisburseModalOpen(false);
        loadData();
      } else {
        setActionError(res.error?.message || "Failed to disburse milestone payment.");
      }
    } catch (err: any) {
      setActionError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmVoid = async () => {
    if (!selectedPayout || !voidReason.trim()) {
      setActionError("Please provide a reason for voiding this payout.");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await voidPayoutAction({
        payoutId: selectedPayout.id,
        voidReason: voidReason.trim(),
      });

      if (res.success) {
        setIsVoidModalOpen(false);
        loadData();
      } else {
        setActionError(res.error?.message || "Failed to void payout.");
      }
    } catch (err: any) {
      setActionError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPayouts = React.useMemo(() => {
    return payouts.filter((p) => {
      if (statusTab === "READY") return p.isEligible && p.payoutStatus !== "DISBURSED" && p.payoutStatus !== "VOIDED";
      if (statusTab === "PENDING") return !p.isEligible && p.payoutStatus !== "DISBURSED" && p.payoutStatus !== "VOIDED";
      if (statusTab === "DISBURSED") return p.payoutStatus === "DISBURSED";
      if (statusTab === "VOIDED") return p.payoutStatus === "VOIDED";
      return true;
    });
  }, [payouts, statusTab]);

  const paginatedPayouts = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayouts.slice(start, start + pageSize);
  }, [filteredPayouts, currentPage, pageSize]);

  if (isLoading && payouts.length === 0) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto font-sans">
        <LoadingState
          variant="page"
          label="Loading Specialist Payouts..."
          description="Retrieving milestone records and commission ledgers."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans">
      {/* Standardized PageHeader */}
      <PageHeader
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "FINANCE", href: "/dashboard/finance" },
          { label: "MILESTONE PAYMENTS" },
        ]}
        title="Milestone Payouts & Escrow Releases"
        description="Check study completion, verify escrow release conditions, and record milestone payments to specialists."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="sky" className="text-xs font-sans font-medium flex items-center gap-1">
              <IconShieldCheck size={14} stroke={2} />
              <span>Escrow Protection Active</span>
            </Badge>
          </div>
        }
      />

      {/* Canonical KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <KpiCard
          label="READY FOR PAYOUT"
          value={summary.readyCount}
          description="Studies delivered & verified for disbursement"
        />
        <KpiCard
          label="TOTAL PAID OUT YTD"
          value={<><Peso />{summary.disbursedYtd.toLocaleString("en-US", { minimumFractionDigits: 2 })}</>}
          description="Total milestone fees disbursed to specialists"
        />
        <KpiCard
          label="IN-PROGRESS ESCROW"
          value={summary.pendingCount}
          description="Active studies pending QA or delivery gates"
        />
        <KpiCard
          label="DISPUTE / REFUND HOLDS"
          value={summary.blockedCount}
          description="Payouts on legal or administrative hold"
        />
      </div>

      {/* Payout Queue Management Card */}
      <Card className="p-6 sm:p-8 flex flex-col gap-6 bg-[#01142B] border border-white/10 rounded-[4px]">
        {/* Filter Toolbar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-white/10 pb-6">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#010114] border border-white/10 rounded-[2px]">
            {[
              { id: "ALL", label: "All Payouts" },
              { id: "READY", label: `Ready for Payout (${summary.readyCount})` },
              { id: "PENDING", label: "In-Progress Escrow" },
              { id: "DISBURSED", label: "Disbursed" },
              { id: "VOIDED", label: "Voided" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusTab(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-[2px] transition-colors cursor-pointer ${
                  statusTab === tab.id
                    ? "bg-[#CC6600] text-white"
                    : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <IconSearch size={16} stroke={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search by Study ID, title, or specialist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-[#010114] border border-white/15 rounded-[2px] text-xs text-white placeholder:text-white/30 focus:border-[#CC6600] focus:outline-none"
            />
          </div>
        </div>

        {/* Payouts Table */}
        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <LoadingState variant="table" label="Loading Payouts..." description="Retrieving specialist milestone records" />
          </div>
        ) : filteredPayouts.length === 0 ? (
          <div className="py-16 text-center text-xs text-white/40 flex flex-col items-center gap-2">
            <IconAward size={28} stroke={1.5} className="text-white/20" />
            <span>No milestone payouts found for this filter.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-black/20 text-white/50 font-mono text-[0.688rem] uppercase tracking-wider">
                  <th className="py-3 px-4">Study / Intake ID</th>
                  <th className="py-3 px-4">Specialist & Role</th>
                  <th className="py-3 px-4">Package & Split</th>
                  <th className="py-3 px-4">Payout Sum</th>
                  <th className="py-3 px-4">Escrow Status</th>
                  <th className="py-3 px-4">Settlement Account</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {paginatedPayouts.map((p) => {
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Study ID & Title */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-white/90 block font-semibold">{p.projectIntakeId}</span>
                        <span className="text-[0.688rem] text-white/50 line-clamp-1 max-w-[220px] mt-0.5">
                          {p.projectTitle}
                        </span>
                      </td>

                      {/* Specialist Name & Role */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-white/90 block">{p.recipientName}</span>
                        <Badge
                          variant={p.recipientRole === "STATISTICIAN" ? "sky" : "emerald"}
                          className="text-[0.625rem] font-mono mt-1"
                        >
                          {p.recipientRole === "STATISTICIAN" ? "Statistician" : "Senior QA Lead"}
                        </Badge>
                      </td>

                      {/* Package & Split Rate */}
                      <td className="py-3.5 px-4 font-mono">
                        <span className="text-white/90 block">{p.packageName}</span>
                        <span className="text-[0.688rem] text-white/40">
                          {p.payoutRateApplied}% of <Peso />{p.grossProjectAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Payout Sum */}
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 text-sm">
                        <Peso />{p.payoutAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>

                      {/* RULE_PAY_01 Checklist Status */}
                      <td className="py-3.5 px-4">
                        {p.payoutStatus === "DISBURSED" ? (
                          <Badge variant="emerald" className="text-[0.625rem] flex items-center gap-1 w-fit">
                            <IconCheck size={12} stroke={2.5} />
                            <span>DISBURSED</span>
                          </Badge>
                        ) : p.payoutStatus === "VOIDED" ? (
                          <Badge variant="danger" className="text-[0.625rem] flex items-center gap-1 w-fit">
                            <IconBan size={12} stroke={2} />
                            <span>VOIDED</span>
                          </Badge>
                        ) : p.isEligible ? (
                          <div className="flex flex-col gap-1">
                            <Badge variant="sky" className="text-[0.625rem] flex items-center gap-1 w-fit">
                              <IconCheck size={12} stroke={2.5} />
                              <span>READY FOR PAYOUT</span>
                            </Badge>
                            <span className="text-[0.625rem] text-emerald-400">All escrow gates passed</span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <Badge variant="amber" className="text-[0.625rem] flex items-center gap-1 w-fit">
                              <IconClock size={12} stroke={2} />
                              <span>ESCROW LOCKED</span>
                            </Badge>
                            <span className="text-[0.625rem] text-white/40 line-clamp-1 max-w-[200px]" title={p.eligibilityReasons.join("; ")}>
                              {p.eligibilityReasons[0] || "Requirements pending"}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Registered Settlement Account */}
                      <td className="py-3.5 px-4">
                        {p.registeredAccount ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[0.625rem] font-mono">
                                {p.registeredAccount.payoutMethod}
                              </Badge>
                              {p.registeredAccount.bankName && (
                                <span className="text-[0.625rem] text-white/50">
                                  {p.registeredAccount.bankName}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-[0.688rem] text-white/80">
                              <span>{p.registeredAccount.accountNumber}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(p.registeredAccount!.accountNumber, p.id)}
                                className="p-0.5 text-white/40 hover:text-white transition-colors cursor-pointer"
                                title="Copy account number"
                              >
                                {copiedId === p.id ? (
                                  <IconCheck size={12} stroke={2.5} className="text-emerald-400" />
                                ) : (
                                  <IconCopy size={12} stroke={1.5} />
                                )}
                              </button>
                            </div>
                            <span className="text-[0.625rem] text-white/40 line-clamp-1">
                              {p.registeredAccount.accountName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[0.688rem] text-amber-400/70 italic font-mono">
                            No Account Registered
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {p.payoutStatus === "DISBURSED" ? (
                            <div className="text-right">
                              <span className="text-[0.688rem] font-mono text-white/40 block">
                                Ref: {p.disbursementRef}
                              </span>
                              <span className="text-[0.625rem] text-white/30 block">
                                {p.disbursedAt ? new Date(p.disbursedAt).toLocaleDateString() : ""}
                              </span>
                            </div>
                          ) : p.payoutStatus === "VOIDED" ? (
                            <span className="text-[0.688rem] text-white/30 italic font-mono">
                              {p.voidReason || "Voided"}
                            </span>
                          ) : (
                            <>
                              <Button
                                variant={p.isEligible ? "primary" : "secondary"}
                                size="sm"
                                disabled={!p.isEligible}
                                onClick={() => handleOpenDisburse(p)}
                                className="text-xs font-semibold rounded-[2px] px-3 py-1.5"
                              >
                                <IconSend size={13} stroke={2} className="mr-1" />
                                <span>Disburse</span>
                              </Button>

                              <button
                                type="button"
                                onClick={() => handleOpenVoid(p)}
                                className="p-1.5 text-white/30 hover:text-red-400 transition-colors cursor-pointer rounded-[2px]"
                                title="Void Payout"
                              >
                                <IconBan size={15} stroke={1.5} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Component */}
        {!isLoading && filteredPayouts.length > 0 && (
          <div className="border-t border-white/10 pt-4">
            <Pagination
              currentPage={currentPage}
              totalItems={filteredPayouts.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[5, 10, 20, 50]}
              itemLabel="payouts"
            />
          </div>
        )}
      </Card>

      {/* DISBURSE PAYOUT MODAL */}
      {isDisburseModalOpen && selectedPayout && (
        <Modal
          open={isDisburseModalOpen}
          onClose={() => !isSubmitting && setIsDisburseModalOpen(false)}
          title="Disburse Specialist Milestone Payout"
          description="Verify disbursement particulars and record the transaction reference number."
          size="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full font-sans">
              <Button
                variant="secondary"
                size="sm"
                disabled={isSubmitting}
                onClick={() => setIsDisburseModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={isSubmitting}
                onClick={handleConfirmDisburse}
                className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500/30"
              >
                <IconCheck size={15} stroke={2} className="mr-1" />
                <span>Confirm Disbursement</span>
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-4 font-sans text-xs">
            {actionError && (
              <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-[2px] text-red-200 flex items-start gap-2">
                <IconAlertCircle size={16} stroke={2} className="text-red-400 shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Summary Voucher Card */}
            <div className="p-4 bg-[#010114] border border-white/10 rounded-[2px] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-white/50">Recipient Specialist:</span>
                <span className="font-semibold text-white">{selectedPayout.recipientName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Study Reference:</span>
                <span className="font-mono text-white/90">{selectedPayout.projectIntakeId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Applied Commission Rate:</span>
                <span className="font-mono text-white">{selectedPayout.payoutRateApplied}%</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-white/70">Disbursement Amount:</span>
                <span className="font-mono font-bold text-emerald-400 text-base">
                  <Peso />{selectedPayout.payoutAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Registered Account Quick Copy */}
            {selectedPayout.registeredAccount && (
              <div className="p-3.5 bg-sky-950/30 border border-sky-500/20 rounded-[2px] flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-[0.688rem] font-mono text-sky-300 font-semibold">
                    Registered {selectedPayout.registeredAccount.payoutMethod} Account:
                  </span>
                  <span className="font-mono text-white text-xs mt-0.5">
                    {selectedPayout.registeredAccount.accountNumber} ({selectedPayout.registeredAccount.accountName})
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopy(selectedPayout.registeredAccount!.accountNumber, "modal-acc")}
                  className="text-xs px-2.5 py-1 font-mono"
                >
                  {copiedId === "modal-acc" ? "Copied!" : "Copy Number"}
                </Button>
              </div>
            )}

            {/* Disbursement Channel Form */}
            <div className="flex flex-col gap-1.5">
              <label className="text-white/60 font-semibold">Disbursement Channel:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "GCASH", label: "GCash", icon: IconDeviceMobile },
                  { id: "MAYA", label: "Maya", icon: IconDeviceMobile },
                  { id: "BANK_TRANSFER", label: "Bank Wire", icon: IconBuildingBank },
                  { id: "CASH", label: "Cash Voucher", icon: IconCurrencyDollar },
                ].map((meth) => {
                  const Icon = meth.icon;
                  return (
                    <button
                      key={meth.id}
                      type="button"
                      onClick={() => setDisbursementMethod(meth.id as any)}
                      className={`p-2.5 rounded-[2px] border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                        disbursementMethod === meth.id
                          ? "bg-[#CC6600]/20 border-[#CC6600] text-white"
                          : "bg-black/20 border-white/10 text-white/50 hover:bg-white/[0.04]"
                      }`}
                    >
                      <Icon size={14} stroke={1.5} />
                      <span>{meth.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Transaction Reference Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-white/60 font-semibold">Transaction Reference Number *</label>
              <input
                type="text"
                placeholder="e.g. GCash Ref # 100293847291 or BDO Wire Ref"
                value={disbursementRef}
                onChange={(e) => setDisbursementRef(e.target.value)}
                className="w-full p-2.5 bg-[#010114] border border-white/15 rounded-[2px] text-xs text-white placeholder:text-white/30 focus:border-[#CC6600] focus:outline-none font-mono"
              />
            </div>

            {/* Optional Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-white/60 font-semibold">Audit Notes (Optional)</label>
              <textarea
                placeholder="Add any administrative notes regarding this milestone disbursement..."
                value={disbursementNotes}
                onChange={(e) => setDisbursementNotes(e.target.value)}
                rows={2}
                className="w-full p-2.5 bg-[#010114] border border-white/15 rounded-[2px] text-xs text-white placeholder:text-white/30 focus:border-[#CC6600] focus:outline-none"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* VOID PAYOUT MODAL */}
      {isVoidModalOpen && selectedPayout && (
        <Modal
          open={isVoidModalOpen}
          onClose={() => !isSubmitting && setIsVoidModalOpen(false)}
          title="Void Milestone Payout"
          description="Voiding cancels this payout entry. This action cannot be reversed."
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-3 w-full font-sans">
              <Button
                variant="secondary"
                size="sm"
                disabled={isSubmitting}
                onClick={() => setIsVoidModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={isSubmitting}
                onClick={handleConfirmVoid}
              >
                Confirm Void
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-3 font-sans text-xs">
            {actionError && (
              <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-[2px] text-red-200">
                {actionError}
              </div>
            )}
            <p className="text-white/70">
              State the administrative reason for voiding this payout for study{" "}
              <strong className="font-mono text-white">{selectedPayout.projectIntakeId}</strong>:
            </p>
            <textarea
              placeholder="e.g. Specialist reassigned prior to completion; work cancelled."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              rows={3}
              className="w-full p-2.5 bg-[#010114] border border-white/15 rounded-[2px] text-xs text-white placeholder:text-white/30 focus:border-red-500 focus:outline-none"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
