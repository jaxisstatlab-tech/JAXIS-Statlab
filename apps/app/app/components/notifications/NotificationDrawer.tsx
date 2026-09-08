"use client";

import React, { useState, useEffect, useCallback, useOptimistic, startTransition, useRef } from "react";
import Link from "next/link";
import {
  LoadingState,
  Toast,
} from "@repo/ui";
import {
  getInAppAlertsAction,
  markAlertReadAction,
  markAllAlertsReadAction,
} from "@/features/notifications/actions";
import type { InAppAlertDTO } from "@/features/notifications/schemas";
import {
  Bell,
  Check,
  Clock,
  FileText,
  Gavel,
  ShieldCheck,
  X,
  ArrowRight,
  Warning,
  Tray,
  CreditCard,
  Receipt,
  UserCheck,
  Package,
  ArrowCounterClockwise,
} from "@phosphor-icons/react";

type NotificationState = {
  alerts: InAppAlertDTO[];
  unreadCount: number;
};

type OptimisticAction =
  | { type: "MARK_READ"; alertId: string }
  | { type: "MARK_ALL_READ" };

export function NotificationDrawer() {
  const [isOpen, setIsOpen] = useState(false);
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
              message: latestAlert.alertType?.replace(/_/g, " ") || "New Notification",
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
              message: newAlert.title || "New Notification",
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
          message: "Sync Failed",
          description: "Could not update notification. Please try again.",
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
          message: "All Marked as Read",
          description: "All unread notifications have been marked as read.",
          variant: "success",
        });
      } catch (err) {
        console.error("Failed to mark all as read:", err);
        // 3. Roll back state on failure
        setAlerts(prevAlerts);
        setUnreadCount(prevUnreadCount);
        setToastMessage({
          message: "Sync Failed",
          description: "Could not update notifications. Please try again.",
          variant: "danger",
        });
      }
    });
  };

  const filteredAlerts = optimisticState.alerts.filter((a) => {
    if (filterTab === "UNREAD") return !a.isRead;
    return true;
  });

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "NEW_INTAKE":
        return <Tray size={16} weight="fill" className="text-sky-400" />;
      case "PAYMENT_UPDATE":
        return <CreditCard size={16} weight="fill" className="text-emerald-400" />;
      case "COMMERCIAL_UPDATE":
        return <Receipt size={16} weight="fill" className="text-amber-400" />;
      case "ASSIGNMENT":
        return <UserCheck size={16} weight="fill" className="text-sky-400" />;
      case "QA_DECISION":
      case "QA_SUBMISSION":
        return <ShieldCheck size={16} weight="fill" className="text-emerald-400" />;
      case "DELIVERABLE_UPDATE":
        return <Package size={16} weight="fill" className="text-emerald-400" />;
      case "REVISION_REQUEST":
        return <ArrowCounterClockwise size={16} weight="bold" className="text-amber-400" />;
      case "PRE_DEADLINE":
        return <Clock size={16} weight="fill" className="text-amber-400" />;
      case "ETHICAL_BREACH":
        return <Warning size={16} weight="fill" className="text-red-400" />;
      case "CLAIM_FILED":
      case "DISPUTE":
        return <Gavel size={16} weight="fill" className="text-[#CC6600]" />;
      default:
        return <FileText size={16} weight="fill" className="text-white/60" />;
    }
  };

  const getActionLabel = (type: string) => {
    switch (type) {
      case "DELIVERABLE_UPDATE":
        return "View Deliverables";
      case "REVISION_REQUEST":
        return "Review Revisions";
      case "DISPUTE":
      case "CLAIM_FILED":
        return "View Dispute";
      case "PAYMENT_UPDATE":
        return "View Payment";
      default:
        return "Open Workspace";
    }
  };

  return (
    <>
      {/* Sleek Precision Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadAlerts();
        }}
        aria-label="Notifications"
        title="Notifications"
        className={`relative h-9 w-9 rounded-[2px] flex items-center justify-center transition-all duration-150 cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ring-0 group ${
          isOpen
            ? "bg-white/[0.08] border border-white/25 text-white"
            : "bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 text-white/70 hover:text-white"
        }`}
      >
        <Bell
          size={17}
          weight="fill"
          className={`transition-transform duration-200 group-hover:scale-105 ${
            isRinging ? "animate-bounce text-[#CC6600]" : ""
          }`}
        />
        {optimisticState.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[17px] h-4 px-1 rounded-[2px] bg-[#CC6600] text-white font-mono text-[0.625rem] font-bold tracking-tight shadow-sm border border-[#010114]">
            {optimisticState.unreadCount > 9 ? "9+" : optimisticState.unreadCount}
          </span>
        )}
      </button>

      {/* Slide-out Drawer Backdrop & Panel with Bi-directional Open & Close Animations */}
      <div
        className={`fixed inset-0 z-50 overflow-hidden select-none transition-all duration-300 ease-in-out ${
          isOpen ? "pointer-events-auto visible" : "pointer-events-none invisible"
        }`}
      >
        {/* Backdrop Fade In / Fade Out */}
        <div
          className={`absolute inset-0 bg-[#010114]/70 backdrop-blur-sm transition-opacity duration-300 ease-in-out cursor-pointer ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsOpen(false)}
        />

        {/* Drawer Container Slide In / Slide Out */}
        <div
          className={`absolute inset-y-0 right-0 max-w-md w-full bg-[#01142B] border-l border-white/10 shadow-2xl flex flex-col justify-between font-sans transition-transform duration-300 ease-in-out will-change-transform ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#010E1F]/90">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-[2px] bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/70">
                <Bell size={16} weight="fill" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm font-bold text-white font-sans leading-none tracking-tight">Notifications</h2>
                <span className="text-[0.688rem] text-white/40 font-sans mt-0.5">
                  {optimisticState.unreadCount === 0
                    ? "No unread alerts"
                    : `${optimisticState.unreadCount} unread ${optimisticState.unreadCount === 1 ? "alert" : "alerts"}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {optimisticState.unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs text-white/60 hover:text-white transition-colors px-2 py-1 rounded-[2px] hover:bg-white/[0.04] cursor-pointer outline-none focus:outline-none focus:ring-0 ring-0"
                >
                  Mark all as read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-[2px] border border-transparent hover:border-white/10 text-white/40 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors cursor-pointer outline-none focus:outline-none focus:ring-0 ring-0"
                aria-label="Close notifications"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
          </div>

          {/* Segmented Filter Tabs */}
          <div className="px-5 py-2.5 bg-[#010915]/60 border-b border-white/10">
            <div className="flex items-center p-0.5 rounded-[2px] bg-[#010915] border border-white/10 text-xs font-mono">
              {(["ALL", "UNREAD"] as const).map((tab) => {
                const count = tab === "ALL" ? optimisticState.alerts.length : optimisticState.unreadCount;
                const isActive = filterTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilterTab(tab)}
                    className={`flex-1 py-1 px-3 text-[0.688rem] font-medium rounded-[2px] transition-colors cursor-pointer flex items-center justify-center gap-1.5 select-none border-0 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ring-0 ${
                      isActive
                        ? "bg-white/[0.08] text-white font-semibold"
                        : "text-white/40 hover:text-white/70 hover:bg-white/[0.02]"
                    }`}
                  >
                    <span>{tab === "ALL" ? "All" : "Unread"}</span>
                    <span
                      className={`text-[0.625rem] px-1 py-0.2 rounded font-mono ${
                        isActive ? "bg-white/10 text-white/80" : "text-white/30"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alerts List */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 custom-scrollbar">
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
                <LoadingState variant="inline" label="Checking notifications..." />
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="flex-1 min-h-full my-auto flex flex-col items-center justify-center text-center text-xs text-white/40 gap-3 px-6 py-16">
                <div className="h-12 w-12 rounded-[2px] bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/30">
                  <Tray size={24} weight="fill" />
                </div>
                <div className="flex flex-col gap-1 max-w-[260px]">
                  <span className="font-semibold text-white/70 text-xs font-sans">
                    {filterTab === "UNREAD" ? "All Caught Up" : "No Notifications Yet"}
                  </span>
                  <span className="text-[0.688rem] leading-relaxed text-white/40 font-sans">
                    {filterTab === "UNREAD"
                      ? "You have zero unread alerts right now."
                      : "You will receive updates here regarding your research studies and review milestones."}
                  </span>
                </div>
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-[2px] transition-all duration-150 flex flex-col gap-2 select-none border ${
                    alert.isRead
                      ? "bg-[#01142B]/70 border-white/[0.06] text-white/70 hover:border-white/15 hover:bg-[#01142B]"
                      : "bg-[#011B38] border-l-[3px] border-l-[#CC6600] border-t-white/10 border-r-white/10 border-b-white/10 text-white shadow-sm hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getAlertIcon(alert.alertType)}
                      <span className="font-mono text-[0.688rem] uppercase text-white/50 font-semibold tracking-wider">
                        {alert.alertType.replace(/_/g, " ")}
                      </span>
                      {alert.projectIntakeId && (
                        <span className="font-mono text-[0.688rem] text-white/80 font-semibold">
                          {alert.projectIntakeId}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[0.625rem] text-white/40 font-mono">
                        {new Date(alert.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {!alert.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(alert.id)}
                          title="Mark as read"
                          className="text-white/40 hover:text-emerald-400 p-0.5 transition-colors cursor-pointer outline-none focus:outline-none focus:ring-0 ring-0"
                        >
                          <Check size={14} weight="bold" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed text-white/85 font-sans">
                    {alert.message}
                  </p>

                  {alert.linkUrl && (
                    <div className="pt-1 flex justify-end">
                      <Link
                        href={alert.linkUrl}
                        onClick={() => {
                          if (!alert.isRead) handleMarkRead(alert.id);
                          setIsOpen(false);
                        }}
                        className="inline-flex items-center gap-1 text-[0.688rem] text-white/70 hover:text-white font-medium transition-colors cursor-pointer group/link hover:underline"
                      >
                        <span>{getActionLabel(alert.alertType)}</span>
                        <ArrowRight
                          size={12}
                          weight="bold"
                          className="transition-transform group-hover/link:translate-x-0.5"
                        />
                      </Link>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 border-t border-white/10 bg-[#010E1F]/90 flex justify-between items-center text-xs text-white/40 font-sans">
            <span className="flex items-center gap-1.5">
              <Bell size={13} weight="fill" className="text-white/30" />
              <span>Study updates and alerts</span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 rounded-[2px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-white/60 hover:text-white font-sans transition-colors cursor-pointer outline-none focus:outline-none focus:ring-0 ring-0"
            >
              Close
            </button>
          </div>
        </div>
      </div>

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
