"use client";

import React, { useEffect, useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  MoneyDisplay,
  LoadingState,
  EmptyState,
  Toast,
  Tabs,
  TabsList,
  TabsTrigger,
  StatusBadge,
  Pagination,
} from "@repo/ui";
import {
  IconChecklist,
  IconReceipt,
  IconShieldCheck,
  IconBuildingBank,
  IconDeviceMobile,
  IconFileText,
  IconRefresh,
  IconExternalLink,
  IconAlertCircle,
} from "@tabler/icons-react";
import Link from "next/link";
import { getFinancePaymentsQueue } from "@/features/payments/actions";
import type { PaymentItem } from "@/features/payments/schemas";
import dynamic from "next/dynamic";

const PaymentVerificationModal = dynamic(
  () =>
    import("@/features/payments/components/PaymentVerificationModal").then(
      (m) => m.PaymentVerificationModal
    ),
  { ssr: false }
);

interface FinancePaymentsQueueClientProps {
  initialPayments?: PaymentItem[];
}

export function FinancePaymentsQueueClient({
  initialPayments = [],
}: FinancePaymentsQueueClientProps) {
  const [payments, setPayments] = useState<PaymentItem[]>(initialPayments);
  const [isLoading, setIsLoading] = useState(initialPayments.length === 0);
  const [activeTab, setActiveTab] = useState<"PENDING" | "VERIFIED" | "REJECTED">("PENDING");
  const [filterMethod, setFilterMethod] = useState<"ALL" | "GCASH" | "BANK_TRANSFER">("ALL");
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const isMountedRef = React.useRef(true);

  const loadQueue = async () => {
    setIsLoading(true);
    try {
      const res = await getFinancePaymentsQueue({ status: "ALL" });
      if (!isMountedRef.current) return;
      if (res.success) {
        setPayments(res.data);
      } else {
        setToastMessage({
          message: "Failed to Load Verification Queue",
          description: res.error.message,
          variant: "danger",
        });
      }
    } catch {
      if (isMountedRef.current) {
        setToastMessage({
          message: "Network Error",
          description: "Could not retrieve pending deposits. Please try again.",
          variant: "danger",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    if (initialPayments.length === 0) {
      loadQueue();
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [initialPayments.length]);

  const handleVerificationSuccess = () => {
    setToastMessage({
      message: "Payment Cleared & Verified",
      description: "Project balance updated. Eligible studies have been transitioned to active assignment.",
      variant: "success",
    });
    loadQueue();
  };

  // Filter by Tab
  const pendingPayments = payments.filter((p) => p.paymentStatus === "PROOF_SUBMITTED");
  const verifiedPayments = payments.filter(
    (p) => p.paymentStatus === "VERIFIED" || p.paymentStatus === "FULLY_PAID"
  );
  const rejectedPayments = payments.filter((p) => p.paymentStatus === "REJECTED");

  const currentTabPayments =
    activeTab === "PENDING"
      ? pendingPayments
      : activeTab === "VERIFIED"
        ? verifiedPayments
        : rejectedPayments;

  // Filter by Payment Method
  const filteredPayments = currentTabPayments.filter((p) => {
    if (filterMethod === "ALL") return true;
    return p.paymentMethod === filterMethod;
  });

  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + p.amountSubmitted, 0);
  const totalVerifiedAmount = verifiedPayments.reduce((sum, p) => sum + p.amountSubmitted, 0);
  const gcashCount = currentTabPayments.filter((p) => p.paymentMethod === "GCASH").length;
  const bankCount = currentTabPayments.filter((p) => p.paymentMethod === "BANK_TRANSFER").length;

  if (isLoading && payments.length === 0) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto font-sans">
        <LoadingState
          variant="page"
          label="Loading Payment Verification Queue..."
          description="Scanning deposit records and receipts."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      {/* ── Header ── */}
      <PageHeader
        title="Deposit Verification Queue & Historical Ledger"
        description="Inspect client GCash and bank transfer receipts, reconcile transaction reference numbers, and review historical cleared payments."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Finance & HR", href: "/dashboard/finance" },
          { label: "Deposit Verification & Ledger" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            <Link href="/dashboard/finance" className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full sm:w-auto justify-center">
                ← Finance Overview
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={loadQueue}
              className="w-full sm:w-auto justify-center gap-1.5"
            >
              <IconRefresh size={14} stroke={2} />
              <span>Refresh Queue</span>
            </Button>
          </div>
        }
      />

      {/* ── KPI Metric Counters ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-white/10 bg-[#01142B]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs font-semibold text-white/50 uppercase tracking-wider">
              Pending Clearances
            </span>
            <IconChecklist size={16} stroke={1.5} className="text-[#FFA040]" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-sans font-bold text-white tracking-tight">
              {pendingPayments.length}
            </div>
            <p className="font-sans text-xs text-white/50 mt-0.5">
              {pendingPayments.length === 1 ? "Receipt awaiting review" : "Receipts awaiting review"}
            </p>
          </div>
        </Card>

        <Card className="p-5 border-white/10 bg-[#01142B]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs font-semibold text-white/50 uppercase tracking-wider">
              Verified Vault Volume
            </span>
            <IconShieldCheck size={16} stroke={1.5} className="text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-sans font-bold text-emerald-400 tracking-tight">
              <MoneyDisplay amount={totalVerifiedAmount} />
            </div>
            <p className="font-sans text-xs text-white/50 mt-0.5">
              {verifiedPayments.length} verified deposits in vault
            </p>
          </div>
        </Card>

        <Card className="p-5 border-white/10 bg-[#01142B]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs font-semibold text-white/50 uppercase tracking-wider">
              Pending Volume
            </span>
            <IconReceipt size={16} stroke={1.5} className="text-[#FFA040]" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-sans font-bold text-amber-400 tracking-tight">
              <MoneyDisplay amount={totalPendingAmount} />
            </div>
            <p className="font-sans text-xs text-white/50 mt-0.5">
              Awaiting officer verification
            </p>
          </div>
        </Card>
      </div>

      {/* ── Main Queue & History Tabs ── */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val as "PENDING" | "VERIFIED" | "REJECTED");
          setFilterMethod("ALL");
          setCurrentPage(1);
        }}
        className="w-full"
      >
        <TabsList className="bg-[#01142B] border border-white/10 p-1 rounded-[2px]">
          <TabsTrigger value="PENDING" className="gap-2 font-sans font-semibold text-xs cursor-pointer">
            <IconChecklist size={14} stroke={2} />
            <span>Pending Review ({pendingPayments.length})</span>
          </TabsTrigger>
          <TabsTrigger value="VERIFIED" className="gap-2 font-sans font-semibold text-xs cursor-pointer">
            <IconShieldCheck size={14} stroke={2} />
            <span>Cleared &amp; Verified History ({verifiedPayments.length})</span>
          </TabsTrigger>
          {rejectedPayments.length > 0 && (
            <TabsTrigger value="REJECTED" className="gap-2 font-sans font-semibold text-xs cursor-pointer">
              <IconAlertCircle size={14} stroke={2} />
              <span>Rejected ({rejectedPayments.length})</span>
            </TabsTrigger>
          )}
        </TabsList>

        <Card className="p-0 border-white/10 overflow-hidden bg-[#01142B]/90 mt-4">
          {/* Method Filter Toolbar */}
          <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setFilterMethod("ALL"); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-[2px] font-sans text-xs font-semibold transition-all cursor-pointer ${
                  filterMethod === "ALL"
                    ? "bg-[#CC6600] text-white shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                All Channels ({currentTabPayments.length})
              </button>
              <button
                type="button"
                onClick={() => { setFilterMethod("GCASH"); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-[2px] font-sans text-xs font-semibold transition-all cursor-pointer ${
                  filterMethod === "GCASH"
                    ? "bg-[#CC6600] text-white shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                GCash ({gcashCount})
              </button>
              <button
                type="button"
                onClick={() => { setFilterMethod("BANK_TRANSFER"); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-[2px] font-sans text-xs font-semibold transition-all cursor-pointer ${
                  filterMethod === "BANK_TRANSFER"
                    ? "bg-[#CC6600] text-white shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                Bank Transfers ({bankCount})
              </button>
            </div>

            <span className="font-sans text-xs text-white/50">
              Showing {filteredPayments.length} of {currentTabPayments.length} records
            </span>
          </div>

          {isLoading ? (
            <div className="py-16">
              <LoadingState
                variant="table"
                label="Scanning financial records and payment receipts..."
                description="Please wait while data synchronizes."
              />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-12">
              <EmptyState
                icon={activeTab === "PENDING" ? IconShieldCheck : IconReceipt}
                title={
                  activeTab === "PENDING"
                    ? "Deposit Verification Queue Cleared"
                    : activeTab === "VERIFIED"
                      ? "No Verified Payments Recorded"
                      : "No Rejected Proofs Recorded"
                }
                description={
                  activeTab === "PENDING"
                    ? "There are currently no unverified payment receipts awaiting review. All submitted deposits have been reconciled."
                    : activeTab === "VERIFIED"
                      ? "No verified payment deposits have been completed yet."
                      : "No transaction receipts have been rejected."
                }
              />
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[900px] text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 font-mono uppercase tracking-wider">
                    <th className="py-3.5 px-5">Study &amp; Title</th>
                    <th className="py-3.5 px-5">Lead Researcher</th>
                    <th className="py-3.5 px-5">Channel &amp; Ref</th>
                    <th className="py-3.5 px-5">
                      {activeTab === "VERIFIED" ? "Cleared Amount" : "Claimed Amount"}
                    </th>
                    <th className="py-3.5 px-5">
                      {activeTab === "VERIFIED" ? "Verified Date" : "Submitted"}
                    </th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-white/80">
                  {paginatedPayments.map((payment) => {
                    const projectId = payment.project?.id || payment.projectId;
                    return (
                      <tr key={payment.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="font-mono text-xs font-bold text-[#FFA040]">
                            {payment.project?.intakeId || payment.projectId}
                          </div>
                          <div className="font-sans text-xs text-white/80 line-clamp-1 max-w-[200px]">
                            {payment.project?.researchTitle || "Research Study"}
                          </div>
                        </td>

                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="font-sans text-xs text-white font-medium">
                            {payment.project?.client.fullName || "Client"}
                          </div>
                          <div className="font-sans text-[0.688rem] text-white/40">
                            {payment.project?.client.clientProfile?.institutionSchool ||
                              payment.project?.client.email}
                          </div>
                        </td>

                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-sans font-medium text-white">
                            {payment.paymentMethod === "GCASH" ? (
                              <IconDeviceMobile size={14} stroke={1.5} className="text-[#CC6600]" />
                            ) : (
                              <IconBuildingBank size={14} stroke={1.5} className="text-sky-400" />
                            )}
                            <span>{payment.paymentMethod === "GCASH" ? "GCash" : "Bank Transfer"}</span>
                          </div>
                          <div className="font-mono text-[0.688rem] text-white/60 mt-0.5">
                            Ref: {payment.referenceNumber || "N/A"}
                          </div>
                        </td>

                        <td className="py-4 px-5 whitespace-nowrap">
                          <span className="font-sans text-sm font-bold text-emerald-400">
                            <MoneyDisplay amount={payment.amountSubmitted} />
                          </span>
                          <div className="font-mono text-[0.688rem] text-white/40">
                            {payment.paymentType === "DOWNPAYMENT" ? "Downpayment" : payment.paymentType === "FULL" ? "Full Payment" : payment.paymentType === "BALANCE" ? "Balance Payment" : payment.paymentType === "INSTALLMENT" ? "Installment" : payment.paymentType}
                          </div>
                        </td>

                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="font-sans text-white/80">
                            {new Date(
                              activeTab === "VERIFIED"
                                ? payment.verifiedAt || payment.updatedAt
                                : payment.createdAt
                            ).toLocaleDateString("en-PH", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                          <div className="font-mono text-[0.688rem] text-white/40">
                            {new Date(
                              activeTab === "VERIFIED"
                                ? payment.verifiedAt || payment.updatedAt
                                : payment.createdAt
                            ).toLocaleTimeString("en-PH", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>

                        <td className="py-4 px-5 whitespace-nowrap">
                          <StatusBadge
                            status={payment.paymentStatus}
                            label={
                              payment.paymentType === "DOWNPAYMENT" && (payment.paymentStatus === "FULLY_PAID" || payment.paymentStatus === "VERIFIED")
                                ? "Downpayment Cleared"
                                : payment.paymentType === "BALANCE" && (payment.paymentStatus === "FULLY_PAID" || payment.paymentStatus === "VERIFIED")
                                  ? "Fully Paid"
                                  : payment.paymentType === "FULL" && (payment.paymentStatus === "FULLY_PAID" || payment.paymentStatus === "VERIFIED")
                                    ? "Fully Paid"
                                    : payment.paymentType === "INSTALLMENT" && (payment.paymentStatus === "FULLY_PAID" || payment.paymentStatus === "VERIFIED")
                                      ? "Installment Cleared"
                                      : undefined
                            }
                          />
                        </td>

                        <td className="py-4 px-5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            {activeTab === "PENDING" ? (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => setSelectedPayment(payment)}
                                className="font-sans text-xs whitespace-nowrap"
                              >
                                Inspect &amp; Verify →
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedPayment(payment)}
                                  className="font-sans text-xs whitespace-nowrap py-1 px-2.5 gap-1.5"
                                >
                                  <IconFileText size={14} stroke={1.5} />
                                  <span>Inspect Receipt</span>
                                </Button>

                                <Link href={`/dashboard/finance/projects/${projectId}/payment`}>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="font-sans text-xs whitespace-nowrap py-1 px-2.5 gap-1"
                                    title="Open Project Ledger"
                                  >
                                    <span>Ledger</span>
                                    <IconExternalLink size={13} stroke={1.5} />
                                  </Button>
                                </Link>
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

          {!isLoading && filteredPayments.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredPayments.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="records"
            />
          )}
        </Card>
      </Tabs>

      {/* ── Inspection / Verification Modal ── */}
      {selectedPayment && (
        <PaymentVerificationModal
          open={!!selectedPayment}
          onClose={() => setSelectedPayment(null)}
          payment={selectedPayment}
          onSuccess={handleVerificationSuccess}
        />
      )}

      {/* ── Toast Notifications ── */}
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          description={toastMessage.description}
          variant={toastMessage.variant}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
