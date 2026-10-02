"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@repo/ui";
import { Peso } from "@repo/ui/MoneyDisplay";
import { CheckCircle, Clock, Printer } from "@phosphor-icons/react";
import type { SOWDetailItem } from "../schemas";
import { ADDONS_CATALOG } from "@/lib/pricing-rules";
import type { AddOnName } from "@prisma/client";
import { clientPackageName } from "@/features/projects/client-packages";
import { formatSignatureName, normalizePersonName } from "@/lib/formatters";

// The agreement as a sheet of paper: dark ink on white, sized like A4, so what you see on screen is
// what prints and what "Save as PDF" produces. The words inside the snapshot (terms, policies) are
// shown exactly as saved, because that is what the client signs; only headings and labels are ours.

// Plain names for add-ons, matching the client's Price page.
const ADDON_NAMES: Record<string, string> = {
  DEFENSELAB: "DefenseLab practice session",
  RUSH: "Rush delivery",
  EXPRESS: "Express delivery",
  EMERGENCY: "Emergency delivery",
};

const CONTACT_EMAIL = "consult@jaxisstatlab.com";

const money = (n: number) => Math.round(n).toLocaleString("en-PH");

function longDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "long", day: "numeric", year: "numeric" });
}

function dateTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export interface SowDocumentProps {
  sow: SOWDetailItem;
  className?: string;
  showPrintAction?: boolean;
}

export function SowDocument({ sow, className = "", showPrintAction = true }: SowDocumentProps) {
  const { client, project, commercial, delivery, terms } = sow.contentSnapshot;
  const ref = `JAXIS-SOW-${sow.id.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}`;
  const preparer = sow.generatedByName?.trim() || "";
  const addOns = commercial.addOns ?? [];
  const balance = commercial.balanceDue ?? Math.max(0, commercial.totalAmount - commercial.downpaymentRequired);

  // The snapshot keeps the package price and the total, not each add-on's price (catalog prices can
  // differ from what was quoted). So extras are shown as one line worth the difference; the table adds up.
  const extrasAmount = Math.max(0, commercial.totalAmount - commercial.basePrice);
  const addOnNames = addOns.map((code) => ADDON_NAMES[code] ?? ADDONS_CATALOG[code as AddOnName]?.name ?? code);
  const extras =
    extrasAmount <= 0 && addOns.length === 0
      ? null
      : addOns.length === 1
        ? { name: addOnNames[0]!, detail: ADDONS_CATALOG[addOns[0] as AddOnName]?.tagline ?? "", amount: extrasAmount }
        : addOns.length > 1
          ? { name: "Extras", detail: addOnNames.join(", "), amount: extrasAmount }
          : { name: "Other charges", detail: "", amount: extrasAmount };

  // The browser uses the page title as the PDF's file name.
  const handlePrint = () => {
    const previous = document.title;
    document.title = `JAXIS Agreement ${project.intakeId}`;
    const restore = () => {
      document.title = previous;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  };

  const terms4: Array<{ title: string; body?: string | null }> = [
    {
      title: "Delivery time",
      body: `Your analysis will be delivered within ${delivery.turnaroundDays} working days. ${delivery.slaStartTrigger ?? ""}`.trim(),
    },
    { title: "Changes after delivery", body: terms.revisionPolicy },
    { title: "Refunds and cancellation", body: terms.refundPolicy },
    { title: "How we talk to each other", body: terms.communicationPolicy },
    { title: "Authorship and responsibility", body: terms.liabilityBoundary },
  ];
  if (terms.customTerms) terms4.push({ title: "Special terms for this study", body: terms.customTerms });

  return (
    <div className={`flex w-full flex-col gap-4 print:gap-0 ${className}`}>
      {showPrintAction ? (
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-white/60">
            {sow.isLocked ? (
              <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-white/15 bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-white">
                <CheckCircle size={13} weight="fill" />
                Signed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs font-medium text-white/75">
                <Clock size={13} weight="fill" />
                Waiting for signature
              </span>
            )}
            <span className="font-mono text-xs text-white/45">{ref}</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer size={15} weight="fill" />
            Print or Save as PDF
          </Button>
        </div>
      ) : null}

      <article
        aria-label="Service agreement"
        className="sow-print-container mx-auto w-full max-w-[210mm] rounded-[2px] bg-white px-6 py-8 font-sans text-[13px] leading-relaxed text-[#1c1c28] shadow-[0_1px_0_rgba(255,255,255,0.06),0_20px_50px_rgba(0,0,0,0.45)] sm:px-12 sm:py-12 print:max-w-none print:rounded-none print:px-0 print:py-0 print:text-[10pt] print:shadow-none"
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
            <h1 className="mt-4 text-[26px] font-bold leading-tight tracking-[-0.02em] text-[#111118]">
              {sow.sowType === "PRIMARY" ? "Service Agreement" : "Add-on Agreement"}
            </h1>
            <p className="mt-0.5 text-[13px] text-[#55556a]">Statistical analysis for your research</p>
          </div>
          <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-[12px] sm:text-right print:text-right">
            <dt className="text-[#6b6b80]">Agreement no.</dt>
            <dd className="font-mono font-semibold text-[#111118]">{ref}</dd>
            <dt className="text-[#6b6b80]">Study ID</dt>
            <dd className="font-mono font-semibold text-[#111118]">{project.intakeId}</dd>
            <dt className="text-[#6b6b80]">Prepared on</dt>
            <dd className="text-[#111118]">{longDate(sow.generatedAt)}</dd>
          </dl>
        </div>

        {/* 1. Parties */}
        <DocSection n={1} title="Who this agreement is between">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 print:grid-cols-2">
            <Party
              role="Client"
              name={client.fullName}
              lines={[client.academicProgram, client.institution]}
              contact={[client.email, client.contactNumber && client.contactNumber !== "On File" ? client.contactNumber : null]}
            />
            <Party
              role="Service provider"
              name="JAXIS StatLab"
              lines={["Statistical analysis for student and academic research"]}
              contact={[CONTACT_EMAIL, "Manila, Philippines"]}
            />
          </div>
        </DocSection>

        {/* 2. Study */}
        <DocSection n={2} title="Your study">
          <Field label="Title">
            <span className="font-semibold text-[#111118]">{project.researchTitle}</span>
          </Field>
          <Field label="Objectives">{project.researchObjectives}</Field>
          {project.researchQuestions ? <Field label="Research questions">{project.researchQuestions}</Field> : null}
          {project.hypotheses ? <Field label="Hypotheses">{project.hypotheses}</Field> : null}
        </DocSection>

        {/* 3. Price */}
        <DocSection n={3} title="Price and payments">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#1c1c28]/25 text-[11px] uppercase tracking-wider text-[#6b6b80]">
                <th scope="col" className="py-2 pr-4 font-semibold">What you get</th>
                <th scope="col" className="py-2 pl-4 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c1c28]/10">
              <tr>
                <td className="py-2.5 pr-4">
                  <span className="font-semibold text-[#111118]">{clientPackageName(commercial.packageName) ?? commercial.packageLabel}</span>
                  <span className="block text-[12px] text-[#55556a]">Statistical analysis, a check of the methods, and a summary report.</span>
                </td>
                <td className="py-2.5 pl-4 text-right font-mono text-[#111118]">
                  <Money amount={commercial.basePrice} />
                </td>
              </tr>
              {extras ? (
                <tr>
                  <td className="py-2.5 pr-4">
                    <span className="font-semibold text-[#111118]">{extras.name}</span>
                    {extras.detail ? <span className="block text-[12px] text-[#55556a]">{extras.detail}</span> : null}
                  </td>
                  <td className="py-2.5 pl-4 text-right font-mono text-[#111118]">
                    <Money amount={extras.amount} />
                  </td>
                </tr>
              ) : null}
              <tr className="border-t-2 border-[#1c1c28]">
                <td className="py-2.5 pr-4 font-bold text-[#111118]">Total price</td>
                <td className="py-2.5 pl-4 text-right font-mono text-[15px] font-bold text-[#111118]">
                  <Money amount={commercial.totalAmount} />
                </td>
              </tr>
            </tbody>
          </table>

          <h3 className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-[#6b6b80]">How you pay</h3>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2">
            <PayStep
              title="Deposit"
              amount={commercial.downpaymentRequired}
              body="Paid before work starts and before your statistical analyst is assigned."
            />
            <PayStep title="Final balance" amount={balance} body="Paid after you review and accept the final results." />
          </div>
          {commercial.paymentMethod ? (
            <p className="mt-3 text-[12px] text-[#55556a]">Payment method: {commercial.paymentMethod}</p>
          ) : null}
        </DocSection>

        {/* 4. Terms */}
        <DocSection n={4} title="Terms">
          <ol className="flex flex-col gap-3">
            {terms4.map((t, i) => (
              <li key={t.title} className="print-avoid-break">
                <p className="font-semibold text-[#111118]">
                  4.{i + 1} {t.title}
                </p>
                <p className="mt-0.5 whitespace-pre-line text-[#33334a]">{t.body}</p>
              </li>
            ))}
          </ol>
        </DocSection>

        {/* 5. Signatures */}
        <section className="print-avoid-break mt-8 border-t-2 border-[#1c1c28] pt-5">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#111118]">5. Signatures</h2>
          <div className="mt-6 grid grid-cols-1 gap-10 sm:grid-cols-2 print:grid-cols-2">
            <SignatureBlock
              role="Client"
              signature={sow.isLocked && sow.signedByName ? sow.signedByName : null}
              name={client.fullName}
              lines={[
                sow.signedAt ? `Signed ${dateTime(sow.signedAt)}` : "Not signed yet",
                sow.signedByUserId ? `Signer ID ${sow.signedByUserId.slice(-8).toUpperCase()}` : null,
              ]}
            />
            <SignatureBlock
              role="For JAXIS StatLab"
              signature={preparer ? formatSignatureName(preparer) : "JAXIS StatLab"}
              name={preparer ? normalizePersonName(preparer) : "Authorized representative"}
              lines={[preparer ? "Authorized representative" : null, `Prepared ${longDate(sow.generatedAt)}`]}
            />
          </div>
          <p className="mt-8 border-t border-[#1c1c28]/15 pt-3 text-[11px] text-[#6b6b80]">
            Signed online by typing the client&apos;s full name. Agreement {ref} for study {project.intakeId}.
          </p>
        </section>
      </article>
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function DocSection({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="sow-print-section mt-7">
      <h2 className="border-b border-[#1c1c28]/20 pb-1.5 text-[13px] font-bold uppercase tracking-wider text-[#111118] [break-after:avoid]">
        {n}. {title}
      </h2>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="print-avoid-break">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6b6b80]">{label}</p>
      <div className="mt-0.5 whitespace-pre-line text-[#33334a]">{children}</div>
    </div>
  );
}

function Party({
  role,
  name,
  lines,
  contact,
}: {
  role: string;
  name: string;
  lines: Array<string | null | undefined>;
  contact: Array<string | null | undefined>;
}) {
  return (
    <div className="print-avoid-break">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6b6b80]">{role}</p>
      <p className="mt-1 text-[15px] font-bold text-[#111118]">{name}</p>
      {lines.filter(Boolean).map((l) => (
        <p key={l as string} className="text-[#33334a]">
          {l}
        </p>
      ))}
      <p className="mt-1 text-[12px] text-[#55556a]">{contact.filter(Boolean).join(" · ")}</p>
    </div>
  );
}

function PayStep({ title, amount, body }: { title: string; amount: number; body: string }) {
  return (
    <div className="print-avoid-break rounded-[2px] border border-[#1c1c28]/15 px-3.5 py-3">
      <p className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-[#111118]">{title}</span>
        <span className="font-mono font-bold text-[#111118]">
          <Money amount={amount} />
        </span>
      </p>
      <p className="mt-1 text-[12px] text-[#55556a]">{body}</p>
    </div>
  );
}

function SignatureBlock({
  role,
  signature,
  name,
  lines,
}: {
  role: string;
  signature: string | null;
  name: string;
  lines: Array<string | null>;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6b6b80]">{role}</p>
      <div className="flex min-h-[64px] items-end">
        {signature ? (
          <p className="font-signature select-none py-1 text-[40px] leading-none text-[#1a2b6b]">{signature}</p>
        ) : (
          <p className="pb-2 text-[12px] italic text-[#8a8aa0]">Waiting for signature</p>
        )}
      </div>
      <div className="border-b border-[#1c1c28]/60" />
      <p className="mt-1.5 font-semibold text-[#111118]">{name}</p>
      {lines.filter(Boolean).map((l) => (
        <p key={l as string} className="text-[12px] text-[#55556a]">
          {l}
        </p>
      ))}
    </div>
  );
}

function Money({ amount }: { amount: number }) {
  return (
    <>
      <Peso className="opacity-100" />
      {money(amount)}
    </>
  );
}
