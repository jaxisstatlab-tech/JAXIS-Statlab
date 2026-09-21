import React from "react";
import type { QaCertificateDTO } from "../schemas";

interface StatisticalAuditCertificateProps {
  data: QaCertificateDTO;
  className?: string;
}

export const StatisticalAuditCertificate: React.FC<StatisticalAuditCertificateProps> = ({
  data,
  className = "",
}) => {
  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 0;
            }
            body {
              background: #ffffff !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body * {
              visibility: hidden !important;
            }
            #jaxis-audit-certificate,
            #jaxis-audit-certificate * {
              visibility: visible !important;
            }
            #jaxis-audit-certificate {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 210mm !important;
              height: 297mm !important;
              max-width: 210mm !important;
              max-height: 297mm !important;
              box-sizing: border-box !important;
              margin: 0 !important;
              padding: 22mm 24mm !important;
              background: #ffffff !important;
              color: #000000 !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              overflow: hidden !important;
              z-index: 9999999 !important;
            }
          }
        `,
      }} />

      <div
        id="jaxis-audit-certificate"
        className={`bg-white text-slate-900 font-serif w-full max-w-[794px] min-h-[1050px] mx-auto p-12 sm:p-16 shadow-2xl border border-slate-200 flex flex-col justify-between select-text ${className}`}
        style={{
          boxSizing: "border-box",
          lineHeight: "1.6",
        }}
      >
        {/* Inner Content Wrapper */}
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="text-center flex flex-col items-center pb-2">
            <h1 className="font-serif font-bold text-2xl tracking-[0.25em] text-slate-900 uppercase">
              JAXIS STATLAB
            </h1>
            <h2 className="font-serif font-semibold text-sm tracking-[0.18em] text-slate-800 uppercase mt-1">
              CERTIFICATE OF STATISTICAL AUDIT
            </h2>
            <div className="font-mono text-xs text-slate-500 tracking-wider mt-1.5 font-medium">
              Certificate ID: {data.certificateId}
            </div>
          </div>

          {/* Opening Certification Statement */}
          <p className="text-xs sm:text-[13px] text-slate-800 text-justify font-serif leading-relaxed">
            This is to certify that the quantitative data processing, statistical modeling, and analytical outputs for the research study detailed below have undergone formal methodological evaluation and computational audit by <strong className="font-bold text-slate-900">JAXIS STATLAB</strong>.
          </p>

          {/* Section 1: PROJECT & CLIENT METADATA */}
          <div className="flex flex-col gap-2">
            <div className="border-b border-slate-900 pb-1">
              <h3 className="text-xs font-serif font-bold tracking-wider text-slate-900 uppercase">
                PROJECT &amp; CLIENT METADATA
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-1.5 text-xs sm:text-[13px] text-slate-800 pt-1">
              <div className="grid grid-cols-12 gap-2">
                <span className="col-span-5 sm:col-span-4 font-serif font-bold text-slate-900 whitespace-nowrap">
                  Research Title :
                </span>
                <span className="col-span-7 sm:col-span-8 font-serif text-slate-800 italic">
                  {data.researchTitle}
                </span>
              </div>

              <div className="grid grid-cols-12 gap-2">
                <span className="col-span-5 sm:col-span-4 font-serif font-bold text-slate-900 whitespace-nowrap">
                  Principal Investigator :
                </span>
                <span className="col-span-7 sm:col-span-8 font-serif text-slate-800">
                  {data.clientName} {data.clientEmail ? `(${data.clientEmail})` : ""}
                </span>
              </div>

              <div className="grid grid-cols-12 gap-2">
                <span className="col-span-5 sm:col-span-4 font-serif font-bold text-slate-900 whitespace-nowrap">
                  Institution / Program :
                </span>
                <span className="col-span-7 sm:col-span-8 font-serif text-slate-800">
                  {data.institution} / {data.program}
                </span>
              </div>

              <div className="grid grid-cols-12 gap-2">
                <span className="col-span-5 sm:col-span-4 font-serif font-bold text-slate-900 whitespace-nowrap">
                  Tier Executed :
                </span>
                <span className="col-span-7 sm:col-span-8 font-serif text-slate-800">
                  {data.tierExecuted}
                </span>
              </div>

              <div className="grid grid-cols-12 gap-2">
                <span className="col-span-5 sm:col-span-4 font-serif font-bold text-slate-900 whitespace-nowrap">
                  Audit Completion Date :
                </span>
                <span className="col-span-7 sm:col-span-8 font-serif text-slate-800">
                  {data.completionDate}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: METHODOLOGICAL AUDIT FRAMEWORK */}
          <div className="flex flex-col gap-2">
            <div className="border-b border-slate-900 pb-1">
              <h3 className="text-xs font-serif font-bold tracking-wider text-slate-900 uppercase">
                METHODOLOGICAL AUDIT FRAMEWORK
              </h3>
            </div>

            <p className="text-xs sm:text-[13px] text-slate-800 text-justify font-serif leading-relaxed pt-1">
              JAXIS STATLAB certifies that the analytical outputs have been independently evaluated across four institutional compliance standards: <strong className="text-slate-900">Data Hygiene &amp; Scale Verification</strong>, <strong className="text-slate-900">Statistical Assumption Testing</strong>, <strong className="text-slate-900">Model Alignment with Research Intent</strong>, and <strong className="text-slate-900">Analytical Execution Integrity</strong>. All procedures were confirmed mathematically valid and compliant with academic research standards.
            </p>
          </div>

          {/* Section 3: AUDIT ATTESTATION & SIGNATURES */}
          <div className="flex flex-col gap-2">
            <div className="border-b border-slate-900 pb-1">
              <h3 className="text-xs font-serif font-bold tracking-wider text-slate-900 uppercase">
                AUDIT ATTESTATION &amp; SIGNATURES
              </h3>
            </div>

            <p className="text-xs sm:text-[13px] text-slate-800 text-justify font-serif leading-relaxed pt-1">
              It is hereby affirmed that the statistical procedures employed are mathematically valid, appropriate for the stated research questions, and rendered in full compliance with academic research standards.
            </p>
          </div>
        </div>

        {/* Dual Column Footer: Signature & Accreditation Seal */}
        <div className="grid grid-cols-2 gap-8 pt-8 mt-4 border-t border-slate-200/60 items-end">
          {/* Left Column: Audited & Approved By (Assigned QA Lead) */}
          <div className="flex flex-col items-center justify-end">
            <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-slate-900 mb-4 text-center">
              AUDITED &amp; APPROVED BY:
            </span>

            {/* Centered Signatory Block */}
            <div className="w-full max-w-[270px] flex flex-col items-center text-center">
              {/* Signature Area with Centered Photo & Strict Height Limit */}
              <div className="relative h-12 w-full flex items-end justify-center mb-1">
                {data.qaSignatureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.qaSignatureUrl}
                    alt={`Signature of ${data.qaLeadName}`}
                    className="max-h-11 max-w-[180px] object-contain select-none"
                  />
                ) : (
                  <div className="h-10 flex items-center justify-center text-xs text-slate-400 font-sans italic">
                    Digital QA Record Verified
                  </div>
                )}
              </div>

              {/* Horizontal Underline */}
              <div className="w-full h-[1px] bg-slate-900 mb-1.5" />

              {/* Centered Signatory Name, Title & Org */}
              <div className="text-xs font-sans font-bold text-slate-900 leading-tight">
                {data.qaLeadName}
              </div>
              <div className="text-[11px] font-sans text-slate-600 leading-tight mt-0.5">
                {data.qaLeadTitle}
              </div>
              <div className="text-[11px] font-sans font-bold text-slate-900 leading-tight mt-0.5">
                JAXIS STATLAB
              </div>
            </div>
          </div>

          {/* Right Column: Authorized & Issued By (Official Seal Badge) */}
          <div className="flex flex-col items-center justify-end">
            <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-slate-900 mb-3 text-center">
              AUTHORIZED &amp; ISSUED BY:
            </span>

            {/* Official JAXIS Seal Badge */}
            <div className="flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/jaxis-seal.png"
                alt="JAXIS StatLab Studio 2026 Certified Seal"
                className="w-48 sm:w-52 object-contain select-none drop-shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
