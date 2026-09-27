"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button, LoadingState } from "@repo/ui";
import { ArrowLeft, Clock, WarningCircle } from "@phosphor-icons/react";
import { getPaymentsByProject } from "@/features/payments/actions";
import { getProjectById } from "@/features/projects/actions";
import { PaymentReceiptDocument } from "@/features/payments/components/PaymentReceiptDocument";
import { paidUpTo, isConfirmed } from "@/features/payments/client-payments";
import { Panel } from "@/components/dashboard/Panel";
import type { ProjectDetailItem } from "@/features/projects/schemas";
import type { ProjectPaymentsData } from "@/features/payments/schemas";

// One payment's receipt, on its own page so it prints cleanly (Payment tab stays highlighted).

export default function ClientPaymentReceiptPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const paymentId = params?.paymentId as string;

  const [project, setProject] = useState<ProjectDetailItem | null>(null);
  const [data, setData] = useState<ProjectPaymentsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [projRes, payRes] = await Promise.all([getProjectById(projectId), getPaymentsByProject(projectId)]);
        if (cancelled) return;
        if (projRes.success) setProject(projRes.data);
        if (payRes.success) setData(payRes.data);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const back = (
    <Link
      href={`/dashboard/client/projects/${projectId}/payment`}
      className="inline-flex items-center gap-1.5 text-[13px] text-white/60 transition-colors hover:text-white print:hidden"
    >
      <ArrowLeft size={14} weight="bold" />
      Back to Payment
    </Link>
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <LoadingState variant="page" label="Loading your receipt..." />
      </div>
    );
  }

  const payment = data?.payments.find((p) => p.id === paymentId);

  if (!project || !data || !payment || !isConfirmed(payment)) {
    const pending = payment?.paymentStatus === "PROOF_SUBMITTED";
    return (
      <div className="flex flex-col gap-6 pb-24">
        {back}
        <Panel as="div">
          <div className="flex flex-col items-center px-6 py-14 text-center">
            {pending ? <Clock size={28} weight="fill" className="text-white/30" /> : <WarningCircle size={28} weight="fill" className="text-white/30" />}
            <p className="mt-4 text-sm font-medium text-white">{pending ? "Your receipt isn't ready yet" : "We couldn't find this receipt"}</p>
            <p className="mt-1 max-w-md text-[13px] text-white/55">
              {pending
                ? "We're still checking this payment. Your receipt appears here as soon as we confirm it, usually within one working day."
                : "It may belong to another study, or the payment wasn't confirmed."}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-5">
              <Link href={`/dashboard/client/projects/${projectId}/payment`}>Back to Payment</Link>
            </Button>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24 print:gap-0 print:pb-0">
      {back}
      <PaymentReceiptDocument
        payment={payment}
        client={{ fullName: project.client.fullName, school: project.client.clientProfile?.institutionSchool, email: project.client.email }}
        study={{ intakeId: project.intakeId, title: project.researchTitle }}
        account={{ totalAmount: data.summary.totalAmount, paidIncludingThis: paidUpTo(data.payments, payment) }}
      />
    </div>
  );
}
