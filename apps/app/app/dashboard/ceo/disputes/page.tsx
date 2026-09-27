"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  PageHeader,
  KpiCard,
  Card,
  Badge,
  Button,
  LoadingState,
  Peso,
  Pagination,
  Toast,
} from "@repo/ui";
import {
  getAdminDisputesAction,
  resolveDisputeAction,
} from "@/features/disputes/actions";
import type {
  DisputeDTO,
  DisputeSummaryDTO,
  DisputeGrounds,
  DisputeResolutionType,
} from "@/features/disputes/schemas";
import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconFileText,
  IconGavel,
  IconSearch,
  IconShieldExclamation,
  IconShieldCheck,
  IconX,
  IconScale,
  IconAward,
} from "@tabler/icons-react";

export default function CeoDisputesPage() {
  const [disputes, setDisputes] = useState<DisputeDTO[]>([]);
  const [summary, setSummary] = useState<DisputeSummaryDTO>({
    totalDisputes: 0,
    openDisputes: 0,
    underReviewDisputes: 0,
    resolvedRefunds: 0,
    resolvedNoRefunds: 0,
    chargebacks: 0,
    totalRefundsGranted: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusTab, setStatusTab] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [selectedDispute, setSelectedDispute] = useState<DisputeDTO | null>(null);

  // Decision Modal State
  const [isRulingModalOpen, setIsRulingModalOpen] = useState<boolean>(false);
  const [activeDispute, setActiveDispute] = useState<DisputeDTO | null>(null);
  const [resolutionType, setResolutionType] = useState<DisputeResolutionType>("NO_REFUND");
  const [resolutionNotes, setResolutionNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Toast State
  const [toast, setToast] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAdminDisputesAction({
        status: statusTab,
        search,
      });
      if (res.success && res.data) {
        setDisputes(res.data.disputes);
        setSummary(res.data.summary);
      } else {
        setToast({
          variant: "danger",
          message: "Failed to Load Claims",
          description: res.error?.message || "Could not retrieve disputes list.",
        });
      }
    } catch (err) {
      console.error("Failed to load CEO disputes:", err);
    } finally {
      setIsLoading(false);
    }
  }, [statusTab, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const paginatedDisputes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return disputes.slice(start, start + pageSize);
  }, [disputes, currentPage, pageSize]);

  const handleOpenRulingModal = (dispute: DisputeDTO) => {
    setActiveDispute(dispute);
    if (dispute.grounds === "SLA_BREACH") {
      setResolutionType("TURNAROUND_UPGRADE_REFUND_ONLY");
    } else {
      setResolutionType("NO_REFUND");
    }
    setResolutionNotes("");
    setModalError(null);
    setIsRulingModalOpen(true);
  };

  const handleConfirmRuling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDispute) return;
    if (resolutionNotes.trim().length < 15) {
      setModalError("Please write at least 15 characters explaining your decision.");
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      const res = await resolveDisputeAction({
        disputeId: activeDispute.id,
        resolutionType,
        resolutionNotes: resolutionNotes.trim(),
      });

      if (res.success) {
        setToast({
          variant: "success",
          message: "Decision Saved",
          description: `Study claim resolved: ${resolutionType.replace(/_/g, " ")}.`,
        });
        setIsRulingModalOpen(false);
        loadData();
      } else {
        setModalError(res.error?.message || "Failed to save decision.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setModalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getGroundsLabel = (grounds: DisputeGrounds) => {
    switch (grounds) {
      case "METHODOLOGY_DEVIATION":
        return "Methodology Deviation";
      case "MATHEMATICAL_ERROR":
        return "Mathematical Error";
      case "SLA_BREACH":
        return "Missed Delivery Deadline";
      default:
        return grounds;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return (
          <Badge variant="sky" className="text-[0.688rem] font-mono flex items-center gap-1">
            <IconClock size={13} stroke={2} />
            <span>New Claim</span>
          </Badge>
        );
      case "UNDER_REVIEW":
        return (
          <Badge variant="amber" className="text-[0.688rem] font-mono flex items-center gap-1">
            <IconScale size={13} stroke={2} />
            <span>Under Review</span>
          </Badge>
        );
      case "RESOLVED_REFUND":
        return (
          <Badge variant="emerald" className="text-[0.688rem] font-mono flex items-center gap-1">
            <IconCheck size={13} stroke={2} />
            <span>Refund Approved</span>
          </Badge>
        );
      case "RESOLVED_NO_REFUND":
        return (
          <Badge variant="muted" className="text-[0.688rem] font-mono flex items-center gap-1">
            <IconCheck size={13} stroke={2} />
            <span>Study Upheld</span>
          </Badge>
        );
      case "CHARGEBACK":
        return (
          <Badge variant="danger" className="text-[0.688rem] font-mono flex items-center gap-1">
            <IconAlertTriangle size={13} stroke={2} />
            <span>Study Halted</span>
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingRulingCount = disputes.filter(
    (d) => d.status === "OPEN" || d.status === "UNDER_REVIEW"
  ).length;

  if (isLoading && !summary) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto font-sans">
        <LoadingState
          variant="page"
          label="Loading Claims Queue..."
          description="Fetching claims and executive resolution records."
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
          { label: "CEO DESK", href: "/dashboard/ceo" },
          { label: "DISPUTES & RULINGS" },
        ]}
        title="CEO Dispute Rulings & Refunds"
        description="Review client claims, decide on refunds, and uphold study quality."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-6">
        <KpiCard
          label="AWAITING DECISION"
          value={pendingRulingCount}
          description="Claims waiting for your ruling"
        />
        <KpiCard
          label="REFUNDS APPROVED"
          value={summary.resolvedRefunds}
          description="Claims resolved with refunds"
        />
        <KpiCard
          label="STUDIES UPHELD"
          value={summary.resolvedNoRefunds}
          description="Studies confirmed correct"
        />
        <KpiCard
          label="TOTAL REFUNDED"
          value={<><Peso />{summary.totalRefundsGranted.toLocaleString("en-US", { minimumFractionDigits: 2 })}</>}
          description="Total money refunded to clients"
        />
      </div>

      {/* Main Table Card */}
      <Card className="p-6 sm:p-8 flex flex-col gap-6 bg-[#0A0A18] border border-white/10 rounded-[4px]">
        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-white/10 pb-5">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "ALL", label: "All Claims" },
              { id: "OPEN", label: "New" },
              { id: "UNDER_REVIEW", label: "Under Review" },
              { id: "RESOLVED_REFUND", label: "Refunded" },
              { id: "RESOLVED_NO_REFUND", label: "Upheld" },
              { id: "CHARGEBACK", label: "Halted" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusTab(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-[2px] text-xs font-semibold transition-all ${
                  statusTab === tab.id
                    ? "bg-[#CC6600] text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search study ID or client..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-black/30 border border-white/10 rounded-[2px] pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/30 w-full"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <LoadingState variant="table" label="Loading Claims Queue..." description="Fetching claims and evidence records" />
          </div>
        ) : disputes.length === 0 ? (
          <div className="py-16 text-center text-xs text-white/40 flex flex-col items-center gap-2">
            <IconShieldCheck size={28} stroke={1.5} className="text-white/20" />
            <span>No claims match the selected criteria.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-black/20 text-white/50 font-mono text-[0.688rem] uppercase tracking-wider">
                  <th className="py-3 px-4">Study / ID</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-right">Study Fee</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date Filed</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {paginatedDisputes.map((d) => (
                  <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Study ID & Title */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-white font-semibold block">{d.projectIntakeId}</span>
                      <span className="text-[0.688rem] text-white/50 line-clamp-1 max-w-[200px] mt-0.5">
                        {d.projectTitle}
                      </span>
                    </td>

                    {/* Client */}
                    <td className="py-3.5 px-4">
                      <span className="text-white/90 block font-medium">{d.clientName}</span>
                      <span className="text-[0.688rem] text-white/40 font-mono">{d.clientEmail}</span>
                    </td>

                    {/* Grounds */}
                    <td className="py-3.5 px-4 font-mono font-medium text-sky-400">
                      {getGroundsLabel(d.grounds)}
                    </td>

                    {/* Study Fee */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white/80">
                      <Peso />{d.grossAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(d.status)}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 font-mono text-white/70">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {d.status !== "RESOLVED_REFUND" && d.status !== "RESOLVED_NO_REFUND" && (
                          <Button
                            variant="primary"
                            className="text-xs h-7 px-3 flex items-center gap-1"
                            onClick={() => handleOpenRulingModal(d)}
                            disabled={isSubmitting}
                          >
                            <IconGavel size={13} />
                            <span>Decide</span>
                          </Button>
                        )}

                        <Button
                          variant="secondary"
                          className="text-xs h-7 px-2.5"
                          onClick={() => setSelectedDispute(d)}
                        >
                          View Dossier
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && disputes.length > 0 && (
          <div className="border-t border-white/10 pt-4">
            <Pagination
              currentPage={currentPage}
              totalItems={disputes.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[5, 10, 20, 50]}
              itemLabel="claims"
            />
          </div>
        )}
      </Card>

      {/* CEO Decision Modal */}
      {isRulingModalOpen && activeDispute && (
        <div className="fixed inset-0 z-50 bg-[#010114]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A0A18] border border-white/20 rounded-[4px] max-w-xl w-full p-6 sm:p-8 flex flex-col gap-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-white">
                <IconGavel size={22} className="text-[#CC6600]" />
                <h3 className="text-base font-bold">CEO Decision on Study Claim</h3>
              </div>
              <button
                onClick={() => setIsRulingModalOpen(false)}
                className="text-white/50 hover:text-white"
              >
                <IconX size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmRuling} className="flex flex-col gap-5 text-xs">
              <div className="bg-black/30 p-3.5 rounded-[2px] border border-white/10 flex flex-col gap-1.5">
                <div className="flex justify-between font-mono text-[0.688rem]">
                  <span className="text-white/50">Study ID:</span>
                  <span className="text-white font-bold">{activeDispute.projectIntakeId}</span>
                </div>
                <div className="flex justify-between font-mono text-[0.688rem]">
                  <span className="text-white/50">Client:</span>
                  <span className="text-white">{activeDispute.clientName} ({activeDispute.clientEmail})</span>
                </div>
                <div className="flex justify-between font-mono text-[0.688rem]">
                  <span className="text-white/50">Total Study Fee:</span>
                  <span className="text-emerald-400 font-bold">
                    <Peso />{activeDispute.grossAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between font-mono text-[0.688rem]">
                  <span className="text-white/50">Reason Filed:</span>
                  <span className="text-sky-400 font-semibold">{getGroundsLabel(activeDispute.grounds)}</span>
                </div>
              </div>

              {modalError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-[2px] text-red-400">
                  {modalError}
                </div>
              )}

              {/* Ruling Option Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-white/80 font-bold">Choose Ruling *</label>
                <div className="grid grid-cols-1 gap-2.5">
                  {/* Full Refund */}
                  <label
                    className={`p-3 rounded-[2px] border flex items-start gap-3 cursor-pointer transition-all ${
                      resolutionType === "FULL_REFUND"
                        ? "bg-[#CC6600]/10 border-[#CC6600] text-white"
                        : "bg-black/20 border-white/10 text-white/70 hover:border-white/20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="ruling"
                      value="FULL_REFUND"
                      checked={resolutionType === "FULL_REFUND"}
                      onChange={() => setResolutionType("FULL_REFUND")}
                      className="mt-0.5 text-[#CC6600]"
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-white">Full Project Refund</span>
                      <span className="text-[0.688rem] text-white/50 leading-normal">
                        Approve a 100% refund to the client. Milestone payouts to specialists will be locked.
                      </span>
                    </div>
                  </label>

                  {/* Fast-Track Upgrade Refund Only */}
                  <label
                    className={`p-3 rounded-[2px] border flex items-start gap-3 cursor-pointer transition-all ${
                      resolutionType === "TURNAROUND_UPGRADE_REFUND_ONLY"
                        ? "bg-[#CC6600]/10 border-[#CC6600] text-white"
                        : "bg-black/20 border-white/10 text-white/70 hover:border-white/20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="ruling"
                      value="TURNAROUND_UPGRADE_REFUND_ONLY"
                      checked={resolutionType === "TURNAROUND_UPGRADE_REFUND_ONLY"}
                      onChange={() => setResolutionType("TURNAROUND_UPGRADE_REFUND_ONLY")}
                      className="mt-0.5 text-[#CC6600]"
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-white">Refund Fast-Track Fee Only</span>
                      <span className="text-[0.688rem] text-white/50 leading-normal">
                        Refund only the extra rush fee because the deadline was missed. The study output stays valid.
                      </span>
                    </div>
                  </label>

                  {/* Uphold Output */}
                  <label
                    className={`p-3 rounded-[2px] border flex items-start gap-3 cursor-pointer transition-all ${
                      resolutionType === "NO_REFUND"
                        ? "bg-emerald-500/10 border-emerald-500 text-white"
                        : "bg-black/20 border-white/10 text-white/70 hover:border-white/20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="ruling"
                      value="NO_REFUND"
                      checked={resolutionType === "NO_REFUND"}
                      onChange={() => setResolutionType("NO_REFUND")}
                      className="mt-0.5 text-emerald-400"
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-white">No Refund (Study Upheld)</span>
                      <span className="text-[0.688rem] text-white/50 leading-normal">
                        The study matches the signed SOW and is mathematically sound. Close the study and release specialist pay.
                      </span>
                    </div>
                  </label>

                  {/* Chargeback */}
                  <label
                    className={`p-3 rounded-[2px] border flex items-start gap-3 cursor-pointer transition-all ${
                      resolutionType === "CHARGEBACK"
                        ? "bg-red-500/10 border-red-500 text-white"
                        : "bg-black/20 border-white/10 text-white/70 hover:border-white/20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="ruling"
                      value="CHARGEBACK"
                      checked={resolutionType === "CHARGEBACK"}
                      onChange={() => setResolutionType("CHARGEBACK")}
                      className="mt-0.5 text-red-400"
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-white">Permanent Chargeback Halt</span>
                      <span className="text-[0.688rem] text-white/50 leading-normal">
                        Halt the project permanently and freeze all related specialist payouts.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Rationale and Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/80 font-semibold">Decision Explanation & Notes *</label>
                <textarea
                  rows={4}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Explain why this decision was reached (e.g. SOW Section 3 verification, calculation audit, or deadline breach)..."
                  className="bg-black/30 border border-white/10 rounded-[2px] p-3 text-white outline-none focus:border-white/30 resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsRulingModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  className="bg-[#CC6600] hover:bg-[#b35900]"
                >
                  {isSubmitting ? "Saving Decision..." : "Save Decision"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispute Dossier Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 bg-[#010114]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A0A18] border border-white/15 rounded-[4px] max-w-2xl w-full p-6 sm:p-8 flex flex-col gap-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <IconFileText size={22} className="text-sky-400" />
                <h3 className="text-base font-bold text-white">Claim Dossier: {selectedDispute.projectIntakeId}</h3>
              </div>
              <button
                onClick={() => setSelectedDispute(null)}
                className="text-white/50 hover:text-white"
              >
                <IconX size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-black/30 p-4 rounded-[2px] border border-white/10">
                <div>
                  <span className="text-white/40 block">Client</span>
                  <span className="text-white font-semibold">{selectedDispute.clientName}</span>
                  <span className="text-white/50 block font-mono text-[0.688rem]">{selectedDispute.clientEmail}</span>
                </div>
                <div>
                  <span className="text-white/40 block">Study Fee</span>
                  <span className="text-emerald-400 font-bold font-mono text-sm">
                    <Peso />{selectedDispute.grossAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-white/40 block">Reason Filed</span>
                  <span className="text-sky-400 font-semibold">{getGroundsLabel(selectedDispute.grounds)}</span>
                </div>
                <div>
                  <span className="text-white/40 block">Status</span>
                  <span>{getStatusBadge(selectedDispute.status)}</span>
                </div>
              </div>

              {/* Client Statement */}
              <div className="flex flex-col gap-1.5">
                <span className="font-semibold text-white">Client Explanation:</span>
                <p className="p-3 bg-black/20 border border-white/5 rounded-[2px] text-white/80 leading-relaxed whitespace-pre-wrap">
                  {selectedDispute.description}
                </p>
              </div>

              {/* Evidence */}
              {selectedDispute.evidenceFilePaths && selectedDispute.evidenceFilePaths.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="font-semibold text-white">Attached Evidence:</span>
                  <div className="flex flex-col gap-1">
                    {selectedDispute.evidenceFilePaths.map((f, i) => (
                      <a
                        key={i}
                        href={f}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-400 hover:underline truncate block"
                      >
                        {f}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* CEO Ruling info */}
              {selectedDispute.resolutionType && (
                <div className="bg-[#0F0F1D] border border-emerald-500/20 rounded-[2px] p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <IconGavel size={16} />
                    <span>CEO Decision</span>
                  </div>
                  <div className="flex justify-between text-[0.688rem] text-white/60">
                    <span>Ruling: <strong className="text-white font-mono">{selectedDispute.resolutionType.replace(/_/g, " ")}</strong></span>
                    <span>Decided on: {selectedDispute.resolvedAt ? new Date(selectedDispute.resolvedAt).toLocaleDateString() : ""}</span>
                  </div>
                  <p className="text-white/90 text-xs bg-black/30 p-3 rounded-[2px] border border-white/5 whitespace-pre-wrap">
                    {selectedDispute.resolutionNotes || "No notes attached."}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-white/10">
              <Button
                variant="secondary"
                onClick={() => setSelectedDispute(null)}
              >
                Close Dossier
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          variant={toast.variant}
          message={toast.message}
          description={toast.description}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
