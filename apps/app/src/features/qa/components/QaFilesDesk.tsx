"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Button, Toast } from "@repo/ui";
import { ArrowRight, DownloadSimple } from "@phosphor-icons/react";
import { ANALYSIS_CATEGORY_METADATA } from "@/lib/analysis-rules";
import { resolveStoredFileUrl } from "@/lib/file-utils";
import { clientPackageName } from "@/features/projects/client-packages";
import { StudySection } from "@/features/projects/components/StudySection";
import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/Panel";
import { getAnalysisFileDownloadUrl } from "@/features/analysis/actions";
import type { WorkbenchDataDTO } from "@/features/analysis/schemas";
import type { AnalysisFileCategory } from "@prisma/client";

// The reviewer's "Working files": every file the analyst uploaded for one study, grouped by kind, with all
// versions (the current one first). Read-only. The study's review page links here for older versions.

type Data = WorkbenchDataDTO;
type File = Data["analysisFiles"][number];
const KIND_ORDER = Object.keys(ANALYSIS_CATEGORY_METADATA) as AnalysisFileCategory[];

function dateTime(iso: string) {
  return new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function shortDate(iso?: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—";
}
function size(bytes?: number | null) {
  if (!bytes) return null;
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function QaFilesDesk({ data }: { data: Data }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; description?: string } | null>(null);
  const status = data.project.masterStatus;
  const analyst = data.assignment?.statisticianName ?? "the analyst";
  const reviewHref = `/dashboard/qa/projects/${data.project.id}/review`;

  // Kinds in the usual order, each with its versions newest first.
  const groups = useMemo(() => {
    const byKind = new Map<AnalysisFileCategory, File[]>();
    for (const f of data.analysisFiles) byKind.set(f.fileCategory, [...(byKind.get(f.fileCategory) ?? []), f]);
    return KIND_ORDER.filter((k) => byKind.has(k)).map((k) => ({
      kind: k,
      label: ANALYSIS_CATEGORY_METADATA[k].label,
      files: byKind.get(k)!.sort((a, b) => b.version - a.version),
    }));
  }, [data.analysisFiles]);
  const current = data.analysisFiles.filter((f) => f.isCurrent).length;
  const older = data.analysisFiles.length - current;
  const lastUpload = data.analysisFiles.reduce<string | null>((m, f) => (!m || f.uploadedAt > m ? f.uploadedAt : m), null);

  const download = async (f: File) => {
    setBusyId(f.id);
    try {
      const res = await getAnalysisFileDownloadUrl(f.id);
      if (!res.success) return setToast({ message: "Couldn't download", description: res.error.message || "Please try again." });
      const link = document.createElement("a");
      link.href = res.data;
      link.download = f.fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setToast({ message: "Couldn't download", description: "Check your connection and try again." });
    } finally {
      setBusyId(null);
    }
  };

  const notice =
    status === "FOR_QA"
      ? { title: "Ready for you to check", body: `${analyst} sent these files for review. Open Review to approve them or send them back.` }
      : status === "QA_REVISION"
        ? { title: "Sent back for changes", body: `${analyst} is fixing it. The new versions will show here as they're uploaded.` }
        : ["DELIVERED", "CLOSED", "DISPUTED"].includes(status)
          ? { title: "Approved and delivered", body: "These files are final." }
          : status === "ETHICAL_BREACH"
            ? { title: "Reported to the CEO", body: "The study is locked until the CEO decides." }
            : { title: "Still with the analyst", body: `${analyst} hasn't sent these for review yet, so they may change. You'll get a notification when it's ready for you.` };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans">
      <StudySection
        title="Working files"
        description={`Every file ${analyst} uploaded for this study, with older versions. You can download them; only the analyst can change them.`}
        actions={
          <Button asChild variant={status === "FOR_QA" ? "primary" : "outline"} size="sm" className="gap-1.5 active:scale-[0.97]">
            <Link href={reviewHref}>
              {status === "FOR_QA" ? "Open Review" : "Review Page"}
              <ArrowRight size={13} weight="bold" />
            </Link>
          </Button>
        }
      />

      <Panel as="div">
        <PanelBody className="flex items-start gap-3">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#CC6600]" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">{notice.title}</p>
            <p className="mt-0.5 text-[13px] text-white/55">{notice.body}</p>
          </div>
        </PanelBody>
      </Panel>

      <Panel as="div">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4 sm:px-6 lg:grid-cols-4">
          {(
            [
              ["Analyst", data.assignment?.statisticianName ?? "Not assigned"],
              ["Package", clientPackageName(data.project.packageName) ?? "—"],
              ["Files", `${current} current${older > 0 ? ` · ${older} older` : ""}`],
              ["Last upload", lastUpload ? dateTime(lastUpload) : "None yet"],
            ] as Array<[string, string]>
          ).map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[12px] text-white/45">{label}</dt>
              <dd className="mt-0.5 truncate text-sm text-white">{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Panel className="lg:col-span-8">
          <PanelHeader title="Analyst's files" count={data.analysisFiles.length} subtitle="Grouped by kind. The current version is what you review." />
          {groups.length === 0 ? (
            <PanelBody>
              <p className="text-[13px] text-white/45">{analyst} hasn&apos;t uploaded any files yet.</p>
            </PanelBody>
          ) : (
            <div className="mt-4 flex flex-col">
              {groups.map((g) => (
                <section key={g.kind} aria-label={g.label} className="border-t border-white/[0.06]">
                  <h3 className="flex items-baseline gap-2 px-5 pb-1 pt-4 text-[13px] font-medium text-white sm:px-6">
                    {g.label}
                    <span className="font-mono text-[11px] font-normal text-white/40">
                      {g.files.length} {g.files.length === 1 ? "version" : "versions"}
                    </span>
                  </h3>
                  <ul className="divide-y divide-white/[0.04]">
                    {g.files.map((f) => (
                      <li key={f.id} className={`flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-start sm:gap-4 sm:px-6 ${f.isCurrent ? "" : "opacity-75"}`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-white/60">v{f.version}</span>
                            {f.isCurrent ? (
                              <span className="rounded-[2px] border border-white/15 bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-white/80">Current</span>
                            ) : null}
                            <span className="min-w-0 truncate text-sm text-white" title={f.fileName}>
                              {f.fileName}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[12px] text-white/45">
                            {dateTime(f.uploadedAt)} · {f.statisticianName}
                            {size(f.fileSize) ? ` · ${size(f.fileSize)}` : ""}
                          </p>
                          {f.notes ? <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{f.notes}</p> : null}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => download(f)}
                          loading={busyId === f.id}
                          className="shrink-0 gap-1.5 active:scale-[0.97]"
                        >
                          {busyId === f.id ? null : <DownloadSimple size={13} weight="fill" />}
                          Download
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="lg:col-span-4 self-start">
          <PanelHeader title="Client's files" count={data.clientFiles.length} />
          {data.clientFiles.length === 0 ? (
            <PanelBody>
              <p className="text-[13px] text-white/45">The client hasn&apos;t added any files.</p>
            </PanelBody>
          ) : (
            <ul className="mt-4 divide-y divide-white/[0.05] border-t border-white/[0.06]">
              {data.clientFiles.map((f) => {
                const url = resolveStoredFileUrl(f.filePath);
                return (
                  <li key={f.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-white" title={f.fileName}>
                        {f.fileName}
                      </p>
                      <p className="text-[12px] text-white/45">{shortDate(f.uploadedAt)}</p>
                    </div>
                    {url ? (
                      <a
                        href={url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Download ${f.fileName}`}
                        className="shrink-0 rounded-[2px] p-2 text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white"
                      >
                        <DownloadSimple size={15} weight="fill" />
                      </a>
                    ) : (
                      <span className="shrink-0 text-[12px] text-white/30" title="This sample file has nothing inside (offline mode).">
                        Sample
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {toast ? <Toast message={toast.message} description={toast.description} variant="danger" onClose={() => setToast(null)} /> : null}
    </div>
  );
}
