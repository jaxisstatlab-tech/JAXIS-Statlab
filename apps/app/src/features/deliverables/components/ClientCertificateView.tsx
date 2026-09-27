"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button, Toast } from "@repo/ui";
import { ArrowLeft, DownloadSimple, Printer, SealCheck } from "@phosphor-icons/react";
import type { QaCertificateDTO } from "../schemas";
import { StatisticalAuditCertificate } from "./StatisticalAuditCertificate";

// The certificate on its own page: Print or Save as PDF (the sheet itself), or download the
// ready-made PDF file from the server. Both show the same wording.

export function ClientCertificateView({ projectId, certificate }: { projectId: string; certificate: QaCertificateDTO }) {
  const [toast, setToast] = useState<string | null>(null);
  const fileBase = (certificate.certificateId || "JAXIS-CERTIFICATE").trim().replace(/[^\w.-]/g, "_");

  // The browser uses the page title as the PDF's file name.
  const handlePrint = () => {
    const previous = document.title;
    document.title = `JAXIS Certificate ${certificate.certificateId}`;
    const restore = () => {
      document.title = previous;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = `/api/deliverables/certificate?studyId=${projectId}`;
    link.download = fileBase.toLowerCase().endsWith(".pdf") ? fileBase : `${fileBase}.pdf`;
    link.style.position = "fixed";
    link.style.left = "-9999px";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => link.remove(), 2000);
    setToast("Downloading your certificate (PDF).");
  };

  return (
    <div className="flex flex-col gap-4 pb-24 print:gap-0 print:pb-0">
      {toast ? <Toast message="Download started" description={toast} variant="info" onClose={() => setToast(null)} /> : null}
      <Link
        href={`/dashboard/client/projects/${projectId}/deliverables`}
        className="inline-flex items-center gap-1.5 self-start text-[13px] text-white/60 transition-colors hover:text-white print:hidden"
      >
        <ArrowLeft size={14} weight="bold" />
        Back to Files
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-white/15 bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-white">
          <SealCheck size={13} weight="fill" />
          Checked and approved
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={handleDownload} className="gap-1.5">
            <DownloadSimple size={15} weight="bold" />
            Download PDF
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer size={15} weight="fill" />
            Print or Save as PDF
          </Button>
        </div>
      </div>
      <StatisticalAuditCertificate data={certificate} />
    </div>
  );
}
