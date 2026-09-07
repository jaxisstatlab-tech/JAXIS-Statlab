"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  KpiCard,
  Modal,
  Toast,
  LoadingState,
  Peso,
} from "@repo/ui";
import {
  IconVideo,
  IconCalendar,
  IconClock,
  IconAlertTriangle,
  IconCheck,
  IconDownload,
  IconInfoCircle,
  IconLoader2,
  IconMicrophone,
  IconPlus,
  IconCalendarEvent,
  IconShieldCheck,
} from "@tabler/icons-react";
import {
  getClientDefenseLabData,
  bookDefenseLabSession,
  rescheduleDefenseLabSession,
} from "@/features/defenselab/actions";
import type {
  DefenseLabSessionDTO,
  DefenseLabProjectEntitlementDTO,
} from "@/features/defenselab/schemas";

interface ClientDefenseLabClientProps {
  initialData?: {
    entitlements: DefenseLabProjectEntitlementDTO[];
    sessions: DefenseLabSessionDTO[];
  } | null;
}

export function ClientDefenseLabClient({
  initialData,
}: ClientDefenseLabClientProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [entitlements, setEntitlements] = useState<DefenseLabProjectEntitlementDTO[]>(
    initialData?.entitlements || []
  );
  const [sessions, setSessions] = useState<DefenseLabSessionDTO[]>(
    initialData?.sessions || []
  );

  // Booking Modal State
  const [isBookModalOpen, setIsBookModalOpen] = useState<boolean>(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialData?.entitlements?.[0]?.projectId || ""
  );
  const [bookScheduledAt, setBookScheduledAt] = useState<string>("");
  const [bookDurationHours, setBookDurationHours] = useState<number>(1);
  const [bookNotes, setBookNotes] = useState<string>("");
  const [isSubmittingBook, setIsSubmittingBook] = useState<boolean>(false);

  // Reschedule Modal State
  const [rescheduleSession, setRescheduleSession] = useState<DefenseLabSessionDTO | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [rescheduleReason, setRescheduleReason] = useState<string>("");
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState<boolean>(false);

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getClientDefenseLabData();
      if (res.success && res.data) {
        setEntitlements(res.data.entitlements);
        setSessions(res.data.sessions);
        if (res.data.entitlements.length > 0 && !selectedProjectId) {
          setSelectedProjectId(res.data.entitlements[0]?.projectId || "");
        }
      } else {
        setToast({
          message: "Data Load Failed",
          description: res.error?.message || "Failed to load DefenseLab rehearsal data.",
          variant: "danger",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (!initialData) {
      loadData();
    }
  }, [initialData, loadData]);

  // Derived KPI Stats
  const totalPurchasedHours = useMemo(() => {
    return entitlements.reduce((sum, e) => sum + e.totalHoursPurchased, 0);
  }, [entitlements]);

  const totalRemainingHours = useMemo(() => {
    return entitlements.reduce((sum, e) => sum + e.remainingHours, 0);
  }, [entitlements]);

  const activeSessions = useMemo(() => {
    return sessions.filter((s) => s.status === "SCHEDULED" || s.status === "RESCHEDULED");
  }, [sessions]);

  const completedSessions = useMemo(() => {
    return sessions.filter((s) => s.status === "COMPLETED");
  }, [sessions]);

  // Handle Book Submit
  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !bookScheduledAt) return;

    setIsSubmittingBook(true);
    try {
      const res = await bookDefenseLabSession({
        projectId: selectedProjectId,
        scheduledAt: new Date(bookScheduledAt).toISOString(),
        durationHours: Number(bookDurationHours),
        notes: bookNotes,
      });

      if (res.success) {
        setToast({
          message: "Rehearsal Scheduled",
          description: "Your DefenseLab mock defense session has been booked with your statistician.",
          variant: "success",
        });
        setIsBookModalOpen(false);
        setBookScheduledAt("");
        setBookNotes("");
        await loadData();
      } else {
        setToast({
          message: "Booking Failed",
          description: res.error?.message || "Could not schedule session.",
          variant: "danger",
        });
      }
    } catch (err) {
      console.error(err);
      setToast({
        message: "Booking Error",
        description: "An unexpected error occurred while booking.",
        variant: "danger",
      });
    } finally {
      setIsSubmittingBook(false);
    }
  };

  // Handle Reschedule Submit
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleSession || !rescheduleDate || !rescheduleReason.trim()) return;

    setIsSubmittingReschedule(true);
    try {
      const res = await rescheduleDefenseLabSession({
        sessionId: rescheduleSession.id,
        newScheduledAt: new Date(rescheduleDate).toISOString(),
        reason: rescheduleReason.trim(),
      });

      if (res.success && res.data) {
        setToast({
          message: "Reschedule Processed",
          description: res.data.message,
          variant: res.data.status === "NO_SHOW_CLIENT" ? "warning" : "success",
        });
        setRescheduleSession(null);
        setRescheduleDate("");
        setRescheduleReason("");
        await loadData();
      } else {
        setToast({
          message: "Reschedule Failed",
          description: res.error?.message || "Could not reschedule session.",
          variant: "danger",
        });
      }
    } catch (err) {
      console.error(err);
      setToast({
        message: "Reschedule Error",
        description: "An unexpected error occurred.",
        variant: "danger",
      });
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  const selectedEntitlement = useMemo(() => {
    return entitlements.find((e) => e.projectId === selectedProjectId);
  }, [entitlements, selectedProjectId]);

  if (isLoading) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto font-sans">
        <LoadingState
          variant="page"
          label="Loading DefenseLab Rehearsals..."
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
        title="DefenseLab Mock Defense Rehearsals"
        description="Schedule 1-on-1 mock panel defense rehearsals with your assigned Senior Statistician to practice answering methodology questions before your real panel defense."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Client Hub", href: "/dashboard/client/projects" },
          { label: "DefenseLab Rehearsals" },
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsBookModalOpen(true)}
            disabled={totalRemainingHours === 0 && entitlements.length === 0}
            className="flex items-center gap-1.5 rounded-[2px] active:scale-[0.97] transition-transform"
          >
            <IconPlus size={15} stroke={2} />
            <span>Schedule Mock Defense</span>
          </Button>
        }
      />

      {/* KPI TELEMETRY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="TOTAL PURCHASED"
              value={totalPurchasedHours}
              unit="HOURS"
              description="Mock defense hours purchased in approved quotes"
              variant="default"
            />
            <KpiCard
              label="AVAILABLE TO SCHEDULE"
              value={totalRemainingHours}
              unit="HOURS"
              description="Remaining unbooked rehearsal hours"
              variant="default"
            />
            <KpiCard
              label="UPCOMING REHEARSALS"
              value={activeSessions.length}
              unit="SESSIONS"
              description="Active scheduled rehearsal appointments"
              variant="default"
            />
            <KpiCard
              label="COMPLETED REHEARSALS"
              value={completedSessions.length}
              unit="SESSIONS"
              description="Completed sessions with recordings available"
              variant="default"
            />
          </div>

          {/* 12-HOUR RESCHEDULING POLICY BANNER */}
          <div className="p-4 bg-[#01142B] border border-sky-500/30 rounded-[2px] flex items-start gap-3 text-xs text-sky-200">
            <IconInfoCircle size={18} stroke={2} className="text-sky-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-white">
                Official DefenseLab 12-Hour Rescheduling Notice Policy (DEF-F03 &amp; DEF-F04)
              </span>
              <span className="text-white/70 leading-relaxed">
                To guarantee your assigned statistician&apos;s preparation and schedule availability, any session change or cancellation requires at least{" "}
                <strong className="text-white">12 hours advance notice</strong>. Rescheduling requests submitted with less than 12 hours notice cannot be rescheduled and are marked as late cancellations (No-Show).
              </span>
            </div>
          </div>

          {/* ENTITLED STUDIES OVERVIEW */}
          <Card className="p-6 bg-[#010D1F] border border-white/[0.08] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <IconShieldCheck size={18} stroke={2} className="text-emerald-400" />
                <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                  Entitled Research Studies &amp; Purchased Hours
                </h2>
              </div>
              <span className="text-xs font-mono text-white/50">
                Rate: <Peso />250.00 / Hour
              </span>
            </div>

            {entitlements.length === 0 ? (
              <div className="p-8 text-center bg-[#01142B] rounded-[2px] border border-white/10 flex flex-col items-center gap-3">
                <IconMicrophone size={32} stroke={1.5} className="text-white/30" />
                <p className="text-sm font-semibold text-white">No DefenseLab Add-on Detected</p>
                <p className="text-xs text-white/60 max-w-md">
                  DefenseLab mock defense rehearsals are an add-on service. When receiving your study proposal quotation, ensure the DefenseLab add-on is included or contact your administrator.
                </p>
                <Link href="/dashboard/client/projects">
                  <Button variant="secondary" size="sm" className="rounded-[2px]">
                    View My Studies
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {entitlements.map((ent) => (
                  <div
                    key={ent.projectId}
                    className="p-4 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col justify-between gap-3 hover:border-white/20 transition-colors"
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[0.688rem] font-mono text-[#38BDF8] bg-sky-950/40 px-2 py-0.5 rounded-[2px] border border-sky-500/30">
                          {ent.intakeId}
                        </span>
                        <span
                          className={`text-xs font-mono px-2 py-0.5 rounded-[2px] font-semibold ${
                            ent.remainingHours > 0
                              ? "bg-emerald-950/50 text-emerald-300 border border-emerald-500/30"
                              : "bg-white/10 text-white/50"
                          }`}
                        >
                          {ent.remainingHours} {ent.remainingHours === 1 ? "Hour" : "Hours"} Available
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
                        {ent.researchTitle}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs text-white/60 font-sans">
                      <span>
                        Assigned Statistician:{" "}
                        <strong className="text-white font-semibold">
                          {ent.expertAssignedName || "Pending Assignment"}
                        </strong>
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={ent.remainingHours <= 0 || !ent.expertAssignedId}
                        onClick={() => {
                          setSelectedProjectId(ent.projectId);
                          setIsBookModalOpen(true);
                        }}
                        className="rounded-[2px] text-xs active:scale-[0.97] transition-transform"
                      >
                        Book Time
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ACTIVE & UPCOMING REHEARSAL SESSIONS */}
          <Card className="p-6 bg-[#010D1F] border border-white/[0.08] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <IconCalendarEvent size={18} stroke={2} className="text-[#CC6600]" />
                <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                  Upcoming Mock Defense Rehearsals ({activeSessions.length})
                </h2>
              </div>
            </div>

            {activeSessions.length === 0 ? (
              <div className="p-8 text-center text-xs text-white/40 font-mono">
                No active rehearsals scheduled. Click &quot;Schedule Mock Defense&quot; above to book your preparation session.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {activeSessions.map((s) => {
                  const sessionDate = new Date(s.scheduledAt);
                  const isSoon = sessionDate.getTime() - Date.now() < 1000 * 60 * 60 * 24;

                  return (
                    <div
                      key={s.id}
                      className="p-4 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-sky-400 bg-sky-950/40 px-2 py-0.5 rounded-[2px] border border-sky-500/30">
                            {s.projectIntakeId}
                          </span>
                          <span className="text-xs font-mono px-2 py-0.5 rounded-[2px] font-semibold bg-amber-950/50 text-amber-300 border border-amber-500/30">
                            {s.status}
                          </span>
                          {isSoon && (
                            <span className="text-[0.625rem] font-mono px-2 py-0.5 rounded-[2px] font-semibold bg-rose-950/50 text-rose-300 border border-rose-500/30">
                              Within 24 Hours
                            </span>
                          )}
                        </div>

                        <span className="text-sm font-semibold text-white">
                          {s.projectTitle}
                        </span>

                        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-white/70">
                          <span className="flex items-center gap-1.5 text-white/90">
                            <IconCalendar size={14} stroke={1.5} className="text-[#CC6600]" />
                            {sessionDate.toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}{" "}
                            at{" "}
                            {sessionDate.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="flex items-center gap-1 text-white/60">
                            <IconClock size={14} stroke={1.5} />
                            Duration: {s.durationHours} {s.durationHours === 1 ? "Hour" : "Hours"}
                          </span>
                          <span>Panelist: {s.expertName}</span>
                        </div>

                        {s.notes && (
                          <p className="text-xs text-white/60 font-sans italic mt-1 bg-black/30 p-2 rounded-[2px] border border-white/5">
                            Focus Agenda: &quot;{s.notes}&quot;
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {s.meetingUrl ? (
                          <a
                            href={s.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex"
                          >
                            <Button
                              variant="primary"
                              size="sm"
                              className="flex items-center gap-1.5 rounded-[2px] active:scale-[0.97] transition-transform"
                            >
                              <IconVideo size={15} stroke={2} />
                              <span>Join Video Call</span>
                            </Button>
                          </a>
                        ) : (
                          <span className="text-xs font-mono text-white/40 bg-black/30 px-3 py-1.5 rounded-[2px] border border-white/5">
                            Meeting Link Pending Coordinator Setup
                          </span>
                        )}

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setRescheduleSession(s);
                            setRescheduleDate(s.scheduledAt.slice(0, 16));
                          }}
                          className="rounded-[2px] text-xs font-sans active:scale-[0.97] transition-transform"
                        >
                          Reschedule
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* COMPLETED REHEARSALS & RECORDING VAULT */}
          <Card className="p-6 bg-[#010D1F] border border-white/[0.08] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <IconDownload size={18} stroke={2} className="text-emerald-400" />
                <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                  Completed Rehearsals &amp; Recording Vault ({completedSessions.length})
                </h2>
              </div>
            </div>

            {completedSessions.length === 0 ? (
              <div className="p-8 text-center text-xs text-white/40 font-mono">
                No completed rehearsal recordings available yet. Once your mock defense concludes, your coordinator will upload the session recording link here.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {completedSessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-sky-400 bg-sky-950/40 px-2 py-0.5 rounded-[2px] border border-sky-500/30">
                          {s.projectIntakeId}
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded-[2px] font-semibold bg-emerald-950/50 text-emerald-300 border border-emerald-500/30">
                          COMPLETED
                        </span>
                      </div>

                      <span className="text-sm font-semibold text-white">
                        {s.projectTitle}
                      </span>

                      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-white/60">
                        <span>
                          Conducted on:{" "}
                          {new Date(s.scheduledAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span>Panelist: {s.expertName}</span>
                        <span>Duration: {s.durationHours} Hours</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {s.recordingUrl ? (
                        <a
                          href={s.recordingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex"
                        >
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex items-center gap-1.5 rounded-[2px]"
                          >
                            <IconDownload size={15} stroke={2} />
                            <span>Access Session Recording</span>
                          </Button>
                        </a>
                      ) : (
                        <span className="text-xs font-mono text-white/40 bg-black/30 px-3 py-1.5 rounded-[2px] border border-white/5">
                          Recording Upload Pending
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

      {/* SCHEDULE REHEARSAL MODAL */}
      {isBookModalOpen && (
        <Modal
          open={isBookModalOpen}
          onClose={() => !isSubmittingBook && setIsBookModalOpen(false)}
          title="Schedule Mock Defense Rehearsal"
          description="Book a 1-on-1 oral defense simulation session with your assigned statistician."
          size="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full font-sans">
              <Button
                variant="secondary"
                size="sm"
                disabled={isSubmittingBook}
                onClick={() => setIsBookModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={
                  isSubmittingBook ||
                  !selectedProjectId ||
                  !bookScheduledAt ||
                  !selectedEntitlement ||
                  selectedEntitlement.remainingHours <= 0
                }
                onClick={handleBookSubmit}
                className="rounded-[2px] font-semibold text-xs"
              >
                {isSubmittingBook ? (
                  <div className="flex items-center gap-1.5">
                    <IconLoader2 size={14} stroke={2.5} className="animate-spin" />
                    <span>Booking Session...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <IconCheck size={15} stroke={2} />
                    <span>Confirm Booking</span>
                  </div>
                )}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleBookSubmit} className="flex flex-col gap-4 text-xs font-sans text-white/90">
            {/* Study Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-white/90">Select Research Study</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-[#01142B] border border-white/15 rounded-[2px] px-3 py-2.5 text-xs text-white outline-none focus:border-[#CC6600] cursor-pointer"
                required
              >
                {entitlements.map((e) => (
                  <option key={e.projectId} value={e.projectId} className="bg-[#01142B] text-white">
                    {e.intakeId} — {e.researchTitle} ({e.remainingHours} hrs remaining)
                  </option>
                ))}
              </select>
            </div>

            {selectedEntitlement && (
              <div className="p-3 bg-black/40 border border-white/10 rounded-[2px] flex items-center justify-between text-xs font-mono">
                <span className="text-white/60">Assigned Statistician:</span>
                <span className="text-white font-semibold">
                  {selectedEntitlement.expertAssignedName || "Pending Assignment"}
                </span>
              </div>
            )}

            {/* Date & Time Picker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-white/90">Date &amp; Time (Rehearsal Slot)</label>
                <input
                  type="datetime-local"
                  min={new Date().toISOString().slice(0, 16)}
                  value={bookScheduledAt}
                  onChange={(e) => setBookScheduledAt(e.target.value)}
                  className="bg-[#01142B] border border-white/15 rounded-[2px] px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#CC6600] cursor-pointer"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-white/90">Session Duration</label>
                <select
                  value={bookDurationHours}
                  onChange={(e) => setBookDurationHours(Number(e.target.value))}
                  className="bg-[#01142B] border border-white/15 rounded-[2px] px-3 py-2 text-xs text-white outline-none focus:border-[#CC6600] cursor-pointer"
                >
                  <option value={1}>1 Hour Session</option>
                  <option value={2}>2 Hours Session</option>
                  <option value={3}>3 Hours Session</option>
                </select>
              </div>
            </div>

            {/* Focus Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-white/90">
                Key Topics / Methodology Concerns (Optional)
              </label>
              <textarea
                placeholder="e.g. Please drill down on ANOVA assumptions, regression interpretation, and sample size power justification..."
                value={bookNotes}
                onChange={(e) => setBookNotes(e.target.value)}
                rows={3}
                className="w-full bg-[#01142B] border border-white/10 rounded-[2px] p-2.5 text-xs text-white placeholder-white/40 focus:border-[#CC6600] outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Policy Notice */}
            <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-[2px] flex items-start gap-2.5 text-amber-200">
              <IconAlertTriangle size={16} stroke={2} className="text-amber-400 shrink-0 mt-0.5" />
              <span>
                Once confirmed, your statistician will reserve this slot. Ensure any cancellations or reschedule requests are submitted at least 12 hours prior to start.
              </span>
            </div>
          </form>
        </Modal>
      )}

      {/* RESCHEDULE SESSION MODAL */}
      {rescheduleSession && (
        <Modal
          open={Boolean(rescheduleSession)}
          onClose={() => !isSubmittingReschedule && setRescheduleSession(null)}
          title="Reschedule Mock Defense Rehearsal"
          description="Submit a request to change the date or time of your scheduled session."
          size="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full font-sans">
              <Button
                variant="secondary"
                size="sm"
                disabled={isSubmittingReschedule}
                onClick={() => setRescheduleSession(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isSubmittingReschedule || !rescheduleDate || !rescheduleReason.trim()}
                onClick={handleRescheduleSubmit}
                className="rounded-[2px] font-semibold text-xs"
              >
                {isSubmittingReschedule ? (
                  <div className="flex items-center gap-1.5">
                    <IconLoader2 size={14} stroke={2.5} className="animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <span>Submit Reschedule</span>
                )}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleRescheduleSubmit} className="flex flex-col gap-4 text-xs font-sans text-white/90">
            <div className="p-3 bg-black/40 border border-white/10 rounded-[2px] flex flex-col gap-1">
              <span className="text-[0.688rem] font-mono text-white/50 uppercase">Current Scheduled Time</span>
              <span className="text-xs font-mono font-semibold text-white">
                {new Date(rescheduleSession.scheduledAt).toLocaleString("en-US", {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-white/90">New Desired Date &amp; Time</label>
              <input
                type="datetime-local"
                min={new Date().toISOString().slice(0, 16)}
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="bg-[#01142B] border border-white/15 rounded-[2px] px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#CC6600] cursor-pointer"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-white/90">Reason for Rescheduling (Mandatory)</label>
              <textarea
                placeholder="Please state why you need to move this rehearsal appointment..."
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                rows={3}
                className="w-full bg-[#01142B] border border-white/10 rounded-[2px] p-2.5 text-xs text-white placeholder-white/40 focus:border-[#CC6600] outline-none resize-none leading-relaxed"
                required
              />
            </div>

            <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-[2px] flex items-start gap-2.5 text-rose-200">
              <IconAlertTriangle size={16} stroke={2} className="text-rose-400 shrink-0 mt-0.5" />
              <span>
                <strong>12-Hour Policy Alert:</strong> If this request is submitted within 12 hours of the current appointment, the session will be marked as a late cancellation (No-Show) without refund.
              </span>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
