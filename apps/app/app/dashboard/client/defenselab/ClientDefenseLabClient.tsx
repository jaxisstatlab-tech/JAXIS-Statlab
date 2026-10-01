"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import {
  PageHeader,
  Button,
  Modal,
  Toast,
  LoadingState,
  Peso,
  CopyButton,
} from "@repo/ui";
import {
  ArrowRight,
  CalendarBlank,
  ChalkboardTeacher,
  Clock,
  PlayCircle,
  Plus,
  UserCircle,
  VideoCamera,
} from "@phosphor-icons/react";
import {
  getClientDefenseLabData,
  bookDefenseLabSession,
  rescheduleDefenseLabSession,
} from "@/features/defenselab/actions";
import type {
  DefenseLabSessionDTO,
  DefenseLabProjectEntitlementDTO,
} from "@/features/defenselab/schemas";
import {
  Meter,
  Panel,
  PanelBody,
  PanelHeader,
} from "@/components/dashboard/Panel";

// Client "DefenseLab practice": the next session first, then hours per study, past sessions with
// recordings, and the 12-hour rescheduling rule in plain words.

interface ClientDefenseLabClientProps {
  initialData?: {
    entitlements: DefenseLabProjectEntitlementDTO[];
    sessions: DefenseLabSessionDTO[];
  } | null;
}

const RATE = 250;
const NOTICE_HOURS = 12;

const PAST_STATUS: Record<string, string> = {
  COMPLETED: "Done",
  NO_SHOW_CLIENT: "Missed",
  CANCELLED: "Cancelled",
  PENALTY_APPLIED: "Late change",
};

const longDate = (d: Date) =>
  d.toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
const shortDate = (d: Date) =>
  d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const timeOf = (d: Date) =>
  d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
const hoursLabel = (n: number) => `${n} ${n === 1 ? "hour" : "hours"}`;

// "Now" only exists in the browser, so the server render and hydration always match.
let pageLoadedAt = 0;
const subscribeNever = () => () => {};
const useClientNow = () =>
  useSyncExternalStore(
    subscribeNever,
    () => (pageLoadedAt ||= Date.now()),
    () => null,
  );

/** "in 3 days", "tomorrow", "in 5 hours" relative to page load. */
function relativeTo(at: Date, now: number | null) {
  if (now === null) return null;
  const hours = (at.getTime() - now) / 3_600_000;
  if (hours < 0) return "now";
  if (hours < 1) return "in less than an hour";
  if (hours < 24)
    return `in ${Math.round(hours)} ${Math.round(hours) === 1 ? "hour" : "hours"}`;
  const days = Math.round(hours / 24);
  return days === 1 ? "tomorrow" : `in ${days} days`;
}

/** datetime-local value for "now + minutes" in the viewer's own timezone. */
function localInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ClientDefenseLabClient({
  initialData,
}: ClientDefenseLabClientProps) {
  const now = useClientNow();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [entitlements, setEntitlements] = useState<
    DefenseLabProjectEntitlementDTO[]
  >(initialData?.entitlements || []);
  const [sessions, setSessions] = useState<DefenseLabSessionDTO[]>(
    initialData?.sessions || [],
  );

  // Booking
  const [isBookModalOpen, setIsBookModalOpen] = useState<boolean>(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialData?.entitlements?.[0]?.projectId || "",
  );
  const [bookScheduledAt, setBookScheduledAt] = useState<string>("");
  const [bookDurationHours, setBookDurationHours] = useState<number>(1);
  const [bookNotes, setBookNotes] = useState<string>("");
  const [isSubmittingBook, setIsSubmittingBook] = useState<boolean>(false);

  // Rescheduling
  const [rescheduleSession, setRescheduleSession] =
    useState<DefenseLabSessionDTO | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [rescheduleReason, setRescheduleReason] = useState<string>("");
  const [isSubmittingReschedule, setIsSubmittingReschedule] =
    useState<boolean>(false);

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
          message: "Couldn't load DefenseLab",
          description: res.error?.message || "Please try again in a moment.",
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

  const upcoming = useMemo(
    () =>
      sessions
        .filter((s) => s.status === "SCHEDULED" || s.status === "RESCHEDULED")
        .sort(
          (a, b) =>
            new Date(a.scheduledAt).getTime() -
            new Date(b.scheduledAt).getTime(),
        ),
    [sessions],
  );
  const past = useMemo(
    () =>
      sessions
        .filter((s) => s.status !== "SCHEDULED" && s.status !== "RESCHEDULED")
        .sort(
          (a, b) =>
            new Date(b.scheduledAt).getTime() -
            new Date(a.scheduledAt).getTime(),
        ),
    [sessions],
  );

  const bookable = entitlements.filter(
    (e) => e.remainingHours > 0 && e.expertAssignedId,
  );
  // Studies can be listed as eligible without any hours bought; only show the ones with hours.
  const withHours = entitlements.filter((e) => e.totalHoursPurchased > 0);
  const selectedEntitlement = entitlements.find(
    (e) => e.projectId === selectedProjectId,
  );

  const openBooking = (projectId?: string) => {
    const target = projectId ?? bookable[0]?.projectId ?? selectedProjectId;
    setSelectedProjectId(target);
    setBookDurationHours(1);
    setIsBookModalOpen(true);
  };

  const copyId = (id: string) =>
    setToast({
      message: "Study ID copied",
      description: `${id} is on your clipboard.`,
      variant: "info",
    });

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
          message: "Session booked",
          description:
            "Your statistical analyst has your time. We'll add the video link before the session.",
          variant: "success",
        });
        setIsBookModalOpen(false);
        setBookScheduledAt("");
        setBookNotes("");
        await loadData();
      } else {
        setToast({
          message: "Couldn't book the session",
          description: res.error?.message || "Please try again in a moment.",
          variant: "danger",
        });
      }
    } catch (err) {
      console.error(err);
      setToast({
        message: "Something went wrong",
        description: "Please try again in a moment.",
        variant: "danger",
      });
    } finally {
      setIsSubmittingBook(false);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleSession || !rescheduleDate || !rescheduleReason.trim())
      return;

    setIsSubmittingReschedule(true);
    try {
      const res = await rescheduleDefenseLabSession({
        sessionId: rescheduleSession.id,
        newScheduledAt: new Date(rescheduleDate).toISOString(),
        reason: rescheduleReason.trim(),
      });

      if (res.success && res.data) {
        setToast({
          message:
            res.data.status === "NO_SHOW_CLIENT"
              ? "Counted as a missed session"
              : "Session moved",
          description: res.data.message,
          variant: res.data.status === "NO_SHOW_CLIENT" ? "warning" : "success",
        });
        setRescheduleSession(null);
        setRescheduleDate("");
        setRescheduleReason("");
        await loadData();
      } else {
        setToast({
          message: "Couldn't move the session",
          description: res.error?.message || "Please try again in a moment.",
          variant: "danger",
        });
      }
    } catch (err) {
      console.error(err);
      setToast({
        message: "Something went wrong",
        description: "Please try again in a moment.",
        variant: "danger",
      });
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  if (isLoading && sessions.length === 0 && entitlements.length === 0) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto font-sans">
        <LoadingState variant="page" label="Loading DefenseLab..." />
      </div>
    );
  }

  const next = upcoming[0] ?? null;
  const laterSessions = upcoming.slice(1);
  const rescheduleIsLate =
    rescheduleSession && now !== null
      ? new Date(rescheduleSession.scheduledAt).getTime() - now <
        NOTICE_HOURS * 3_600_000
      : false;

  return (
    <div
      data-portal="client"
      className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans"
    >
      {toast && (
        <Toast
          message={toast.message}
          description={toast.description}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}

      <PageHeader
        title="DefenseLab Practice"
        description="Practice your defense 1-on-1 with a senior statistical analyst who asks the questions panels ask."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "My Studies", href: "/dashboard/client" },
          { label: "DefenseLab" },
        ]}
        actions={
          bookable.length > 0 ? (
            <Button
              variant={next ? "outline" : "primary"}
              size="sm"
              onClick={() => openBooking()}
              className="gap-1.5"
            >
              <Plus size={15} weight="bold" />
              Book a Session
            </Button>
          ) : undefined
        }
      />

      {entitlements.length === 0 && sessions.length === 0 ? (
        <HowItWorks />
      ) : (
        <>
          {/* ── Next session ── */}
          {next ? (
            <NextSession
              session={next}
              now={now}
              onReschedule={() => {
                setRescheduleSession(next);
                setRescheduleDate(localInputValue(new Date(next.scheduledAt)));
              }}
              onCopy={copyId}
            />
          ) : (
            <Panel as="div">
              <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-start gap-3">
                  <CalendarBlank
                    size={22}
                    weight="fill"
                    className="mt-0.5 shrink-0 text-white/40"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">
                      No session booked yet
                    </p>
                    <p className="mt-0.5 text-[13px] text-white/55">
                      {bookable.length > 0
                        ? "Pick a time that works for you. Your statistical analyst gets it right away."
                        : "You can book once your statistical analyst is assigned and your deposit is confirmed."}
                    </p>
                  </div>
                </div>
                {bookable.length > 0 ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openBooking()}
                    className="shrink-0 gap-1.5 self-start sm:self-center"
                  >
                    Book a Session
                    <ArrowRight size={14} weight="bold" />
                  </Button>
                ) : null}
              </div>
            </Panel>
          )}

          {laterSessions.length > 0 ? (
            <Panel aria-label="Also booked">
              <PanelHeader title="Also booked" count={laterSessions.length} />
              <ul className="mt-4 divide-y divide-white/[0.06] border-t border-white/[0.06]">
                {laterSessions.map((s) => {
                  const at = new Date(s.scheduledAt);
                  return (
                    <li
                      key={s.id}
                      className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">
                          {longDate(at)} · {timeOf(at)}
                        </p>
                        <p className="mt-0.5 truncate text-[13px] text-white/55">
                          {s.projectTitle}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRescheduleSession(s);
                          setRescheduleDate(localInputValue(at));
                        }}
                        className="shrink-0 self-start sm:self-center"
                      >
                        Reschedule
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          ) : null}

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            {/* ── Your hours ── */}
            <Panel aria-label="Your hours" className="lg:col-span-7">
              <PanelHeader
                title="Your hours"
                subtitle={
                  <>
                    DefenseLab is <Peso />
                    {`${RATE} per hour, added to your study's price.`}
                  </>
                }
              />
              {withHours.length === 0 ? (
                <PanelBody>
                  <p className="text-[13px] text-white/55">
                    None of your studies have DefenseLab hours right now.
                  </p>
                </PanelBody>
              ) : (
                <ul className="mt-4 divide-y divide-white/[0.06] border-t border-white/[0.06]">
                  {withHours.map((ent) => {
                    const used = Math.max(
                      0,
                      ent.totalHoursPurchased - ent.remainingHours,
                    );
                    const canBook =
                      ent.remainingHours > 0 && !!ent.expertAssignedId;
                    return (
                      <li
                        key={ent.projectId}
                        className="flex flex-col gap-3 px-5 py-4 sm:px-6"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p
                              className="truncate text-sm font-medium text-white"
                              title={ent.researchTitle}
                            >
                              {ent.researchTitle}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/45">
                              <CopyButton
                                variant="ghost"
                                value={ent.intakeId}
                                label={ent.intakeId}
                                onCopy={() => copyId(ent.intakeId)}
                                className="-ml-2 text-[11px]"
                              />
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1.5">
                                <UserCircle
                                  size={14}
                                  weight="fill"
                                  className="text-white/35"
                                />
                                {ent.expertAssignedName ??
                                  "Statistical analyst not assigned yet"}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openBooking(ent.projectId)}
                            disabled={!canBook}
                            title={
                              canBook
                                ? undefined
                                : ent.remainingHours <= 0
                                  ? "No hours left on this study"
                                  : "You can book once your statistical analyst is assigned"
                            }
                            className="shrink-0"
                          >
                            Book
                          </Button>
                        </div>
                        {ent.totalHoursPurchased > 0 ? (
                          <div className="max-w-sm">
                            <div className="flex items-baseline justify-between text-xs">
                              <span className="text-white/50">
                                {ent.remainingHours > 0
                                  ? `${hoursLabel(ent.remainingHours)} left`
                                  : "All hours booked"}
                              </span>
                              <span className="font-mono text-white/45">
                                {used} of {ent.totalHoursPurchased} used
                              </span>
                            </div>
                            <Meter
                              value={used}
                              max={ent.totalHoursPurchased}
                              label={`DefenseLab hours used on ${ent.intakeId}`}
                              className="mt-1.5"
                            />
                          </div>
                        ) : (
                          <p className="text-xs text-white/45">
                            No hours on this study yet. Message us to add
                            DefenseLab.
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-auto border-t border-white/[0.06] px-5 py-4 text-[13px] text-white/50 sm:px-6">
                Want practice for another study?{" "}
                <Link
                  href="/dashboard/client/messages"
                  className="text-white/80 underline decoration-white/25 underline-offset-4 hover:text-white"
                >
                  Message us
                </Link>{" "}
                and we&apos;ll add hours to it.
              </p>
            </Panel>

            {/* ── Rules ── */}
            <Panel aria-label="Good to know" className="lg:col-span-5">
              <PanelHeader title="Good to know" />
              <PanelBody className="flex flex-col gap-4 text-[13px] leading-relaxed text-white/65">
                <p className="flex gap-3">
                  <Clock
                    size={16}
                    weight="fill"
                    className="mt-0.5 shrink-0 text-white/40"
                  />
                  <span>
                    Need to move a session? Reschedule at least{" "}
                    <span className="text-white">12 hours before</span>
                    {
                      " it starts. Later changes count as a missed session and aren't refunded."
                    }
                  </span>
                </p>
                <p className="flex gap-3">
                  <VideoCamera
                    size={16}
                    weight="fill"
                    className="mt-0.5 shrink-0 text-white/40"
                  />
                  <span>
                    We add the video call link before your session. It shows up
                    here.
                  </span>
                </p>
                <p className="flex gap-3">
                  <PlayCircle
                    size={16}
                    weight="fill"
                    className="mt-0.5 shrink-0 text-white/40"
                  />
                  <span>
                    After the session, your recording appears under Past
                    sessions.
                  </span>
                </p>
              </PanelBody>
            </Panel>
          </div>

          {/* ── Past sessions ── */}
          <Panel aria-label="Past sessions">
            <PanelHeader
              title="Past sessions"
              count={past.length}
              subtitle="Watch your recordings anytime."
            />
            {past.length === 0 ? (
              <PanelBody>
                <p className="text-[13px] text-white/55">
                  Your finished sessions and their recordings will show up here.
                </p>
              </PanelBody>
            ) : (
              <ul className="mt-4 divide-y divide-white/[0.06] border-t border-white/[0.06]">
                {past.map((s) => {
                  const at = new Date(s.scheduledAt);
                  return (
                    <li
                      key={s.id}
                      className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-[2px] border border-white/15 bg-white/[0.04] px-2 py-0.5 text-xs text-white/75">
                            {PAST_STATUS[s.status] ?? s.status.toLowerCase()}
                          </span>
                          <span className="font-mono text-[11px] text-white/45">
                            {shortDate(at)} · {hoursLabel(s.durationHours)} ·{" "}
                            {s.expertName}
                          </span>
                        </div>
                        <p
                          className="mt-2 truncate text-sm text-white"
                          title={s.projectTitle}
                        >
                          {s.projectTitle}
                        </p>
                      </div>
                      {s.recordingUrl ? (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1.5 self-start sm:self-center"
                        >
                          <a
                            href={s.recordingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <PlayCircle size={15} weight="fill" />
                            Watch Recording
                          </a>
                        </Button>
                      ) : s.status === "COMPLETED" ? (
                        <span className="text-xs text-white/45">
                          Recording coming soon
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </>
      )}

      {/* ── Book a session ── */}
      {isBookModalOpen && (
        <Modal
          open={isBookModalOpen}
          onClose={() => !isSubmittingBook && setIsBookModalOpen(false)}
          title="Book a practice session"
          description="Pick a time. Your statistical analyst gets it right away."
          size="md"
          footer={
            <div className="flex w-full items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={isSubmittingBook}
                onClick={() => setIsBookModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={isSubmittingBook}
                disabled={
                  isSubmittingBook ||
                  !selectedProjectId ||
                  !bookScheduledAt ||
                  !selectedEntitlement ||
                  selectedEntitlement.remainingHours <= 0
                }
                onClick={handleBookSubmit}
              >
                {isSubmittingBook ? "Booking..." : "Book Session"}
              </Button>
            </div>
          }
        >
          <form
            onSubmit={handleBookSubmit}
            className="flex flex-col gap-5 text-sm text-white/85"
          >
            <Field label="Study">
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setBookDurationHours(1);
                }}
                className={INPUT}
                required
              >
                {withHours.map((e) => (
                  <option
                    key={e.projectId}
                    value={e.projectId}
                    disabled={e.remainingHours <= 0 || !e.expertAssignedId}
                    className="bg-[#0A0A18] text-white"
                  >
                    {e.researchTitle} ({hoursLabel(e.remainingHours)} left)
                  </option>
                ))}
              </select>
              {selectedEntitlement ? (
                <p className="text-xs text-white/50">
                  With{" "}
                  {selectedEntitlement.expertAssignedName ??
                    "your statistical analyst"}{" "}
                  · {hoursLabel(selectedEntitlement.remainingHours)} left
                </p>
              ) : null}
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
              <Field label="Date and time">
                <input
                  type="datetime-local"
                  min={
                    now !== null
                      ? localInputValue(new Date(now + 60 * 60 * 1000))
                      : undefined
                  }
                  value={bookScheduledAt}
                  onChange={(e) => setBookScheduledAt(e.target.value)}
                  className={`${INPUT} font-mono`}
                  required
                />
              </Field>
              <Field label="Length">
                <select
                  value={bookDurationHours}
                  onChange={(e) => setBookDurationHours(Number(e.target.value))}
                  className={INPUT}
                >
                  {[1, 2, 3].map((h) => (
                    <option
                      key={h}
                      value={h}
                      disabled={
                        !!selectedEntitlement &&
                        h > selectedEntitlement.remainingHours
                      }
                      className="bg-[#0A0A18] text-white"
                    >
                      {hoursLabel(h)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="What do you want to practice? (optional)">
              <textarea
                placeholder="For example: explaining my regression results, or why I chose this sample size."
                value={bookNotes}
                onChange={(e) => setBookNotes(e.target.value)}
                rows={3}
                className={`${INPUT} resize-none leading-relaxed`}
              />
            </Field>

            <p className="flex gap-2.5 rounded-[2px] border border-white/[0.08] bg-white/[0.02] p-3 text-[13px] leading-relaxed text-white/60">
              <Clock
                size={16}
                weight="fill"
                className="mt-0.5 shrink-0 text-white/40"
              />
              You can reschedule up to 12 hours before the session starts.
            </p>
          </form>
        </Modal>
      )}

      {/* ── Reschedule ── */}
      {rescheduleSession && (
        <Modal
          open={Boolean(rescheduleSession)}
          onClose={() => !isSubmittingReschedule && setRescheduleSession(null)}
          title="Move this session"
          description="Pick a new time and tell your statistical analyst why."
          size="md"
          footer={
            <div className="flex w-full items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={isSubmittingReschedule}
                onClick={() => setRescheduleSession(null)}
              >
                Keep Current Time
              </Button>
              <Button
                variant={rescheduleIsLate ? "danger" : "primary"}
                size="sm"
                loading={isSubmittingReschedule}
                disabled={
                  isSubmittingReschedule ||
                  !rescheduleDate ||
                  !rescheduleReason.trim()
                }
                onClick={handleRescheduleSubmit}
              >
                {isSubmittingReschedule
                  ? "Moving..."
                  : rescheduleIsLate
                    ? "Move Anyway"
                    : "Move Session"}
              </Button>
            </div>
          }
        >
          <form
            onSubmit={handleRescheduleSubmit}
            className="flex flex-col gap-5 text-sm text-white/85"
          >
            <div className="rounded-[2px] border border-white/[0.08] bg-white/[0.02] p-3">
              <p className="text-xs text-white/45">Currently booked</p>
              <p className="mt-0.5 text-sm text-white">
                {longDate(new Date(rescheduleSession.scheduledAt))} ·{" "}
                {timeOf(new Date(rescheduleSession.scheduledAt))}
              </p>
            </div>

            {rescheduleIsLate ? (
              <p className="rounded-[2px] border border-red-500/30 bg-red-500/[0.06] p-3 text-[13px] leading-relaxed text-red-200">
                This session starts in less than 12 hours. If you move it now,
                it counts as a missed session and the hour isn&apos;t refunded.
              </p>
            ) : null}

            <Field label="New date and time">
              <input
                type="datetime-local"
                min={
                  now !== null
                    ? localInputValue(new Date(now + 60 * 60 * 1000))
                    : undefined
                }
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className={`${INPUT} font-mono`}
                required
              />
            </Field>

            <Field label="Why do you need to move it?">
              <textarea
                placeholder="A short note for your statistical analyst."
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                rows={3}
                className={`${INPUT} resize-none leading-relaxed`}
                required
              />
            </Field>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

const INPUT =
  "w-full rounded-[2px] border border-white/15 bg-[#050513] px-3 py-2.5 text-base text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#CC6600] sm:text-sm";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-white/70">{label}</span>
      {children}
    </label>
  );
}

/** The next booked session, big and clear: when, with whom, the video link, and what to practice. */
function NextSession({
  session: s,
  now,
  onReschedule,
  onCopy,
}: {
  session: DefenseLabSessionDTO;
  now: number | null;
  onReschedule: () => void;
  onCopy: (id: string) => void;
}) {
  const at = new Date(s.scheduledAt);
  const soon = relativeTo(at, now);
  return (
    <Panel aria-label="Next session" className="border-[#CC6600]/35">
      <div className="grid grid-cols-1 gap-6 px-5 py-6 sm:px-6 md:grid-cols-[auto_minmax(0,1fr)] md:gap-8">
        {/* A small calendar page; the full date is spelled out beside it, so screen readers skip this */}
        <div
          aria-hidden="true"
          className="w-24 shrink-0 self-start overflow-hidden rounded-[2px] border border-white/10 bg-[#0F0F1D] text-center"
        >
          <div className="border-b border-[#CC6600]/30 bg-[#CC6600]/[0.14] py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FFA040]">
            {at.toLocaleDateString("en-PH", { month: "short" })}
          </div>
          <div className="flex flex-col items-center px-2 pb-3 pt-2.5">
            <span className="font-sans text-[2.5rem] font-semibold leading-none tracking-[-0.03em] tabular-nums text-white">
              {at.getDate()}
            </span>
            <span className="mt-2 text-[11px] font-medium text-white/55">
              {at.toLocaleDateString("en-PH", { weekday: "long" })}
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-[#CC6600]/50 bg-[#CC6600]/10 px-2 py-0.5 text-xs font-medium text-[#FFA040]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#CC6600]" />
              Next session{soon ? ` · ${soon}` : ""}
            </span>
          </div>
          <p className="mt-3 text-xl font-semibold tracking-[-0.01em] text-white">
            {longDate(at)} at {timeOf(at)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-white/60">
            <span className="inline-flex items-center gap-1.5">
              <UserCircle size={15} weight="fill" className="text-white/40" />
              {s.expertName}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={15} weight="fill" className="text-white/40" />
              {hoursLabel(s.durationHours)}
            </span>
            <span className="inline-flex min-w-0 items-start gap-1.5">
              <ChalkboardTeacher
                size={15}
                weight="fill"
                className="text-white/40"
              />
              <span>{s.projectTitle}</span>
            </span>
          </div>

          {s.notes ? (
            <p className="mt-4 border-l-2 border-white/15 pl-3 text-[13px] leading-relaxed text-white/70">
              <span className="text-white/45">You want to practice: </span>
              {s.notes}
            </p>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              {s.meetingUrl ? (
                <Button asChild variant="primary" size="sm" className="gap-1.5">
                  <a
                    href={s.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <VideoCamera size={15} weight="fill" />
                    Join Video Call
                  </a>
                </Button>
              ) : (
                <span className="text-[13px] text-white/50">
                  We&apos;ll add the video link before your session.
                </span>
              )}
              <Button variant="outline" size="sm" onClick={onReschedule}>
                Reschedule
              </Button>
            </div>
            <CopyButton
              variant="ghost"
              value={s.projectIntakeId}
              label={s.projectIntakeId}
              onCopy={() => onCopy(s.projectIntakeId)}
              className="self-start text-[11px] sm:self-auto"
            />
          </div>
        </div>
      </div>
    </Panel>
  );
}

/** Shown when no study has DefenseLab yet: what it is and how to get it. */
function HowItWorks() {
  const steps = [
    {
      title: "Add it to your price",
      body: (
        <>
          Tick DefenseLab when you accept your price. It&apos;s <Peso />
          {`${RATE} per hour.`}
        </>
      ),
    },
    {
      title: "Book a time",
      body: "Once your statistical analyst is assigned, pick a time that works for you.",
    },
    {
      title: "Practice and rewatch",
      body: "A 1-on-1 mock panel on video. You get the recording afterwards.",
    },
  ];
  return (
    <Panel aria-label="How DefenseLab works">
      <PanelHeader
        title="How DefenseLab works"
        subtitle="A practice defense before the real one."
      />
      <PanelBody className="flex flex-col gap-6">
        <ol className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {steps.map((st, i) => (
            <li key={st.title} className="flex gap-3 sm:flex-col sm:gap-2">
              <span className="font-mono text-[11px] text-white/35">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-sm font-medium text-white">{st.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-white/55">
                  {st.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.07] pt-5">
          <Button asChild variant="primary" size="sm" className="gap-1.5">
            <Link href="/dashboard/client/quotations">
              See My Quotes
              <ArrowRight size={14} weight="bold" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/client/messages">Ask Us to Add It</Link>
          </Button>
        </div>
      </PanelBody>
    </Panel>
  );
}
