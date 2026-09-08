"use client";

import React from "react";
import Link from "next/link";
import { Card, Button, StatusBadge, CopyButton } from "@repo/ui";
import {
  ChatCenteredText,
  DownloadSimple,
  ArrowRight,
  Check,
  Clock,
  Calendar,
  Warning,
  FileText,
  GraduationCap,
} from "@phosphor-icons/react";
import { getProjectDisplayStatus } from "@/lib/project-rules";
import type { ProjectDetailItem } from "@/features/projects/schemas";

const MILESTONE_STAGES = [
  { id: "proposal", label: "Proposal & Quote" },
  { id: "sow", label: "Contract (SOW)" },
  { id: "deposit", label: "Downpayment" },
  { id: "analysis", label: "Analysis & QA" },
  { id: "deliverables", label: "Final Outputs" },
];

function getStageIndex(status: string): number {
  switch (status) {
    case "NEW_REQUEST":
    case "AWAITING_INFORMATION":
    case "UNDER_EVALUATION":
    case "QUOTE_SENT":
      return 0;
    case "CLIENT_APPROVED":
    case "SOW_PENDING":
      return 1;
    case "SOW_SIGNED":
    case "AWAITING_PAYMENT":
      return 2;
    case "ACTIVE":
    case "EXPERT_ASSIGNED":
    case "IN_PROGRESS":
    case "SLA_PAUSED":
    case "SCOPE_CREEP_HALTED":
    case "REASSIGNMENT_NEEDED":
    case "REVISION_REQUESTED":
    case "FOR_QA":
    case "QA_REVISION":
      return 3;
    case "DELIVERED":
    case "CLOSED":
      return 4;
    default:
      return 0;
  }
}

interface ClientStudyCardProps {
  study: ProjectDetailItem;
  onDownloadDeliverable?: (study: ProjectDetailItem) => void;
  className?: string;
}

export const ClientStudyCard: React.FC<ClientStudyCardProps> = ({
  study,
  onDownloadDeliverable,
  className = "",
}) => {
  const displayStatus = getProjectDisplayStatus(study, "CLIENT");
  const currentStageIndex = getStageIndex(study.masterStatus);
  const isDelivered =
    study.masterStatus === "DELIVERED" || study.masterStatus === "CLOSED";
  const isAwaitingInfo = study.masterStatus === "AWAITING_INFORMATION";
  const isQuotePending = study.masterStatus === "QUOTE_SENT";
  const hasAssignedSpecialist =
    study.masterStatus === "EXPERT_ASSIGNED" ||
    study.masterStatus === "IN_PROGRESS" ||
    study.masterStatus === "SLA_PAUSED" ||
    study.masterStatus === "FOR_QA" ||
    study.masterStatus === "QA_REVISION" ||
    study.masterStatus === "DELIVERED" ||
    study.masterStatus === "CLOSED";

  const institutionSchool =
    study.client?.clientProfile?.institutionSchool || null;

  return (
    <Card className={`p-6 sm:p-8 border border-white/10 bg-[#01142B] hover:border-white/20 transition-all rounded-[2px] shadow-xl flex flex-col gap-6 ${className}`}>
      {/* ── Top Header: Title, ID, Status Badge ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex flex-col gap-2 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton
              variant="badge"
              value={study.intakeId}
              label={study.intakeId}
            />
            {institutionSchool && (
              <span className="flex items-center gap-1.5 text-xs text-white/60 font-sans bg-white/[0.04] border border-white/10 px-2 py-0.5 rounded-[2px] truncate max-w-[260px]">
                <GraduationCap size={14} weight="fill" className="text-sky-400 shrink-0" />
                <span className="truncate">{institutionSchool}</span>
              </span>
            )}
          </div>

          <Link
            href={`/dashboard/client/projects/${study.id}`}
            prefetch={false}
            className="group/title"
          >
            <h3 className="text-base sm:text-lg font-bold text-white group-hover/title:text-[#FFA040] transition-colors font-sans leading-snug">
              {study.researchTitle}
            </h3>
          </Link>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50 font-sans">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} weight="fill" className="text-amber-400/80" />
              <span>Target:</span>
              <strong className="text-white/80 font-mono font-semibold">
                {new Date(study.deadlineRequested).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock size={14} weight="fill" className="text-white/40" />
              <span>Submitted:</span>
              <span className="text-white/70 font-mono">
                {new Date(study.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </span>
          </div>
        </div>

        <div className="shrink-0 self-start">
          <StatusBadge
            status={displayStatus.status}
            label={displayStatus.label}
            pulse={displayStatus.pulse}
          />
        </div>
      </div>

      {/* ── Visual Milestone Pipeline (Dashdark X Precision Stepper) ── */}
      <div className="pt-2 pb-1 border-y border-white/[0.06]">
        <div
          className="hidden md:flex items-center justify-between relative py-2"
          role="progressbar"
          aria-label="Research study progress pipeline"
          aria-valuenow={currentStageIndex + 1}
          aria-valuemin={1}
          aria-valuemax={5}
        >
          {MILESTONE_STAGES.map((stage, idx) => {
            const isPassed = currentStageIndex > idx;
            const isCurrent = currentStageIndex === idx;

            return (
              <div
                key={stage.id}
                className="flex-1 flex flex-col items-center relative group"
              >
                {/* Connecting Track Line */}
                {idx > 0 && (
                  <div
                    className={`absolute top-3.5 right-1/2 left-[-50%] h-[2px] transition-colors -z-0 ${
                      isPassed || isCurrent
                        ? "bg-[#10B981]"
                        : "bg-white/10"
                    }`}
                  />
                )}

                {/* Node Circle */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all z-10 ${
                    isPassed
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
                      : isCurrent
                      ? "bg-[#CC6600] text-white ring-2 ring-[#CC6600]/40 border-2 border-white/80"
                      : "bg-[#010D1F] border border-white/15 text-white/30"
                  }`}
                >
                  {isPassed ? (
                    <Check size={13} weight="bold" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Stage Label */}
                <span
                  className={`text-xs mt-2 font-sans font-medium text-center tracking-normal ${
                    isCurrent
                      ? "text-[#FFA040] font-semibold"
                      : isPassed
                      ? "text-emerald-400/90 font-medium"
                      : "text-white/40"
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Mobile Condensed Pipeline Tracker */}
        <div
          className="flex md:hidden flex-col gap-2 py-1"
          role="progressbar"
          aria-label="Research study progress pipeline"
          aria-valuenow={currentStageIndex + 1}
          aria-valuemin={1}
          aria-valuemax={5}
        >
          <div className="flex items-center justify-between text-xs font-sans">
            <span className="text-white/50">Current Stage:</span>
            <span className="font-semibold text-amber-300">
              Stage {currentStageIndex + 1} of 5: {MILESTONE_STAGES[currentStageIndex]?.label}
            </span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#CC6600] h-full transition-all duration-300 rounded-full"
              style={{
                width: `${((currentStageIndex + 1) / 5) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── High-Priority Action Notice (If Waiting for Client Action) ── */}
      {isAwaitingInfo && (
        <div className="p-4 rounded-[2px] bg-amber-500/[0.08] border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Warning size={18} weight="fill" className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-100 font-sans leading-relaxed">
              <span className="font-semibold text-amber-300 block mb-0.5">
                Action Required from You:
              </span>
              &ldquo;{study.missingInfoReason || "Please upload the requested dataset or questionnaire clarification."}&rdquo;
            </div>
          </div>
          <Link href={`/dashboard/client/projects/${study.id}`} className="shrink-0">
            <Button
              variant="primary"
              size="sm"
              className="font-sans text-xs font-semibold px-3.5 py-1.5 whitespace-nowrap active:scale-[0.97] transition-transform min-h-[36px]"
            >
              Upload Files →
            </Button>
          </Link>
        </div>
      )}

      {isQuotePending && (
        <div className="p-4 rounded-[2px] bg-[#CC6600]/10 border border-[#CC6600]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <FileText size={18} weight="fill" className="text-[#FFA040] shrink-0 mt-0.5" />
            <div className="text-xs text-white/90 font-sans leading-relaxed">
              <span className="font-semibold text-white block mb-0.5">
                Quotation Ready for Your Review
              </span>
              Your customized statistical scope and deliverables breakdown are ready. Accept your quote to lock your assigned statistician.
            </div>
          </div>
          <Link href={`/dashboard/client/projects/${study.id}/quote`} className="shrink-0">
            <Button
              variant="primary"
              size="sm"
              className="font-sans text-xs font-semibold px-3.5 py-1.5 whitespace-nowrap bg-[#CC6600] hover:bg-[#B35500] text-white active:scale-[0.97] transition-all rounded-[2px]"
            >
              Review &amp; Accept Quote →
            </Button>
          </Link>
        </div>
      )}

      {/* ── Bottom Action Toolbar: Messenger, Deliverables, Details ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          {/* Messenger Direct Chat Button */}
          <Link href={`/dashboard/client/messages?projectId=${study.id}`} prefetch={false}>
            <Button
              variant="outline"
              size="sm"
              className="font-sans text-xs font-semibold px-3.5 py-2 flex items-center gap-2 border-white/15 hover:bg-white/[0.06] text-white/90 active:scale-[0.97] transition-all rounded-[2px]"
            >
              <ChatCenteredText size={16} weight="fill" className="text-sky-400" />
              <span>{hasAssignedSpecialist ? "Message Statistician" : "Message Desk"}</span>
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Download Deliverable Package Button */}
          {isDelivered && onDownloadDeliverable && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onDownloadDeliverable(study)}
              className="font-sans text-xs font-semibold px-4 py-2 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white active:scale-[0.97] transition-all rounded-[2px]"
            >
              <DownloadSimple size={16} weight="bold" />
              <span>Download Deliverables</span>
            </Button>
          )}

          {/* View Details Link */}
          <Link href={`/dashboard/client/projects/${study.id}`} prefetch={false}>
            <Button
              variant="secondary"
              size="sm"
              className="font-sans text-xs font-semibold px-4 py-2 flex items-center gap-1.5 active:scale-[0.97] transition-all rounded-[2px]"
            >
              <span>View Details</span>
              <ArrowRight size={14} weight="bold" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
};
