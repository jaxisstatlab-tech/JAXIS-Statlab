"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  PageHeader,
  KpiCard,
  Card,
  Badge,
  LoadingState,
  Pagination,
} from "@repo/ui";
import { getAuditLogsAction } from "@/features/reporting/actions";
import type { AuditLogDTO } from "@/features/reporting/schemas";
import {
  IconFileText,
  IconSearch,
  IconShieldCheck,
  IconArrowsExchange,
  IconReceipt,
} from "@tabler/icons-react";
import { useLoadUnlessPreloaded } from "@/hooks/use-load-unless-preloaded";

export function AdminAuditLogClient({ initialLogs }: { initialLogs: AuditLogDTO[] | null }) {
  const [logs, setLogs] = useState<AuditLogDTO[]>(initialLogs ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(initialLogs === null);
  const [search, setSearch] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAuditLogsAction({
        search,
        action: actionFilter,
      });
      if (res.success && res.data) {
        setLogs(res.data);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [search, actionFilter]);

  useLoadUnlessPreloaded(loadData, [search, actionFilter], initialLogs !== null);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return logs.slice(start, start + pageSize);
  }, [logs, currentPage, pageSize]);

  const getActionBadge = (action: string) => {
    if (action.includes("STATUS") || action.includes("TRANSITION")) {
      return (
        <Badge variant="sky" className="text-[0.688rem] font-mono flex items-center gap-1">
          <IconArrowsExchange size={12} />
          <span>STATUS CHANGE</span>
        </Badge>
      );
    }
    if (action.includes("PAYOUT") || action.includes("DISBURSED") || action.includes("PAYMENT")) {
      return (
        <Badge variant="emerald" className="text-[0.688rem] font-mono flex items-center gap-1">
          <IconReceipt size={12} />
          <span>FINANCIAL ACTION</span>
        </Badge>
      );
    }
    if (action.includes("ARCHIVE")) {
      return (
        <Badge variant="amber" className="text-[0.688rem] font-mono flex items-center gap-1">
          <IconFileText size={12} />
          <span>ARCHIVED</span>
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[0.688rem] font-mono">
        {action}
      </Badge>
    );
  };

  if (isLoading && logs.length === 0) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto font-sans">
        <LoadingState
          variant="page"
          label="Loading System Audit Logs..."
          description="Querying immutable activity trail."
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
          { label: "ACTIVITY LOG" },
        ]}
        title="System Activity & Audit Log"
        description="Immutable system-wide ledger of operational status changes, financial disbursements, and admin actions."
      />

      {/* Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <KpiCard
          label="TOTAL AUDIT LOGS"
          value={logs.length}
          description="Recorded system events"
        />
        <KpiCard
          label="STATUS MUTATIONS"
          value={logs.filter((l) => l.action.includes("STATUS") || l.action.includes("TRANSITION")).length}
          description="Project lifecycle transitions"
        />
        <KpiCard
          label="FINANCIAL EVENTS"
          value={logs.filter((l) => l.action.includes("PAYOUT") || l.action.includes("DISBURSED") || l.action.includes("PAYMENT")).length}
          description="Escrow & payout mutations"
        />
      </div>

      {/* Main Table Card */}
      <Card className="p-6 sm:p-8 flex flex-col gap-6 bg-[#0A0A18] border border-white/10 rounded-[4px]">
        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-white/10 pb-5">
          {/* Action Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "ALL", label: "All Events" },
              { id: "STATUS_TRANSITION", label: "Status Changes" },
              { id: "PROJECT_ARCHIVED", label: "Archivals" },
              { id: "FILES_PURGED", label: "Storage Purges" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActionFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-[2px] text-xs font-semibold transition-all ${
                  actionFilter === tab.id
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
              placeholder="Search user, action, reason..."
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
            <LoadingState variant="table" label="Loading System Audit Logs..." description="Querying immutable activity trail" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-xs text-white/40 flex flex-col items-center gap-2">
            <IconShieldCheck size={28} stroke={1.5} className="text-white/20" />
            <span>No activity log entries match your filter.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-black/20 text-white/50 font-mono text-[0.688rem] uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Transition / Context</th>
                  <th className="py-3 px-4">Notes & Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 font-mono text-white/60">
                      {new Date(log.createdAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    {/* Event Type */}
                    <td className="py-3.5 px-4">
                      {getActionBadge(log.action)}
                    </td>

                    {/* Actor */}
                    <td className="py-3.5 px-4">
                      <span className="text-white font-medium block">{log.actorName}</span>
                      <span className="text-[0.688rem] text-white/40 font-mono">{log.actorRole}</span>
                    </td>

                    {/* Transition */}
                    <td className="py-3.5 px-4 font-mono">
                      {log.oldValue && log.newValue ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-white/50">{log.oldValue}</span>
                          <span className="text-sky-400">&rarr;</span>
                          <span className="text-white font-bold">{log.newValue}</span>
                        </div>
                      ) : (
                        <span className="text-white/60">{log.newValue || log.projectId || "—"}</span>
                      )}
                    </td>

                    {/* Reason */}
                    <td className="py-3.5 px-4 text-white/70 max-w-xs truncate">
                      {log.reason || "System recorded event"}
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
    </div>
  );
}
