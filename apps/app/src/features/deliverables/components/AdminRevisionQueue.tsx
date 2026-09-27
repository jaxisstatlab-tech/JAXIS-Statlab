"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { RevisionRequestDTO } from "../schemas";
import { classifyRevision } from "../actions";
import {
  Button,
  Card,
  KpiCard,
  PageHeader,
  StatusBadge,
  Badge,
  Modal,
  Toast,
  Pagination,
} from "@repo/ui";
import {
  IconRotateClockwise,
  IconShieldCheck,
  IconArrowRight,
  IconLoader2,
} from "@tabler/icons-react";
import { RevisionClassification } from "@prisma/client";
import { REVISION_CLASSIFICATION_METADATA } from "@/lib/delivery-rules";

interface AdminRevisionQueueProps {
  revisions: RevisionRequestDTO[];
}

export function AdminRevisionQueue({ revisions }: AdminRevisionQueueProps) {
  const router = useRouter();

  const [filterTab, setFilterTab] = useState<"ALL" | "PENDING" | "CLASSIFIED">("ALL");
  const [selectedRevision, setSelectedRevision] = useState<RevisionRequestDTO | null>(null);
  const [classification, setClassification] = useState<RevisionClassification>("INCLUDED");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    description: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const filteredRevisions = revisions.filter((r) => {
    if (filterTab === "PENDING") return r.status === "PENDING_REVIEW";
    if (filterTab === "CLASSIFIED") return r.status !== "PENDING_REVIEW";
    return true;
  });

  // Reset page when filter tab changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterTab]);

  const pendingCount = revisions.filter((r) => r.status === "PENDING_REVIEW").length;
  const includedCount = revisions.filter((r) => r.classification === "INCLUDED").length;
  const scopeChangeCount = revisions.filter(
    (r) => r.classification === "METHODOLOGY_CHANGE" || r.classification === "NEW_PAID_WORK"
  ).length;

  const handleOpenTriage = (rev: RevisionRequestDTO) => {
    setSelectedRevision(rev);
    setClassification(rev.classification || "INCLUDED");
    setNotes(rev.classificationNotes || "");
  };

  const handleClassify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRevision) return;

    if (!notes.trim() || notes.length < 5) {
      setToast({
        message: "Notes Required",
        description: "Please provide brief notes explaining the classification decision.",
        variant: "warning",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await classifyRevision({
        revisionRequestId: selectedRevision.id,
        classification,
        notes: notes.trim(),
      });

      setToast({
        message: "Revision Classified",
        description: `Request classified as ${REVISION_CLASSIFICATION_METADATA[classification].label}.`,
        variant: "success",
      });

      setSelectedRevision(null);
      router.refresh();
    } catch (err: unknown) {
      setToast({
        message: "Classification Failed",
        description: err instanceof Error ? err.message : "Failed to classify revision.",
        variant: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "REVISIONS QUEUE" },
        ]}
        title="Client Revision Triage Desk"
        description="Audit, classify, and route post-delivery revision requests submitted by research clients."
      />

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="PENDING TRIAGE"
          value={String(pendingCount)}
          unit={pendingCount === 1 ? "REQUEST" : "REQUESTS"}
          description="Awaiting administrative review"
          variant={pendingCount > 0 ? "amber" : "default"}
        />

        <KpiCard
          label="INCLUDED REVISIONS"
          value={String(includedCount)}
          unit="ACTIVE"
          description="Routed to Lead Statisticians"
          variant="sky"
        />

        <KpiCard
          label="SCOPE EXPANSIONS"
          value={String(scopeChangeCount)}
          unit="FLAGGED"
          description="Methodology changes & paid expansions"
          variant={scopeChangeCount > 0 ? "emerald" : "default"}
        />
      </div>

      {/* Tabs & Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Button
              variant={filterTab === "ALL" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setFilterTab("ALL")}
            >
              All Requests ({revisions.length})
            </Button>
            <Button
              variant={filterTab === "PENDING" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setFilterTab("PENDING")}
            >
              Pending Triage ({pendingCount})
            </Button>
            <Button
              variant={filterTab === "CLASSIFIED" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setFilterTab("CLASSIFIED")}
            >
              Classified ({revisions.length - pendingCount})
            </Button>
          </div>

          <span className="text-xs font-mono text-white/50">
            Showing {filteredRevisions.length} records
          </span>
        </div>

        <Card className="overflow-hidden border border-white/10 bg-[#0A0A18]">
          {filteredRevisions.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="p-3.5 rounded-[2px] bg-white/[0.04] text-white/40 mb-3 border border-white/10">
                <IconRotateClockwise size={32} />
              </div>
              <h4 className="font-sans font-semibold text-sm text-white/80">No Revision Requests Found</h4>
              <p className="font-sans text-xs text-white/50 max-w-sm mt-1">
                There are currently no revision requests matching the selected filter.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 font-mono">
                    <th className="py-3 px-4 font-semibold">STUDY / INTAKE ID</th>
                    <th className="py-3 px-4 font-semibold">CLIENT</th>
                    <th className="py-3 px-4 font-semibold">SUBMITTED</th>
                    <th className="py-3 px-4 font-semibold">STATUS</th>
                    <th className="py-3 px-4 font-semibold">CLASSIFICATION</th>
                    <th className="py-3 px-4 font-semibold text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {filteredRevisions.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((rev) => (
                    <tr key={rev.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-mono font-semibold text-sky-400 block">
                            {rev.intakeId}
                          </span>
                          <span className="font-sans text-white/80 block mt-0.5 line-clamp-1 max-w-xs" title={rev.projectTitle}>
                            {rev.projectTitle}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-sans font-medium text-white/90 block">
                            {rev.clientName}
                          </span>
                          <span className="font-mono text-[11px] text-white/40 block mt-0.5">
                            {rev.clientEmail}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-white/70">
                        {new Date(rev.createdAt).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={rev.status} />
                      </td>
                      <td className="py-3.5 px-4">
                        {rev.classification ? (
                          <Badge
                            variant={rev.classification === "INCLUDED" ? "sky" : "amber"}
                            size="sm"
                          >
                            {rev.classificationLabel}
                          </Badge>
                        ) : (
                          <span className="font-mono text-white/40 text-[11px]">Unclassified</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenTriage(rev)}
                        >
                          <span>{rev.status === "PENDING_REVIEW" ? "Triage & Classify" : "Review"}</span>
                          <IconArrowRight size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredRevisions.length > 0 && (
              <div className="border-t border-white/10 p-3 sm:px-6">
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredRevisions.length}
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

      {/* Triage & Classify Modal */}
      {selectedRevision && (
        <Modal
          isOpen={Boolean(selectedRevision)}
          onClose={() => !isSubmitting && setSelectedRevision(null)}
          title={`Revision Triage: ${selectedRevision.intakeId}`}
          description={`Classify scope boundary for ${selectedRevision.projectTitle}`}
          size="lg"
        >
          <form onSubmit={handleClassify} className="space-y-5">
            {/* Client Request Details */}
            <div className="p-4 rounded-[2px] bg-[#010114] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-white/40 uppercase">Client Request Submission</span>
                <span className="font-mono text-white/50">
                  {selectedRevision.clientName} ({selectedRevision.clientEmail})
                </span>
              </div>

              {selectedRevision.requestedSections && (
                <div className="text-xs font-sans text-white/70">
                  <span className="font-semibold text-white/90">Requested Sections: </span>
                  {selectedRevision.requestedSections}
                </div>
              )}

              <p className="text-xs font-sans text-white/80 leading-relaxed bg-white/[0.02] p-3 rounded-[2px] border border-white/5">
                {selectedRevision.description}
              </p>
            </div>

            {/* Classification Radios */}
            <div>
              <label className="block text-xs font-mono text-white/70 mb-2 uppercase font-semibold">
                Scope Classification *
              </label>

              <div className="space-y-2.5">
                {(Object.entries(REVISION_CLASSIFICATION_METADATA) as [RevisionClassification, typeof REVISION_CLASSIFICATION_METADATA[RevisionClassification]][]).map(
                  ([key, meta]) => (
                    <label
                      key={key}
                      className={`flex items-start gap-3 p-3.5 rounded-[2px] border cursor-pointer transition-colors ${
                        classification === key
                          ? "bg-white/[0.04] border-[#CC6600]"
                          : "bg-[#0A0A18] border-white/10 hover:border-white/20"
                      }`}
                    >
                      <input
                        type="radio"
                        name="classification"
                        value={key}
                        checked={classification === key}
                        onChange={(e) => setClassification(e.target.value as RevisionClassification)}
                        className="mt-1 text-[#CC6600] focus:ring-0 bg-[#010114]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-sans font-bold text-xs text-white">
                            {meta.label}
                          </span>
                          <Badge variant={meta.isFree ? "sky" : "amber"} size="sm">
                            {meta.actionLabel}
                          </Badge>
                        </div>
                        <p className="font-sans text-[11px] text-white/50 mt-1 leading-relaxed">
                          {meta.description}
                        </p>
                      </div>
                    </label>
                  )
                )}
              </div>
            </div>

            {/* Admin Notes */}
            <div>
              <label className="block text-xs font-mono text-white/70 mb-1.5 uppercase font-semibold">
                Triage Notes & Next Steps *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Explain the classification decision and give clear instructions to the Lead Statistician or Client..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#010114] border border-white/10 rounded-[2px] p-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 leading-relaxed font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                type="button"
                variant="ghost"
                size="md"
                disabled={isSubmitting}
                onClick={() => setSelectedRevision(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSubmitting || !notes.trim()}
              >
                {isSubmitting ? <IconLoader2 size={16} className="animate-spin" /> : <IconShieldCheck size={16} />}
                <span>{isSubmitting ? "Saving..." : "Save Classification"}</span>
              </Button>
            </div>
          </form>
        </Modal>
      )}

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
