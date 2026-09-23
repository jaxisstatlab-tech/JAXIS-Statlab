"use client";

import React, { useState, useEffect, useCallback, useTransition, use } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  StatusBadge,
  Button,
  FormSelect,
  FormTextarea,
  Modal,
  ModalFooter,
  Alert,
  Toast,
  LoadingState,
  Peso,
} from "@repo/ui";
import {
  IconCheck,
  IconSettings,
  IconCopy,
  IconCalculator,
  IconReceipt,
  IconReceipt2,
  IconFileText,
  IconEdit,
  IconFileCertificate,
  IconFileCheck,
} from "@tabler/icons-react";
import {
  getProjectById,
  updateProjectStatus,
  requestMissingInfo,
  markIntakeComplete,
} from "@/features/projects/actions";
import { getQuotationByProject, getCommercialCatalog } from "@/features/quotations/actions";
import { QuotationBuilderModal } from "@/features/quotations/components/QuotationBuilderModal";
import type { CommercialCatalogData } from "@/lib/pricing-rules";
import { getSOWByProject } from "@/features/sow/actions";
import type { SOWDetailItem } from "@/features/sow/schemas";
import {
  VALID_TRANSITIONS,
  PROJECT_STATUS_LABELS,
  MISSING_INFO_TEMPLATES,
  getProjectDisplayStatus,
} from "@/lib/project-rules";
import { ProjectFilesCard } from "@/features/projects/components/ProjectFilesCard";
import { getProjectAssignment } from "@/features/assignments/actions";
import { AssignmentModal } from "@/features/assignments/components/AssignmentModal";
import { ProjectAssignmentCard } from "@/features/assignments/components/ProjectAssignmentCard";
import type { AssignmentDetailItem } from "@/features/assignments/schemas";
import { IconUserCheck } from "@tabler/icons-react";
import type { ProjectDetailItem } from "@/features/projects/schemas";
import type { QuotationDetailItem } from "@/features/quotations/schemas";
import type { ProjectStatus } from "@prisma/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminProjectInspectionPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [project, setProject] = useState<ProjectDetailItem | null>(null);
  const [quotation, setQuotation] = useState<QuotationDetailItem | null>(null);
  const [sow, setSow] = useState<SOWDetailItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [isMissingInfoModalOpen, setIsMissingInfoModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [missingInfoReason, setMissingInfoReason] = useState("");
  const [missingInfoError, setMissingInfoError] = useState<string | null>(null);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedTargetStatus, setSelectedTargetStatus] = useState<string>("");
  const [statusModalError, setStatusModalError] = useState<string | null>(null);

  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [catalog, setCatalog] = useState<CommercialCatalogData | undefined>(undefined);
  const [assignment, setAssignment] = useState<AssignmentDetailItem | null>(null);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleCopyId = () => {
    if (!project) return;
    navigator.clipboard.writeText(project.intakeId);
    setToastMessage({
      message: "Copied to Clipboard",
      description: `Study ID "${project.intakeId}" has been copied to your clipboard.`,
      variant: "info",
    });
  };

  const loadProject = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [projectRes, quoteRes, assignRes, sowRes, catalogData] = await Promise.all([
        getProjectById(projectId),
        getQuotationByProject(projectId),
        getProjectAssignment(projectId),
        getSOWByProject(projectId),
        getCommercialCatalog(),
      ]);

      if (projectRes.success) {
        setProject(projectRes.data);
      } else {
        setError(projectRes.error.message);
      }

      setQuotation(quoteRes);
      if (catalogData) {
        setCatalog(catalogData);
      }

      if (assignRes.success) {
        setAssignment(assignRes.data);
      }

      if (sowRes.success && sowRes.data) {
        setSow(sowRes.data);
      } else {
        setSow(null);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to load project details.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleMarkComplete = () => {
    if (!project) return;
    startTransition(async () => {
      const res = await markIntakeComplete(project.id);
      if (res.success) {
        loadProject();
      } else {
        setError(res.error.message);
      }
    });
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const found = MISSING_INFO_TEMPLATES.find((t) => t.id === templateId);
    if (found) {
      setMissingInfoReason(found.text);
      setMissingInfoError(null);
    }
  };

  const handleRequestMissingInfo = () => {
    if (!project) return;
    if (!missingInfoReason.trim() || missingInfoReason.trim().length < 5) {
      setMissingInfoError("Please provide an explanatory reason (min 5 characters).");
      return;
    }

    setMissingInfoError(null);
    startTransition(async () => {
      const res = await requestMissingInfo({
        projectId: project.id,
        reason: missingInfoReason.trim(),
      });

      if (res.success) {
        setToastMessage({
          message: "Information Request Sent",
          description: `Missing artifacts request dispatched to ${project.client.fullName}. Study transitioned to AWAITING_INFORMATION.`,
          variant: "warning",
        });
        setIsMissingInfoModalOpen(false);
        setMissingInfoReason("");
        setSelectedTemplateId("");
        loadProject();
      } else {
        setMissingInfoError(res.error.message);
        setToastMessage({
          message: "Request Failed",
          description: res.error.message,
          variant: "danger",
        });
      }
    });
  };

  const handleStatusTransition = () => {
    if (!project || !selectedTargetStatus) return;

    setStatusModalError(null);
    startTransition(async () => {
      const res = await updateProjectStatus({
        projectId: project.id,
        status: selectedTargetStatus as ProjectStatus,
      });

      if (res.success) {
        setToastMessage({
          message: "Status Transition Applied",
          description: `Study transitioned to ${PROJECT_STATUS_LABELS[selectedTargetStatus as ProjectStatus] || selectedTargetStatus}.`,
          variant: "success",
        });
        setIsStatusModalOpen(false);
        loadProject();
      } else {
        setStatusModalError(res.error.message);
        setToastMessage({
          message: "Transition Failed",
          description: res.error.message,
          variant: "danger",
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
        <LoadingState
          variant="page"
          label="Loading Project Inspection Desk..."
          description="Retrieving analytical milestones, deliverables, and communication logs."
        />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-20 w-full animate-content-fade">
        <PageHeader
          title="Study Record Not Found"
          breadcrumbs={[
            { label: "WORKSPACE", href: "/dashboard" },
            { label: "Admin Command", href: "/dashboard/admin" },
            { label: "Intake Triage", href: "/dashboard/admin/intake" },
            { label: "Detail" },
          ]}
        />
        <Card className="p-8 text-center flex flex-col items-center gap-4">
          <p className="text-sm text-red-400 font-mono">
            {error || "The requested project record could not be loaded."}
          </p>
          <Link href="/dashboard/admin/intake">
            <Button variant="secondary" size="md">
              ← Return to Intake Triage Queue
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const allowedTransitions = VALID_TRANSITIONS[project.masterStatus] || [];

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-20 w-full animate-content-fade">
      <PageHeader
        title={project.researchTitle}
        description={`Study ID: ${project.intakeId} · Primary Client: ${project.client.fullName} · Submitted ${new Date(
          project.createdAt
        ).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} at ${new Date(
          project.createdAt
        ).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`}
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Admin Command", href: "/dashboard/admin" },
          { label: "Intake Triage", href: "/dashboard/admin/intake" },
          { label: project.intakeId },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/admin/projects/${project.id}/analysis`}>
              <Button variant="outline" size="sm" className="rounded-[2px] text-xs">
                Analysis Files Audit
              </Button>
            </Link>
            <Link href="/dashboard/admin/intake">
              <Button variant="secondary" size="sm" className="rounded-[2px] text-xs">
                ← Triage Queue
              </Button>
            </Link>
          </div>
        }
      />

      {error && <Alert variant="danger">{error}</Alert>}

      {/* ── Governance Status Action Bar ── */}
      <Card
        className="overflow-hidden border border-white/10 bg-[#01142B]/90 rounded-[4px] shadow-lg"
        style={{ padding: "0.875rem 1.5rem" }}
      >
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-sans text-white/60 uppercase font-semibold tracking-wider">
                Current Master Status:
              </span>
              {(() => {
                const displayStatus = getProjectDisplayStatus(project, "ADMIN");
                return (
                  <StatusBadge
                    status={displayStatus.status}
                    label={displayStatus.label}
                    pulse={displayStatus.pulse || project.masterStatus === "NEW_REQUEST" || project.masterStatus === "AWAITING_INFORMATION"}
                  />
                );
              })()}
              <button
                type="button"
                onClick={handleCopyId}
                title="Click to copy Study ID"
                className="text-xs font-mono font-bold text-[#FF9433] bg-[#CC6600]/15 hover:bg-[#CC6600]/25 border border-[#CC6600]/30 hover:border-[#CC6600] px-2.5 py-1 rounded-[3px] whitespace-nowrap cursor-pointer transition-all inline-flex items-center gap-1.5 group/btn ml-1"
              >
                <span>{project.intakeId}</span>
                <IconCopy size={13} stroke={1.5} className="opacity-60 group-hover/btn:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {project.masterStatus === "UNDER_EVALUATION" && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsQuotationModalOpen(true)}
                className="text-xs font-sans font-semibold whitespace-nowrap flex items-center gap-1.5 bg-[#CC6600] text-white hover:bg-[#E67300] rounded-[2px]"
              >
                <IconCalculator size={14} stroke={1.5} />
                <span>{quotation ? "Edit Quote Draft" : "Build Quote →"}</span>
              </Button>
            )}

            {(project.masterStatus === "QUOTE_SENT" || project.masterStatus === "CLIENT_APPROVED") && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsQuotationModalOpen(true)}
                className="text-xs font-sans whitespace-nowrap flex items-center gap-1.5 rounded-[2px]"
              >
                <IconFileText size={14} stroke={1.5} />
                <span>Quote Details</span>
              </Button>
            )}

            {(project.masterStatus === "CLIENT_APPROVED" || quotation?.status === "CLIENT_APPROVED") && !sow?.isLocked && (
              <Link href={`/dashboard/admin/projects/${project.id}/sow`}>
                <Button
                  variant="primary"
                  size="sm"
                  className="text-xs font-sans font-semibold whitespace-nowrap flex items-center gap-1.5 bg-[#CC6600] text-white hover:bg-[#E67300] rounded-[2px]"
                >
                  <IconFileText size={14} stroke={1.5} />
                  <span>{sow ? "View Sent SOW →" : "Draft SOW →"}</span>
                </Button>
              </Link>
            )}

            {(project.masterStatus === "SOW_SIGNED" ||
              project.masterStatus === "AWAITING_PAYMENT" ||
              project.masterStatus === "ACTIVE" ||
              project.masterStatus === "EXPERT_ASSIGNED" ||
              project.masterStatus === "IN_PROGRESS" ||
              project.masterStatus === "FOR_QA") && (
              <Link href={`/dashboard/admin/projects/${project.id}/payment`}>
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-xs font-sans whitespace-nowrap flex items-center gap-1.5"
                >
                  <IconReceipt size={14} stroke={1.5} />
                  <span>Payment Ledger</span>
                </Button>
              </Link>
            )}

            {(project.masterStatus === "FOR_QA" ||
              project.masterStatus === "DELIVERED" ||
              project.masterStatus === "REVISION_REQUESTED" ||
              project.masterStatus === "IN_PROGRESS") && (
              <Link href={`/dashboard/admin/projects/${project.id}/deliverables`}>
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-xs font-sans whitespace-nowrap flex items-center gap-1.5"
                >
                  <IconFileText size={14} stroke={1.5} />
                  <span>Deliverables Desk</span>
                </Button>
              </Link>
            )}

            {project.masterStatus === "ACTIVE" && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAssignmentModalOpen(true)}
                className="text-xs font-sans font-semibold whitespace-nowrap flex items-center gap-1.5 bg-[#CC6600] text-white hover:bg-[#E67300] rounded-[2px]"
              >
                <IconUserCheck size={14} stroke={2} />
                <span>+ Assign Specialists</span>
              </Button>
            )}

            {(project.masterStatus === "NEW_REQUEST" ||
              project.masterStatus === "AWAITING_INFORMATION") && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleMarkComplete}
                disabled={isPending}
                className="text-xs font-sans font-semibold whitespace-nowrap flex items-center gap-1 rounded-[2px]"
              >
                <IconCheck size={14} stroke={2.5} />
                <span>Mark Intake Complete</span>
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setMissingInfoReason(project.missingInfoReason || "");
                setIsMissingInfoModalOpen(true);
              }}
              className="text-xs font-sans whitespace-nowrap rounded-[2px]"
            >
              Request Missing Info
            </Button>

            {allowedTransitions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedTargetStatus(allowedTransitions[0]!);
                  setIsStatusModalOpen(true);
                }}
                className="text-xs font-sans whitespace-nowrap flex items-center gap-1.5 rounded-[2px]"
              >
                <IconSettings size={14} stroke={1.5} />
                <span>Change Status</span>
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ── Missing Information Reason (if active) ── */}
      {project.masterStatus === "AWAITING_INFORMATION" && project.missingInfoReason && (
        <Card className="p-5 bg-amber-500/[0.04] border-l-4 border-l-amber-500 flex flex-col gap-2">
          <span className="text-xs font-mono text-amber-400 font-bold uppercase">
            Active Missing Information Request:
          </span>
          <p
            className="text-xs text-white/90 leading-relaxed font-sans bg-black/30 p-4 rounded-[2px] border border-white/[0.08]"
            style={{ padding: "1rem" }}
          >
            &ldquo;{project.missingInfoReason}&rdquo;
          </p>
        </Card>
      )}

      {/* ── Specialist Assignment & SLA Tracking (Module 08) ── */}
      {assignment && (
        <ProjectAssignmentCard
          assignment={assignment}
          onRefresh={loadProject}
          onReassign={() => setIsAssignmentModalOpen(true)}
          canManage={true}
        />
      )}

      {/* ── Main Inspection Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Research Content & Datasets */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Commercial Proposal & Statement of Work (SOW) Card */}
          {(project.masterStatus === "UNDER_EVALUATION" ||
            project.masterStatus === "QUOTE_SENT" ||
            project.masterStatus === "CLIENT_APPROVED" ||
            project.masterStatus === "SOW_PENDING" ||
            project.masterStatus === "SOW_SIGNED" ||
            project.masterStatus === "AWAITING_PAYMENT" ||
            project.masterStatus === "EXPERT_ASSIGNED" ||
            project.masterStatus === "ACTIVE" ||
            project.masterStatus === "IN_PROGRESS" ||
            quotation !== null ||
            sow !== null) && (
            <Card className="p-6 bg-[#01142B] border border-white/[0.08] flex flex-col gap-5">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-[2px] bg-[#CC6600]/10 border border-[#CC6600]/30 flex items-center justify-center text-[#CC6600]">
                    <IconReceipt2 size={18} stroke={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-sans">
                      Quote &amp; Agreement
                    </h3>
                    <p className="text-xs text-white/50 font-sans">
                      Review the price quote and manage the client agreement.
                    </p>
                  </div>
                </div>
              </div>

              {/* Two-Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* ── Price Quote ── */}
                <div className="p-4 rounded-[2px] bg-[#010D1F] border border-white/[0.06] flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                          Price Quote
                        </span>
                        {quotation && (
                          <span className="text-[0.625rem] font-mono uppercase px-1.5 py-0.5 rounded-[2px] bg-white/[0.04] text-white/60 border border-white/10">
                            {quotation.packageName.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                      {quotation && (
                        <span
                          className={`text-[0.625rem] font-mono font-semibold px-2 py-0.5 rounded-[2px] border ${
                            quotation.status === "CLIENT_APPROVED"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : quotation.status === "QUOTE_SENT"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-sky-500/10 text-sky-400 border-sky-500/20"
                          }`}
                        >
                          {quotation.status === "CLIENT_APPROVED"
                            ? "Approved"
                            : quotation.status === "QUOTE_SENT"
                            ? "Sent"
                            : quotation.status === "DRAFT"
                            ? "Draft"
                            : quotation.status}
                        </span>
                      )}
                    </div>

                    {quotation ? (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-3 gap-2.5 p-3 rounded-[2px] bg-white/[0.02] border border-white/[0.04]">
                          <div>
                            <div className="text-[0.625rem] font-sans text-white/50">Total Price</div>
                            <div className="text-sm font-bold font-mono text-[#38BDF8] mt-0.5 flex items-center">
                              <Peso />{quotation.totalAmount.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-[0.625rem] font-sans text-white/50">Downpayment</div>
                            <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5 flex items-center">
                              <Peso />{quotation.downpaymentRequired.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-[0.625rem] font-sans text-white/50">Valid Until</div>
                            <div className="text-xs font-bold font-mono text-amber-300 mt-1">
                              {quotation.isExpired ? (
                                <span className="text-rose-400">Expired</span>
                              ) : (
                                new Date(quotation.expiresAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-white/50 font-sans">
                          {quotation.lineItems.length} {quotation.lineItems.length === 1 ? "service" : "services"} included in this quote.
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-white/60 font-sans leading-relaxed">
                        Evaluation complete. Build a quote with package pricing and add-ons for the client.
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/[0.04] flex items-center justify-end">
                    <Button
                      variant={quotation ? "secondary" : "primary"}
                      size="sm"
                      onClick={() => setIsQuotationModalOpen(true)}
                      className={`whitespace-nowrap gap-1.5 font-sans text-xs font-semibold ${
                        !quotation ? "bg-[#CC6600] text-white hover:bg-[#E67300]" : ""
                      }`}
                    >
                      {quotation ? (
                        <>
                          <IconEdit size={14} stroke={1.5} />
                          <span>{quotation.status === "DRAFT" ? "Edit Quote" : "View Quote"}</span>
                        </>
                      ) : (
                        <>
                          <IconCalculator size={14} stroke={1.5} />
                          <span>Build Quote →</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* ── Agreement (SOW) ── */}
                <div className="p-4 rounded-[2px] bg-[#010D1F] border border-white/[0.06] flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        Agreement (SOW)
                      </span>
                      <span
                        className={`text-[0.625rem] font-mono font-semibold px-2 py-0.5 rounded-[2px] border ${
                          sow?.isLocked || project.masterStatus === "SOW_SIGNED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : sow || project.masterStatus === "SOW_PENDING"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : quotation?.status === "CLIENT_APPROVED" || project.masterStatus === "CLIENT_APPROVED"
                            ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                            : "bg-white/[0.04] text-white/40 border-white/10"
                        }`}
                      >
                        {sow?.isLocked || project.masterStatus === "SOW_SIGNED"
                          ? "Signed"
                          : sow || project.masterStatus === "SOW_PENDING"
                          ? "Awaiting Signature"
                          : quotation?.status === "CLIENT_APPROVED" || project.masterStatus === "CLIENT_APPROVED"
                          ? "Ready to Draft"
                          : "Locked"}
                      </span>
                    </div>

                    {sow?.isLocked || project.masterStatus === "SOW_SIGNED" ? (
                      <div className="p-3 rounded-[2px] bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 text-xs font-sans leading-relaxed">
                        Signed by {sow?.signedByName || project.client.fullName}
                        {sow?.signedAt
                          ? ` on ${new Date(sow.signedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}`
                          : ""}.
                      </div>
                    ) : sow || project.masterStatus === "SOW_PENDING" ? (
                      <div className="p-3 rounded-[2px] bg-amber-950/20 border border-amber-500/20 text-amber-300 text-xs font-sans leading-relaxed">
                        Agreement sent to client. Awaiting signature.
                      </div>
                    ) : quotation?.status === "CLIENT_APPROVED" || project.masterStatus === "CLIENT_APPROVED" ? (
                      <div className="p-3 rounded-[2px] bg-sky-950/20 border border-sky-500/20 text-sky-300 text-xs font-sans leading-relaxed">
                        Quote accepted by client. Ready to draft the research agreement.
                      </div>
                    ) : (
                      <p className="text-xs text-white/40 font-sans leading-relaxed">
                        Unlocked once the client accepts the price quote.
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/[0.04] flex items-center justify-end gap-2">
                    {(project.hasPendingPaymentVerification ||
                      project.latestPaymentStatus === "PROOF_SUBMITTED" ||
                      project.masterStatus === "AWAITING_PAYMENT") && (
                      <Link href={`/dashboard/admin/projects/${project.id}/payment`}>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-1.5 font-sans text-xs font-semibold px-3 py-1.5"
                        >
                          <IconReceipt size={14} stroke={1.5} />
                          <span>Payment Desk</span>
                        </Button>
                      </Link>
                    )}
                    <Link href={`/dashboard/admin/projects/${project.id}/sow`}>
                      <Button
                        variant={
                          quotation?.status === "CLIENT_APPROVED" || project.masterStatus === "CLIENT_APPROVED" || sow
                            ? "primary"
                            : "outline"
                        }
                        size="sm"
                        className={`whitespace-nowrap gap-1.5 font-sans text-xs font-semibold ${
                          (quotation?.status === "CLIENT_APPROVED" || project.masterStatus === "CLIENT_APPROVED") &&
                          !sow?.isLocked
                            ? "bg-[#CC6600] text-white hover:bg-[#E67300]"
                            : ""
                        }`}
                      >
                        <IconFileText size={14} stroke={1.5} />
                        <span>
                          {sow?.isLocked || project.masterStatus === "SOW_SIGNED"
                            ? "View Signed SOW →"
                            : sow || project.masterStatus === "SOW_PENDING"
                            ? "View Sent SOW →"
                            : quotation?.status === "CLIENT_APPROVED" || project.masterStatus === "CLIENT_APPROVED"
                            ? "Draft SOW →"
                            : "Open SOW Desk →"}
                        </span>
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-6 md:p-8 flex flex-col gap-6">
            <div className="border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-white font-sans">
                Research Problem &amp; Analytical Scope
              </h3>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-mono uppercase text-white/40 font-bold">
                Statement of the Problem / Key Questions
              </span>
              <div
                className="p-4 rounded-[2px] bg-[#011C38] border border-white/[0.08] text-xs text-white/90 whitespace-pre-line leading-relaxed font-sans"
                style={{ padding: "1rem" }}
              >
                {project.researchQuestions}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-mono uppercase text-white/40 font-bold">
                Core Research Objectives
              </span>
              <div
                className="p-4 rounded-[2px] bg-[#011C38] border border-white/[0.08] text-xs text-white/90 whitespace-pre-line leading-relaxed font-sans"
                style={{ padding: "1rem" }}
              >
                {project.researchObjectives}
              </div>
            </div>

            {project.hypotheses && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-mono uppercase text-white/40 font-bold">
                  Theoretical Hypotheses
                </span>
                <div
                  className="p-4 rounded-[2px] bg-[#011C38] border border-white/[0.08] text-xs text-white/90 whitespace-pre-line leading-relaxed font-sans"
                  style={{ padding: "1rem" }}
                >
                  {project.hypotheses}
                </div>
              </div>
            )}
          </Card>

          {/* Attached Files Card */}
          <ProjectFilesCard files={project.files} studyId={project.intakeId} />
        </div>

        {/* Right Col: Client Institutional Identity */}
        <div className="flex flex-col gap-6">
          <Card className="p-6 flex flex-col gap-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-sky-400 font-bold border-b border-white/[0.08] pb-2">
              Client & Institutional Profile
            </h3>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <span className="text-white/40 block">Full Name</span>
                <span className="text-white font-semibold font-sans">{project.client.fullName}</span>
              </div>

              <div>
                <span className="text-white/40 block">Email Address</span>
                <span className="text-white font-mono">{project.client.email}</span>
              </div>

              {project.client.clientProfile ? (
                <>
                  <div>
                    <span className="text-white/40 block">University / Institution</span>
                    <span className="text-white font-semibold font-sans">
                      {project.client.clientProfile.institutionSchool}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 block">Academic Degree / Program</span>
                    <span className="text-white font-semibold font-sans">
                      {project.client.clientProfile.academicProgram}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 block">Contact Number</span>
                    <span className="text-white font-mono">
                      {project.client.clientProfile.contactNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 block">Philippine Region</span>
                    <span className="text-white font-semibold font-sans">
                      {project.client.clientProfile.region}
                    </span>
                  </div>
                </>
              ) : (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-[2px] text-amber-300 text-xs">
                  Institutional profile not registered.
                </div>
              )}
            </div>
          </Card>

          {/* Study Information Summary */}
          <Card className="p-6 flex flex-col gap-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-white/50 font-bold border-b border-white/[0.08] pb-2">
              Study Information
            </h3>
            <div className="flex flex-col gap-2.5 text-xs font-mono text-white/60">
              <div className="flex justify-between items-center gap-2">
                <span>Created:</span>
                <span className="text-white text-right">
                  {new Date(project.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })},{" "}
                  {new Date(project.createdAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span>Last Modified:</span>
                <span className="text-white text-right">
                  {new Date(project.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })},{" "}
                  {new Date(project.updatedAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span>Target Deadline:</span>
                <span className="text-amber-400 font-mono font-medium text-right">
                  {new Date(project.deadlineRequested).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Dispute Flag:</span>
                <span className={project.hasActiveDispute ? "text-red-400" : "text-emerald-400"}>
                  {project.hasActiveDispute ? "Active Dispute" : "Clean"}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Request Missing Info Modal ── */}
      {isMissingInfoModalOpen && (
        <Modal
          isOpen={isMissingInfoModalOpen}
          onClose={() => setIsMissingInfoModalOpen(false)}
          title={`Request Missing Information (${project.intakeId})`}
        >
          <div className="flex flex-col gap-4">
            <p className="text-xs text-white/70 font-sans leading-relaxed">
              Describe what research documents or dataset information the client must attach. This transitions status to <code className="text-amber-400 font-mono">AWAITING_INFORMATION</code>.
            </p>

            {/* Template Selector Dropdown */}
            <div className="flex flex-col gap-1.5">
              <FormSelect
                label="Pre-Configured Request Template (Optional)"
                monoLabel
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                options={[
                  { value: "", label: "-- Select a Standard Request Template (Auto-fills note) --" },
                  ...MISSING_INFO_TEMPLATES.map((t) => ({
                    value: t.id,
                    label: `[${t.category.toUpperCase()}] ${t.label}`,
                  })),
                ]}
              />
            </div>

            <FormTextarea
              label="Information Required Note"
              required
              rows={4}
              placeholder="e.g. Please upload the questionnaire tool and specify sample size N."
              value={missingInfoReason}
              onChange={(e) => {
                setMissingInfoReason(e.target.value);
                if (selectedTemplateId) setSelectedTemplateId("");
              }}
              error={missingInfoError || undefined}
              monoLabel
            />

            <ModalFooter>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsMissingInfoModalOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRequestMissingInfo}
                loading={isPending}
              >
                Send Request
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      )}

      {/* ── Status Transition Modal ── */}
      {isStatusModalOpen && (
        <Modal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          title={`State Machine Status Transition: ${project.intakeId}`}
        >
          <div className="flex flex-col gap-4">
            <p className="text-xs text-white/70 font-sans leading-relaxed">
              Select an approved state transition from the JAXIS project lifecycle state machine.
            </p>

            <FormSelect
              label="Permitted Target Status"
              options={allowedTransitions.map((t) => ({
                label: `${PROJECT_STATUS_LABELS[t] || t} (${t})`,
                value: t,
              }))}
              value={selectedTargetStatus}
              onChange={(e) => setSelectedTargetStatus(e.target.value)}
              monoLabel
            />

            {statusModalError && (
              <span className="text-xs text-red-400 font-mono">{statusModalError}</span>
            )}

            <ModalFooter>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsStatusModalOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleStatusTransition}
                loading={isPending}
              >
                Apply Transition
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      )}

      {/* Commercial Quotation Builder Modal */}
      {project && (
        <QuotationBuilderModal
          isOpen={isQuotationModalOpen}
          onClose={() => setIsQuotationModalOpen(false)}
          projectId={project.id}
          projectIntakeId={project.intakeId}
          projectTitle={project.researchTitle}
          clientName={project.client.fullName}
          existingQuotation={quotation}
          customCatalog={catalog}
          onSuccess={loadProject}
        />
      )}

      {/* Specialist Assignment Modal (Module 08) */}
      {project && (
        <AssignmentModal
          isOpen={isAssignmentModalOpen}
          onClose={() => setIsAssignmentModalOpen(false)}
          projectId={project.id}
          projectTitle={project.researchTitle}
          projectMethod={project.packageName?.replace(/_/g, " ")}
          existingAssignment={assignment}
          onSuccess={() => {
            loadProject();
            setToastMessage({
              message: assignment ? "Specialist Reassigned" : "Specialists Assigned",
              description: `Study ${project.intakeId} has been successfully staffed. SLA countdown active.`,
              variant: "success",
            });
          }}
        />
      )}

      {toastMessage && (
        <Toast
          message={toastMessage.message}
          description={toastMessage.description}
          variant={toastMessage.variant}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
