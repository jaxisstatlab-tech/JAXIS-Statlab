"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button, Toast } from "@repo/ui";
import { DownloadSimple, Eye, SealCheck } from "@phosphor-icons/react";
import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/Panel";
import { clientGetsFile, fileExtension } from "@/lib/file-types";
import { getDeliverableDownloadUrl } from "../actions";
import { DELIVERABLE_KIND } from "../labels";
import type { DeliverableDTO, QaCertificateDTO } from "../schemas";

// A finished study's final files for admins and the CEO: everything the analyst and reviewer produced (write-up,
// code, data, output) and the certificate, each marked with whether the client gets it (only the PDF / Word
// write-up and the certificate do).

const date = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" }) : "—";
const size = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export function FinalFilesCard({
  projectId,
  files,
  certificate,
  className = "",
}: {
  projectId: string;
  files: DeliverableDTO[];
  certificate?: QaCertificateDTO | null;
  className?: string;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const certUrl = `/api/deliverables/certificate?studyId=${encodeURIComponent(projectId)}`;
  // Write-ups first, then the rest by name.
  const sorted = [...files].sort((a, b) => Number(clientGetsFile(b.fileName)) - Number(clientGetsFile(a.fileName)) || a.fileName.localeCompare(b.fileName));
  const count = files.length + (certificate ? 1 : 0);

  const download = async (d: DeliverableDTO) => {
    setBusyId(d.id);
    try {
      const { url } = await getDeliverableDownloadUrl(d.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Panel className={className}>
      <PanelHeader title="Final files" count={count} subtitle="From the analyst and the reviewer. The client gets only the write-up (PDF or Word) and the certificate." />
      {count === 0 ? (
        <PanelBody>
          <p className="text-[13px] text-white/45">No final files yet.</p>
        </PanelBody>
      ) : (
        <ul className="mt-4 divide-y divide-white/[0.05] border-t border-white/[0.06] font-sans">
          {sorted.map((d) => {
            const forClient = clientGetsFile(d.fileName);
            return (
              <li key={d.id} className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
                <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border border-white/10 bg-white/[0.04] font-mono text-[10px] uppercase text-white/60 sm:flex">
                  {fileExtension(d.fileName).replace(".", "").slice(0, 4) || "file"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 truncate text-sm text-white" title={d.fileName}>
                      {d.fileName}
                    </span>
                    <Tag forClient={forClient} />
                  </div>
                  <p className="mt-0.5 text-[12px] text-white/45">
                    {DELIVERABLE_KIND[d.category]?.label ?? d.categoryLabel} · {size(d.fileSize)}
                    {d.releasedAt ? ` · released ${date(d.releasedAt)}` : " · not released yet"}
                    {forClient && d.isFinalReleased ? ` · downloaded ${d.downloadCount} ${d.downloadCount === 1 ? "time" : "times"}` : ""}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => download(d)} loading={busyId === d.id} className="shrink-0 gap-1.5 self-start sm:self-center">
                  {busyId === d.id ? null : <DownloadSimple size={14} weight="fill" />}
                  Download
                </Button>
              </li>
            );
          })}
          {certificate ? (
            <li className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
              <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border border-white/10 bg-white/[0.04] text-white/60 sm:flex">
                <SealCheck size={16} weight="fill" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-white">Certificate of Statistical Audit</span>
                  <Tag forClient />
                </div>
                <p className="mt-0.5 text-[12px] text-white/45">
                  PDF · signed by {certificate.qaLeadName}
                  {certificate.completionDate ? ` · checked ${certificate.completionDate}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1 self-start sm:self-center">
                <Button asChild variant="ghost" size="sm" className="gap-1.5">
                  <Link href={`/dashboard/admin/projects/${projectId}/deliverables/certificate`}>
                    <Eye size={14} weight="fill" />
                    View
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="gap-1.5">
                  <a href={certUrl} download>
                    <DownloadSimple size={14} weight="fill" />
                    Download
                  </a>
                </Button>
              </div>
            </li>
          ) : null}
        </ul>
      )}
      {error ? <Toast message="Couldn't download" description={error} variant="danger" onClose={() => setError(null)} /> : null}
    </Panel>
  );
}

function Tag({ forClient }: { forClient: boolean }) {
  return (
    <span
      className={`rounded-[2px] border px-1.5 py-0.5 text-[11px] ${forClient ? "border-white/15 bg-white/[0.05] text-white/80" : "border-white/10 text-white/50"}`}
      title={forClient ? "The client can download this" : "Only staff can see this"}
    >
      {forClient ? "Client gets it" : "Staff only"}
    </span>
  );
}
