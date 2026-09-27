"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { LoadingState, Toast, Button } from "@repo/ui";
import {
  IconReceipt,
  IconChecklist,
} from "@tabler/icons-react";
import Link from "next/link";
import { getPaymentsByProject } from "@/features/payments/actions";
import type { PaymentItem, ProjectPaymentsData } from "@/features/payments/schemas";
import { PaymentLedgerCard } from "@/features/payments/components/PaymentLedgerCard";
import dynamic from "next/dynamic";

const PaymentVerificationModal = dynamic(
  () =>
    import("@/features/payments/components/PaymentVerificationModal").then(
      (m) => m.PaymentVerificationModal
    ),
  { ssr: false }
);
import { getProjectById } from "@/features/projects/actions";
import type { ProjectDetailItem } from "@/features/projects/schemas";
import { StudySection } from "@/features/projects/components/StudySection";

export default function AdminProjectPaymentPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectDetailItem | null>(null);
  const [paymentsData, setPaymentsData] = useState<ProjectPaymentsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVerificationPayment, setSelectedVerificationPayment] = useState<PaymentItem | null>(null);

  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [projRes, payRes] = await Promise.all([
        getProjectById(projectId),
        getPaymentsByProject(projectId),
      ]);

      if (projRes.success) {
        setProject(projRes.data);
      }
      if (payRes.success) {
        setPaymentsData(payRes.data);
      }
    } catch {
      setToastMessage({
        message: "Failed to Load Financial Data",
        description: "Please check your network connection and refresh.",
        variant: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleVerificationSuccess = () => {
    setToastMessage({
      message: "Payment Cleared Successfully",
      description: "Project balance updated. State machine evaluated.",
      variant: "success",
    });
    loadData();
  };

  if (isLoading) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
        <LoadingState
          variant="page"
          label="Loading administrative financial ledger..."
          description="Scanning verified receipts, escrow reserves, and contract terms."
        />
      </div>
    );
  }

  if (!project || !paymentsData) {
    return (
      <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
        <div className="p-8 text-center bg-[#0A0A18] border border-white/10 rounded-[2px]">
          <h2 className="text-base font-sans font-bold text-white">Financial Ledger Unavailable</h2>
          <p className="text-xs text-white/50 mt-1 mb-4 font-sans">
            Unable to locate project or payments for ID: {projectId}.
          </p>
          <Link href="/dashboard/admin/intake">
            <Button variant="outline" size="sm">
              ← Return to Intake Triage
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { summary, payments } = paymentsData;
  const pendingProof = payments.find((p) => p.paymentStatus === "PROOF_SUBMITTED");

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      {/* ── Page Header ── */}
      <StudySection
          title="Payment"
          description="Deposits, receipts and what's left to pay."
          actions={
            <>
              {pendingProof && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedVerificationPayment(pendingProof)}
                className="gap-1.5 font-sans font-semibold"
              >
                <IconChecklist size={14} stroke={2} />
                <span>Check Deposit</span>
              </Button>
            )}
            </>
          }
        />

      {/* ── Pending Verification Alert (if any) ── */}
      {pendingProof && (
        <div className="p-4 rounded-[2px] bg-[#CC6600]/10 border border-[#CC6600]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[2px] bg-[#CC6600]/20 flex items-center justify-center flex-shrink-0">
              <IconReceipt size={20} stroke={1.5} className="text-[#FFA040]" />
            </div>
            <div>
              <h4 className="text-xs font-sans font-semibold text-white">
                Deposit Proof Awaiting Verification
              </h4>
              <p className="text-[0.688rem] font-sans text-white/60 mt-0.5">
                Client submitted {pendingProof.paymentMethod} proof for ₱
                {pendingProof.amountSubmitted.toLocaleString("en-PH", { minimumFractionDigits: 2 })} (Ref:{" "}
                {pendingProof.referenceNumber || "N/A"}).
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setSelectedVerificationPayment(pendingProof)}
            className="whitespace-nowrap font-sans text-xs font-semibold"
          >
            Review &amp; Clear Funds →
          </Button>
        </div>
      )}

      {/* ── Main Ledger Card ── */}
      <PaymentLedgerCard
        summary={summary}
        payments={payments}
        canUpload={false}
      />

      {/* ── Verification Modal ── */}
      {selectedVerificationPayment && (
        <PaymentVerificationModal
          open={!!selectedVerificationPayment}
          onClose={() => setSelectedVerificationPayment(null)}
          payment={selectedVerificationPayment}
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
