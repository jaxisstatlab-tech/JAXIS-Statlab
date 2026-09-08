"use client";

import React, { useState, useEffect, useCallback, useOptimistic, startTransition, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  LoadingState,
  Toast,
} from "@repo/ui";
import {
  getInAppAlertsAction,
  markAlertReadAction,
  markAllAlertsReadAction,
  deleteAlertAction,
  clearAllAlertsAction,
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
  Trash,
} from "@phosphor-icons/react";

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
  side = "right",
  align = "start",
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
          message: "Notification Removed",
          description: "Alert cleared from your workspace.",
          variant: "info",
        });
      } catch (err) {
        console.error("Failed to delete alert:", err);
        // 3. Roll back state on failure
        setAlerts(prevAlerts);
        setUnreadCount(prevUnreadCount);
        setToastMessage({
          message: "Action Failed",
          description: "Could not remove notification. Please try again.",
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
          message: "Notifications Cleared",
          description: "All alerts have been cleared from your workspace.",
          variant: "success",
        });
      } catch (err) {
        console.error("Failed to clear all alerts:", err);
        // 3. Roll back state on failure
        setAlerts(prevAlerts);
        setUnreadCount(prevUnreadCount);
        setToastMessage({
          message: "Action Failed",
          description: "Could not clear notifications. Please try again.",
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
          className={`w-full flex items-center h-9 rounded-[2px] transition-all duration-150 cursor-pointer outline-none group active:scale-[0.98] overflow-hidden ${
            isOpen
              ? "bg-white/[0.08] text-white border border-white/20"
              : "hover:bg-white/[0.05] text-white/70 hover:text-white border border-transparent"
          } ${className}`}
        >
          {/* Bell Icon: Anchored at center x = 34px */}
          <div className="w-10 h-full shrink-0 flex items-center justify-center relative">
            <Bell
              size={16}
              weight="fill"
              className={`transition-colors duration-150 ${
                isOpen
                  ? "text-[#FFA040]"
                  : optimisticState.unreadCount > 0
                  ? "text-[#FFA040]"
                  : "text-white/40 group-hover:text-white/80"
              } ${isRinging ? "animate-bounce text-[#CC6600]" : ""}`}
            />
            {optimisticState.unreadCount > 0 && (
              <span className="absolute top-1.5 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#CC6600] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#CC6600]" />
              </span>
            )}
          </div>

          {/* Text Label & Badge: Smoothly fades in/out without layout reflow */}
          <div
            className={`flex items-center justify-between flex-1 min-w-0 whitespace-nowrap overflow-hidden transition-all duration-200 ${
              isSidebarCollapsed
                ? "max-w-0 opacity-0 pointer-events-none ml-0 pr-0"
                : "max-w-[200px] opacity-100 ml-1.5 pr-2"
            }`}
          >
            <span className="text-xs font-sans font-medium text-white/70 group-hover:text-white truncate">
              Notifications
            </span>

            {optimisticState.unreadCount > 0 && (
              <span className="bg-[#CC6600] text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] shadow-sm shrink-0">
                {optimisticState.unreadCount > 9 ? "9+" : optimisticState.unreadCount} NEW
              </span>
            )}
          </div>
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
          className={`relative h-8 w-8 rounded-[2px] flex items-center justify-center transition-all duration-150 cursor-pointer outline-none focus:outline-none ring-0 group ${
            isOpen
              ? "bg-white/[0.08] border border-white/25 text-[#FFA040]"
              : "bg-white/[0.03] hover:bg-[#CC6600]/20 border border-white/10 hover:border-[#CC6600]/40 text-white/60 hover:text-[#FFA040]"
          } ${className}`}
        >
          <Bell
            size={16}
            weight="fill"
            className={`transition-transform duration-200 group-hover:scale-105 ${
              isRinging ? "animate-bounce text-[#CC6600]" : ""
            }`}
          />
          {optimisticState.unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#CC6600] opacity-80" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#CC6600] ring-1 ring-[#010114]" />
            </span>
          )}
        </button>
      )}

      {/* Full-Screen Dimmed Backdrop & Slide-out Right Drawer via React Portal */}
      {mounted && typeof document !== "undefined" && createPortal(
        <div
          className={`fixed inset-0 z-[9999] overflow-hidden select-none transition-all duration-300 ease-in-out ${
            isOpen ? "pointer-events-auto visible" : "pointer-events-none invisible"
          }`}
          role="dialog"
          aria-modal="true"
        >
          {/* Dimmed Background Backdrop (Full viewport dimming) */}
          <div
            className={`fixed inset-0 bg-[#010114]/80 backdrop-blur-[4px] transition-opacity duration-300 ease-in-out cursor-pointer ${
              isOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Container Sliding in from the Right Edge */}
          <div
            className={`fixed inset-y-0 right-0 max-w-md w-full bg-[#010114] border-l border-white/[0.08] shadow-2xl flex flex-col justify-between font-sans transition-transform duration-300 ease-in-out will-change-transform z-10 ${
              isOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
          {/* Header (Matching Sidebar Studio Vibe - h-16, #010114, border-white/[0.08]) */}
          <div className="h-16 px-5 border-b border-white/[0.08] flex items-center justify-between bg-[#010114] shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-[2px] bg-[#CC6600]/10 border border-[#CC6600]/30 flex items-center justify-center text-[#FFA040] shrink-0 shadow-sm">
                <Bell
                  size={18}
                  weight="fill"
                  className={optimisticState.unreadCount > 0 ? "text-[#FFA040]" : "text-white/60"}
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white font-sans tracking-wide leading-none">
                    Notifications
                  </h2>
                  {optimisticState.unreadCount > 0 && (
                    <span className="bg-[#CC6600] text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] shadow-sm leading-none">
                      {optimisticState.unreadCount} NEW
                    </span>
                  )}
                </div>
                <span className="text-xs text-white/40 font-sans mt-1">
                  {optimisticState.unreadCount === 0
                    ? "All caught up"
                    : `${optimisticState.unreadCount} unread alert${optimisticState.unreadCount > 1 ? "s" : ""}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {optimisticState.unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs text-white/60 hover:text-white transition-colors px-2.5 py-1 rounded-[2px] hover:bg-white/[0.06] border border-transparent hover:border-white/10 cursor-pointer outline-none active:scale-95"
                  title="Mark all notifications as read"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-[2px] border border-transparent hover:border-white/10 text-white/40 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors cursor-pointer outline-none active:scale-95"
                aria-label="Close notifications"
                title="Close (Esc)"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
          </div>

          {/* Segmented Filter Tabs & Quick Action Strip */}
          <div className="px-5 py-2.5 bg-[#010114] border-b border-white/[0.08] flex items-center justify-between shrink-0">
            <div className="flex items-center p-0.5 rounded-[2px] bg-[#010D1F] border border-white/[0.08] text-xs font-sans w-full">
              {(["ALL", "UNREAD"] as const).map((tab) => {
                const count = tab === "ALL" ? optimisticState.alerts.length : optimisticState.unreadCount;
                const isActive = filterTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilterTab(tab)}
                    className={`flex-1 py-1.5 px-3 text-xs rounded-[2px] transition-all cursor-pointer flex items-center justify-center gap-2 select-none border outline-none active:scale-95 ${
                      isActive
                        ? "bg-[#01142B] border-white/15 text-white font-semibold shadow-sm"
                        : "border-transparent text-white/40 hover:text-white/75 hover:bg-white/[0.03]"
                    }`}
                  >
                    <span>{tab === "ALL" ? "All Alerts" : "Unread"}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-[2px] leading-none ${
                        isActive
                          ? tab === "UNREAD" && count > 0
                            ? "bg-[#CC6600] text-white font-bold"
                            : "bg-white/10 text-white"
                          : "bg-white/[0.04] text-white/30"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alerts Feed */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 scrollbar-thin min-h-0 bg-[#010114]">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <LoadingState variant="inline" label="Loading alerts..." />
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center text-xs text-white/40 gap-3">
                <div className="h-12 w-12 rounded-[2px] bg-[#01142B] border border-white/10 flex items-center justify-center text-white/30">
                  <Tray size={22} weight="fill" />
                </div>
                <span className="font-semibold text-white/70 text-sm font-sans">
                  {filterTab === "UNREAD" ? "No unread alerts" : "No notifications"}
                </span>
                <span className="text-xs text-white/40 font-sans max-w-[260px] leading-relaxed">
                  {filterTab === "UNREAD"
                    ? "You are completely caught up with all activity."
                    : "Study milestones, intake updates, and consultation alerts will appear here."}
                </span>
                {filterTab === "UNREAD" && optimisticState.alerts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterTab("ALL")}
                    className="mt-1 text-xs text-[#FFA040] hover:text-white transition-colors hover:underline cursor-pointer select-none"
                  >
                    View all {optimisticState.alerts.length} notification{optimisticState.alerts.length > 1 ? "s" : ""} →
                  </button>
                )}
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-[2px] transition-all duration-150 flex flex-col gap-2 select-none border text-left group ${
                    alert.isRead
                      ? "bg-[#010D1F]/70 border-white/[0.06] text-white/70 hover:border-white/15 hover:bg-[#010D1F]"
                      : "bg-[#01142B] border-l-[3px] border-l-[#CC6600] border-t-white/10 border-r-white/10 border-b-white/10 text-white shadow-sm hover:border-white/20 hover:bg-[#011833]"
                  }`}
                >
                  {/* Card Header Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-6 h-6 rounded-[2px] bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
                        {getAlertIcon(alert.alertType)}
                      </div>
                      <span className="font-mono text-[10px] uppercase text-white/50 font-semibold tracking-wider truncate">
                        {alert.alertType.replace(/_/g, " ")}
                      </span>
                      {alert.projectIntakeId && (
                        <span className="font-mono text-[10px] text-[#FFA040] bg-[#CC6600]/10 border border-[#CC6600]/25 px-1.5 py-0.2 rounded-[2px] font-bold shrink-0">
                          {alert.projectIntakeId}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                      <span className="text-[10px] text-white/35 font-mono">
                        {new Date(alert.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      {/* Mark as read button */}
                      {!alert.isRead && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkRead(alert.id);
                          }}
                          title="Mark as read"
                          className="text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 p-1 rounded-[2px] transition-colors cursor-pointer outline-none border border-transparent hover:border-emerald-500/20 active:scale-95"
                          aria-label="Mark as read"
                        >
                          <Check size={13} weight="bold" />
                        </button>
                      )}

                      {/* Clear / Delete this individual notification */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAlert(alert.id);
                        }}
                        title="Clear notification"
                        className="text-white/25 hover:text-red-400 hover:bg-red-500/10 p-1 rounded-[2px] transition-colors cursor-pointer outline-none border border-transparent hover:border-red-500/20 active:scale-95 opacity-70 group-hover:opacity-100"
                        aria-label="Clear notification"
                      >
                        <Trash size={13} weight="fill" />
                      </button>
                    </div>
                  </div>

                  {/* Message body */}
                  <p className="text-xs leading-relaxed text-white/85 font-sans">
                    {alert.message}
                  </p>

                  {/* Action link */}
                  {alert.linkUrl && (
                    <div className="pt-1 flex justify-end">
                      <Link
                        href={alert.linkUrl}
                        onClick={() => {
                          if (!alert.isRead) handleMarkRead(alert.id);
                          setIsOpen(false);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-[#FFA040] hover:text-white font-medium transition-colors cursor-pointer group/link hover:underline"
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
          <div className="px-5 py-3 border-t border-white/10 bg-[#010814] flex justify-between items-center text-xs text-white/40 font-sans shrink-0">
            <span className="flex items-center gap-2 text-white/50 select-none">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <span className="font-sans text-[11px] tracking-tight">Live updates active</span>
            </span>

            <div className="flex items-center gap-2">
              {optimisticState.alerts.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2.5 py-1 rounded-[2px] bg-red-950/30 hover:bg-red-900/50 border border-red-500/20 hover:border-red-500/40 text-[11px] text-red-300 font-sans transition-colors cursor-pointer flex items-center gap-1 active:scale-95"
                  title="Clear all notifications"
                >
                  <Trash size={11} weight="fill" />
                  <span>Clear All</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 rounded-[2px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-white/70 hover:text-white font-sans transition-colors cursor-pointer active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
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
