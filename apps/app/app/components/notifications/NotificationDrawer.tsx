"use client";

import React, { useState, useEffect, useCallback, useMemo, useOptimistic, startTransition, useRef, useId } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Toast } from "@repo/ui";
import {
  getInAppAlertsAction,
  markAlertReadAction,
  markAllAlertsReadAction,
  deleteAlertAction,
  clearAllAlertsAction,
} from "@/features/notifications/actions";
import type { InAppAlertDTO } from "@/features/notifications/schemas";
import { ArrowRight, Bell, CaretRight, Check, Checks, Trash, X } from "@phosphor-icons/react";

type NotificationState = {
  alerts: InAppAlertDTO[];
  unreadCount: number;
};

type OptimisticAction =
  | { type: "MARK_READ"; alertId: string }
  | { type: "MARK_ALL_READ" }
  | { type: "DELETE_ALERT"; alertId: string }
  | { type: "CLEAR_ALL" };

export interface NotificationDrawerProps {
  className?: string;
  triggerVariant?: "icon" | "row";
  isSidebarCollapsed?: boolean;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export function NotificationDrawer({
  className = "",
  triggerVariant = "icon",
  isSidebarCollapsed = false,
}: NotificationDrawerProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [alerts, setAlerts] = useState<InAppAlertDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filterTab, setFilterTab] = useState<"ALL" | "UNREAD">("ALL");
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);
  const [isRinging, setIsRinging] = useState<boolean>(false);
  const sseConnectedRef = useRef(false);

  const [optimisticState, setOptimisticState] = useOptimistic(
    { alerts, unreadCount },
    (state: NotificationState, action: OptimisticAction): NotificationState => {
      switch (action.type) {
        case "MARK_READ": {
          const isAlertUnread = state.alerts.some((a) => a.id === action.alertId && !a.isRead);
          return {
            alerts: state.alerts.map((a) =>
              a.id === action.alertId ? { ...a, isRead: true } : a
            ),
            unreadCount: isAlertUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
          };
        }
        case "MARK_ALL_READ": {
          return {
            alerts: state.alerts.map((a) => ({ ...a, isRead: true })),
            unreadCount: 0,
          };
        }
        case "DELETE_ALERT": {
          const target = state.alerts.find((a) => a.id === action.alertId);
          const wasUnread = target && !target.isRead;
          return {
            alerts: state.alerts.filter((a) => a.id !== action.alertId),
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
          };
        }
        case "CLEAR_ALL": {
          return {
            alerts: [],
            unreadCount: 0,
          };
        }
        default:
          return state;
      }
    }
  );

  const alertsRef = useRef<InAppAlertDTO[]>([]);
  alertsRef.current = alerts;

  const loadAlerts = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    try {
      const res = await getInAppAlertsAction();
      if (res.success && res.data) {
        const freshAlerts = res.data.alerts;
        const freshUnreadCount = res.data.unreadCount;

        // If delta sync discovers brand new unread alerts that arrived from another serverless instance
        if (!isInitial && alertsRef.current.length > 0 && freshAlerts.length > 0) {
          const knownIds = new Set(alertsRef.current.map((a) => a.id));
          const newlyDiscovered = freshAlerts.filter((a) => !knownIds.has(a.id) && !a.isRead);

          const latestAlert = newlyDiscovered[0];
          if (latestAlert) {
            // Ring bell animation
            setIsRinging(true);
            setTimeout(() => setIsRinging(false), 2500);

            // Live floating Toast notification
            setToastMessage({
              message: alertMeta(latestAlert.alertType).label,
              description: latestAlert.message,
              variant: "info",
            });

            // Dispatch global event for active desk pages to auto-refresh data
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("jaxis:study-updated", { detail: latestAlert }));
            }
          }
        }

        setAlerts(freshAlerts);
        setUnreadCount(freshUnreadCount);
      }
    } catch (err) {
      console.error("Failed to load alerts:", err);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, []);

  // ── Real-Time Server-Sent Events (SSE) Stream ──
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let isMounted = true;

    const connectStream = () => {
      if (!isMounted) return;

      try {
        eventSource = new EventSource("/api/v1/notifications/stream");

        eventSource.onopen = () => {
          sseConnectedRef.current = true;
        };

        eventSource.addEventListener("connected", () => {
          sseConnectedRef.current = true;
        });

        eventSource.addEventListener("notification", (e: MessageEvent) => {
          try {
            const newAlert = JSON.parse(e.data) as InAppAlertDTO & { title?: string };
            if (!newAlert || !newAlert.id) return;

            setAlerts((prev) => {
              if (prev.some((a) => a.id === newAlert.id)) return prev;
              return [newAlert, ...prev];
            });

            setUnreadCount((count) => count + 1);

            // Ring bell animation
            setIsRinging(true);
            setTimeout(() => setIsRinging(false), 2500);

            // Live floating Toast notification
            setToastMessage({
              message: newAlert.title || alertMeta(newAlert.alertType).label,
              description: newAlert.message,
              variant: "info",
            });

            // Dispatch global event for active desk pages to auto-refresh data
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("jaxis:study-updated", { detail: newAlert }));
            }
          } catch (err) {
            console.error("[SSE] Notification parse error:", err);
          }
        });

        eventSource.onerror = () => {
          sseConnectedRef.current = false;
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (isMounted) {
            reconnectTimer = setTimeout(connectStream, 5000);
          }
        };
      } catch (err) {
        console.warn("[SSE] Failed to establish EventSource:", err);
        sseConnectedRef.current = false;
        if (isMounted) {
          reconnectTimer = setTimeout(connectStream, 10000);
        }
      }
    };

    connectStream();

    return () => {
      isMounted = false;
      sseConnectedRef.current = false;
      if (eventSource) eventSource.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  useEffect(() => {
    loadAlerts(true);

    const poll = () => {
      // Sleep background poll if tab is hidden/minimized
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      loadAlerts(false);
    };

    // Resilient background delta sync (every 15 seconds) ensuring guaranteed delivery across Vercel serverless instances
    const interval = setInterval(poll, 15000);

    // Refresh immediately when user returns to tab
    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        loadAlerts(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadAlerts]);

  // Mount check for client portal rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Body scroll locking when drawer is open
  useEffect(() => {
    if (isOpen && typeof document !== "undefined") {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleMarkRead = (alertId: string) => {
    const prevAlerts = alerts;
    const prevUnreadCount = unreadCount;

    startTransition(async () => {
      // 1. Instantly update the UI optimistically (0ms)
      setOptimisticState({ type: "MARK_READ", alertId });

      try {
        const res = await markAlertReadAction({ alertId });
        if (res && !res.success) {
          throw new Error(res.error?.message || "Failed to mark alert as read");
        }
        // 2. Commit real state
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, isRead: true } : a))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Failed to mark alert as read:", err);
        // 3. Roll back state on failure and alert the user
        setAlerts(prevAlerts);
        setUnreadCount(prevUnreadCount);
        setToastMessage({
          message: "Couldn't update",
          description: "We couldn't mark that as read. Please try again.",
          variant: "danger",
        });
      }
    });
  };

  const handleMarkAllRead = () => {
    const prevAlerts = alerts;
    const prevUnreadCount = unreadCount;

    startTransition(async () => {
      // 1. Instantly update the UI optimistically (0ms)
      setOptimisticState({ type: "MARK_ALL_READ" });

      try {
        const res = await markAllAlertsReadAction();
        if (res && !res.success) {
          throw new Error(res.error?.message || "Failed to mark all alerts as read");
        }
        // 2. Commit real state
        setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
        setUnreadCount(0);
        setToastMessage({
          message: "All marked as read",
          description: "You're all caught up.",
          variant: "success",
        });
      } catch (err) {
        console.error("Failed to mark all as read:", err);
        // 3. Roll back state on failure
        setAlerts(prevAlerts);
        setUnreadCount(prevUnreadCount);
        setToastMessage({
          message: "Couldn't update",
          description: "We couldn't mark your notifications as read. Please try again.",
          variant: "danger",
        });
      }
    });
  };

  const handleDeleteAlert = (alertId: string) => {
    const prevAlerts = alerts;
    const prevUnreadCount = unreadCount;
    const target = alerts.find((a) => a.id === alertId);
    const wasUnread = Boolean(target && !target.isRead);

    startTransition(async () => {
      // 1. Instant optimistic update (0ms)
      setOptimisticState({ type: "DELETE_ALERT", alertId });

      try {
        const res = await deleteAlertAction({ alertId });
        if (res && !res.success) {
          throw new Error(res.error?.message || "Failed to remove notification");
        }
        // 2. Commit real state
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
        if (wasUnread) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        setToastMessage({
          message: "Notification removed",
          description: "It won't show up here again.",
          variant: "info",
        });
      } catch (err) {
        console.error("Failed to delete alert:", err);
        // 3. Roll back state on failure
        setAlerts(prevAlerts);
        setUnreadCount(prevUnreadCount);
        setToastMessage({
          message: "Couldn't remove",
          description: "Please try again in a moment.",
          variant: "danger",
        });
      }
    });
  };

  const handleClearAll = () => {
    if (alerts.length === 0) return;
    const prevAlerts = alerts;
    const prevUnreadCount = unreadCount;

    startTransition(async () => {
      // 1. Instant optimistic update (0ms)
      setOptimisticState({ type: "CLEAR_ALL" });

      try {
        const res = await clearAllAlertsAction();
        if (res && !res.success) {
          throw new Error(res.error?.message || "Failed to clear notifications");
        }
        // 2. Commit real state
        setAlerts([]);
        setUnreadCount(0);
        setToastMessage({
          message: "Notifications cleared",
          description: "Your list is empty.",
          variant: "success",
        });
      } catch (err) {
        console.error("Failed to clear all alerts:", err);
        // 3. Roll back state on failure
        setAlerts(prevAlerts);
        setUnreadCount(prevUnreadCount);
        setToastMessage({
          message: "Couldn't clear",
          description: "Please try again in a moment.",
          variant: "danger",
        });
      }
    });
  };

  // Default sort: Newest first to oldest (guaranteed chronological descending order & deduplicated)
  const filteredAlerts = useMemo(() => {
    const list = [...optimisticState.alerts]
      .filter((a) => (filterTab === "UNREAD" ? !a.isRead : true))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const seenIds = new Set<string>();
    const seenContent = new Set<string>();
    return list.filter((a) => {
      if (seenIds.has(a.id)) return false;
      seenIds.add(a.id);
      const contentKey = `${a.alertType}_${a.message}`;
      if (seenContent.has(contentKey)) return false;
      seenContent.add(contentKey);
      return true;
    });
  }, [optimisticState.alerts, filterTab]);

  const [confirmClear, setConfirmClear] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  // Move focus into the panel when it opens; reset the clear-all confirmation when it closes.
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => closeButtonRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    setConfirmClear(false);
  }, [isOpen]);

  const groupedAlerts = useMemo(() => {
    const groups: Array<{ label: string; items: InAppAlertDTO[] }> = [];
    for (const alert of filteredAlerts) {
      const label = dayGroup(alert.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(alert);
      else groups.push({ label, items: [alert] });
    }
    return groups;
  }, [filteredAlerts]);

  return (
    <>
      {/* Trigger Button (Row or Icon) */}
      {triggerVariant === "row" ? (
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) loadAlerts();
          }}
          aria-label="Notifications"
          title={
            isSidebarCollapsed
              ? optimisticState.unreadCount > 0
                ? `${optimisticState.unreadCount} unread notification${optimisticState.unreadCount > 1 ? "s" : ""}`
                : "Notifications"
              : undefined
          }
          className={`group relative flex items-center h-9 rounded-[2px] transition-[background-color,color] duration-150 ease-out outline-none ${
            isSidebarCollapsed ? "w-10 mx-auto justify-center" : "w-full gap-3 px-2.5"
          } ${isOpen ? "bg-white/[0.08] text-white" : "text-white/60 hover:text-white hover:bg-white/[0.04]"} ${className}`}
        >
          {/* Matches the sidebar nav rows */}
          <Bell
            size={16}
            weight="fill"
            className={`shrink-0 transition-colors duration-150 ${
              isOpen ? "text-white" : "text-white/40 group-hover:text-white/80"
            } ${isRinging ? "animate-bounce" : ""}`}
          />
          {isSidebarCollapsed ? (
            optimisticState.unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#CC6600]" aria-hidden="true" />
            )
          ) : (
            <>
              <span className="font-sans text-[13px] truncate">Notifications</span>
              {optimisticState.unreadCount > 0 && (
                <span
                  className="ml-auto min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-[2px] bg-[#CC6600] font-mono text-[11px] font-medium text-white shrink-0"
                  aria-label={`${optimisticState.unreadCount} unread`}
                >
                  {optimisticState.unreadCount > 99 ? "99+" : optimisticState.unreadCount}
                </span>
              )}
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) loadAlerts();
          }}
          aria-label="Notifications"
          title={
            optimisticState.unreadCount > 0
              ? `${optimisticState.unreadCount} unread alert${optimisticState.unreadCount > 1 ? "s" : ""}`
              : "Notifications"
          }
          className={`relative h-10 w-10 rounded-[2px] flex items-center justify-center transition-colors duration-150 cursor-pointer outline-none group ${
            isOpen ? "bg-white/[0.08] text-white" : "text-white/60 hover:text-white hover:bg-white/[0.06]"
          } ${className}`}
        >
          <Bell size={18} weight="fill" className={isRinging ? "animate-bounce" : ""} />
          {optimisticState.unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#CC6600] ring-2 ring-[#010114]" aria-hidden="true" />
          )}
        </button>
      )}

      {/* Slide-out panel (portal), styled like the sidebar */}
      {mounted && typeof document !== "undefined" && createPortal(
        <div
          className={`fixed inset-0 z-[9999] transition-[visibility] duration-300 ${
            isOpen ? "visible" : "invisible pointer-events-none"
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div
            className={`absolute inset-0 bg-[#010114]/60 transition-opacity duration-300 ease-out ${
              isOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            className={`absolute inset-y-0 right-0 w-full sm:w-[26rem] bg-[#010114] border-l border-white/[0.08] flex flex-col font-sans transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] will-change-transform ${
              isOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {/* Header */}
            <div className="h-16 px-5 border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h2 id={titleId} className="text-[15px] font-semibold tracking-[-0.01em] text-white">
                  Notifications
                </h2>
                <p className="font-mono text-[11px] text-white/45">
                  {optimisticState.unreadCount === 0
                    ? "You're all caught up"
                    : `${optimisticState.unreadCount} unread`}
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-9 w-9 rounded-[2px] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
                aria-label="Close notifications"
                title="Close (Esc)"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Filter + mark all */}
            <div className="px-5 py-3 border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-1" role="tablist" aria-label="Filter notifications">
                {(["ALL", "UNREAD"] as const).map((tab) => {
                  const count = tab === "ALL" ? optimisticState.alerts.length : optimisticState.unreadCount;
                  const active = filterTab === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setFilterTab(tab)}
                      className={`inline-flex items-center gap-2 rounded-[2px] px-3 py-1.5 text-[13px] transition-colors ${
                        active ? "bg-white/[0.08] font-medium text-white" : "text-white/55 hover:text-white"
                      }`}
                    >
                      {tab === "ALL" ? "All" : "Unread"}
                      <span className={`font-mono text-[11px] ${active ? "text-white/60" : "text-white/35"}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
              {optimisticState.unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1.5 rounded-[2px] px-2 py-1.5 text-[13px] text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  <Checks size={15} weight="bold" />
                  Mark all as read
                </button>
              )}
            </div>

            {/* Feed */}
            <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin]">
              {isLoading ? (
                <ul aria-label="Loading notifications" className="divide-y divide-white/[0.06]">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex gap-3 px-5 py-4 animate-pulse">
                      <span className="h-8 w-8 rounded-[2px] bg-white/[0.05] shrink-0" />
                      <span className="flex-1 flex flex-col gap-2 pt-1">
                        <span className="h-3 w-1/3 rounded-[2px] bg-white/[0.06]" />
                        <span className="h-3 w-5/6 rounded-[2px] bg-white/[0.04]" />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : filteredAlerts.length === 0 ? (
                <div className="px-8 py-20 flex flex-col items-center text-center">
                  <span className="h-10 w-10 rounded-[2px] border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40">
                    <Bell size={18} weight="fill" />
                  </span>
                  <p className="mt-4 text-sm font-medium text-white">
                    {filterTab === "UNREAD" || optimisticState.alerts.length > 0 ? "You're all caught up" : "No notifications yet"}
                  </p>
                  <p className="mt-1.5 max-w-[17rem] text-[13px] leading-relaxed text-white/50">
                    {filterTab === "UNREAD"
                      ? "You've read everything. New updates will show up here."
                      : "Updates about your studies, like new prices, payments and files, show up here."}
                  </p>
                  {filterTab === "UNREAD" && optimisticState.alerts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterTab("ALL")}
                      className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs text-white/70 hover:text-white transition-colors"
                    >
                      Show all {optimisticState.alerts.length}
                      <ArrowRight size={12} weight="bold" />
                    </button>
                  )}
                </div>
              ) : (
                groupedAlerts.map((group) => (
                  <section key={group.label} aria-label={group.label}>
                    <h3 className="px-5 pt-5 pb-2 font-mono text-[11px] uppercase tracking-wider text-white/40">
                      {group.label}
                    </h3>
                    <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
                      {group.items.map((alert) => {
                        const { title, action } = describeAlert(alert.alertType, alert.message);
                        const intakeId = alert.projectIntakeId || alert.message.match(STUDY_ID)?.[0] || null;
                        const message = dropRepeatedTitle(stripStudyId(alert.message, intakeId), title);
                        const unread = !alert.isRead;
                        const body = (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="w-2 shrink-0 flex justify-center" aria-hidden="true">
                                {unread && <span className="h-1.5 w-1.5 rounded-full bg-[#CC6600]" />}
                              </span>
                              <span className={`min-w-0 truncate text-sm ${unread ? "font-semibold text-white" : "font-medium text-white/70"}`}>
                                {unread && <span className="sr-only">Unread: </span>}
                                {title}
                              </span>
                              <time
                                dateTime={alert.createdAt}
                                title={new Date(alert.createdAt).toLocaleString("en-PH", { dateStyle: "full", timeStyle: "short" })}
                                className="ml-auto pl-2 font-mono text-[11px] text-white/40 whitespace-nowrap shrink-0"
                              >
                                {shortTime(alert.createdAt)}
                              </time>
                            </div>
                            <p className={`mt-1 pl-4 text-[13px] leading-relaxed line-clamp-2 ${unread ? "text-white/70" : "text-white/45"}`}>
                              {message}
                            </p>
                            {(intakeId || alert.linkUrl) && (
                              <div className="mt-2 pl-4 pr-16 flex items-center gap-2 font-mono text-[11px] text-white/40">
                                {intakeId && <span>{intakeId}</span>}
                                {intakeId && alert.linkUrl && <span aria-hidden="true">·</span>}
                                {alert.linkUrl && (
                                  <span className="inline-flex items-center gap-1 text-white/65 transition-colors group-hover:text-white">
                                    {action}
                                    <CaretRight size={11} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
                                  </span>
                                )}
                              </div>
                            )}
                          </>
                        );
                        return (
                          <li key={alert.id} className="group relative">
                            {alert.linkUrl ? (
                              <Link
                                href={alert.linkUrl}
                                onClick={() => {
                                  if (unread) handleMarkRead(alert.id);
                                  setIsOpen(false);
                                }}
                                className="block px-5 py-4 transition-colors hover:bg-white/[0.03] focus-visible:bg-white/[0.04] outline-none"
                              >
                                {body}
                              </Link>
                            ) : (
                              <div className="px-5 py-4">{body}</div>
                            )}

                            {/* Row actions: shown on hover/focus (always on touch screens) */}
                            <span className="absolute right-3 bottom-2.5 flex items-center gap-0.5 transition-opacity [@media(hover:hover)]:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
                              {unread && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkRead(alert.id)}
                                  className="h-7 w-7 rounded-[2px] flex items-center justify-center text-white/45 hover:text-white hover:bg-white/[0.08] transition-colors"
                                  aria-label="Mark as read"
                                  title="Mark as read"
                                >
                                  <Check size={14} weight="bold" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteAlert(alert.id)}
                                className="h-7 w-7 rounded-[2px] flex items-center justify-center text-white/45 hover:text-white hover:bg-white/[0.08] transition-colors"
                                aria-label="Remove notification"
                                title="Remove"
                              >
                                <X size={14} weight="bold" />
                              </button>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))
              )}
            </div>

            {/* Footer: clear all (asks first) */}
            {optimisticState.alerts.length > 0 && (
              <div className="px-5 py-3 border-t border-white/[0.08] flex items-center justify-between gap-3 shrink-0 min-h-14">
                {confirmClear ? (
                  <>
                    <span className="text-[13px] text-white/70">Clear all notifications?</span>
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmClear(false)}
                        className="h-8 px-3 rounded-[2px] border border-white/15 text-[13px] text-white hover:border-white/35 hover:bg-white/[0.04] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmClear(false);
                          handleClearAll();
                        }}
                        className="h-8 px-3 rounded-[2px] bg-red-600 text-[13px] font-medium text-white hover:bg-red-500 transition-colors"
                      >
                        Clear all
                      </button>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-mono text-[11px] text-white/40">Updates arrive live</span>
                    <button
                      type="button"
                      onClick={() => setConfirmClear(true)}
                      className="inline-flex items-center gap-1.5 rounded-[2px] px-2 py-1.5 text-[13px] text-white/55 hover:text-red-300 hover:bg-red-500/[0.08] transition-colors"
                    >
                      <Trash size={14} weight="fill" />
                      Clear all
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {toastMessage && (
        <Toast
          message={toastMessage.message}
          description={toastMessage.description}
          variant={toastMessage.variant}
          onClose={() => setToastMessage(null)}
        />
      )}
    </>
  );
}

// ─── Plain-English titles and link labels per alert type ──────────────────────

const ALERT_META: Record<string, { label: string; action: string }> = {
  NEW_INTAKE: { label: "New study request", action: "Open study" },
  PAYMENT_UPDATE: { label: "Payment update", action: "View payment" },
  COMMERCIAL_UPDATE: { label: "Price and agreement", action: "Review" },
  ASSIGNMENT: { label: "Statistician assigned", action: "Open study" },
  QA_DECISION: { label: "Quality check", action: "Open study" },
  QA_SUBMISSION: { label: "Ready for quality check", action: "Open study" },
  DELIVERABLE_UPDATE: { label: "Your files are ready", action: "Get files" },
  REVISION_REQUEST: { label: "Changes requested", action: "View changes" },
  PRE_DEADLINE: { label: "Deadline coming up", action: "Open study" },
  ETHICAL_BREACH: { label: "Study on hold", action: "Open study" },
  CLAIM_FILED: { label: "Claim filed", action: "View claim" },
  DISPUTE: { label: "Claim update", action: "View claim" },
  NEW_MESSAGE: { label: "New message", action: "Reply" },
  MESSAGE_ALERT: { label: "New message", action: "Reply" },
  STATUS_UPDATE: { label: "Study update", action: "Open study" },
  INPUT_UPDATE: { label: "Study details updated", action: "Open study" },
  OUTPUT_UPDATE: { label: "Results updated", action: "Open study" },
  SLA_ALERT: { label: "Delivery timer", action: "Open study" },
  DEFENSELAB_UPDATE: { label: "DefenseLab update", action: "Open DefenseLab" },
  PAYROLL_UPDATE: { label: "Payroll update", action: "Open payroll" },
  ATTENDANCE_UPDATE: { label: "Timesheet update", action: "Open timesheet" },
  STUDY_DELETION_REQUESTED: { label: "Deletion requested", action: "Review" },
  SECURITY_ALERT: { label: "Security alert", action: "Review" },
  SYSTEM_ALERT: { label: "From JAXIS", action: "Open" },
};

function alertMeta(type: string) {
  return (
    ALERT_META[type] ?? {
      label: type ? type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, " ") : "Update",
      action: "Open",
    }
  );
}

/** Title + link label. Price and agreement alerts share one type, so the message decides which. */
function describeAlert(type: string, message: string): { title: string; action: string } {
  const meta = alertMeta(type);
  if (type === "COMMERCIAL_UPDATE") {
    if (/agreement|statement of work|\bSOW\b/i.test(message)) return { title: "Agreement ready to sign", action: "Review & sign" };
    if (/price|quot/i.test(message)) return { title: "Your price is ready", action: "Review price" };
  }
  return { title: meta.label, action: meta.action };
}

const STUDY_ID = /JAXIS-\d{6}-\d{4}/;

/** "Your price is ready. Review…" under the title "Your price is ready" → "Review…". */
function dropRepeatedTitle(message: string, title: string): string {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const match = message.match(/^(.+?[.!?])\s+(.+)$/s);
  return match && normalize(match[1]!) === normalize(title) ? match[2]! : message;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The study ID has its own line, so drop it (with a leading "for"/"study") from the sentence. */
function stripStudyId(message: string, intakeId: string | null): string {
  const ids = [STUDY_ID.source, intakeId ? escapeRegExp(intakeId) : null].filter(Boolean).join("|");
  return message
    .replace(new RegExp(`\\s*\\(?(?:(?:for|of|on|in)\\s+)?(?:study\\s+)?(?:${ids})\\)?`, "gi"), "")
    .replace(/\s+([.,!?)])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayGroup(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Earlier";
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : "Earlier";
}

/** "Just now", "12m ago", "2:14 PM" (today/yesterday), "Sep 12" (older). */
function shortTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (dayGroup(dateStr) !== "Earlier") return d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    ...(d.getFullYear() === new Date().getFullYear() ? {} : { year: "numeric" }),
  });
}
