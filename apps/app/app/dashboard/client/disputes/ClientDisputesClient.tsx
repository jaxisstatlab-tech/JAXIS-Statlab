"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  PageHeader,
  Card,
  Badge,
  Button,
  LoadingState,
  Peso,
  Pagination,
  Toast,
} from "@repo/ui";
import {
  getClientEligibleDisputesAction,
  submitDisputeAction,
} from "@/features/disputes/actions";
import type {
  DisputeDTO,
  ClientDisputeEligibilityDTO,
  DisputeGrounds,
} from "@/features/disputes/schemas";
import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconFileText,
  IconGavel,
  IconInfoCircle,
  IconPlus,
  IconScale,
  IconShieldExclamation,
  IconShieldCheck,
  IconX,
  IconUpload,
} from "@tabler/icons-react";

interface ClientDisputesClientProps {
  initialData?: {
    eligibleProjects: ClientDisputeEligibilityDTO[];
    clientDisputes: DisputeDTO[];
  } | null;
}

export function ClientDisputesClient({
  initialData,
}: ClientDisputesClientProps) {
  const [eligibleProjects, setEligibleProjects] = useState<ClientDisputeEligibilityDTO[]>(
    initialData?.eligibleProjects || []
  );
  const [disputes, setDisputes] = useState<DisputeDTO[]>(
    initialData?.clientDisputes || []
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedDispute, setSelectedDispute] = useState<DisputeDTO | null>(null);

  // Filing Modal State
  const [isFilingModalOpen, setIsFilingModalOpen] = useState<boolean>(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedGrounds, setSelectedGrounds] = useState<DisputeGrounds>("METHODOLOGY_DEVIATION");
  const [description, setDescription] = useState<string>("");
  const [evidenceLink, setEvidenceLink] = useState<string>("");
  const [evidenceList, setEvidenceList] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Toast State
  const [toast, setToast] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getClientEligibleDisputesAction();
      if (res.success && res.data) {
        setEligibleProjects(res.data.eligibleProjects);
        setDisputes(res.data.clientDisputes);
      } else {
        setToast({
          message: "Data Load Failed",
          description: res.error?.message || "Failed to load dispute records.",
          variant: "danger",
        });
      }
    } catch {
      setToast({
        message: "Network Error",
        description: "An unexpected error occurred while fetching dispute records.",
        variant: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialData) {
      loadData();
    }
  }, [initialData, loadData]);

  const openEligibleProjects = eligibleProjects.filter(
    (p) => p.isEligible && !p.existingDispute
  );

  const paginatedDisputes = disputes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleOpenFilingModal = (projectId?: string) => {
    if (projectId) {
      setSelectedProjectId(projectId);
    } else if (openEligibleProjects.length > 0) {
      setSelectedProjectId(openEligibleProjects[0]?.projectId || "");
    }
    setSelectedGrounds("METHODOLOGY_DEVIATION");
    setDescription("");
    setEvidenceLink("");
    setEvidenceList([]);
    setFormError(null);
    setIsFilingModalOpen(true);
  };

  const handleAddEvidence = () => {
    if (!evidenceLink.trim()) return;
    if (!evidenceLink.startsWith("http://") && !evidenceLink.startsWith("https://")) {
      setFormError("Please enter a valid URL (starting with https://).");
      return;
    }
    setEvidenceList([...evidenceList, evidenceLink.trim()]);
    setEvidenceLink("");
    setFormError(null);
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidenceList(evidenceList.filter((_, i) => i !== index));
  };

  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setFormError("Please choose a study.");
      return;
    }
    if (description.trim().length < 20) {
      setFormError("Please explain the issue in at least 20 characters.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await submitDisputeAction({
        projectId: selectedProjectId,
        grounds: selectedGrounds,
        description: description.trim(),
        evidenceFilePaths: evidenceList,
      });

      if (res.success) {
        setToast({
          variant: "success",
          message: "Claim Filed",
          description: "Our review team and CEO have received your claim.",
        });
        setIsFilingModalOpen(false);
        loadData();
      } else {
        setFormError(res.error?.message || "Failed to submit claim.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getGroundsLabel = (grounds: DisputeGrounds) => {
    switch (grounds) {
      case "METHODOLOGY_DEVIATION":
        return "Methodology Deviation (Wrong Test or Model)";
      case "MATHEMATICAL_ERROR":
        return "Mathematical or Calculation Error";
      case "SLA_BREACH":
        return "Missed Delivery Deadline";
      default:
        return grounds;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return (
          <Badge variant="sky" className="text-[0.688rem] font-mono flex items-center gap-1">
            <IconClock size={13} stroke={2} />
            <span>New Claim</span>
          </Badge>
        );
      case "UNDER_REVIEW":
        return (
          <Badge variant="amber" className="text-[0.688rem] font-mono flex items-center gap-1">
            <IconScale size={13} stroke={2} />
            <span>Under Review</span>
          </Badge>
        );
      case "RESOLVED_REFUND":
        return (
          <Badge variant="emerald" className="text-[0.688rem] font-mono flex items-center gap-1">
            <IconCheck size={13} stroke={2} />
            <span>Refund Approved</span>
          </Badge>
        );
      case "RESOLVED_NO_REFUND":
        return (
          <Badge variant="muted" className="text-[0.688rem] font-mono flex items-center gap-1">
            <IconCheck size={13} stroke={2} />
            <span>Study Upheld</span>
          </Badge>
        );
      case "CHARGEBACK":
        return (
          <Badge variant="danger" className="text-[0.688rem] font-mono flex items-center gap-1">
            <IconAlertTriangle size={13} stroke={2} />
            <span>Study Halted</span>
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading && eligibleProjects.length === 0 && disputes.length === 0) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto font-sans">
        <LoadingState
          variant="page"
          label="Loading Study Claims..."
          description="Checking delivery windows, active claims, and review status."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans">
      {/* Standardized PageHeader */}
      <PageHeader
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "MY STUDIES", href: "/dashboard/client/projects" },
          { label: "REVISIONS & HELP" },
        ]}
        title="Study Claims & Disputes"
        description="If your delivered study has math errors or did not follow your SOW, you can file a formal claim within 7 days of delivery."
        actions={
          <Button
            variant="primary"
            className="text-xs flex items-center gap-1.5 rounded-[2px] active:scale-[0.97] transition-transform"
            onClick={() => handleOpenFilingModal()}
            disabled={openEligibleProjects.length === 0}
          >
            <IconPlus size={15} stroke={2} />
            <span>File New Claim</span>
          </Button>
        }
      />

      {/* 7-Day Claim Window Tracker Cards */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/90">
            Delivered Studies (7-Day Claim Window)
          </h2>
          <span className="text-xs text-white/40">
            Claims must be filed within 7 calendar days after delivery.
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <LoadingState variant="card" label="Checking delivery dates..." />
          </div>
        ) : eligibleProjects.length === 0 ? (
          <Card className="p-8 text-center text-xs text-white/40 flex flex-col items-center gap-2 bg-[#01142B] border border-white/10 rounded-[2px]">
            <IconShieldCheck size={28} stroke={1.5} className="text-white/20" />
            <span>No delivered studies found. Claims can only be filed once your study deliverables are released.</span>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eligibleProjects.map((p, idx) => {
              const hasDispute = Boolean(p.existingDispute);
              return (
                <Card
                  key={p.projectId}
                  className={`p-5 flex flex-col justify-between gap-4 bg-[#01142B] border border-white/10 rounded-[2px] animate-card-reveal stagger-${Math.min(idx + 1, 8)}`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-white/80 font-semibold">{p.intakeId}</span>
                      {hasDispute ? (
                        getStatusBadge(p.existingDispute!.status)
                      ) : p.isEligible ? (
                        <Badge variant="emerald" className="text-[0.688rem] font-mono">
                          {p.remainingDays} {p.remainingDays === 1 ? "day" : "days"} left
                        </Badge>
                      ) : (
                        <Badge variant="muted" className="text-[0.688rem] font-mono">
                          Window Expired
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white line-clamp-2">{p.researchTitle}</h3>

                    <div className="text-xs text-white/50 flex flex-col gap-1 mt-1 font-mono text-[0.688rem]">
                      <div>Delivered: {p.deliveredAt ? new Date(p.deliveredAt).toLocaleDateString() : "N/A"}</div>
                      <div>Claim Deadline: {p.windowExpiresAt ? new Date(p.windowExpiresAt).toLocaleDateString() : "N/A"}</div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                    {hasDispute ? (
                      <Button
                        variant="secondary"
                        className="text-xs w-full rounded-[2px] active:scale-[0.97] transition-transform"
                        onClick={() => setSelectedDispute(p.existingDispute || null)}
                      >
                        View Claim Details
                      </Button>
                    ) : p.isEligible ? (
                      <Button
                        variant="primary"
                        className="text-xs w-full rounded-[2px] active:scale-[0.97] transition-transform"
                        onClick={() => handleOpenFilingModal(p.projectId)}
                      >
                        File Claim
                      </Button>
                    ) : (
                      <span className="text-xs text-white/30 italic">
                        7-day window closed
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Filed Claims Table */}
      <Card className="p-6 sm:p-8 flex flex-col gap-6 bg-[#01142B] border border-white/10 rounded-[2px] animate-card-reveal stagger-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="text-base font-bold text-white">Your Filed Claims</h2>
            <p className="text-xs text-white/50">History of all technical claims, review notes, and CEO decisions.</p>
          </div>
          <span className="text-xs font-mono text-white/40">{disputes.length} Total</span>
        </div>

        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <LoadingState variant="table" label="Loading claims history..." />
          </div>
        ) : disputes.length === 0 ? (
          <div className="py-12 text-center text-xs text-white/40 flex flex-col items-center gap-2">
            <IconCheck size={28} stroke={1.5} className="text-white/20" />
            <span>You have no active or historical study claims.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-black/20 text-white/50 font-mono text-[0.688rem] uppercase tracking-wider">
                  <th className="py-3 px-4">Study</th>
                  <th className="py-3 px-4">Reason / Grounds</th>
                  <th className="py-3 px-4">Study Fee</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date Filed</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {paginatedDisputes.map((d) => (
                  <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-white font-semibold block">{d.projectIntakeId}</span>
                      <span className="text-[0.688rem] text-white/50 line-clamp-1 max-w-[220px] mt-0.5">
                        {d.projectTitle}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-sky-400">
                      {getGroundsLabel(d.grounds)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-white/90">
                      <Peso />{d.grossAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(d.status)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-white/60">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="secondary"
                        className="text-xs h-7 px-2.5"
                        onClick={() => setSelectedDispute(d)}
                      >
                        View Decision
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && disputes.length > 0 && (
          <div className="border-t border-white/10 pt-4">
            <Pagination
              currentPage={currentPage}
              totalItems={disputes.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[5, 10, 20, 50]}
              itemLabel="claims"
            />
          </div>
        )}
      </Card>

      {/* Dispute Filing Modal */}
      {isFilingModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#010114]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#01142B] border border-white/15 rounded-[2px] max-w-2xl w-full p-6 sm:p-8 flex flex-col gap-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <IconShieldExclamation size={22} className="text-amber-400" />
                <h3 className="text-lg font-bold text-white">File a Study Claim</h3>
              </div>
              <button
                onClick={() => setIsFilingModalOpen(false)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <IconX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitDispute} className="flex flex-col gap-5 text-xs">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-[2px] text-red-400">
                  {formError}
                </div>
              )}

              {/* Study Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/70 font-semibold">Select Delivered Study *</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="bg-black/30 border border-white/10 rounded-[2px] p-2.5 text-white outline-none focus:border-white/30"
                  required
                >
                  {openEligibleProjects.map((p) => (
                    <option key={p.projectId} value={p.projectId} className="bg-[#01142B] text-white">
                      {p.intakeId} — {p.researchTitle} ({p.remainingDays} days left)
                    </option>
                  ))}
                </select>
              </div>

              {/* Grounds Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/70 font-semibold">What is the reason for this claim? *</label>
                <select
                  value={selectedGrounds}
                  onChange={(e) => setSelectedGrounds(e.target.value as DisputeGrounds)}
                  className="bg-black/30 border border-white/10 rounded-[2px] p-2.5 text-white outline-none focus:border-white/30"
                  required
                >
                  <option value="METHODOLOGY_DEVIATION" className="bg-[#01142B] text-white">
                    Methodology Deviation (Wrong Statistical Test, Missed SOW Variable)
                  </option>
                  <option value="MATHEMATICAL_ERROR" className="bg-[#01142B] text-white">
                    Calculation or Table Error (p-values, odds ratios, incorrect counts)
                  </option>
                  <option value="SLA_BREACH" className="bg-[#01142B] text-white">
                    Missed Delivery Deadline (Rush/Express add-on refund)
                  </option>
                </select>
                <span className="text-[0.688rem] text-white/40">
                  Claims must be based on objective technical deviations from your signed Scope of Work.
                </span>
              </div>

              {/* Technical Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/70 font-semibold">Explain what went wrong in detail *</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the exact tables, figures, or sections in your deliverable where the statistical test or numbers differ from your signed Scope of Work..."
                  className="bg-black/30 border border-white/10 rounded-[2px] p-3 text-white outline-none focus:border-white/30 resize-none"
                  required
                />
              </div>

              {/* Evidence Uploads / Links */}
              <div className="flex flex-col gap-2">
                <label className="text-white/70 font-semibold">Evidence Links (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={evidenceLink}
                    onChange={(e) => setEvidenceLink(e.target.value)}
                    placeholder="https://drive.google.com/... or cloud document link"
                    className="bg-black/30 border border-white/10 rounded-[2px] p-2 text-white flex-1 outline-none focus:border-white/30"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddEvidence}
                    className="text-xs flex items-center gap-1"
                  >
                    <IconUpload size={14} />
                    <span>Add Link</span>
                  </Button>
                </div>

                {evidenceList.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-2 bg-black/20 p-2.5 rounded-[2px] border border-white/5">
                    <span className="text-[0.688rem] text-white/50">Attached links:</span>
                    {evidenceList.map((link, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-sky-400 bg-white/5 px-2 py-1 rounded-[2px]">
                        <span className="truncate max-w-[400px]">{link}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEvidence(idx)}
                          className="text-red-400 hover:text-red-300 ml-2"
                        >
                          <IconX size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsFilingModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting Claim..." : "Submit Claim for Review"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details & Ruling Dossier Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 bg-[#010114]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#01142B] border border-white/15 rounded-[2px] max-w-2xl w-full p-6 sm:p-8 flex flex-col gap-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <IconFileText size={22} className="text-sky-400" />
                <h3 className="text-base font-bold text-white">Claim Details: {selectedDispute.projectIntakeId}</h3>
              </div>
              <button
                onClick={() => setSelectedDispute(null)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <IconX size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-black/30 p-4 rounded-[2px] border border-white/10">
                <div>
                  <span className="text-white/40 block">Study Title</span>
                  <span className="text-white font-semibold">{selectedDispute.projectTitle}</span>
                </div>
                <div>
                  <span className="text-white/40 block">Study Package Fee</span>
                  <span className="text-emerald-400 font-bold font-mono text-sm">
                    <Peso />{selectedDispute.grossAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-white/40 block">Reason Filed</span>
                  <span className="text-sky-400 font-semibold">{getGroundsLabel(selectedDispute.grounds)}</span>
                </div>
                <div>
                  <span className="text-white/40 block">Status</span>
                  <span>{getStatusBadge(selectedDispute.status)}</span>
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <span className="font-semibold text-white">Your Explanation:</span>
                <p className="p-3 bg-black/20 border border-white/5 rounded-[2px] text-white/80 leading-relaxed whitespace-pre-wrap">
                  {selectedDispute.description}
                </p>
              </div>

              {/* Evidence */}
              {selectedDispute.evidenceFilePaths && selectedDispute.evidenceFilePaths.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="font-semibold text-white">Attached Evidence:</span>
                  <div className="flex flex-col gap-1">
                    {selectedDispute.evidenceFilePaths.map((f, i) => (
                      <a
                        key={i}
                        href={f}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-400 hover:underline truncate block"
                      >
                        {f}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Ruling Box */}
              {selectedDispute.resolutionType ? (
                <div className="bg-[#011B38] border border-emerald-500/20 rounded-[2px] p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <IconGavel size={16} />
                    <span>CEO Decision</span>
                  </div>
                  <div className="flex justify-between text-[0.688rem] text-white/60">
                    <span>Ruling: <strong className="text-white font-mono">{selectedDispute.resolutionType.replace(/_/g, " ")}</strong></span>
                    <span>Decided on: {selectedDispute.resolvedAt ? new Date(selectedDispute.resolvedAt).toLocaleDateString() : ""}</span>
                  </div>
                  <p className="text-white/90 text-xs bg-black/30 p-3 rounded-[2px] border border-white/5 whitespace-pre-wrap">
                    {selectedDispute.resolutionNotes || "No notes attached."}
                  </p>
                </div>
              ) : (
                <div className="bg-sky-500/10 border border-sky-500/20 rounded-[2px] p-4 text-sky-300 flex items-center gap-2.5">
                  <IconInfoCircle size={20} className="shrink-0" />
                  <span>Your claim is currently being investigated by our review lead and CEO. You will receive an update once a decision is made.</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-white/10">
              <Button
                variant="secondary"
                onClick={() => setSelectedDispute(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          variant={toast.variant}
          message={toast.message}
          description={toast.description}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
