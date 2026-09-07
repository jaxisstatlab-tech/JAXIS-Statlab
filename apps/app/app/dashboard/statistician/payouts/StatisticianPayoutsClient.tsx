"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  PageHeader,
  KpiCard,
  Card,
  Badge,
  LoadingState,
  Peso,
  Pagination,
} from "@repo/ui";
import { getSpecialistPayoutHistoryAction } from "@/features/finance/actions";
import type { SpecialistPayoutDTO } from "@/features/finance/schemas";
import {
  IconCheck,
  IconClock,
  IconReceipt,
  IconShieldCheck,
} from "@tabler/icons-react";

export interface StatisticianPayoutsClientProps {
  initialData: {
    payouts: SpecialistPayoutDTO[];
    verifiedEarnings: number;
    inProgressEscrow: number;
  };
}

export function StatisticianPayoutsClient({ initialData }: StatisticianPayoutsClientProps) {
  const [payouts, setPayouts] = useState<SpecialistPayoutDTO[]>(initialData.payouts);
  const [verifiedEarnings, setVerifiedEarnings] = useState<number>(initialData.verifiedEarnings);
  const [inProgressEscrow, setInProgressEscrow] = useState<number>(initialData.inProgressEscrow);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const isMountedRef = useRef(true);
  const isInitialMount = useRef(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getSpecialistPayoutHistoryAction();
      if (!isMountedRef.current) return;
      if (res.success && res.data) {
        setPayouts(res.data.payouts);
        setVerifiedEarnings(res.data.verifiedEarnings);
        setInProgressEscrow(res.data.inProgressEscrow);
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error("Failed to load specialist payouts:", err);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    loadData();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadData]);

  const completedCount = payouts.filter((p) => p.payoutStatus === "DISBURSED").length;

  const paginatedPayouts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return payouts.slice(start, start + pageSize);
  }, [payouts, currentPage, pageSize]);

  if (isLoading && payouts.length === 0) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto font-sans">
        <LoadingState
          variant="page"
          label="Loading Payout History..."
          description="Retrieving personal compensation ledger."
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
          { label: "STATISTICIAN WORKBENCH", href: "/dashboard/statistician" },
          { label: "MILESTONE PAYOUTS" },
        ]}
        title="My Milestone Payouts & Earnings"
        description="Track verified milestone fee disbursements, in-progress escrow balances, and package commission rates."
      />

      {/* Canonical KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <KpiCard
          label="VERIFIED EARNINGS (PAID)"
          value={<><Peso />{verifiedEarnings.toLocaleString("en-US", { minimumFractionDigits: 2 })}</>}
          description="Total milestone commissions disbursed to your account"
        />
        <KpiCard
          label="IN-PROGRESS ESCROW"
          value={<><Peso />{inProgressEscrow.toLocaleString("en-US", { minimumFractionDigits: 2 })}</>}
          description="Pending milestones awaiting final study delivery"
        />
        <KpiCard
          label="COMPLETED STUDIES"
          value={completedCount}
          description="Total studies completed and settled"
        />
      </div>

      {/* Payout History Card */}
      <Card className="p-6 sm:p-8 flex flex-col gap-6 bg-[#01142B] border border-white/10 rounded-[4px]">
        <div className="border-b border-white/10 pb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Study Milestone History</h2>
          <span className="text-xs text-white/50">{payouts.length} total assignments</span>
        </div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <LoadingState variant="table" label="Loading Payout History..." description="Retrieving personal compensation ledger" />
          </div>
        ) : payouts.length === 0 ? (
          <div className="py-16 text-center text-xs text-white/40 flex flex-col items-center gap-2">
            <IconReceipt size={28} stroke={1.5} className="text-white/20" />
            <span>No milestone payouts recorded yet.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-black/20 text-white/50 font-mono text-[0.688rem] uppercase tracking-wider">
                  <th className="py-3 px-4">Study / Intake ID</th>
                  <th className="py-3 px-4">Package</th>
                  <th className="py-3 px-4 text-right">Study Value</th>
                  <th className="py-3 px-4 text-center">Applied Split</th>
                  <th className="py-3 px-4 text-right">Payout Sum</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Disbursement Particulars</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {paginatedPayouts.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Study ID & Title */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-white/90 font-semibold block">{p.projectIntakeId}</span>
                      <span className="text-[0.688rem] text-white/50 line-clamp-1 max-w-[240px] mt-0.5">
                        {p.projectTitle}
                      </span>
                    </td>

                    {/* Package */}
                    <td className="py-3.5 px-4 font-mono">
                      <Badge variant="muted" className="text-[0.625rem]">
                        {p.packageName}
                      </Badge>
                    </td>

                    {/* Gross Project Amount */}
                    <td className="py-3.5 px-4 text-right font-mono text-white/70">
                      <Peso />{p.grossProjectAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>

                    {/* Applied Rate */}
                    <td className="py-3.5 px-4 text-center font-mono font-semibold text-sky-400">
                      {p.payoutRateApplied}%
                    </td>

                    {/* Payout Sum */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                      <Peso />{p.payoutAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {p.payoutStatus === "DISBURSED" ? (
                        <Badge variant="emerald" className="text-[0.688rem] font-mono flex items-center gap-1">
                          <IconCheck size={13} stroke={2} />
                          <span>Disbursed</span>
                        </Badge>
                      ) : p.payoutStatus === "APPROVED" ? (
                        <Badge variant="sky" className="text-[0.688rem] font-mono flex items-center gap-1">
                          <IconShieldCheck size={13} stroke={2} />
                          <span>Approved (Pending Release)</span>
                        </Badge>
                      ) : p.payoutStatus === "VOIDED" ? (
                        <Badge variant="danger" className="text-[0.688rem] font-mono">
                          Voided
                        </Badge>
                      ) : (
                        <Badge variant="amber" className="text-[0.688rem] font-mono flex items-center gap-1">
                          <IconClock size={13} stroke={2} />
                          <span>In Escrow</span>
                        </Badge>
                      )}
                    </td>

                    {/* Disbursement Details */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      {p.payoutStatus === "DISBURSED" ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-white/90 text-xs font-semibold">
                            {p.disbursementMethod} &bull; {p.disbursementRef}
                          </span>
                          <span className="text-[0.625rem] text-white/40">
                            {p.disbursedAt ? new Date(p.disbursedAt).toLocaleDateString() : ""}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[0.688rem] text-white/30 italic">
                          Awaiting study delivery
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Component */}
        {!isLoading && payouts.length > 0 && (
          <div className="border-t border-white/10 pt-4">
            <Pagination
              currentPage={currentPage}
              totalItems={payouts.length}
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
    </div>
  );
}
