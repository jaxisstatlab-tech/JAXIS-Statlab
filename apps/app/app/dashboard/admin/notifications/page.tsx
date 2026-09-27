"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  PageHeader,
  KpiCard,
  Card,
  Badge,
  Button,
  LoadingState,
  Pagination,
  Toast,
} from "@repo/ui";
import {
  getNotificationLogsAction,
  retryFailedNotificationAction,
} from "@/features/notifications/actions";
import type {
  NotificationLogDTO,
  NotificationSummaryDTO,
} from "@/features/notifications/schemas";
import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconFileText,
  IconMail,
  IconRefresh,
  IconSearch,
  IconShieldCheck,
  IconX,
  IconSend,
} from "@tabler/icons-react";

export default function AdminNotificationsPage() {
  const [logs, setLogs] = useState<NotificationLogDTO[]>([]);
  const [summary, setSummary] = useState<NotificationSummaryDTO>({
    totalSent: 0,
    totalFailed: 0,
    totalRetrying: 0,
    totalAlerts: 0,
    unreadAlerts: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusTab, setStatusTab] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<NotificationLogDTO | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

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
      const res = await getNotificationLogsAction({
        status: statusTab,
        search,
      });
      if (res.success && res.data) {
        setLogs(res.data.logs);
        setSummary(res.data.summary);
      } else {
        setToast({
          variant: "danger",
          message: "Failed to Load Logs",
          description: res.error?.message || "Could not retrieve email delivery logs.",
        });
      }
    } catch (err) {
      console.error("Failed to load notification logs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [statusTab, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return logs.slice(start, start + pageSize);
  }, [logs, currentPage, pageSize]);

  const handleRetryEmail = async (logId: string) => {
    setIsRetrying(true);
    try {
      const res = await retryFailedNotificationAction(logId);
      if (res.success) {
        setToast({
          variant: "success",
          message: "Email Re-sent",
          description: "Notification was successfully dispatched.",
        });
        setSelectedLog(null);
        loadData();
      } else {
        setToast({
          variant: "danger",
          message: "Retry Failed",
          description: res.error?.message || "Could not deliver email.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setToast({
        variant: "danger",
        message: "Error",
        description: msg,
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SENT":
        return (
          <Badge variant="emerald" className="text-[0.688rem] font-mono flex items-center gap-1">
            <IconCheck size={13} stroke={2} />
            <span>Delivered</span>
          </Badge>
        );
      case "RETRYING":
        return (
          <Badge variant="amber" className="text-[0.688rem] font-mono flex items-center gap-1">
            <IconClock size={13} stroke={2} />
            <span>Retrying</span>
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="danger" className="text-[0.688rem] font-mono flex items-center gap-1">
            <IconAlertTriangle size={13} stroke={2} />
            <span>Failed</span>
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading && !summary) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto font-sans">
        <LoadingState
          variant="page"
          label="Loading Email Delivery Logs..."
          description="Querying notification logs database."
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
          { label: "OPERATIONS", href: "/dashboard/admin" },
          { label: "EMAIL LOGS" },
        ]}
        title="Email Delivery Logs"
        description="Monitor transactional email deliveries, audit delivery failures, and trigger manual re-sends."
      />

      {/* KPI Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-6">
        <KpiCard
          label="EMAILS DELIVERED"
          value={summary.totalSent}
          description="Successful client notifications"
        />
        <KpiCard
          label="FAILED DELIVERIES"
          value={summary.totalFailed}
          description="Delivery errors requiring review"
        />
        <KpiCard
          label="ACTIVE RETRIES"
          value={summary.totalRetrying}
          description="Automatic retry queue"
        />
        <KpiCard
          label="IN-APP ALERTS"
          value={summary.totalAlerts}
          description="Total topbar alerts recorded"
        />
      </div>

      {/* Main Table Card */}
      <Card className="p-6 sm:p-8 flex flex-col gap-6 bg-[#0A0A18] border border-white/10 rounded-[4px]">
        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-white/10 pb-5">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "ALL", label: "All Logs" },
              { id: "SENT", label: "Delivered" },
              { id: "FAILED", label: "Failed" },
              { id: "RETRYING", label: "Retrying" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusTab(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-[2px] text-xs font-semibold transition-all ${
                  statusTab === tab.id
                    ? "bg-[#CC6600] text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search email, recipient, or template..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-black/30 border border-white/10 rounded-[2px] pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/30 w-full"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <LoadingState variant="table" label="Loading Email Delivery Logs..." description="Querying notification logs database" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-xs text-white/40 flex flex-col items-center gap-2">
            <IconShieldCheck size={28} stroke={1.5} className="text-white/20" />
            <span>No email delivery logs match the selected filter.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-black/20 text-white/50 font-mono text-[0.688rem] uppercase tracking-wider">
                  <th className="py-3 px-4">Template</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Study</th>
                  <th className="py-3 px-4 text-center">Attempts</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Sent Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Template */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <IconMail size={15} className="text-sky-400 shrink-0" />
                        <span>{log.template}</span>
                      </div>
                    </td>

                    {/* Recipient */}
                    <td className="py-3.5 px-4">
                      <span className="text-white/90 font-medium block">{log.recipientName}</span>
                      <span className="text-[0.688rem] text-white/40 font-mono">{log.email}</span>
                    </td>

                    {/* Study */}
                    <td className="py-3.5 px-4 font-mono text-white/70">
                      {log.projectIntakeId || "N/A"}
                    </td>

                    {/* Attempts */}
                    <td className="py-3.5 px-4 text-center font-mono text-white/70">
                      {log.attemptCount} / 3
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(log.status)}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 font-mono text-white/60">
                      {new Date(log.sentAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {log.status === "FAILED" && (
                          <Button
                            variant="secondary"
                            className="text-xs h-7 px-2.5 text-amber-400 hover:text-amber-300 flex items-center gap-1"
                            onClick={() => handleRetryEmail(log.id)}
                            disabled={isRetrying}
                          >
                            <IconRefresh size={13} />
                            <span>Retry</span>
                          </Button>
                        )}

                        <Button
                          variant="secondary"
                          className="text-xs h-7 px-2.5"
                          onClick={() => setSelectedLog(log)}
                        >
                          Details
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && logs.length > 0 && (
          <div className="border-t border-white/10 pt-4">
            <Pagination
              currentPage={currentPage}
              totalItems={logs.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[5, 10, 20, 50]}
              itemLabel="logs"
            />
          </div>
        )}
      </Card>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-[#010114]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A0A18] border border-white/15 rounded-[4px] max-w-xl w-full p-6 sm:p-8 flex flex-col gap-6 shadow-2xl animate-in fade-in zoom-in-95 font-sans">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <IconFileText size={22} className="text-sky-400" />
                <h3 className="text-base font-bold text-white">Email Delivery Details</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-white/50 hover:text-white"
              >
                <IconX size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-black/30 p-4 rounded-[2px] border border-white/10">
                <div>
                  <span className="text-white/40 block">Recipient</span>
                  <span className="text-white font-semibold">{selectedLog.recipientName}</span>
                  <span className="text-white/50 block font-mono text-[0.688rem]">{selectedLog.email}</span>
                </div>
                <div>
                  <span className="text-white/40 block">Template</span>
                  <span className="text-sky-400 font-mono font-bold">{selectedLog.template}</span>
                </div>
                <div>
                  <span className="text-white/40 block">Delivery Status</span>
                  <span>{getStatusBadge(selectedLog.status)}</span>
                </div>
                <div>
                  <span className="text-white/40 block">Attempt Count</span>
                  <span className="text-white font-mono">{selectedLog.attemptCount} of 3</span>
                </div>
                <div>
                  <span className="text-white/40 block">Study Intake ID</span>
                  <span className="text-white font-mono">{selectedLog.projectIntakeId || "N/A"}</span>
                </div>
                <div>
                  <span className="text-white/40 block">Timestamp</span>
                  <span className="text-white/70 font-mono">{new Date(selectedLog.sentAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Error Message if any */}
              {selectedLog.errorMessage && (
                <div className="flex flex-col gap-1.5">
                  <span className="font-semibold text-red-400">Error Information:</span>
                  <p className="p-3 bg-red-500/10 border border-red-500/30 rounded-[2px] text-red-300 font-mono text-[0.688rem] leading-relaxed break-words">
                    {selectedLog.errorMessage}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-white/10">
              {selectedLog.status === "FAILED" ? (
                <Button
                  variant="primary"
                  className="text-xs flex items-center gap-1.5 bg-[#CC6600]"
                  onClick={() => handleRetryEmail(selectedLog.id)}
                  disabled={isRetrying}
                >
                  <IconSend size={14} />
                  <span>{isRetrying ? "Retrying..." : "Resend Email Now"}</span>
                </Button>
              ) : (
                <span className="text-xs text-white/40">Delivered successfully.</span>
              )}

              <Button
                variant="secondary"
                onClick={() => setSelectedLog(null)}
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
