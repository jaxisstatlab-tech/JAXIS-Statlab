"use client";

import React, { useEffect } from "react";
import { Button } from "@repo/ui";
import { Printer, X, ShieldCheck, DownloadSimple } from "@phosphor-icons/react";
import type { QaCertificateDTO } from "../schemas";
import { StatisticalAuditCertificate } from "./StatisticalAuditCertificate";

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: QaCertificateDTO;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  certificate,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = (mode: "download" | "print" = "download") => {
    const originalTitle = document.title;
    document.title = `${certificate.certificateId} - Certificate of Statistical Audit - JAXIS StatLab`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fade-in print:p-0">
      {/* Dark backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity print:hidden"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#010D1F] border border-white/10 rounded-[2px] shadow-2xl overflow-hidden z-10 print:static print:w-auto print:max-w-none print:max-h-none print:border-none print:shadow-none print:bg-transparent">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#01142B] print:hidden">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={20} weight="fill" className="text-[#CC6600]" />
            <div>
              <h2 className="text-sm font-bold text-white font-sans">
                Certificate of Statistical Audit
              </h2>
              <p className="text-xs text-white/60 font-sans">
                Official A4 Academic Attestation &amp; QA Accreditation Seal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handlePrint("print")}
              className="rounded-[2px] gap-1.5 font-sans text-xs border border-white/15 active:scale-95"
            >
              <Printer size={15} weight="fill" />
              <span>Print</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handlePrint("download")}
              className="rounded-[2px] gap-1.5 font-sans font-semibold text-xs shadow-sm bg-[#CC6600] hover:bg-[#E67300] text-white active:scale-95"
            >
              <DownloadSimple size={15} weight="bold" />
              <span>Download A4 PDF</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-[2px] text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer ml-1"
              title="Close Preview (Esc)"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>

        {/* Modal Body - Scrollable Certificate Preview Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#010114]/90 flex flex-col items-center justify-start print:p-0 print:overflow-visible print:bg-transparent">
          <div className="w-full flex justify-center py-2">
            <StatisticalAuditCertificate data={certificate} />
          </div>

          {/* Helper Print Guidance Note */}
          <div className="mt-4 mb-2 text-center text-xs text-white/40 font-mono print:hidden">
            Tip: Select destination <strong className="text-white/70">&quot;Save as PDF&quot;</strong>, paper size <strong className="text-white/70">&quot;A4&quot;</strong>, and margins <strong className="text-white/70">&quot;None&quot;</strong> for an exact single-page printout.
          </div>
        </div>
      </div>
    </div>
  );
};
