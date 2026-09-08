"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ClientDeliverablesDTO, DeliverableDTO } from "../schemas";
import { getDeliverableDownloadUrl } from "../actions";
import {
  Button,
  Card,
  KpiCard,
  PageHeader,
  StatusBadge,
  Badge,
  Toast,
  Peso,
} from "@repo/ui";
import {
  DownloadSimple,
  Clock,
  ShieldCheck,
  FileText,
  CircleNotch,
  ArrowCounterClockwise,
  Info,
  Receipt,
} from "@phosphor-icons/react";
import { DELIVERABLE_CATEGORY_METADATA } from "@/lib/delivery-rules";

interface ClientDeliverablesDeskProps {
  data: ClientDeliverablesDTO;
}

export function ClientDeliverablesDesk({ data }: ClientDeliverablesDeskProps) {
  const router = useRouter();
  const { project, isReleased, paymentLock, revisionWindow, deliverables, revisions, hasPendingRevision } = data;

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    description: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const handleDownload = async (item: DeliverableDTO) => {
    try {
      setDownloadingId(item.id);
      const { url } = await getDeliverableDownloadUrl(item.id);
      window.open(url, "_blank");
      setToast({
        message: "Download Started",
        description: `Downloading ${item.fileName}...`,
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "MY STUDIES", href: "/dashboard/client/projects" },
          { label: project.intakeId, href: `/dashboard/client/projects/${project.id}` },
          { label: "DELIVERABLES" },
        ]}
        title="Final Deliverables Portal"
        description={`Official statistical outputs, data tables, and manuscript findings for ${project.researchTitle}.`}
        actions={
          isReleased && revisionWindow.isActive && !hasPendingRevision ? (
            <Button
              variant="secondary"
              size="md"
              onClick={() => router.push(`/dashboard/client/projects/${project.id}/revision`)}
            >
              <ArrowCounterClockwise size={16} weight="bold" />
              <span>Request Included Revision</span>
            </Button>
          ) : undefined
        }
      />

      {/* Overview Cards (When Released) */}
      {isReleased ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            label="FINAL DELIVERABLES"
            value={String(deliverables.length)}
            unit="FILES"
            badge={
              <span className="flex items-center gap-1">
                <ShieldCheck size={12} weight="fill" className="text-emerald-400" />
                <span>VERIFIED</span>
              </span>
            }
            badgeColor="emerald"
            description="Verified research deliverables"
            variant="emerald"
            className="animate-card-reveal stagger-1"
          />

          <KpiCard
            label="REVISION WINDOW"
            value={revisionWindow.isActive ? revisionWindow.remainingFormatted : "CLOSED"}
            badge={
              <span className="flex items-center gap-1">
                <Clock size={12} weight="fill" className="text-sky-400" />
                <span>{revisionWindow.isActive ? "ACTIVE" : "EXPIRED"}</span>
              </span>
            }
            badgeColor={revisionWindow.isActive ? "sky" : "gray"}
            description={
              revisionWindow.isActive
                ? `Expires ${revisionWindow.expiresAtFormatted}`
                : "3-day post-delivery window concluded"
            }
            variant={revisionWindow.isActive ? "sky" : "default"}
            className="animate-card-reveal stagger-2"
          />

          <KpiCard
            label="ARCHIVE RETENTION"
            value="90 DAYS"
            badge={
              <span className="flex items-center gap-1">
                <FileText size={12} weight="fill" className="text-white/40" />
                <span>CLOUD</span>
              </span>
            }
            badgeColor="gray"
            description={
              project.filesPurgeAt
                ? `Stored until ${new Date(project.filesPurgeAt).toLocaleDateString("en-PH")}`
                : "Active cloud retention"
            }
            variant="default"
            className="animate-card-reveal stagger-3"
          />
        </div>
      ) : null}

      {/* Payment Lock Notice */}
      {!isReleased && paymentLock?.isLocked && (
        <Card className="p-8 sm:p-12 text-center bg-[#01142B] border border-amber-500/30 animate-card-reveal stagger-1">
          <div className="mx-auto w-16 h-16 rounded-[2px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
            <Receipt size={36} weight="fill" />
          </div>
          <h3 className="font-sans font-bold text-lg text-white">
            Deliverables Locked · Final Balance Settlement Required
          </h3>
          <p className="font-sans text-xs sm:text-sm text-white/70 max-w-xl mx-auto mt-2 leading-relaxed">
            Your Lead Statistician and Senior QA Lead have completed and verified your research outputs. Settle your outstanding balance of <span className="text-white font-semibold"><Peso />{paymentLock.remainingBalance.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span> to unlock your official deliverables and start the 3-day revision window.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => router.push(`/dashboard/client/projects/${project.id}/payment`)}
              className="bg-[#CC6600] hover:bg-[#E67300] text-white"
            >
              <Receipt size={16} weight="fill" className="mr-1.5" />
              <span>Settle Balance on Payment Desk →</span>
            </Button>
          </div>
        </Card>
      )}

      {/* Unreleased Under Packaging Notice */}
      {!isReleased && !paymentLock?.isLocked && (
        <Card className="p-8 sm:p-12 text-center bg-[#01142B] border border-sky-500/20 animate-card-reveal stagger-1">
          <div className="mx-auto w-16 h-16 rounded-[2px] bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
            <ShieldCheck size={36} weight="fill" />
          </div>
          <h3 className="font-sans font-bold text-lg text-white">
            Final Outputs Under Senior QA Verification & Packaging
          </h3>
          <p className="font-sans text-xs sm:text-sm text-white/70 max-w-xl mx-auto mt-2 leading-relaxed">
            Your Lead Statistician has prepared the preliminary results. Our Senior QA Lead is conducting dual-blind verification and the administration is packaging your final files. Download links will unlock here automatically as soon as release is authorized.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={() => router.push(`/dashboard/client/projects/${project.id}/messages`)}
            >
              Contact Research Team →
            </Button>
          </div>
        </Card>
      )}

      {/* Active Revision Window Banner */}
      {isReleased && revisionWindow.isActive && (
        <Card className="p-6 bg-[#011B38] border border-sky-500/30 animate-card-reveal stagger-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-[2px] bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Clock size={24} weight="fill" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-sm text-white">
                  3-Day Included Revision Window Active ({revisionWindow.remainingFormatted})
                </h3>
                <p className="font-sans text-xs text-white/60 mt-1 max-w-xl leading-relaxed">
                  You are entitled to 1 round of included revisions for formatting clarifications, minor adjustments, or table refinements within the agreed scope. Window closes on {revisionWindow.expiresAtFormatted}.
                </p>
              </div>
            </div>

            {!hasPendingRevision ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => router.push(`/dashboard/client/projects/${project.id}/revision`)}
              >
                <ArrowCounterClockwise size={16} weight="bold" />
                <span>File Revision Request</span>
              </Button>
            ) : (
              <Badge variant="amber" size="md">
                Revision Request Under Review
              </Badge>
            )}
          </div>
        </Card>
      )}

      {/* Deliverables Download Grid */}
      {isReleased && (
        <div className="space-y-4 animate-card-reveal stagger-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-sans font-bold text-lg text-white">Download Final Outputs</h2>
              <p className="font-sans text-xs text-white/60">
                High-resolution reports, statistical worksheets, syntax scripts, and appendices.
              </p>
            </div>
            <span className="text-xs font-mono text-white/50">
              {deliverables.length} {deliverables.length === 1 ? "FILE READY" : "FILES READY"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deliverables.map((file) => {
              const catMeta = DELIVERABLE_CATEGORY_METADATA[file.category];
              return (
                <Card
                  key={file.id}
                  className="p-6 border border-white/10 bg-[#01142B] hover:border-white/20 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <Badge variant={catMeta?.badgeVariant || "default"} size="sm">
                        {file.categoryLabel}
                      </Badge>
                      <span className="font-mono text-xs text-white/40">
                        {formatFileSize(file.fileSize)}
                      </span>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-[2px] bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
                        <FileText size={20} weight="fill" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-sans font-bold text-sm text-white truncate" title={file.fileName}>
                          {file.fileName}
                        </h4>
                        <p className="font-sans text-xs text-white/50 mt-1 line-clamp-2">
                          {catMeta?.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="font-mono text-[11px] text-white/40">
                      Released {new Date(file.createdAt).toLocaleDateString("en-PH")}
                    </span>

                    <Button
                      variant="primary"
                      size="sm"
                      disabled={downloadingId === file.id}
                      onClick={() => handleDownload(file)}
                    >
                      {downloadingId === file.id ? (
                        <CircleNotch size={14} className="animate-spin" />
                      ) : (
                        <DownloadSimple size={14} weight="bold" />
                      )}
                      <span>{downloadingId === file.id ? "Preparing..." : "Download File"}</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Revision Requests History */}
      {revisions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-sans font-bold text-lg text-white">Your Revision Requests</h2>
              <p className="font-sans text-xs text-white/60">
                Log and current status of your submitted revision inquiries.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {revisions.map((rev) => (
              <Card key={rev.id} className="p-5 border border-white/10 bg-[#01142B]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={rev.status} />
                    <span className="font-mono text-xs text-white/50">
                      Submitted on {new Date(rev.createdAt).toLocaleDateString("en-PH")}
                    </span>
                  </div>
                  {rev.classification && (
                    <Badge variant={rev.classification === "INCLUDED" ? "sky" : "amber"} size="sm">
                      {rev.classificationLabel}
                    </Badge>
                  )}
                </div>

                <div className="mt-3 text-xs font-sans text-white/80 space-y-2">
                  <div className="p-3 bg-white/[0.02] rounded-[2px] border border-white/5 leading-relaxed">
                    <span className="font-mono text-[10px] text-white/40 block uppercase tracking-wider mb-1">
                      Submitted Request Details:
                    </span>
                    {rev.description}
                  </div>

                  {rev.requestedSections && (
                    <div className="text-[11px] text-white/60">
                      <span className="font-semibold text-white/80">Affected Sections: </span>
                      {rev.requestedSections}
                    </div>
                  )}

                  {rev.classificationNotes && (
                    <div className="mt-2 p-3 rounded-[2px] bg-sky-500/10 border border-sky-500/20 text-xs text-sky-200">
                      <span className="font-semibold block mb-0.5">Administration Review Notes:</span>
                      {rev.classificationNotes}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 90-Day Archival Notice */}
      {isReleased && (
        <Card className="p-5 bg-white/[0.02] border border-white/10">
          <div className="flex items-start gap-3">
            <Info size={18} weight="fill" className="text-white/40 shrink-0 mt-0.5" />
            <p className="font-sans text-xs text-white/60 leading-relaxed">
              <strong className="text-white/80">Archival & Retention Policy:</strong> JAXIS StatLab retains your raw and finalized research files on secure encrypted cloud storage for 90 calendar days following project delivery. Please download and store local backups of your datasets and reports before the archival expiration date.
            </p>
          </div>
        </Card>
      )}

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
