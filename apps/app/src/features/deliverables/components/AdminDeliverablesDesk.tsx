"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminDeliverablesDeskDTO,
  DeliverableDTO,
} from "../schemas";
import {
  uploadDeliverable,
  deleteDeliverable,
  releaseDeliverables,
  getDeliverableDownloadUrl,
} from "../actions";
import {
  Button,
  Card,
  KpiCard,
  StatusBadge,
  Badge,
  Modal,
  Toast,
  Peso,
  Pagination,
} from "@repo/ui";
import {
  IconCheck,
  IconLock,
  IconUpload,
  IconTrash,
  IconDownload,
  IconAlertTriangle,
  IconFileText,
  IconShieldCheck,
  IconArrowRight,
  IconLoader2,
  IconClock,
  IconCircleCheck,
} from "@tabler/icons-react";
import { DeliverableCategory } from "@prisma/client";
import { DELIVERABLE_CATEGORY_METADATA } from "@/lib/delivery-rules";
import { StudySection } from "@/features/projects/components/StudySection";

interface AdminDeliverablesDeskProps {
  data: AdminDeliverablesDeskDTO;
}

export function AdminDeliverablesDesk({ data }: AdminDeliverablesDeskProps) {
  const router = useRouter();
  const { project, gateEligibility, deliverables, revisions } = data;

  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DeliverableCategory>("STATISTICAL_OUTPUT");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(1024 * 500); // 500 KB default
  const [fileType, setFileType] = useState("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [toast, setToast] = useState<{
    message: string;
    description: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const isReleased = project.masterStatus === "DELIVERED" || Boolean(project.deliveredAt);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) {
      setToast({
        message: "Missing File Name",
        description: "Please enter a valid file name.",
        variant: "warning",
      });
      return;
    }

    try {
      setIsUploading(true);
      const cleanFileName = fileName.trim();
      const storageKey = `deliverables/${project.id}/${Date.now()}-${cleanFileName}`;

      await uploadDeliverable({
        projectId: project.id,
        category: selectedCategory,
        fileName: cleanFileName,
        filePath: storageKey,
        fileSize,
        fileType,
      });

      setToast({
        message: "Deliverable Uploaded",
        description: `${cleanFileName} added to packaging queue.`,
        variant: "success",
      });

      setShowUploadModal(false);
      setFileName("");
      router.refresh();
    } catch (err: unknown) {
      setToast({
        message: "Upload Failed",
        description: err instanceof Error ? err.message : "Failed to upload file.",
        variant: "danger",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from this package?`)) return;

    try {
      setDeletingId(id);
      await deleteDeliverable(id);
      setToast({
        message: "File Removed",
        description: `${name} has been removed from deliverables.`,
        variant: "info",
      });
      router.refresh();
    } catch (err: unknown) {
      setToast({
        message: "Delete Failed",
        description: err instanceof Error ? err.message : "Failed to remove file.",
        variant: "danger",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (deliverable: DeliverableDTO) => {
    try {
      setDownloadingId(deliverable.id);
      const { url } = await getDeliverableDownloadUrl(deliverable.id);
      window.open(url, "_blank");
      setToast({
        message: "Download Started",
        description: `Downloading ${deliverable.fileName}`,
        variant: "info",
      });
    } catch (err: unknown) {
      setToast({
        message: "Download Failed",
        description: err instanceof Error ? err.message : "Unable to generate download link.",
        variant: "danger",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRelease = async () => {
    try {
      setIsReleasing(true);
      await releaseDeliverables({ projectId: project.id });
      setToast({
        message: "Deliverables Released",
        description: "Files are now available in the client portal. 3-day revision window activated.",
        variant: "success",
      });
      setShowReleaseModal(false);
      router.refresh();
    } catch (err: unknown) {
      setToast({
        message: "Release Blocked",
        description: err instanceof Error ? err.message : "Release could not be completed.",
        variant: "danger",
      });
    } finally {
      setIsReleasing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      {/* Page Header */}
      <StudySection
          title="Files"
          description="Add the final files, check both reviews, then release them to the client."
          actions={<div className="flex items-center gap-3">
            {!isReleased && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowUploadModal(true)}
              >
                <IconUpload size={16} />
                <span>Add File</span>
              </Button>
            )}
            {!isReleased ? (
              <Button
                variant="primary"
                size="md"
                disabled={!gateEligibility.eligible}
                onClick={() => setShowReleaseModal(true)}
              >
                <span>Release to Client</span>
                <IconArrowRight size={16} />
              </Button>
            ) : (
              <Badge variant="emerald" size="md">
                <IconCircleCheck size={14} className="mr-1.5" />
                Released to Client
              </Badge>
            )}
          </div>}
        />

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="FINANCIAL CLEARANCE"
          value={
            gateEligibility.financialGatePassed ? (
              "PAID IN FULL"
            ) : (
              <div className="flex items-center">
                <Peso />
                {gateEligibility.remainingBalance.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </div>
            )
          }
          unit={gateEligibility.financialGatePassed ? undefined : "DUE"}
          description={
            gateEligibility.financialGatePassed
              ? "All payments verified and cleared"
              : `Total: ₱${gateEligibility.totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
          }
          variant={gateEligibility.financialGatePassed ? "emerald" : "red"}
        />

        <KpiCard
          label="QA LEAD CLEARANCE"
          value={
            !gateEligibility.isTier2Package
              ? "NOT REQUIRED"
              : gateEligibility.qaGatePassed
                ? "APPROVED"
                : "PENDING QA"
          }
          description={
            !gateEligibility.isTier2Package
              ? "Standard Package (Tier 1)"
              : gateEligibility.qaGatePassed
                ? "Senior QA sign-off confirmed"
                : "Awaiting Senior QA review"
          }
          variant={
            !gateEligibility.isTier2Package
              ? "default"
              : gateEligibility.qaGatePassed
                ? "emerald"
                : "amber"
          }
        />

        <KpiCard
          label="PACKAGED ASSETS"
          value={String(deliverables.length)}
          unit="FILES"
          description={
            deliverables.length > 0
              ? `${deliverables.filter((d) => d.category === "STATISTICAL_OUTPUT" || d.category === "PDF_REPORT").length} primary deliverables`
              : "No assets uploaded yet"
          }
          variant={deliverables.length > 0 ? "sky" : "default"}
        />

        <KpiCard
          label="RELEASE STATUS"
          value={isReleased ? "DELIVERED" : gateEligibility.eligible ? "READY" : "LOCKED"}
          description={
            isReleased
              ? `Delivered ${new Date(project.deliveredAt!).toLocaleDateString("en-PH")}`
              : gateEligibility.eligible
                ? "All release gates cleared"
                : "Requirements incomplete"
          }
          variant={isReleased ? "emerald" : gateEligibility.eligible ? "sky" : "red"}
        />
      </div>

      {/* Dual Release Gate Status Banner */}
      {!isReleased && (
        <Card
          className={`p-6 border ${
            gateEligibility.eligible
              ? "bg-[#0F0F1D] border-emerald-500/30"
              : "bg-[#0A0A18] border-amber-500/30"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-[2px] ${
                  gateEligibility.eligible
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}
              >
                {gateEligibility.eligible ? (
                  <IconShieldCheck size={28} />
                ) : (
                  <IconLock size={28} />
                )}
              </div>
              <div>
                <h3 className="font-sans font-bold text-base text-white">
                  {gateEligibility.eligible
                    ? "Dual Release Gate Clearance: Ready for Release"
                    : "Dual Release Gate Restrictions Active"}
                </h3>
                <p className="font-sans text-xs text-white/60 mt-1 max-w-2xl">
                  {gateEligibility.eligible
                    ? "Both the Financial Clearance Gate (RULE_REL_01) and Quality Assurance Gate (RULE_REL_02) have been satisfied. You can now release deliverables to the client."
                    : "Release is blocked until all mandatory criteria are met. Review the checklist items below."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] bg-white/[0.04] border border-white/10 text-xs font-mono">
                {gateEligibility.financialGatePassed ? (
                  <IconCheck size={14} className="text-emerald-400" />
                ) : (
                  <IconAlertTriangle size={14} className="text-red-400" />
                )}
                <span className={gateEligibility.financialGatePassed ? "text-emerald-300" : "text-amber-300"}>
                  Financial Gate (RULE_REL_01)
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] bg-white/[0.04] border border-white/10 text-xs font-mono">
                {gateEligibility.qaGatePassed ? (
                  <IconCheck size={14} className="text-emerald-400" />
                ) : (
                  <IconAlertTriangle size={14} className="text-amber-400" />
                )}
                <span className={gateEligibility.qaGatePassed ? "text-emerald-300" : "text-amber-300"}>
                  QA Gate (RULE_REL_02)
                </span>
              </div>
            </div>
          </div>

          {!gateEligibility.eligible && gateEligibility.reasons.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
              {gateEligibility.reasons.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs font-sans text-amber-300/90">
                  <IconAlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Released Banner (If Already Delivered) */}
      {isReleased && (
        <Card className="p-6 bg-[#0F0F1D] border border-emerald-500/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-[2px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <IconShieldCheck size={24} />
              </div>
              <div>
                <h3 className="font-sans font-bold text-sm text-white">
                  Deliverables Released to Client
                </h3>
                <p className="font-sans text-xs text-white/60 mt-0.5">
                  Released on {new Date(project.deliveredAt!).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-white/70">
              <div className="flex items-center gap-1.5">
                <IconClock size={14} className="text-sky-400" />
                <span>
                  Revision Expiry:{" "}
                  {project.revisionWindowExpiresAt
                    ? new Date(project.revisionWindowExpiresAt).toLocaleDateString("en-PH")
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <IconTrash size={14} className="text-amber-400" />
                <span>
                  Archive Purge:{" "}
                  {project.filesPurgeAt
                    ? new Date(project.filesPurgeAt).toLocaleDateString("en-PH")
                    : "90 Days"}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Deliverables List Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-sans font-bold text-lg text-white">Packaged Deliverable Assets</h2>
            <p className="font-sans text-xs text-white/60">
              Final manuscript files, datasets, syntax scripts, and appendices included in the release.
            </p>
          </div>
          <span className="text-xs font-mono text-white/50">
            {deliverables.length} {deliverables.length === 1 ? "FILE" : "FILES"} PACKAGED
          </span>
        </div>

        <Card className="overflow-hidden border border-white/10 bg-[#0A0A18]">
          {deliverables.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="p-3.5 rounded-[2px] bg-white/[0.04] text-white/40 mb-3 border border-white/10">
                <IconFileText size={32} />
              </div>
              <h4 className="font-sans font-semibold text-sm text-white/80">No Deliverable Assets Packaged</h4>
              <p className="font-sans text-xs text-white/50 max-w-sm mt-1">
                Upload final statistical reports, clean datasets, and appendix documents to prepare the release package.
              </p>
              {!isReleased && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  onClick={() => setShowUploadModal(true)}
                >
                  <IconUpload size={14} />
                  <span>+ Add First Deliverable</span>
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 font-mono">
                    <th className="py-3 px-4 font-semibold">ASSET / FILE NAME</th>
                    <th className="py-3 px-4 font-semibold">CATEGORY</th>
                    <th className="py-3 px-4 font-semibold">SIZE</th>
                    <th className="py-3 px-4 font-semibold">UPLOADED BY</th>
                    <th className="py-3 px-4 font-semibold">STATUS</th>
                    <th className="py-3 px-4 font-semibold text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {deliverables.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item) => {
                    const catMeta = DELIVERABLE_CATEGORY_METADATA[item.category];
                    return (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-[2px] bg-sky-500/10 text-sky-400 border border-sky-500/20">
                              <IconFileText size={16} />
                            </div>
                            <div>
                              <span className="font-sans font-semibold text-white/90 block">
                                {item.fileName}
                              </span>
                              <span className="font-mono text-[11px] text-white/40 block mt-0.5">
                                {new Date(item.createdAt).toLocaleDateString("en-PH", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={catMeta?.badgeVariant || "default"} size="sm">
                            {item.categoryLabel}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-white/70">
                          {formatFileSize(item.fileSize)}
                        </td>
                        <td className="py-3.5 px-4 text-white/70">
                          {item.uploaderName}
                        </td>
                        <td className="py-3.5 px-4">
                          {item.isFinalReleased ? (
                            <Badge variant="emerald" size="sm">
                              Released ({item.downloadCount} dl)
                            </Badge>
                          ) : (
                            <Badge variant="default" size="sm">
                              Unreleased Draft
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={downloadingId === item.id}
                              onClick={() => handleDownload(item)}
                            >
                              {downloadingId === item.id ? (
                                <IconLoader2 size={14} className="animate-spin" />
                              ) : (
                                <IconDownload size={14} />
                              )}
                              <span>Download</span>
                            </Button>
                            {!isReleased && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deletingId === item.id}
                                onClick={() => handleDelete(item.id, item.fileName)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                {deletingId === item.id ? (
                                  <IconLoader2 size={14} className="animate-spin" />
                                ) : (
                                  <IconTrash size={14} />
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {deliverables.length > 0 && (
              <div className="border-t border-white/10 p-3 sm:px-6">
                <Pagination
                  currentPage={currentPage}
                  totalItems={deliverables.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </>
        )}
        </Card>
      </div>

      {/* Revision Requests History (If Any) */}
      {revisions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-sans font-bold text-lg text-white">Client Revision Requests</h2>
              <p className="font-sans text-xs text-white/60">
                Log of formal revision requests submitted by the client during the 3-day post-delivery window.
              </p>
            </div>
            <span className="text-xs font-mono text-white/50">
              {revisions.length} {revisions.length === 1 ? "REQUEST" : "REQUESTS"}
            </span>
          </div>

          <div className="space-y-3">
            {revisions.map((rev) => (
              <Card key={rev.id} className="p-5 border border-white/10 bg-[#0A0A18]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={rev.status} />
                    <span className="font-mono text-xs text-white/50">
                      Filed {new Date(rev.createdAt).toLocaleDateString("en-PH")} by {rev.clientName}
                    </span>
                  </div>
                  {rev.classification && (
                    <Badge variant={rev.classification === "INCLUDED" ? "sky" : "amber"} size="sm">
                      {rev.classificationLabel}
                    </Badge>
                  )}
                </div>

                <div className="mt-3 text-xs font-sans text-white/80 space-y-2">
                  <div>
                    <span className="font-mono text-white/40 block uppercase text-[10px] tracking-wider mb-1">
                      Client Description:
                    </span>
                    <p className="p-3 bg-white/[0.02] rounded-[2px] border border-white/5 leading-relaxed">
                      {rev.description}
                    </p>
                  </div>

                  {rev.requestedSections && (
                    <div className="text-[11px] text-white/60">
                      <span className="font-semibold text-white/80">Affected Sections: </span>
                      {rev.requestedSections}
                    </div>
                  )}

                  {rev.classificationNotes && (
                    <div className="mt-2 pt-2 border-t border-white/5 text-[11px] text-sky-300/90">
                      <span className="font-semibold text-sky-400">Admin Triage Note: </span>
                      {rev.classificationNotes}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upload Deliverable Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => !isUploading && setShowUploadModal(false)}
        title="Package Deliverable Asset"
        description="Upload official statistical results, datasets, and reports for this study."
        size="lg"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-white/60 mb-1.5 uppercase">
              Deliverable Category *
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as DeliverableCategory)}
              className="w-full bg-[#0A0A18] border border-white/10 rounded-[2px] px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
            >
              {Object.entries(DELIVERABLE_CATEGORY_METADATA).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] font-sans text-white/50 mt-1">
              {DELIVERABLE_CATEGORY_METADATA[selectedCategory]?.description}
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono text-white/60 mb-1.5 uppercase">
              File Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Statistical_Results_Report_Final.pdf"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full bg-[#0A0A18] border border-white/10 rounded-[2px] px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-white/60 mb-1.5 uppercase">
                Estimated File Size (KB)
              </label>
              <input
                type="number"
                min={1}
                value={Math.round(fileSize / 1024)}
                onChange={(e) => setFileSize(Number(e.target.value) * 1024)}
                className="w-full bg-[#0A0A18] border border-white/10 rounded-[2px] px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-white/60 mb-1.5 uppercase">
                MIME File Type
              </label>
              <input
                type="text"
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                className="w-full bg-[#0A0A18] border border-white/10 rounded-[2px] px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              size="md"
              disabled={isUploading}
              onClick={() => setShowUploadModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isUploading}
            >
              {isUploading ? <IconLoader2 size={16} className="animate-spin" /> : <IconUpload size={16} />}
              <span>{isUploading ? "Uploading..." : "Add to Package"}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Release Confirmation Modal */}
      <Modal
        isOpen={showReleaseModal}
        onClose={() => !isReleasing && setShowReleaseModal(false)}
        title="Authorize Final Deliverables Release"
        description="This action will immediately publish all packaged files to the client portal and activate their 3-day revision window."
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-[2px] bg-emerald-500/10 border border-emerald-500/20 text-xs font-sans text-emerald-300 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-emerald-200">
              <IconShieldCheck size={16} />
              <span>Dual Release Gates Verified:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-emerald-300/90 pl-1">
              <li>Financial Gate: 100% balance cleared.</li>
              <li>QA Gate: Quality sign-off confirmed.</li>
              <li>Files: {deliverables.length} packaged assets ready for download.</li>
            </ul>
          </div>

          <p className="text-xs font-sans text-white/70 leading-relaxed">
            Upon release:
            <br />
            • The client receives secure pre-signed download links.
            <br />
            • A 3 Philippine business days revision countdown is started.
            <br />
            • The project status automatically advances to <strong className="text-white">DELIVERED</strong>.
          </p>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              size="md"
              disabled={isReleasing}
              onClick={() => setShowReleaseModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={isReleasing}
              onClick={handleRelease}
            >
              {isReleasing ? <IconLoader2 size={16} className="animate-spin" /> : <IconArrowRight size={16} />}
              <span>{isReleasing ? "Releasing Files..." : "Authorize & Release"}</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          description={toast.description}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
