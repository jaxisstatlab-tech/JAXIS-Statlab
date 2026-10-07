"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Button, Toast } from "@repo/ui";
import { ArrowRight } from "@phosphor-icons/react";
import { Panel, PanelBody } from "@/components/dashboard/Panel";
import { StudySection } from "@/features/projects/components/StudySection";
import { PaymentLedgerCard } from "@/features/payments/components/PaymentLedgerCard";
import type { PaymentItem, ProjectPaymentsData } from "@/features/payments/schemas";
import type { ProjectDetailItem } from "@/features/projects/schemas";

const PaymentVerificationModal = dynamic(
  () => import("@/features/payments/components/PaymentVerificationModal").then((m) => m.PaymentVerificationModal),
  { ssr: false }
);

// Payment tab: price, deposit, paid and left to pay, and each payment with its receipt. A payment waiting to be
// checked gets the one orange button; confirming the deposit opens the study for assignment.

export function AdminPaymentDesk({ project, data, loadError }: { project?: ProjectDetailItem; data?: ProjectPaymentsData; loadError?: string }) {
  const router = useRouter();
  const [checking, setChecking] = useState<PaymentItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (!project || !data) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 font-sans animate-content-fade">
        <Panel as="div">
          <PanelBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white">The payments didn&apos;t load</p>
              <p className="mt-0.5 text-[13px] text-white/55">{loadError || "Try again in a moment."}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.refresh()}>
              Try Again
            </Button>
          </PanelBody>
        </Panel>
      </div>
    );
  }

  const { summary, payments } = data;
  const waiting = payments.find((p) => p.paymentStatus === "PROOF_SUBMITTED");
  const s = project.masterStatus;
  const beforeSigning = ["NEW_REQUEST", "AWAITING_INFORMATION", "UNDER_EVALUATION", "QUOTE_SENT", "CLIENT_APPROVED", "SOW_PENDING"].includes(s);

  const description = waiting
    ? `${project.client.fullName} sent a payment. Check the receipt, then confirm or reject it.`
    : beforeSigning
      ? "The client pays the deposit after signing the agreement."
      : summary.isFullyPaid
        ? "Paid in full."
        : summary.isDownpaymentCleared
          ? "Deposit confirmed. The balance is due before the final files are released."
          : "Waiting for the client's deposit.";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 font-sans animate-content-fade">
      <StudySection
        title="Payment"
        description={description}
        actions={
          waiting ? (
            <Button variant="primary" size="sm" onClick={() => setChecking(waiting)} className="active:scale-[0.97]">
              Check Payment
            </Button>
          ) : s === "ACTIVE" ? (
            <Button asChild variant="outline" size="sm" className="gap-1.5 active:scale-[0.97]">
              <Link href={`/dashboard/admin/projects/${project.id}`}>
                Assign Team
                <ArrowRight size={13} weight="bold" />
              </Link>
            </Button>
          ) : null
        }
      />

      <PaymentLedgerCard summary={summary} payments={payments} onVerify={setChecking} />

      {checking ? (
        <PaymentVerificationModal
          open
          onClose={() => setChecking(null)}
          payment={checking}
          onSuccess={() => {
            setChecking(null);
            setToast("Payment updated");
            router.refresh();
          }}
        />
      ) : null}
      {toast ? <Toast message={toast} variant="success" onClose={() => setToast(null)} /> : null}
    </div>
  );
}
