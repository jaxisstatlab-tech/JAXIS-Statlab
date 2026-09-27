"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  PageHeader,
  Card,
  Button,
  KpiCard,
  Modal,
  Toast,
  LoadingState,
  Peso,
  Pagination,
} from "@repo/ui";
import {
  IconVideo,
  IconDownload,
} from "@tabler/icons-react";
import {
  getAdminDefenseLabData,
  updateDefenseLabMeetingLink,
  completeDefenseLabSession,
  uploadDefenseLabRecording,
  applyDefenseLabPenalty,
} from "@/features/defenselab/actions";
import type { DefenseLabSessionDTO } from "@/features/defenselab/schemas";

type FilterTab = "ALL" | "SCHEDULED" | "COMPLETED" | "NO_SHOW_CLIENT" | "PENALTIES";

export default function AdminDefenseLabPage() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessions, setSessions] = useState<DefenseLabSessionDTO[]>([]);
  const [stats, setStats] = useState({
    totalScheduled: 0,
    totalCompleted: 0,
    pendingMeetingLinks: 0,
    pendingRecordings: 0,
    lateNoShows: 0,
    penaltiesLogged: 0,
  });

  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals state
  const [activeModalSession, setActiveModalSession] = useState<DefenseLabSessionDTO | null>(null);
  const [modalType, setModalType] = useState<"MEETING_LINK" | "COMPLETE" | "RECORDING" | "PENALTY" | null>(null);

  const [meetingUrlInput, setMeetingUrlInput] = useState<string>("");
  const [recordingUrlInput, setRecordingUrlInput] = useState<string>("");
  const [completionNotesInput, setCompletionNotesInput] = useState<string>("");
  const [penaltyReasonInput, setPenaltyReasonInput] = useState<string>("");
  const [penaltyAmountInput, setPenaltyAmountInput] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAdminDefenseLabData();
      if (res.success && res.data) {
        setSessions(res.data.sessions);
        setStats(res.data.stats);
      } else {
        setToast({
          message: "Failed to Load Operations Queue",
          description: res.error?.message || "Could not retrieve DefenseLab sessions.",
          variant: "danger",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Tab filter
      if (activeTab === "SCHEDULED" && s.status !== "SCHEDULED" && s.status !== "RESCHEDULED") return false;
      if (activeTab === "COMPLETED" && s.status !== "COMPLETED") return false;
      if (activeTab === "NO_SHOW_CLIENT" && s.status !== "NO_SHOW_CLIENT") return false;
      if (activeTab === "PENALTIES" && !s.penaltyApplied) return false;

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesIntake = s.projectIntakeId.toLowerCase().includes(q);
        const matchesTitle = s.projectTitle.toLowerCase().includes(q);
        const matchesClient = s.clientName.toLowerCase().includes(q);
        const matchesExpert = s.expertName.toLowerCase().includes(q);
        return matchesIntake || matchesTitle || matchesClient || matchesExpert;
      }

      return true;
    });
  }, [sessions, activeTab, searchQuery]);

  // Reset page on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  // Paginated sessions
  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSessions.slice(start, start + pageSize);
  }, [filteredSessions, currentPage, pageSize]);

  // Open modals helper
  const handleOpenMeetingModal = (session: DefenseLabSessionDTO) => {
    setActiveModalSession(session);
    setMeetingUrlInput(session.meetingUrl || "");
    setModalType("MEETING_LINK");
  };

  const handleOpenCompleteModal = (session: DefenseLabSessionDTO) => {
    setActiveModalSession(session);
    setRecordingUrlInput(session.recordingUrl || "");
    setCompletionNotesInput(session.notes || "");
    setModalType("COMPLETE");
  };

  const handleOpenRecordingModal = (session: DefenseLabSessionDTO) => {
    setActiveModalSession(session);
    setRecordingUrlInput(session.recordingUrl || "");
    setModalType("RECORDING");
  };

  const handleOpenPenaltyModal = (session: DefenseLabSessionDTO) => {
    setActiveModalSession(session);
    setPenaltyReasonInput(session.penaltyReason || "");
    setPenaltyAmountInput(session.penaltyAmount || 0);
    setModalType("PENALTY");
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setActiveModalSession(null);
    setModalType(null);
  };

  // Submit Meeting Link
  const handleSubmitMeetingLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalSession || !meetingUrlInput.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await updateDefenseLabMeetingLink({
        sessionId: activeModalSession.id,
        meetingUrl: meetingUrlInput.trim(),
      });

      if (res.success) {
        setToast({
          message: "Meeting Link Updated",
          description: "Google Meet / Zoom URL saved for the rehearsal session.",
          variant: "success",
        });
        handleCloseModal();
        await loadData();
      } else {
        setToast({
          message: "Update Failed",
          description: res.error?.message || "Could not save meeting link.",
          variant: "danger",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Complete
  const handleSubmitComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalSession) return;

    setIsSubmitting(true);
    try {
      const res = await completeDefenseLabSession({
        sessionId: activeModalSession.id,
        recordingUrl: recordingUrlInput.trim() || undefined,
        notes: completionNotesInput.trim() || undefined,
      });

      if (res.success) {
        setToast({
          message: "Session Completed",
          description: "DefenseLab rehearsal session marked as completed.",
          variant: "success",
        });
        handleCloseModal();
        await loadData();
      } else {
        setToast({
          message: "Completion Failed",
          description: res.error?.message || "Could not mark session complete.",
          variant: "danger",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Recording
  const handleSubmitRecording = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalSession || !recordingUrlInput.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await uploadDefenseLabRecording({
        sessionId: activeModalSession.id,
        recordingUrl: recordingUrlInput.trim(),
      });

      if (res.success) {
        setToast({
          message: "Recording Attached",
          description: "Session recording URL uploaded and made accessible to the client.",
          variant: "success",
        });
        handleCloseModal();
        await loadData();
      } else {
        setToast({
          message: "Upload Failed",
          description: res.error?.message || "Could not save recording URL.",
          variant: "danger",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Penalty
  const handleSubmitPenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalSession || !penaltyReasonInput.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await applyDefenseLabPenalty({
        sessionId: activeModalSession.id,
        penaltyReason: penaltyReasonInput.trim(),
        penaltyAmount: Number(penaltyAmountInput) || undefined,
      });

      if (res.success) {
        setToast({
          message: "Penalty Recorded",
          description: "Administrative penalty determination saved for this session.",
          variant: "success",
        });
        handleCloseModal();
        await loadData();
      } else {
        setToast({
          message: "Penalty Logging Failed",
          description: res.error?.message || "Could not log penalty.",
          variant: "danger",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto font-sans">
        <LoadingState
          variant="page"
          label="Loading DefenseLab Operations Queue..."
          description="Retrieving mock panel defense sessions and specialist rosters"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans">
      {toast && (
        <Toast
          message={toast.message}
          description={toast.description}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}

      <PageHeader
        title="DefenseLab Operations &amp; Rehearsals"
        description="Coordinate 1-on-1 mock panel oral defense rehearsal sessions, manage video meeting links, verify completions, and upload recording URLs."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Administration", href: "/dashboard/admin" },
          { label: "DefenseLab Rehearsals" },
        ]}
      />

      {/* KPI TELEMETRY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="SCHEDULED SESSIONS"
          value={stats.totalScheduled}
          unit="SESSIONS"
          description="Active upcoming defense rehearsals"
          variant="default"
        />
            <KpiCard
              label="PENDING MEETING LINKS"
              value={stats.pendingMeetingLinks}
              unit="URGENT"
              description="Sessions needing Google Meet / Zoom URL"
              variant={stats.pendingMeetingLinks > 0 ? "amber" : "default"}
            />
            <KpiCard
              label="PENDING RECORDINGS"
              value={stats.pendingRecordings}
              unit="UNATTACHED"
              description="Completed sessions awaiting recording URL"
              variant={stats.pendingRecordings > 0 ? "amber" : "default"}
            />
            <KpiCard
              label="COMPLETED REHEARSALS"
              value={stats.totalCompleted}
              unit="TOTAL"
              description="Successfully delivered mock defenses"
              variant="emerald"
            />
          </div>

          {/* SESSIONS QUEUE TABLE CARD */}
          <Card className="p-6 bg-[#050513] border border-white/[0.08] flex flex-col gap-5">
            {/* Filter Tabs & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: "ALL", label: `All (${sessions.length})` },
                    { id: "SCHEDULED", label: `Scheduled (${stats.totalScheduled})` },
                    { id: "COMPLETED", label: `Completed (${stats.totalCompleted})` },
                    { id: "NO_SHOW_CLIENT", label: `Late No-Shows (${stats.lateNoShows})` },
                    { id: "PENALTIES", label: `Penalties Logged (${stats.penaltiesLogged})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-[2px] text-xs font-mono transition-colors cursor-pointer ${
                      activeTab === tab.id
                        ? "bg-[#CC6600] text-white font-semibold"
                        : "bg-[#0A0A18] text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Search by Intake ID, Study, Client, or Statistician..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#0A0A18] border border-white/15 rounded-[2px] px-3 py-1.5 text-xs text-white font-mono placeholder-white/40 outline-none focus:border-[#CC6600] w-full md:w-80"
              />
            </div>

            {/* Table */}
            {filteredSessions.length === 0 ? (
              <div className="p-12 text-center text-xs text-white/40 font-mono">
                No DefenseLab rehearsal sessions match the selected filter.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50 font-mono uppercase text-[0.688rem] tracking-wider">
                      <th className="pb-3 pr-4">Study / Intake</th>
                      <th className="pb-3 px-4">Client &amp; Panelist</th>
                      <th className="pb-3 px-4">Scheduled Slot</th>
                      <th className="pb-3 px-4">Duration &amp; Fee</th>
                      <th className="pb-3 px-4">Status</th>
                      <th className="pb-3 px-4">Meeting &amp; Recording</th>
                      <th className="pb-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {paginatedSessions.map((s) => {
                      const sessionDate = new Date(s.scheduledAt);
                      const isUpcoming = s.status === "SCHEDULED" || s.status === "RESCHEDULED";

                      return (
                        <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                          {/* Study */}
                          <td className="py-3.5 pr-4 align-top">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-mono text-sky-400 font-semibold text-xs">
                                {s.projectIntakeId}
                              </span>
                              <span className="text-white font-semibold line-clamp-1 max-w-[200px]">
                                {s.projectTitle}
                              </span>
                            </div>
                          </td>

                          {/* Client & Panelist */}
                          <td className="py-3.5 px-4 align-top font-sans">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-white/90">
                                Client: <strong className="text-white">{s.clientName}</strong>
                              </span>
                              <span className="text-white/60 text-[0.688rem]">
                                Panelist: {s.expertName}
                              </span>
                            </div>
                          </td>

                          {/* Scheduled Slot */}
                          <td className="py-3.5 px-4 align-top font-mono">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-white font-medium">
                                {sessionDate.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                              <span className="text-[#FFA040] text-[0.688rem]">
                                {sessionDate.toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </td>

                          {/* Duration & Fee */}
                          <td className="py-3.5 px-4 align-top font-mono">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-white">
                                {s.durationHours} {s.durationHours === 1 ? "Hour" : "Hours"}
                              </span>
                              <span className="text-emerald-400 font-semibold">
                                <Peso />
                                {s.amountPaid.toFixed(2)}
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="flex flex-col gap-1">
                              <span
                                className={`text-[0.688rem] font-mono px-2 py-0.5 rounded-[2px] font-semibold inline-block text-center ${
                                  s.status === "COMPLETED"
                                    ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30"
                                    : s.status === "NO_SHOW_CLIENT"
                                      ? "bg-rose-950/60 text-rose-300 border border-rose-500/30"
                                      : "bg-amber-950/60 text-amber-300 border border-amber-500/30"
                                }`}
                              >
                                {s.status}
                              </span>
                              {s.penaltyApplied && (
                                <span className="text-[0.625rem] font-mono text-rose-400 bg-rose-950/40 px-1.5 py-0.5 rounded-[2px] border border-rose-500/20 text-center">
                                  Penalty Logged
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Meeting & Recording */}
                          <td className="py-3.5 px-4 align-top text-xs font-mono">
                            <div className="flex flex-col gap-1">
                              {s.meetingUrl ? (
                                <a
                                  href={s.meetingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sky-400 hover:text-sky-300 underline flex items-center gap-1"
                                >
                                  <IconVideo size={13} stroke={2} />
                                  <span>Meeting Link</span>
                                </a>
                              ) : (
                                <span className="text-amber-400/80 text-[0.688rem]">
                                  Pending Link
                                </span>
                              )}

                              {s.recordingUrl ? (
                                <a
                                  href={s.recordingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1"
                                >
                                  <IconDownload size={13} stroke={2} />
                                  <span>Recording Attached</span>
                                </a>
                              ) : s.status === "COMPLETED" ? (
                                <span className="text-rose-400 text-[0.688rem]">
                                  No Recording
                                </span>
                              ) : null}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 pl-4 align-top text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleOpenMeetingModal(s)}
                                className="h-7 px-2 text-[0.688rem] rounded-[2px]"
                                title="Configure Video Meeting Link"
                              >
                                Link
                              </Button>

                              {isUpcoming && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleOpenCompleteModal(s)}
                                  className="h-7 px-2 text-[0.688rem] rounded-[2px]"
                                >
                                  Complete
                                </Button>
                              )}

                              {s.status === "COMPLETED" && !s.recordingUrl && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleOpenRecordingModal(s)}
                                  className="h-7 px-2 text-[0.688rem] rounded-[2px]"
                                >
                                  + Recording
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenPenaltyModal(s)}
                                className="h-7 px-2 text-[0.688rem] rounded-[2px] text-white/50 hover:text-rose-300"
                                title="Log / Review Penalty Determination"
                              >
                                Penalty
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredSessions.length > 0 && (
                <div className="border-t border-white/10 p-3 sm:px-6">
                  <Pagination
                    currentPage={currentPage}
                    totalItems={filteredSessions.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                  />
                </div>
              )}
            </>
          )}
        </Card>

      {/* MODAL 1: MEETING LINK */}
      {modalType === "MEETING_LINK" && activeModalSession && (
        <Modal
          open={Boolean(modalType === "MEETING_LINK")}
          onClose={handleCloseModal}
          title="Configure Rehearsal Meeting Link"
          description="Enter the Google Meet, Zoom, or Microsoft Teams URL for this rehearsal."
          size="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full font-sans">
              <Button variant="secondary" size="sm" disabled={isSubmitting} onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isSubmitting || !meetingUrlInput.trim()}
                onClick={handleSubmitMeetingLink}
                className="rounded-[2px]"
              >
                {isSubmitting ? "Saving..." : "Save Meeting Link"}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSubmitMeetingLink} className="flex flex-col gap-4 text-xs font-sans text-white/90">
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-white/90">Video Call URL</label>
              <input
                type="url"
                placeholder="https://meet.google.com/abc-defg-hij or https://zoom.us/j/..."
                value={meetingUrlInput}
                onChange={(e) => setMeetingUrlInput(e.target.value)}
                className="w-full bg-[#0A0A18] border border-white/15 rounded-[2px] px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#CC6600]"
                required
              />
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: COMPLETE SESSION */}
      {modalType === "COMPLETE" && activeModalSession && (
        <Modal
          open={Boolean(modalType === "COMPLETE")}
          onClose={handleCloseModal}
          title="Mark DefenseLab Rehearsal Completed"
          description="Finalize the session delivery and optionally attach the cloud recording link."
          size="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full font-sans">
              <Button variant="secondary" size="sm" disabled={isSubmitting} onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                onClick={handleSubmitComplete}
                className="rounded-[2px]"
              >
                {isSubmitting ? "Completing..." : "Confirm Completion"}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSubmitComplete} className="flex flex-col gap-4 text-xs font-sans text-white/90">
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-white/90">Recording Cloud URL (Optional)</label>
              <input
                type="url"
                placeholder="https://drive.google.com/... or https://dropbox.com/..."
                value={recordingUrlInput}
                onChange={(e) => setRecordingUrlInput(e.target.value)}
                className="w-full bg-[#0A0A18] border border-white/15 rounded-[2px] px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#CC6600]"
              />
              <span className="text-[0.625rem] text-white/50 font-mono">
                You can also upload or update this recording link at a later time.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-white/90">Panelist Notes / Rubric Summary</label>
              <textarea
                placeholder="Notes on client performance, strong methodology arguments, or areas for refinement..."
                value={completionNotesInput}
                onChange={(e) => setCompletionNotesInput(e.target.value)}
                rows={3}
                className="w-full bg-[#0A0A18] border border-white/10 rounded-[2px] p-2.5 text-xs text-white placeholder-white/40 focus:border-[#CC6600] outline-none resize-none leading-relaxed"
              />
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: UPLOAD RECORDING */}
      {modalType === "RECORDING" && activeModalSession && (
        <Modal
          open={Boolean(modalType === "RECORDING")}
          onClose={handleCloseModal}
          title="Attach DefenseLab Session Recording"
          description="Provide the cloud storage URL for the recorded mock defense session."
          size="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full font-sans">
              <Button variant="secondary" size="sm" disabled={isSubmitting} onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isSubmitting || !recordingUrlInput.trim()}
                onClick={handleSubmitRecording}
                className="rounded-[2px]"
              >
                {isSubmitting ? "Uploading..." : "Save Recording"}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSubmitRecording} className="flex flex-col gap-4 text-xs font-sans text-white/90">
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-white/90">Recording Storage URL</label>
              <input
                type="url"
                placeholder="https://drive.google.com/... or https://dropbox.com/..."
                value={recordingUrlInput}
                onChange={(e) => setRecordingUrlInput(e.target.value)}
                className="w-full bg-[#0A0A18] border border-white/15 rounded-[2px] px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#CC6600]"
                required
              />
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 4: PENALTY */}
      {modalType === "PENALTY" && activeModalSession && (
        <Modal
          open={Boolean(modalType === "PENALTY")}
          onClose={handleCloseModal}
          title="Administrative Penalty Determination"
          description="Record penalty details for late specialist cancellations or unexcused no-shows."
          size="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full font-sans">
              <Button variant="secondary" size="sm" disabled={isSubmitting} onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isSubmitting || !penaltyReasonInput.trim()}
                onClick={handleSubmitPenalty}
                className="rounded-[2px]"
              >
                {isSubmitting ? "Saving..." : "Apply Determination"}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSubmitPenalty} className="flex flex-col gap-4 text-xs font-sans text-white/90">
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-white/90">Penalty Justification Reason</label>
              <textarea
                placeholder="Describe reason for penalty determination (e.g., Specialist unexcused absence, late notice violation)..."
                value={penaltyReasonInput}
                onChange={(e) => setPenaltyReasonInput(e.target.value)}
                rows={3}
                className="w-full bg-[#0A0A18] border border-white/10 rounded-[2px] p-2.5 text-xs text-white placeholder-white/40 focus:border-[#CC6600] outline-none resize-none leading-relaxed"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-white/90">Penalty Amount / Deduction (Optional)</label>
              <input
                type="number"
                min={0}
                step={50}
                value={penaltyAmountInput}
                onChange={(e) => setPenaltyAmountInput(Number(e.target.value))}
                className="bg-[#0A0A18] border border-white/15 rounded-[2px] px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#CC6600]"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
