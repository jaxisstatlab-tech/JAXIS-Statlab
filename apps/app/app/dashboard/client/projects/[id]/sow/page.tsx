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
  EmptyState,
  FormInput,
  FormCheckbox,
  ConfirmDialog,
} from "@repo/ui";
import {
  ArrowLeft,
  FileText,
  ShieldCheck,
  Lock,
  Check,
  Warning,
  CreditCard,
} from "@phosphor-icons/react";
import { getSOWByProject, signSOW } from "@/features/sow/actions";
import { getProjectById } from "@/features/projects/actions";
import { getClientProfile } from "@/features/client-profile/actions";
import { SowDocument } from "@/features/sow/components/SowDocument";
import type { SOWDetailItem } from "@/features/sow/schemas";
import type { ProjectDetailItem } from "@/features/projects/schemas";

export default function ClientSowPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [project, setProject] = useState<ProjectDetailItem | null>(null);
  const [sow, setSow] = useState<SOWDetailItem | null>(null);
  const [registeredName, setRegisteredName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Digital Signature Form State
  const [typedName, setTypedName] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
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
        const [projRes, sowRes, profRes] = await Promise.all([
          getProjectById(projectId),
          getSOWByProject(projectId),
          getClientProfile(),
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

        if (profRes.success && profRes.data?.profile) {
          setRegisteredName(profRes.data.profile.fullName || "");
        } else if (projRes.data.client?.fullName) {
          setRegisteredName(projRes.data.client.fullName);
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

  const isNameMatch =
    typedName.trim().length > 0 &&
    registeredName.trim().length > 0 &&
    typedName.trim().toLowerCase() === registeredName.trim().toLowerCase();

  const canSign = isNameMatch && agreedToTerms && sow && !sow.isLocked;

  const handleConfirmSign = () => {
    if (!canSign || !sow) return;

    setSignError(null);
    startTransition(async () => {
      const res = await signSOW({
        sowId: sow.id,
        typedFullName: typedName.trim(),
        agreedToTerms: true,
      });

      if (res.success && res.data) {
        setSow(res.data);
        setIsConfirmModalOpen(false);
        setToastMessage({
          message: "Statement of Work Signed",
          description: "Your scope is officially locked. You may now proceed to initial installment payment.",
          variant: "success",
        });
        router.refresh();
      } else {
        setSignError(!res.success ? res.error.message : "Failed to execute digital signature.");
        setIsConfirmModalOpen(false);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
        <LoadingState
          variant="page"
          label="Retrieving Statement of Work contract..."
          description="Please wait a moment while we load your agreement"
        />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
        <PageHeader
          title="Contract Execution Error"
          breadcrumbs={[
            { label: "WORKSPACE", href: "/dashboard" },
            { label: "Projects", href: "/dashboard/client/projects" },
            { label: "SOW Agreement" },
          ]}
        />
        <Alert variant="danger">
          {error || "The requested contract or research study could not be loaded."}
        </Alert>
        <Link href="/dashboard/client/projects">
          <Button variant="secondary" size="md">
            ← Return to Studies Desk
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade print:p-0 print:m-0 print:max-w-none print:pb-0 print:animate-none">
      {/* ── Page Header (hidden in print) ── */}
      <div className="print:hidden">
        <PageHeader
          title="Statement of Work & Scope Agreement"
          description={`Formal contractual specification for ${project.intakeId} · Primary Client: ${registeredName}`}
          breadcrumbs={[
            { label: "WORKSPACE", href: "/dashboard" },
            { label: "Client Portal", href: "/dashboard/client" },
            { label: "Projects", href: "/dashboard/client/projects" },
            { label: project.intakeId, href: `/dashboard/client/projects/${project.id}` },
            { label: "Statement of Work" },
          ]}
          actions={
            <Link href={`/dashboard/client/projects/${project.id}`}>
              <Button variant="secondary" size="sm" className="flex items-center gap-2 font-sans font-semibold text-xs rounded-[2px] active:scale-[0.97] transition-transform">
                <ArrowLeft size={15} weight="fill" />
                <span>Return to Study Details</span>
              </Button>
            </Link>
          }
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

      {/* ── Case 1: SOW Not Yet Generated by Admin ── */}
      {!sow ? (
        <Card className="p-10 sm:p-14 text-center flex flex-col items-center gap-6 bg-[#01142B]/90 border border-white/10 rounded-[2px] shadow-2xl">
          <EmptyState
            icon={FileText}
            title="Statement of Work In Preparation"
            description="Our administrative officers are drafting your official Statement of Work contract based on your accepted quotation. You will be notified as soon as it is ready for your signature."
          />
          <div className="flex items-center gap-4 mt-2">
            <Link href={`/dashboard/client/projects/${project.id}`}>
              <Button variant="secondary" size="md">
                ← Back to Study Details
              </Button>
            </Link>
            <Link href={`/dashboard/client/projects/${project.id}/quote`}>
              <Button variant="outline" size="md">
                View Accepted Quote
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {/* ── Case 2: SOW Exists — Render Document ── */}
          <SowDocument sow={sow} />

          {/* ── Post-Sign Status Banner (if signed) ── */}
          {sow.isLocked ? (
            <Card className="p-8 bg-emerald-950/20 border border-emerald-500/30 rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-6 print:hidden shadow-xl">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-[2px] bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <ShieldCheck size={26} weight="fill" className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white font-sans">
                    Contract Executed & Scope Locked
                  </h3>
                  <p className="text-sm font-sans text-emerald-300/80 mt-1">
                    Digitally signed by <strong className="text-white">{sow.signedByName}</strong> on {new Date(sow.signedAt || "").toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}.
                  </p>
                </div>
              </div>

              <Link href={`/dashboard/client/projects/${project.id}`}>
                <Button variant="primary" size="md" className="font-sans font-bold text-xs tracking-wider bg-[#CC6600] hover:bg-[#FFA040] text-white whitespace-nowrap px-6 py-3 rounded-[2px]">
                  <CreditCard size={18} weight="fill" className="mr-2" />
                  <span>PROCEED TO PAYMENT STAGE →</span>
                </Button>
              </Link>
            </Card>
          ) : (
            /* ── Digital Signature Execution Form (if awaiting signature) ── */
            <Card className="p-8 sm:p-10 bg-[#01142B]/95 border border-amber-500/40 rounded-[2px] flex flex-col gap-6 print:hidden shadow-2xl">
              <div className="flex items-start gap-4 border-b border-white/10 pb-6">
                <div className="h-12 w-12 rounded-[2px] bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <Lock size={24} weight="fill" className="text-amber-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white font-sans">
                    Execute Contract & Lock Scope
                  </h3>
                  <p className="text-sm text-white/70 font-sans leading-relaxed">
                    To execute this legally-binding agreement, type your full legal name exactly as registered in your account profile. Once executed, the scope, timeline, and pricing are permanently locked.
                  </p>
                </div>
              </div>

              {signError && <Alert variant="danger">{signError}</Alert>}

              <div className="flex flex-col gap-6">
                {/* Typed Full Name Input */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-sans">
                    <span className="text-white/90 uppercase font-bold tracking-wider">
                      Full Legal Name Signature
                    </span>
                    <span className="text-white/50">
                      Must match: <strong className="text-amber-400 font-mono text-xs">{registeredName}</strong>
                    </span>
                  </div>

                  <FormInput
                    placeholder={`Type "${registeredName}" to sign`}
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    className="font-sans text-sm h-12"
                  />

                  {typedName.trim().length > 0 && (
                    <div className="flex flex-col gap-2 mt-1">
                      <div className="p-4 rounded-[4px] bg-[#010915] border border-white/10 flex flex-col gap-1">
                        <span className="text-[0.688rem] font-mono uppercase tracking-wider text-white/40">
                          Digital Signature Calligraphy Preview
                        </span>
                        <p className="font-signature text-3xl sm:text-4xl text-emerald-400 select-none leading-none py-1">
                          {typedName}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-sans">
                        {isNameMatch ? (
                          <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
                            <Check size={16} weight="fill" />
                            Signature name matches your verified registered account profile.
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1.5 font-medium">
                            <Warning size={16} weight="fill" />
                            Name does not match yet. Please type exactly: &ldquo;{registeredName}&rdquo;
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Legal Agreement Checkbox */}
                <div className="pt-2 pb-2 bg-white/[0.02] p-4 rounded-[2px] border border-white/[0.06]">
                  <FormCheckbox
                    id="agree-sow"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    label={
                      <span className="text-xs sm:text-sm text-white/80 font-sans leading-relaxed">
                        I confirm that I have thoroughly reviewed the research objectives, turnaround timeline, deliverables schedule, and milestone payment terms. I agree that upon signing, the scope of work is permanently locked and legally binding under JAXIS Terms of Service.
                      </span>
                    }
                  />
                </div>

                {/* Action Trigger */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-4">
                  <Link href={`/dashboard/client/projects/${project.id}`}>
                    <Button variant="secondary" size="md" className="rounded-[2px]">
                      Cancel
                    </Button>
                  </Link>

                  <Button
                    variant="primary"
                    size="md"
                    disabled={!canSign || isPending}
                    loading={isPending}
                    onClick={() => setIsConfirmModalOpen(true)}
                    className="font-sans font-bold text-xs sm:text-sm tracking-wider bg-[#CC6600] hover:bg-[#FFA040] text-white px-6 py-3 flex items-center gap-2 rounded-[2px]"
                  >
                    <ShieldCheck size={18} weight="fill" />
                    <span>Sign Statement of Work</span>
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* ── Signature Confirmation Modal ── */}
          {isConfirmModalOpen && (
            <ConfirmDialog
              open={isConfirmModalOpen}
              onCancel={() => setIsConfirmModalOpen(false)}
              title="Sign Statement of Work"
              description={`You are digitally signing this Statement of Work as "${typedName.trim()}". Once signed, your scope of work will be confirmed and you can proceed to the deposit desk. Do you want to proceed?`}
              confirmLabel="Confirm & Sign Agreement"
              confirmVariant="default"
              loading={isPending}
              onConfirm={handleConfirmSign}
            />
          )}
        </>
      )}
    </div>
  );
}
