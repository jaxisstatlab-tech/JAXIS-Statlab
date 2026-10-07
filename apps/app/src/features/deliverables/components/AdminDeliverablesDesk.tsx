"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Modal, Toast } from "@repo/ui";
import { DownloadSimple, Eye, SealCheck, Trash, UploadSimple, Warning } from "@phosphor-icons/react";
import type { DeliverableCategory } from "@prisma/client";
import type { AdminDeliverablesDeskDTO, DeliverableDTO, QaCertificateDTO } from "../schemas";
import { deleteDeliverable, getDeliverableDownloadUrl, releaseDeliverables, uploadDeliverable } from "../actions";
import { uploadFileToR2 } from "@/lib/storage-client";
import { STUDY_FILE_EXTENSIONS, clientGetsFile, hasAllowedExtension } from "@/lib/file-types";
import { DELIVERABLE_KIND } from "../labels";
import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/Panel";
import { StudySection } from "@/features/projects/components/StudySection";

// Files tab: the files the client gets. The reviewer's approval delivers the analyst's files on its own; here an
// admin can add more files (a real upload into this study's folder) and release them, and see the client's
// change requests.

const KIND = DELIVERABLE_KIND;
const REQUEST: Record<string, string> = {
  PENDING_REVIEW: "Waiting for you",
  INCLUDED: "Covered by the price",
  METHODOLOGY_CHANGE: "Needs a new agreement",
  NEW_PAID_WORK: "Needs a new price",
  RESOLVED: "Done",
  CANCELLED: "Cancelled",
};
const ACCEPT = STUDY_FILE_EXTENSIONS.DELIVERABLE.join(",");
const FIELD =
  "w-full rounded-[2px] border border-white/10 bg-[#050513] font-sans text-[13px] text-white outline-none focus:border-[#CC6600]/60";

const date = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" }) : "—";
const dateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
const size = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const money = (n: number) => n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

type ToastState = { message: string; description?: string; variant: "success" | "danger" } | null;

export function AdminDeliverablesDesk({ data, certificate = null }: { data: AdminDeliverablesDeskDTO; certificate?: QaCertificateDTO | null }) {
  const router = useRouter();
  const { project, gateEligibility: gate, deliverables, revisions } = data;
  const [toast, setToast] = useState<ToastState>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<DeliverableDTO | null>(null);

  const s = project.masterStatus;
  const delivered = s === "DELIVERED" || s === "CLOSED" || s === "DISPUTED";
  const approved = project.qaApproved;
  const canRelease = approved && (s === "DELIVERED" || s === "REVISION_REQUESTED");
  const unreleased = deliverables.filter((d) => !d.isFinalReleased);
  const released = deliverables.length - unreleased.length;
  const openRequests = revisions.filter((r) => r.status === "PENDING_REVIEW").length;
  const reviewer = project.assignedQaLead?.fullName ?? "the reviewer";
  const blockers = [
    !gate.financialGatePassed ? `The client still owes ₱${money(gate.remainingBalance)}. Files are released once it's paid.` : null,
    unreleased.length === 0 ? "There are no new files to release." : null,
  ].filter(Boolean) as string[];

  const description = !approved
    ? `The analyst's files go to the client when ${reviewer} approves the work. You can add extra files here; they're released with it.`
    : s === "REVISION_REQUESTED"
      ? "The client asked for changes. Add the fixed files, then release them to deliver the study again."
      : delivered
        ? `Delivered ${dateTime(project.deliveredAt)}. ${project.revisionWindowExpiresAt ? `The client can ask for changes until ${dateTime(project.revisionWindowExpiresAt)}.` : ""}`
        : "Approved by the reviewer.";

  const release = async () => {
    setReleasing(true);
    try {
      await releaseDeliverables({ projectId: project.id });
      setReleaseOpen(false);
      setToast({ message: "Files released", description: `${project.client.fullName} can download them now.`, variant: "success" });
      router.refresh();
    } catch (err) {
      setToast({ message: "Not released", description: err instanceof Error ? err.message : "Please try again.", variant: "danger" });
    } finally {
      setReleasing(false);
    }
  };

  const download = async (d: DeliverableDTO) => {
    setBusyId(d.id);
    try {
      const { url } = await getDeliverableDownloadUrl(d.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setToast({ message: "Couldn't download", description: err instanceof Error ? err.message : "Please try again.", variant: "danger" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 font-sans animate-content-fade">
      <StudySection
        title="Files"
        description={description}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 active:scale-[0.97]">
              <UploadSimple size={14} weight="fill" />
              Add File
            </Button>
            {canRelease && unreleased.length > 0 ? (
              <Button variant="primary" size="sm" onClick={() => setReleaseOpen(true)} className="active:scale-[0.97]">
                Release {unreleased.length} {unreleased.length === 1 ? "File" : "Files"}
              </Button>
            ) : null}
          </>
        }
      />

      {openRequests > 0 ? (
        <Panel as="div">
          <PanelBody className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#CC6600]" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-white">
                  {project.client.fullName} asked for changes
                </p>
                <p className="mt-0.5 text-[13px] text-white/55">Decide if it&apos;s covered by the price or needs a new one.</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/admin/revisions">Change Requests</Link>
            </Button>
          </PanelBody>
        </Panel>
      ) : null}

      <Panel as="div">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4 sm:px-6 lg:grid-cols-4">
          <Fact label="Reviewer" value={approved ? "Approved" : "Not approved yet"} sub={project.assignedQaLead?.fullName ?? null} />
          <Fact
            label="Payment"
            value={gate.financialGatePassed ? "Paid in full" : `₱${money(gate.remainingBalance)} left`}
            sub={gate.totalAmount > 0 ? `of ₱${money(gate.totalAmount)}` : null}
          />
          <Fact label="Files" value={`${released} released`} sub={unreleased.length ? `${unreleased.length} not released yet` : null} />
          <Fact
            label="Files are deleted"
            value={project.filesPurgeAt ? date(project.filesPurgeAt) : "—"}
            sub={project.filesPurgeAt ? "90 days after delivery" : "Set when delivered"}
          />
        </dl>
      </Panel>

      {canRelease && unreleased.length > 0 && blockers.length > 0 ? (
        <Panel as="div">
          <PanelBody>
            <p className="text-sm font-medium text-white">Can&apos;t release yet</p>
            <ul className="mt-1 list-inside list-disc text-[13px] text-white/60">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </PanelBody>
        </Panel>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Panel className="lg:col-span-8">
          <PanelHeader
            title="Final files"
            count={deliverables.length + (certificate ? 1 : 0)}
            subtitle="The client gets only the write-up (PDF or Word) and the certificate; the rest stays with staff. Released files can't be removed."
          />
          {deliverables.length === 0 && !certificate ? (
            <PanelBody>
              <p className="text-[13px] text-white/45">
                {approved ? "No files yet." : `None yet. The analyst's files are added when ${reviewer} approves the work.`}
              </p>
            </PanelBody>
          ) : (
            <ul className="mt-4 divide-y divide-white/[0.05] border-t border-white/[0.06]">
              {deliverables.map((d) => (
                <li key={d.id} className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 truncate text-sm text-white" title={d.fileName}>
                        {d.fileName}
                      </span>
                      <span
                        className={`rounded-[2px] border px-1.5 py-0.5 text-[11px] ${
                          d.isFinalReleased ? "border-white/15 bg-white/[0.05] text-white/75" : "border-[#CC6600]/50 text-white"
                        }`}
                      >
                        {d.isFinalReleased ? "Released" : "Not released yet"}
                      </span>
                      <span className="text-[11px] text-white/45">{clientGetsFile(d.fileName) ? "Client gets it" : "Staff only"}</span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-white/45">
                      {KIND[d.category]?.label ?? d.categoryLabel} · {size(d.fileSize)} · {d.uploaderName} · {date(d.createdAt)}
                      {d.isFinalReleased && clientGetsFile(d.fileName) ? ` · downloaded ${d.downloadCount} ${d.downloadCount === 1 ? "time" : "times"}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => download(d)} loading={busyId === d.id} className="gap-1.5">
                      {busyId === d.id ? null : <DownloadSimple size={14} weight="fill" />}
                      Download
                    </Button>
                    {!d.isFinalReleased ? (
                      <button
                        type="button"
                        onClick={() => setRemoving(d)}
                        aria-label={`Remove ${d.fileName}`}
                        title="Remove"
                        className="rounded-[2px] p-2 text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-300"
                      >
                        <Trash size={15} weight="fill" />
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
              {certificate ? (
                <li className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SealCheck size={15} weight="fill" className="text-white/60" />
                      <span className="text-sm text-white">Certificate of Statistical Audit</span>
                      <span className="text-[11px] text-white/45">Client gets it</span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-white/45">
                      PDF · signed by {certificate.qaLeadName}
                      {certificate.completionDate ? ` · checked ${certificate.completionDate}` : ""} · made from the reviewer&apos;s approval
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button asChild variant="ghost" size="sm" className="gap-1.5">
                      <Link href={`/dashboard/admin/projects/${project.id}/deliverables/certificate`}>
                        <Eye size={14} weight="fill" />
                        View
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm" className="gap-1.5">
                      <a href={`/api/deliverables/certificate?studyId=${encodeURIComponent(project.id)}`} download>
                        <DownloadSimple size={14} weight="fill" />
                        Download
                      </a>
                    </Button>
                  </div>
                </li>
              ) : null}
            </ul>
          )}
        </Panel>

        <Panel className="self-start lg:col-span-4">
          <PanelHeader title="Change requests" count={revisions.length} />
          {revisions.length === 0 ? (
            <PanelBody>
              <p className="text-[13px] text-white/45">
                {delivered ? "None. The client can ask within 3 working days of delivery." : "The client can ask for changes after delivery."}
              </p>
            </PanelBody>
          ) : (
            <ul className="mt-4 divide-y divide-white/[0.05] border-t border-white/[0.06]">
              {revisions.map((r) => (
                <li key={r.id} className="px-5 py-4 sm:px-6">
                  <p className="text-[13px] font-medium text-white">{REQUEST[r.status] ?? r.status}</p>
                  <p className="mt-0.5 text-[12px] text-white/45">Sent {dateTime(r.createdAt)}</p>
                  <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-white/75">{r.description}</p>
                  {r.requestedSections ? <p className="mt-1 text-[12px] text-white/55">Parts: {r.requestedSections}</p> : null}
                  {r.classificationNotes ? (
                    <p className="mt-1.5 text-[12px] text-white/55">
                      {r.classifierName ?? "Admin"}: {r.classificationNotes}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <AddFileDialog
        open={addOpen}
        projectId={project.id}
        onClose={() => setAddOpen(false)}
        onAdded={(name) => {
          setAddOpen(false);
          setToast({ message: "File added", description: canRelease ? `${name} is ready to release.` : `${name} is released with the approval.`, variant: "success" });
          router.refresh();
        }}
      />

      {releaseOpen ? (
        <Modal
          open
          onClose={() => (releasing ? undefined : setReleaseOpen(false))}
          title={`Release ${unreleased.length} ${unreleased.length === 1 ? "file" : "files"}?`}
          description={
            s === "REVISION_REQUESTED"
              ? `${project.client.fullName} can download them right away. The study is delivered again and the 3-day window for changes starts over.`
              : `${project.client.fullName} can download them right away. The delivery date stays the same.`
          }
          size="md"
          footer={
            <div className="flex w-full justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setReleaseOpen(false)} disabled={releasing}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={release} loading={releasing} disabled={blockers.length > 0}>
                Release
              </Button>
            </div>
          }
        >
          <ul className="flex flex-col gap-1 font-sans text-[13px] text-white/75">
            {unreleased.map((d) => (
              <li key={d.id} className="truncate">
                {d.fileName}
              </li>
            ))}
          </ul>
          {blockers.length > 0 ? <p className="mt-3 text-[13px] text-red-300">{blockers[0]}</p> : null}
        </Modal>
      ) : null}

      {removing ? (
        <Modal
          open
          onClose={() => (busyId ? undefined : setRemoving(null))}
          title="Remove this file?"
          description={`${removing.fileName} hasn't been released, so the client never saw it.`}
          size="sm"
          footer={
            <div className="flex w-full justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setRemoving(null)} disabled={!!busyId}>
                Keep It
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={busyId === removing.id}
                onClick={async () => {
                  setBusyId(removing.id);
                  try {
                    await deleteDeliverable(removing.id);
                    setToast({ message: "File removed", description: removing.fileName, variant: "success" });
                    setRemoving(null);
                    router.refresh();
                  } catch (err) {
                    setToast({ message: "Not removed", description: err instanceof Error ? err.message : "Please try again.", variant: "danger" });
                  } finally {
                    setBusyId(null);
                  }
                }}
              >
                Remove
              </Button>
            </div>
          }
        >
          <span />
        </Modal>
      ) : null}

      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

function Fact({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-white/45">{label}</dt>
      <dd className="mt-0.5 text-sm text-white sm:truncate">{value}</dd>
      {sub ? <dd className="text-[12px] text-white/45 sm:truncate">{sub}</dd> : null}
    </div>
  );
}

function AddFileDialog({ open, projectId, onClose, onAdded }: { open: boolean; projectId: string; onClose: () => void; onAdded: (name: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<DeliverableCategory>("STATISTICAL_OUTPUT");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setFile(null);
      setKind("STATISTICAL_OUTPUT");
      setError(null);
    }
  }
  if (!open) return null;

  const pick = (f: File | null) => {
    setError(null);
    if (f && !hasAllowedExtension(f.name, STUDY_FILE_EXTENSIONS.DELIVERABLE)) {
      setFile(null);
      return setError(`${f.name} isn't a file type the client can get here.`);
    }
    setFile(f);
  };

  const add = async () => {
    if (!file) return setError("Choose a file first.");
    setBusy(true);
    setError(null);
    try {
      const stored = await uploadFileToR2(file, "DELIVERABLE", projectId);
      if (!stored.success || !stored.data) throw new Error(stored.error?.message || "The file didn't upload. Please try again.");
      await uploadDeliverable({
        projectId,
        category: kind,
        fileName: file.name,
        filePath: stored.data.storageKey,
        fileSize: file.size,
        fileType: file.type || "application/octet-stream",
      });
      onAdded(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The file didn't save. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => (busy ? undefined : onClose())}
      title="Add a file for the client"
      description="Up to 15 MB. Hidden from the client until it's released, and only a PDF or Word file ever reaches them."
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={add} loading={busy} disabled={!file}>
            Add File
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 font-sans">
        <div className="flex flex-col gap-1.5 text-[13px] text-white/70">
          File
          <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex min-h-[64px] items-center justify-center rounded-[2px] border border-dashed border-white/15 px-4 py-3 text-center text-[13px] text-white/60 transition-colors hover:border-white/30 hover:text-white"
          >
            {file ? (
              <span className="min-w-0 truncate text-white">
                {file.name} <span className="text-white/45">· {size(file.size)}</span>
              </span>
            ) : (
              "Choose a file"
            )}
          </button>
        </div>
        <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
          What is it?
          <select value={kind} onChange={(e) => setKind(e.target.value as DeliverableCategory)} className={`${FIELD} h-9 cursor-pointer px-2.5 [&>option]:bg-[#0A0A18]`}>
            {Object.entries(KIND).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <span className="text-[12px] text-white/45">{KIND[kind]?.hint}</span>
        </label>
        {error ? (
          <p role="alert" className="flex items-start gap-2 text-[13px] text-red-300">
            <Warning size={15} weight="fill" className="mt-0.5 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
