"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@repo/ui";
import { Peso } from "@repo/ui/MoneyDisplay";
import { CheckCircle, Printer } from "@phosphor-icons/react";
import type { PaymentItem } from "../schemas";

// A receipt for one confirmed payment, drawn as a sheet of paper (dark ink on white, A4 width) so
// the screen, the printout and "Save as PDF" all look the same. Same look as the agreement.

const CONTACT_EMAIL = "consult@jaxisstatlab.com";

export const PAYMENT_TYPE_LABEL: Record<string, string> = {
  DOWNPAYMENT: "Deposit",
  BALANCE: "Final balance",
  FULL: "Full payment",
  INSTALLMENT: "Part payment",
};

export const receiptNumber = (paymentId: string) => `JAXIS-RCT-${paymentId.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}`;

const money = (n: number) => n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function longDate(value?: string | null, withTime = false) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "long",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

export interface PaymentReceiptDocumentProps {
  payment: PaymentItem;
  client: { fullName: string; school?: string | null; email?: string | null };
  study: { intakeId: string; title: string };
  /** Totals right after this payment. */
  account: { totalAmount: number; paidIncludingThis: number };
}

export function PaymentReceiptDocument({ payment, client, study, account }: PaymentReceiptDocumentProps) {
  const no = receiptNumber(payment.id);
  const leftToPay = Math.max(0, account.totalAmount - account.paidIncludingThis);
  const forWhat = PAYMENT_TYPE_LABEL[payment.paymentType] ?? "Payment";

  // The browser uses the page title as the PDF's file name.
  const handlePrint = () => {
    const previous = document.title;
    document.title = `JAXIS Receipt ${no}`;
    const restore = () => {
      document.title = previous;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  };

  return (
    <div className="flex w-full flex-col gap-4 print:gap-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-white/15 bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-white">
          <CheckCircle size={13} weight="fill" />
          Payment confirmed
        </span>
        <Button type="button" variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
          <Printer size={15} weight="fill" />
          Print or Save as PDF
        </Button>
      </div>

      <article
        aria-label="Payment receipt"
        className="print-sheet mx-auto w-full max-w-[210mm] rounded-[2px] bg-white px-6 py-8 font-sans text-[13px] leading-relaxed text-[#1c1c28] shadow-[0_1px_0_rgba(255,255,255,0.06),0_20px_50px_rgba(0,0,0,0.45)] sm:px-12 sm:py-12 print:max-w-none print:rounded-none print:px-0 print:py-0 print:text-[10pt] print:shadow-none"
      >
        {/* Letterhead */}
        <div className="flex flex-col gap-5 border-b-2 border-[#1c1c28] pb-5 sm:flex-row sm:items-end sm:justify-between print:flex-row print:items-end print:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Image src="/jaxislogo.png" alt="" width={28} height={28} priority className="h-7 w-7" />
              <span className="text-[15px] font-bold tracking-[-0.01em] text-[#1c1c28]">
                JAXIS <span className="font-normal">StatLab</span>
              </span>
            </div>
            <h1 className="mt-4 text-[26px] font-bold leading-tight tracking-[-0.02em] text-[#111118]">Acknowledgement Receipt</h1>
            <p className="mt-0.5 text-[13px] text-[#55556a]">Proof that we received your payment</p>
          </div>
          <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-[12px] sm:text-right print:text-right">
            <dt className="text-[#6b6b80]">Receipt no.</dt>
            <dd className="font-mono font-semibold text-[#111118]">{no}</dd>
            <dt className="text-[#6b6b80]">Date issued</dt>
            <dd className="text-[#111118]">{longDate(payment.verifiedAt || payment.updatedAt)}</dd>
            <dt className="text-[#6b6b80]">Study ID</dt>
            <dd className="font-mono font-semibold text-[#111118]">{study.intakeId}</dd>
          </dl>
        </div>

        {/* Amount */}
        <div className="mt-7 flex flex-col gap-1 rounded-[2px] border border-[#1c1c28]/15 px-5 py-4 sm:flex-row sm:items-end sm:justify-between print:flex-row print:items-end print:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6b6b80]">Amount received</p>
            <p className="mt-1 font-mono text-[28px] font-bold leading-none text-[#111118]">
              <Peso className="opacity-100" />
              {money(payment.amountSubmitted)}
            </p>
          </div>
          <p className="text-[13px] text-[#33334a]">
            {forWhat} for study {study.intakeId}
          </p>
        </div>

        {/* Details */}
        <dl className="mt-6 grid grid-cols-1 gap-x-8 sm:grid-cols-2 print:grid-cols-2">
          <Row label="Received from">
            <span className="font-semibold text-[#111118]">{client.fullName}</span>
            {client.school ? <span className="block text-[#55556a]">{client.school}</span> : null}
          </Row>
          <Row label="For">
            <span className="text-[#111118]">{study.title}</span>
          </Row>
          <Row label="Paid by">{payment.paymentMethod === "BANK_TRANSFER" ? "Bank transfer" : payment.paymentMethod === "GCASH" ? "GCash" : "—"}</Row>
          <Row label="Reference no.">
            <span className="font-mono">{payment.referenceNumber || "—"}</span>
          </Row>
          <Row label="Sent on">{longDate(payment.createdAt, true)}</Row>
          <Row label="Confirmed on">{longDate(payment.verifiedAt || payment.updatedAt, true)}</Row>
        </dl>

        {/* Account after this payment */}
        <div className="print-avoid-break mt-7">
          <h2 className="border-b border-[#1c1c28]/20 pb-1.5 text-[13px] font-bold uppercase tracking-wider text-[#111118]">
            Your study&apos;s payments after this receipt
          </h2>
          <table className="mt-2 w-full border-collapse text-left">
            <tbody className="divide-y divide-[#1c1c28]/10">
              <tr>
                <td className="py-2 text-[#33334a]">Total price</td>
                <td className="py-2 text-right font-mono text-[#111118]">
                  <Peso className="opacity-100" />
                  {money(account.totalAmount)}
                </td>
              </tr>
              <tr>
                <td className="py-2 text-[#33334a]">Paid so far (including this payment)</td>
                <td className="py-2 text-right font-mono text-[#111118]">
                  <Peso className="opacity-100" />
                  {money(account.paidIncludingThis)}
                </td>
              </tr>
              <tr className="border-t-2 border-[#1c1c28]">
                <td className="py-2 font-bold text-[#111118]">{leftToPay > 0 ? "Left to pay" : "Paid in full"}</td>
                <td className="py-2 text-right font-mono font-bold text-[#111118]">
                  <Peso className="opacity-100" />
                  {money(leftToPay)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-10 border-t border-[#1c1c28]/15 pt-3 text-[11px] leading-relaxed text-[#6b6b80]">
          JAXIS StatLab acknowledges receiving the payment above for study {study.intakeId}. Keep this for your records.
          Questions: {CONTACT_EMAIL}. Receipt {no}.
        </p>
      </article>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="print-avoid-break flex flex-col gap-0.5 border-b border-[#1c1c28]/10 py-2.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#6b6b80]">{label}</dt>
      <dd className="text-[#33334a]">{children}</dd>
    </div>
  );
}
