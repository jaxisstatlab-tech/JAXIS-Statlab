"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  PageHeader,
  Button,
  Card,
  Alert,
  Toast,
  LoadingState,
  FormTextarea,
  EmptyState,
  Peso,
} from "@repo/ui";
import {
  IconFileText,
  IconShieldCheck,
  IconFileCertificate,
  IconCheck,
  IconLock,
  IconCreditCard,
} from "@tabler/icons-react";
import { getSOWByProject, generateSOW } from "@/features/sow/actions";
import { getProjectById } from "@/features/projects/actions";
import { getQuotationByProject } from "@/features/quotations/actions";
import { SowDocument } from "@/features/sow/components/SowDocument";
import type { SOWDetailItem } from "@/features/sow/schemas";
import type { ProjectDetailItem } from "@/features/projects/schemas";
import type { QuotationDetailItem } from "@/features/quotations/schemas";
import { StudySection } from "@/features/projects/components/StudySection";

export default function AdminSowPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [project, setProject] = useState<ProjectDetailItem | null>(null);
  const [quotation, setQuotation] = useState<QuotationDetailItem | null>(null);
  const [sow, setSow] = useState<SOWDetailItem | null>(null);
  const [customTerms, setCustomTerms] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const [projRes, sowRes, quoteRes] = await Promise.all([
          getProjectById(projectId),
          getSOWByProject(projectId),
          getQuotationByProject(projectId),
        ]);

        if (!projRes.success) {
          setError(projRes.error.message);
          setIsLoading(false);
          return;
        }

        setProject(projRes.data);

        if (sowRes.success && sowRes.data) {
          setSow(sowRes.data);
        }

        if (quoteRes) {
          setQuotation(quoteRes);
        }
      } catch (err) {
        setError((err as Error).message || "An unexpected error occurred.");
      } finally {
        setIsLoading(false);
      }
    }

    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const handleManualCompile = () => {
    if (!project) return;

    setGenError(null);
    startTransition(async () => {
      const res = await generateSOW({
        projectId: project.id,
        customTerms: customTerms.trim() || undefined,
      });

      if (res.success && res.data) {
        setSow(res.data);
        setToastMessage({
          message: "Statement of Work Compiled",
          description: "Official SOW generated and dispatched to client for digital signature.",
          variant: "success",
        });
        router.refresh();
      } else {
        setGenError(!res.success ? res.error.message : "Failed to compile Statement of Work.");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
        <LoadingState
          variant="page"
          label="Loading contract console..."
          description="Retrieving study specification and quotation basis"
        />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
        <PageHeader
          title="Contract Console Error"
          breadcrumbs={[
            { label: "WORKSPACE", href: "/dashboard" },
            { label: "Admin Command", href: "/dashboard/admin" },
            { label: "Projects", href: "/dashboard/admin/projects" },
            { label: "SOW Console" },
          ]}
        />
        <Alert variant="danger">{error || "Failed to load project."}</Alert>
        <Link href="/dashboard/admin/projects">
          <Button variant="secondary" size="md">
            ← Return to Projects Desk
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade print:p-0 print:m-0 print:max-w-none print:pb-0 print:animate-none">
      {/* ── Page Header (hidden in print) ── */}
      <div className="print:hidden">
        <StudySection
          title="Agreement"
          description="The signed scope for this study and its snapshot."
        />
      </div>

      {toastMessage && (
        <div className="print:hidden">
          <Toast
            message={toastMessage.message}
            description={toastMessage.description}
            variant={toastMessage.variant}
            onClose={() => setToastMessage(null)}
          />
        </div>
      )}

      {/* ── Case 1: SOW Not Yet Generated (Waiting for Client Quote Acceptance) ── */}
      {!sow ? (
        <div className="flex flex-col gap-6">
          <Card className="p-8 sm:p-10 bg-[#0A0A18]/95 border border-white/15 rounded-[6px] flex flex-col gap-6 shadow-2xl">
            <div className="flex items-start gap-4 border-b border-white/10 pb-6">
              <div className="h-12 w-12 rounded-[4px] bg-[#CC6600]/20 border border-[#CC6600]/40 flex items-center justify-center shrink-0">
                <IconFileCertificate size={24} stroke={1.5} className="text-[#FFA040]" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-lg font-bold text-white font-sans">
                    Statement of Work (SOW) Drafting Desk
                  </h3>
                  {quotation?.status === "CLIENT_APPROVED" && (
                    <span className="text-xs font-sans text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-[2px] uppercase font-bold flex items-center gap-1">
                      <IconCheck size={12} stroke={2.5} />
                      Quote Approved by Client
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/70 font-sans leading-relaxed">
                  {quotation?.status === "CLIENT_APPROVED"
                    ? "The client has formally accepted the commercial quote. Review the scope below, add any custom clauses or university requirements, and compile the official Statement of Work for client signature."
                    : "Review commercial quotation details, add any customized terms or scope boundaries, and compile the official Statement of Work."}
                </p>
              </div>
            </div>

            {genError && <Alert variant="danger">{genError}</Alert>}

            {quotation ? (
              <div className="flex flex-col gap-6">
                {/* Target Commercial Basis */}
                <div className="p-6 rounded-[4px] bg-[#0D0D1B]/60 border border-white/10 flex flex-col gap-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-sans uppercase font-bold text-white/60 tracking-wider">
                      Commercial Quotation Basis
                    </span>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-[2px] bg-white/10 text-white/80 font-semibold uppercase">
                      Status: {quotation.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <div className="space-y-1">
                      <span className="text-xs font-sans text-white/40 block">Agreed Package</span>
                      <strong className="text-sm sm:text-base font-bold text-sky-400 font-sans block">
                        {quotation.packageName}
                      </strong>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-sans text-white/40 block">Total Contract Sum</span>
                      <strong className="text-sm sm:text-base font-bold text-amber-400 font-mono block">
                        <Peso className="text-amber-400 text-sm sm:text-base" />{Number(quotation.totalAmount).toLocaleString()}
                      </strong>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-sans text-white/40 block">Initial Downpayment</span>
                      <strong className="text-sm sm:text-base font-bold text-emerald-400 font-mono block">
                        <Peso className="text-emerald-400 text-sm sm:text-base" />{Number(quotation.downpaymentRequired).toLocaleString()}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Custom Contractual Clauses */}
                <div className="p-6 border border-white/10 rounded-[4px] bg-[#0A0A18]/60 flex flex-col gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white font-sans">
                      Special Terms & Scope Boundaries (Optional)
                    </h4>
                    <p className="text-xs text-white/60 font-sans leading-relaxed">
                      Inject any bespoke clauses, university guidelines, client data commitments, or boundary conditions into the legal snapshot.
                    </p>
                  </div>
                  <FormTextarea
                    label="Custom Terms & Conditions"
                    placeholder="e.g., Client to supply raw survey matrix (.xlsx) with clean demographic labels. Scope includes Chapter 4 descriptive and inferential tests, excluding structural equation modeling."
                    value={customTerms}
                    onChange={(e) => setCustomTerms(e.target.value)}
                    rows={4}
                    className="font-sans text-sm"
                  />
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                      variant="primary"
                      size="md"
                      loading={isPending}
                      onClick={handleManualCompile}
                      className="font-sans font-semibold text-xs bg-[#CC6600] hover:bg-[#E67300] text-white flex items-center gap-2 px-5 py-2.5"
                    >
                      <IconFileCertificate size={16} stroke={2} />
                      <span>Compile & Issue Statement of Work to Client →</span>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={IconFileText}
                title="No Quotation Created"
                description="No commercial quotation has been created for this study yet. Please create and send a proposal first."
              />
            )}
          </Card>
        </div>
      ) : (
        /* ── Case 2: SOW Exists — Full Document & Live Audit Status ── */
        <>
          <SowDocument sow={sow} />

          {/* Admin Status & Action Card */}
          <Card className="p-8 bg-[#0A0A18]/90 border border-white/15 rounded-[6px] flex flex-col sm:flex-row sm:items-center justify-between gap-6 print:hidden shadow-xl">
            <div className="flex items-center gap-4">
              {sow.isLocked ? (
                <div className="h-12 w-12 rounded-[4px] bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <IconShieldCheck size={24} stroke={2} className="text-emerald-400" />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-[4px] bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <IconLock size={24} stroke={1.5} className="text-amber-400" />
                </div>
              )}
              <div className="space-y-1">
                <p className="text-base font-bold text-white font-sans">
                  {sow.isLocked ? "Contract Signed & Scope Locked" : "Dispatched — Awaiting Client Digital Signature"}
                </p>
                <p className="text-sm font-sans text-white/60">
                  {sow.isLocked
                    ? `Executed by ${sow.signedByName} on ${new Date(sow.signedAt || "").toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}.`
                    : "The contract is available in the client portal awaiting their digital signature."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Link href={`/dashboard/admin/projects/${project.id}`}>
                <Button variant="secondary" size="md" className="font-sans font-semibold text-xs">
                  ← Back to Project Desk
                </Button>
              </Link>
              {sow.isLocked && (
                <Link href={`/dashboard/admin/projects/${project.id}/payment`}>
                  <Button variant="primary" size="md" className="font-sans font-semibold text-xs bg-[#CC6600] hover:bg-[#FFA040] text-white">
                    <IconCreditCard size={16} stroke={1.5} className="mr-1.5" />
                    <span>View Payment Status →</span>
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
