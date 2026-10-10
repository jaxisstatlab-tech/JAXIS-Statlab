import React from "react";
import Image from "next/image";
import type { QaCertificateDTO } from "../schemas";
import { CERTIFICATE_TEXT, certificateRows } from "../certificate-text";

// The certificate as one A4 sheet (dark ink on white), same look as the agreement and receipt.
// It uses the shared `print-sheet` print rules (no page-wide print overrides of its own), so the
// screen, the printout and "Save as PDF" match. Wording comes from certificate-text.ts, shared with
// the downloadable PDF.

interface StatisticalAuditCertificateProps {
  data: QaCertificateDTO;
  className?: string;
}

export const StatisticalAuditCertificate: React.FC<StatisticalAuditCertificateProps> = ({ data, className = "" }) => {
  const rows = certificateRows(data);
  return (
    <article
      aria-label={CERTIFICATE_TEXT.title}
      className={`print-sheet mx-auto flex w-full max-w-[210mm] flex-col rounded-[2px] bg-white px-6 py-8 font-sans text-[13px] leading-relaxed text-[#1c1c28] shadow-[0_1px_0_rgba(255,255,255,0.06),0_20px_50px_rgba(0,0,0,0.45)] sm:min-h-[297mm] sm:px-14 sm:py-14 print:min-h-0 print:max-w-none print:rounded-none print:px-0 print:py-0 print:text-[10pt] print:shadow-none ${className}`}
    >
      {/* Frame, like the PDF */}
      <div className="flex flex-1 flex-col border-[1.5px] border-[#0a1f3d] p-1 print:border-[1.5px]">
        <div className="flex flex-1 flex-col border border-[#143870]/60 px-5 py-8 sm:px-10 sm:py-10">
          {/* Heading */}
          <div className="flex flex-col items-center text-center">
            <Image src="/jaxislogo.png" alt="" width={36} height={36} priority className="h-9 w-9" />
            <p className="mt-3 text-[18px] font-bold tracking-[0.08em] text-[#111118]">JAXIS STATLAB</p>
            <h1 className="mt-1 text-[14px] font-semibold uppercase tracking-[0.14em] text-[#2e3440]">{CERTIFICATE_TEXT.title}</h1>
            <p className="mt-1.5 font-mono text-[11px] text-[#6b6b80]">Certificate no. {data.certificateId}</p>
          </div>

          <p className="mt-7 text-center text-[13.5px] leading-relaxed text-[#2e3440]">{CERTIFICATE_TEXT.statement}</p>

          {/* The study */}
          <section className="print-avoid-break mt-7">
            <h2 className="border-b border-[#1c1c28]/70 pb-1 text-[12px] font-bold uppercase tracking-wider text-[#111118]">{CERTIFICATE_TEXT.studyHeading}</h2>
            <dl className="mt-2.5 flex flex-col gap-1.5">
              {rows.map((r) => (
                <div key={r.label} className="grid grid-cols-1 gap-x-4 sm:grid-cols-[10rem_1fr] print:grid-cols-[10rem_1fr]">
                  <dt className="font-semibold text-[#111118]">{r.label}</dt>
                  <dd className={`text-[#33334a] ${r.label === CERTIFICATE_TEXT.titleLabel ? "italic" : ""}`}>{r.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* What was checked */}
          <section className="print-avoid-break mt-6">
            <h2 className="border-b border-[#1c1c28]/70 pb-1 text-[12px] font-bold uppercase tracking-wider text-[#111118]">{CERTIFICATE_TEXT.checksHeading}</h2>
            <p className="mt-2.5 text-[#33334a]">{CERTIFICATE_TEXT.scope}</p>
            <ul className="mt-2.5 flex flex-col gap-1">
              {CERTIFICATE_TEXT.checks.map((c) => (
                <li key={c} className="flex gap-2 text-[#33334a]">
                  <span aria-hidden="true">–</span>
                  {c}
                </li>
              ))}
            </ul>
          </section>

          {/* Attestation */}
          <section className="print-avoid-break mt-6">
            <h2 className="border-b border-[#1c1c28]/70 pb-1 text-[12px] font-bold uppercase tracking-wider text-[#111118]">{CERTIFICATE_TEXT.attestationHeading}</h2>
            <p className="mt-2.5 text-[#33334a]">{CERTIFICATE_TEXT.attestation}</p>
          </section>

          {/* Signatures */}
          <div className="print-avoid-break mt-auto grid grid-cols-1 gap-8 border-t border-[#1c1c28]/15 pt-8 sm:grid-cols-2 print:grid-cols-2">
            <div className="flex flex-col items-center text-center">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#111118]">{CERTIFICATE_TEXT.signedByLabel}</p>
              <div className="flex h-14 w-full items-end justify-center">
                {data.qaSignatureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.qaSignatureUrl} alt={`Signature of ${data.qaLeadName}`} className="max-h-12 max-w-[180px] object-contain" />
                ) : (
                  <p className="pb-1.5 text-[12px] italic text-[#6b6b80]">{CERTIFICATE_TEXT.noSignature}</p>
                )}
              </div>
              <div className="mt-1 w-full max-w-[260px] border-b border-[#1c1c28]" />
              <p className="mt-1.5 font-semibold text-[#111118]">{data.qaLeadName}</p>
              <p className="text-[12px] text-[#55556a]">{data.qaLeadTitle}</p>
              <p className="text-[11px] font-bold text-[#0a1f3d]">JAXIS STATLAB</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#111118]">Issued by:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/jaxis-seal.png" alt="JAXIS StatLab seal" className="mt-2 w-48 object-contain" />
            </div>
          </div>

          <p className="mt-6 text-center text-[10.5px] text-[#6b6b80]">
            {CERTIFICATE_TEXT.footerId(data)} · Questions: {CERTIFICATE_TEXT.contact}
          </p>
        </div>
      </div>
    </article>
  );
};
