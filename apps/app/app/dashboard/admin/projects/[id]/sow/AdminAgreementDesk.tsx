"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Peso, Toast } from "@repo/ui";
import { ArrowRight, Warning } from "@phosphor-icons/react";
import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/Panel";
import { StudySection } from "@/features/projects/components/StudySection";
import { SowDocument } from "@/features/sow/components/SowDocument";
import { generateSOW } from "@/features/sow/actions";
import { clientPackageName } from "@/features/projects/client-packages";
import type { ProjectDetailItem } from "@/features/projects/schemas";
import type { QuotationDetailItem } from "@/features/quotations/schemas";
import type { SOWDetailItem } from "@/features/sow/schemas";

// Agreement tab: draft it from the accepted quote (with optional extra terms), change it until the client signs,
// then show the signed copy. The server allows drafting only after the client accepts the quote.

const FIELD =
  "w-full rounded-[2px] border border-white/10 bg-[#050513] p-3 font-sans text-[13px] leading-relaxed text-white outline-none placeholder:text-white/30 focus:border-[#CC6600]/60";

const money = (n: number) => n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const dateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

export function AdminAgreementDesk({
  project,
  quotation = null,
  sow = null,
  loadError,
}: {
  project?: ProjectDetailItem;
  quotation?: QuotationDetailItem | null;
  sow?: SOWDetailItem | null;
  loadError?: string;
}) {
  const router = useRouter();
  const [terms, setTerms] = useState(sow?.contentSnapshot.terms.customTerms ?? "");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; description?: string } | null>(null);
  const [busy, start] = useTransition();

  if (!project) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 font-sans animate-content-fade">
        <Panel as="div">
          <PanelBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white">The agreement didn&apos;t load</p>
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

  const s = project.masterStatus;
  const base = `/dashboard/admin/projects/${project.id}`;
  const accepted = quotation?.status === "CLIENT_APPROVED";
  const canDraft = accepted && (s === "CLIENT_APPROVED" || s === "SOW_PENDING") && !sow?.isLocked;
  const showForm = canDraft && (!sow || editing);

  const save = () => {
    setError(null);
    start(async () => {
      const res = await generateSOW({ projectId: project.id, customTerms: terms.trim() || undefined });
      if (res.success) {
        setEditing(false);
        setToast({
          message: sow ? "Agreement updated" : "Agreement sent",
          description: sow ? `${project.client.fullName} sees the new version.` : `${project.client.fullName} can now read and sign it.`,
        });
        router.refresh();
      } else setError(res.error.message);
    });
  };

  const description = sow?.isLocked
    ? `Signed by ${sow.signedByName || project.client.fullName} on ${dateTime(sow.signedAt)}. It can't be changed.`
    : sow
      ? `Sent ${dateTime(sow.generatedAt)}. Waiting for ${project.client.fullName} to sign.${canDraft ? " You can still change it until they do." : ""}`
      : canDraft
        ? "The client accepted the quote. Add any extra terms, then send the agreement for them to sign."
        : "The agreement is drafted after the client accepts the quote.";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 font-sans animate-content-fade print:m-0 print:max-w-none print:animate-none print:p-0 print:pb-0">
      <div className="print:hidden">
        <StudySection
          title="Agreement"
          description={description}
          actions={
            sow?.isLocked ? (
              <Button asChild variant="outline" size="sm" className="gap-1.5 active:scale-[0.97]">
                <Link href={`${base}/payment`}>
                  Payment
                  <ArrowRight size={13} weight="bold" />
                </Link>
              </Button>
            ) : sow && canDraft && !editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="active:scale-[0.97]">
                Change Terms
              </Button>
            ) : null
          }
        />
      </div>

      {showForm ? (
        <div className="grid grid-cols-1 gap-6 print:hidden lg:grid-cols-12">
          <Panel className="lg:col-span-8">
            <PanelHeader
              title={sow ? "Change the agreement" : "Draft the agreement"}
              subtitle="Price, package, deadline and the standard policies come from the accepted quote. Add anything else the client should agree to."
            />
            <PanelBody className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
                Extra terms (optional)
                <textarea
                  rows={6}
                  value={terms}
                  maxLength={2000}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="For example: The client sends the cleaned data file (.xlsx) with labels for each column. Covers Chapter 4 tests only, not structural equation modeling."
                  className={`${FIELD} resize-y`}
                />
              </label>
              {error ? (
                <p role="alert" className="flex items-start gap-2 text-[13px] text-red-300">
                  <Warning size={15} weight="fill" className="mt-0.5 shrink-0" />
                  {error}
                </p>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2 border-t border-white/[0.06] pt-4">
                {sow ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(false);
                      setTerms(sow.contentSnapshot.terms.customTerms ?? "");
                      setError(null);
                    }}
                    disabled={busy}
                  >
                    Cancel
                  </Button>
                ) : null}
                <Button variant="primary" size="sm" onClick={save} loading={busy} className="active:scale-[0.97]">
                  {sow ? "Save and Resend" : "Send for Signing"}
                </Button>
              </div>
            </PanelBody>
          </Panel>

          <Panel className="self-start lg:col-span-4">
            <PanelHeader title="From the accepted quote" />
            <PanelBody>
              <dl className="flex flex-col gap-3 text-[13px]">
                <Row label="Package" value={clientPackageName(quotation!.packageName) ?? quotation!.packageName} />
                <Row
                  label="Total"
                  value={
                    <>
                      <Peso />
                      {money(quotation!.totalAmount)}
                    </>
                  }
                />
                <Row
                  label="Deposit"
                  value={
                    <>
                      <Peso />
                      {money(quotation!.downpaymentRequired)}
                    </>
                  }
                />
                {quotation!.lineItems.filter((li) => li.itemType === "ADDON").length > 0 ? (
                  <Row label="Add-ons" value={quotation!.lineItems.filter((li) => li.itemType === "ADDON").map((li) => li.itemName).join(", ")} />
                ) : null}
              </dl>
            </PanelBody>
          </Panel>
        </div>
      ) : null}

      {sow ? (
        <SowDocument sow={sow} />
      ) : !canDraft ? (
        <Panel as="div" className="print:hidden">
          <PanelBody className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-white/55">
              {`${quotation ? "The quote hasn't been accepted yet." : "There's no quote yet."} The agreement appears here once it's drafted.`}
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href={base}>Overview</Link>
            </Button>
          </PanelBody>
        </Panel>
      ) : null}

      {toast ? <Toast message={toast.message} description={toast.description} variant="success" onClose={() => setToast(null)} /> : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-white/45">{label}</dt>
      <dd className="min-w-0 text-right text-white">{value}</dd>
    </div>
  );
}
