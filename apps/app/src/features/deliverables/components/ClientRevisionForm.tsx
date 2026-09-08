"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ClientDeliverablesDTO } from "../schemas";
import { submitClientRevision } from "../actions";
import {
  Button,
  Card,
  PageHeader,
  Badge,
  Toast,
} from "@repo/ui";
import {
  Clock,
  Warning,
  ShieldCheck,
  ArrowLeft,
  PaperPlaneRight,
  CircleNotch,
} from "@phosphor-icons/react";

interface ClientRevisionFormProps {
  data: ClientDeliverablesDTO;
}

export function ClientRevisionForm({ data }: ClientRevisionFormProps) {
  const router = useRouter();
  const { project, isReleased, revisionWindow, hasPendingRevision } = data;

  const [requestedSections, setRequestedSections] = useState("");
  const [description, setDescription] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    description: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim() || description.length < 10) {
      setToast({
        message: "Description Too Short",
        description: "Please provide at least 10 characters describing the changes requested.",
        variant: "warning",
      });
      return;
    }

    if (!agreed) {
      setToast({
        message: "Agreement Required",
        description: "Please confirm that this request is within the original Scope of Work.",
        variant: "warning",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await submitClientRevision({
        projectId: project.id,
        description: description.trim(),
        requestedSections: requestedSections.trim() || undefined,
      });

      setToast({
        message: "Revision Submitted",
        description: "Your revision request has been submitted to the administration for triage.",
        variant: "success",
      });

      setTimeout(() => {
        router.push(`/dashboard/client/projects/${project.id}/deliverables`);
      }, 1200);
    } catch (err: unknown) {
      setToast({
        message: "Submission Failed",
        description: err instanceof Error ? err.message : "Unable to submit revision request.",
        variant: "danger",
      });
      setIsSubmitting(false);
    }
  };

  if (!isReleased || !revisionWindow.isActive) {
    return (
      <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-24 w-full animate-content-fade">
        <PageHeader
          breadcrumbs={[
            { label: "WORKSPACE", href: "/dashboard" },
            { label: "MY STUDIES", href: "/dashboard/client/projects" },
            { label: project.intakeId, href: `/dashboard/client/projects/${project.id}` },
            { label: "DELIVERABLES", href: `/dashboard/client/projects/${project.id}/deliverables` },
            { label: "REVISION REQUEST" },
          ]}
          title="Revision Window Closed"
          description="The 3-day post-delivery revision window for this research study has concluded."
        />

        <Card className="p-8 text-center bg-[#01142B] border border-amber-500/20">
          <div className="mx-auto w-14 h-14 rounded-[2px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
            <Clock size={32} weight="fill" />
          </div>
          <h3 className="font-sans font-bold text-base text-white">
            Revision Request Submission Unavailable
          </h3>
          <p className="font-sans text-xs text-white/60 max-w-md mx-auto mt-2 leading-relaxed">
            Free included revisions must be filed within 3 Philippine business days following deliverable release. If you require additional statistical tests or structural modifications, please reach out to our team via consultation messages.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={() => router.push(`/dashboard/client/projects/${project.id}/deliverables`)}
            >
              ← Back to Deliverables
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => router.push(`/dashboard/client/projects/${project.id}/messages`)}
            >
              Open Consultation Chat →
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (hasPendingRevision) {
    return (
      <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-24 w-full animate-content-fade">
        <PageHeader
          breadcrumbs={[
            { label: "WORKSPACE", href: "/dashboard" },
            { label: "MY STUDIES", href: "/dashboard/client/projects" },
            { label: project.intakeId, href: `/dashboard/client/projects/${project.id}` },
            { label: "DELIVERABLES", href: `/dashboard/client/projects/${project.id}/deliverables` },
            { label: "REVISION REQUEST" },
          ]}
          title="Revision Request Pending"
          description="You already have an active revision request undergoing review."
        />

        <Card className="p-8 text-center bg-[#01142B] border border-sky-500/20">
          <div className="mx-auto w-14 h-14 rounded-[2px] bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
            <ShieldCheck size={32} weight="fill" />
          </div>
          <h3 className="font-sans font-bold text-base text-white">
            Revision Under Administrative Review
          </h3>
          <p className="font-sans text-xs text-white/60 max-w-md mx-auto mt-2 leading-relaxed">
            Our administration is currently reviewing your revision items. Once classified, minor corrections will be routed directly to your Lead Statistician.
          </p>
          <div className="mt-6">
            <Button
              variant="secondary"
              size="md"
              onClick={() => router.push(`/dashboard/client/projects/${project.id}/deliverables`)}
            >
              ← View Deliverables Status
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-24 w-full animate-content-fade">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "MY STUDIES", href: "/dashboard/client/projects" },
          { label: project.intakeId, href: `/dashboard/client/projects/${project.id}` },
          { label: "DELIVERABLES", href: `/dashboard/client/projects/${project.id}/deliverables` },
          { label: "REVISION REQUEST" },
        ]}
        title="Submit Study Revision Request"
        description={`Request specific adjustments or table refinements for ${project.researchTitle}.`}
        actions={
          <Button
            variant="ghost"
            size="md"
            onClick={() => router.push(`/dashboard/client/projects/${project.id}/deliverables`)}
          >
            <ArrowLeft size={16} weight="bold" />
            <span>Back to Deliverables</span>
          </Button>
        }
      />

      {/* Countdown Card */}
      <Card className="p-5 bg-[#011B38] border border-sky-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[2px] bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Clock size={20} weight="fill" />
            </div>
            <div>
              <span className="font-mono text-xs text-sky-400 block font-semibold">
                ACTIVE REVISION WINDOW
              </span>
              <span className="font-sans text-xs text-white/70 block mt-0.5">
                Closes on {revisionWindow.expiresAtFormatted} ({revisionWindow.remainingFormatted})
              </span>
            </div>
          </div>
          <Badge variant="sky" size="md">
            1 Round Included
          </Badge>
        </div>
      </Card>

      {/* Guidelines Card */}
      <Card className="p-6 bg-[#01142B] border border-white/10">
        <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-white/80 mb-3">
          Revision Policy & Guidelines
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
          <div className="p-3.5 rounded-[2px] bg-emerald-500/[0.04] border border-emerald-500/20 text-white/80 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
              <ShieldCheck size={16} weight="fill" />
              <span>Included (Free of Charge)</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-white/60 pl-1 text-[11px]">
              <li>Formatting, table numbering, and APA styling adjustments</li>
              <li>Re-running models with existing data variables</li>
              <li>Clarifications on statistical interpretation text</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-[2px] bg-amber-500/[0.04] border border-amber-500/20 text-white/80 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-amber-300">
              <Warning size={16} weight="fill" />
              <span>Requires Supplemental SOW / Quote</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-white/60 pl-1 text-[11px]">
              <li>Adding brand new research hypotheses or questions</li>
              <li>Swapping datasets or adding new respondents</li>
              <li>Switching to completely different analysis methodologies</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Form */}
      <Card className="p-6 sm:p-8 bg-[#01142B] border border-white/10">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-mono text-white/70 mb-1.5 uppercase font-semibold">
              Affected Sections or Tables (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Chapter 4 - Section 4.2, Table 3 (Regression Output), Appendix B"
              value={requestedSections}
              onChange={(e) => setRequestedSections(e.target.value)}
              className="w-full bg-[#010114] border border-white/10 rounded-[2px] px-3.5 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
            />
            <p className="text-[11px] font-sans text-white/40 mt-1">
              List the specific chapters, tables, or figures you would like our research team to review.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono text-white/70 uppercase font-semibold">
                Detailed Revision Instructions *
              </label>
              <span className="text-[11px] font-mono text-white/40">
                {description.length} / 3000 characters
              </span>
            </div>
            <textarea
              required
              rows={6}
              maxLength={3000}
              placeholder="Please provide specific, clear instructions on what needs to be adjusted, clarified, or corrected..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#010114] border border-white/10 rounded-[2px] p-3.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 leading-relaxed font-sans"
            />
          </div>

          <div className="p-4 rounded-[2px] bg-white/[0.02] border border-white/10">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 rounded-[2px] bg-[#010114] border-white/20 text-[#CC6600] focus:ring-0"
              />
              <span className="text-xs font-sans text-white/70 leading-relaxed select-none">
                I confirm that the revision details provided above are within the original research objectives and agreed Scope of Work.
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              size="md"
              disabled={isSubmitting}
              onClick={() => router.push(`/dashboard/client/projects/${project.id}/deliverables`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting || !description.trim() || !agreed}
            >
              {isSubmitting ? <CircleNotch size={16} className="animate-spin" /> : <PaperPlaneRight size={16} weight="fill" />}
              <span>{isSubmitting ? "Submitting..." : "Submit Revision Request"}</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Toast */}
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
