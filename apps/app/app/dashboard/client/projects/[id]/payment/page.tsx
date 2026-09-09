"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { PageHeader, LoadingState, Toast, Button, Peso } from "@repo/ui";
import {
  ArrowLeft,
  ShieldCheck,
  Plus,
} from "@phosphor-icons/react";
import Link from "next/link";
import { getPaymentsByProject } from "@/features/payments/actions";
import type { PaymentItem, ProjectPaymentsData } from "@/features/payments/schemas";
import { PaymentLedgerCard } from "@/features/payments/components/PaymentLedgerCard";
import dynamic from "next/dynamic";

const PaymentProofUploadModal = dynamic(
  () =>
    import("@/features/payments/components/PaymentProofUploadModal").then(
      (m) => m.PaymentProofUploadModal
    ),
  { ssr: false }
);
import { getProjectById } from "@/features/projects/actions";
import type { ProjectDetailItem } from "@/features/projects/schemas";

export default function ClientProjectPaymentPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectDetailItem | null>(null);
  const [paymentsData, setPaymentsData] = useState<ProjectPaymentsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

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

  const handleUploadSuccess = (payment: PaymentItem) => {
    setToastMessage({
      message: "Payment Proof Submitted",
      description: `Reference #${payment.referenceNumber || payment.id} received. Our finance team will verify your payment shortly.`,
      variant: "success",
    });
    setPaymentsData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        payments: [payment, ...prev.payments.filter((p) => p.id !== payment.id)],
      };
    });
    loadData();
  };

  if (isLoading) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
        <LoadingState
          variant="page"
          label="Loading payments..."
          description="Retrieving payment history and contract balance."
        />
      </div>
    );
  }

  if (!project || !paymentsData) {
    return (
      <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
        <div className="p-8 text-center bg-[#01142B] border border-white/10 rounded-[2px]">
          <h2 className="text-base font-sans font-bold text-white">Payment Records Unavailable</h2>
          <p className="text-xs text-white/50 mt-1 mb-4 font-sans">
            Unable to locate project or quotation terms for ID: {projectId}.
          </p>
          <Link href="/dashboard/client/projects">
            <Button variant="outline" size="sm" className="rounded-[2px] active:scale-[0.97] transition-all">
              ← Return to Active Studies
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { summary, payments, quotationId: returnedQuotationId } = paymentsData;
  const quotationId = returnedQuotationId || payments[0]?.quotationId || project.id;

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      {/* ── Page Header & Navigation ── */}
      <PageHeader
        title={`Payments & Receipts: ${project.intakeId}`}
        description="Submit GCash or bank transfer deposit receipts to activate research and track your contract balance."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "MY STUDIES", href: "/dashboard/client/projects" },
          { label: project.intakeId, href: `/dashboard/client/projects/${project.id}` },
          { label: "PAYMENTS" },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <Link href={`/dashboard/client/projects/${project.id}`}>
              <Button variant="outline" size="sm" className="gap-1.5 font-sans rounded-[2px] active:scale-[0.97] transition-all">
                <ArrowLeft size={14} weight="fill" />
                <span>Return to Study</span>
              </Button>
            </Link>
            {!summary.isFullyPaid && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsUploadModalOpen(true)}
                className="gap-1.5 font-sans rounded-[2px] active:scale-[0.97] transition-all bg-[#CC6600] hover:bg-[#E67300] text-white"
              >
                <Plus size={14} weight="fill" />
                <span>Submit Deposit Proof</span>
              </Button>
            )}
          </div>
        }
      />

      {/* ── SOW Agreement Status Banner ── */}
      <div className="p-4 rounded-[2px] bg-[#011B38]/80 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-card-reveal stagger-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[2px] bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={20} weight="fill" className="text-emerald-400" />
          </div>
          <div>
            <h4 className="text-xs font-sans font-semibold text-white">
              Official Statement of Work Executed
            </h4>
            <p className="text-[0.688rem] font-sans text-white/50 mt-0.5 inline-flex items-baseline">
              Package: {project.packageName || "JX-03 Core"} · Total Fee:&nbsp;<Peso className="text-white/50" />
              {summary.totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })} · SOW Signed
            </p>
          </div>
        </div>

        <Link href={`/dashboard/client/projects/${project.id}/sow`}>
          <Button variant="secondary" size="sm" className="whitespace-nowrap font-sans text-xs rounded-[2px] active:scale-[0.97] transition-all">
            View Signed Contract →
          </Button>
        </Link>
      </div>

      {/* ── Main Payment Ledger Card ── */}
      <PaymentLedgerCard
        summary={summary}
        payments={payments}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        canUpload={!summary.isFullyPaid}
      />

      {/* ── Upload Modal ── */}
      {isUploadModalOpen && (
        <PaymentProofUploadModal
          open={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          projectId={project.id}
          projectIntakeId={project.intakeId}
          quotationId={quotationId}
          totalAmount={summary.totalAmount}
          downpaymentRequired={summary.downpaymentRequired}
          remainingBalance={summary.remainingBalance}
          onSuccess={handleUploadSuccess}
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
