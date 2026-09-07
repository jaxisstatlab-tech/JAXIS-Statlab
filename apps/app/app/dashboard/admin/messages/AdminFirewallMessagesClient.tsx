"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  PageHeader,
  Card,
  KpiCard,
  Button,
  Badge,
  LoadingState,
  FormInput,
  FormSelect,
  Toast,
  Pagination,
} from "@repo/ui";
import { getBlockedMessages } from "@/features/messaging/actions";
import type { BlockedMessageLogDTO } from "@/features/messaging/schemas";
import { BlockedMessageReviewModal } from "@/features/messaging/components/BlockedMessageReviewModal";
import {
  IconShieldLock,
  IconRefresh,
  IconEye,
  IconShieldCheck,
  IconMail,
  IconPhone,
  IconCoins,
  IconBrandTelegram,
  IconLink,
} from "@tabler/icons-react";

interface AdminFirewallMessagesClientProps {
  initialData?: {
    logs: BlockedMessageLogDTO[];
    totalCount: number;
    pendingCount: number;
    reviewedCount: number;
  } | null;
}

export function AdminFirewallMessagesClient({
  initialData = null,
}: AdminFirewallMessagesClientProps) {
  const [logs, setLogs] = useState<BlockedMessageLogDTO[]>(initialData?.logs || []);
  const [totalCount, setTotalCount] = useState<number>(initialData?.totalCount || 0);
  const [pendingCount, setPendingCount] = useState<number>(initialData?.pendingCount || 0);
  const [reviewedCount, setReviewedCount] = useState<number>(initialData?.reviewedCount || 0);
  const [isLoading, setIsLoading] = useState<boolean>(!initialData);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<
    "ALL" | "EMAIL" | "PHONE" | "PAYMENT" | "MESSENGER" | "SOCIAL" | "URL"
  >("ALL");
  const [selectedStatus, setSelectedStatus] = useState<
    "ALL" | "PENDING_REVIEW" | "REVIEWED"
  >("ALL");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedStatus]);

  // Review modal
  const [selectedLog, setSelectedLog] = useState<BlockedMessageLogDTO | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getBlockedMessages({
        search: searchQuery,
        category: selectedCategory,
        reviewedStatus: selectedStatus,
        page: currentPage,
        pageSize: pageSize,
      });

      if (res.success && res.data) {
        setLogs(res.data.logs);
        setTotalCount(res.data.totalCount);
        setPendingCount(res.data.pendingCount);
        setReviewedCount(res.data.reviewedCount);
      }
    } catch (err) {
      console.error("Failed to load blocked message logs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedStatus, currentPage, pageSize]);

  useEffect(() => {
    if (!initialData) {
      loadLogs();
    }
  }, [initialData, loadLogs]);

  const handleOpenReview = (log: BlockedMessageLogDTO) => {
    setSelectedLog(log);
    setIsReviewModalOpen(true);
  };

  const handleReviewedSuccess = () => {
    setToastMessage({
      message: "Incident Audit Completed",
      description: "The blocked message log has been marked as reviewed.",
      variant: "success",
    });
    loadLogs();
  };

  const getCategoryIcon = (pattern: string) => {
    if (pattern.includes("EMAIL")) return <IconMail size={14} className="text-sky-400" />;
    if (pattern.includes("PHONE") || pattern.includes("MOBILE")) return <IconPhone size={14} className="text-emerald-400" />;
    if (pattern.includes("PAYMENT") || pattern.includes("WALLET")) return <IconCoins size={14} className="text-amber-400" />;
    if (pattern.includes("MESSENGER") || pattern.includes("SOCIAL")) return <IconBrandTelegram size={14} className="text-purple-400" />;
    return <IconLink size={14} className="text-red-400" />;
  };

  if (isLoading && logs.length === 0) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto font-sans">
        <LoadingState
          variant="page"
          label="Loading Blocked Messages..."
          description="Retrieving flagged communications for review."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          description={toastMessage.description}
          variant={toastMessage.variant}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Standardized PageHeader */}
      <PageHeader
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "AUDIT & SECURITY" },
          { label: "FIREWALL LOGS" },
        ]}
        title="Communication Firewall Audit Desk"
        description="Review all off-platform contact attempts intercepted by the JAXIS communication firewall."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            loading={isLoading}
            className="cursor-pointer text-xs font-semibold rounded-[2px]"
          >
            <IconRefresh size={16} stroke={2} className="mr-1.5" />
            <span>Refresh Logs</span>
          </Button>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <KpiCard
          label="Intercepted Messages"
          value={totalCount}
          variant="red"
          description="Total off-platform attempts blocked"
        />

        <KpiCard
          label="Pending Review"
          value={pendingCount}
          variant="amber"
          description="Requires Admin/CEO audit confirmation"
        />

        <KpiCard
          label="Audit Completed"
          value={reviewedCount}
          variant="emerald"
          description="Logs confirmed and acknowledged"
        />

        <KpiCard
          label="Leak Prevention Rate"
          value="100%"
          variant="sky"
          description="Zero prohibited contact delivered"
        />
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 sm:p-5 bg-[#01142B] border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1 min-w-[240px]">
          <FormInput
            placeholder="Search by matched snippet, sender name, email, or intake ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-48">
            <FormSelect
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as typeof selectedCategory)}
              options={[
                { value: "ALL", label: "All Categories" },
                { value: "EMAIL", label: "Email Addresses" },
                { value: "PHONE", label: "Mobile Numbers" },
                { value: "PAYMENT", label: "E-Wallets & Payments" },
                { value: "MESSENGER", label: "Messaging Apps" },
                { value: "SOCIAL", label: "Social Media Handles" },
                { value: "URL", label: "External Web Links" },
              ]}
              className="text-xs"
            />
          </div>

          <div className="w-44">
            <FormSelect
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)}
              options={[
                { value: "ALL", label: "All Review Statuses" },
                { value: "PENDING_REVIEW", label: "Pending Review" },
                { value: "REVIEWED", label: "Audit Completed" },
              ]}
              className="text-xs"
            />
          </div>
        </div>
      </Card>

      {/* Blocked Messages Table */}
      <Card className="p-0 bg-[#01142B] border-white/10 overflow-hidden shadow-2xl">
        <div className="p-4 sm:p-5 border-b border-white/10 bg-[#010114]/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconShieldLock size={18} stroke={1.5} className="text-[#CC6600]" />
            <h2 className="text-sm font-bold text-white font-sans">
              Intercepted Messages Log ({logs.length})
            </h2>
          </div>
          <span className="text-[0.688rem] font-mono text-white/50">
            Real-Time Firewall Protection Active
          </span>
        </div>

        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center">
            <LoadingState variant="table" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center gap-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <IconShieldCheck size={24} stroke={2} />
            </div>
            <div className="max-w-md">
              <span className="text-sm font-bold text-white block">Zero Intercepted Incidents</span>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">
                No off-platform contact violations matching your filter criteria were detected.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-sans border-collapse">
              <thead className="bg-white/[0.02] border-b border-white/10 text-white/50 text-[0.688rem] font-mono uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Sender</th>
                  <th className="py-3 px-4">Study Intake</th>
                  <th className="py-3 px-4">Violation Rule</th>
                  <th className="py-3 px-4">Flagged Snippet</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono text-white/60 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      <span className="text-white/40">
                        {new Date(log.createdAt).toLocaleTimeString("en-PH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-white">{log.senderName}</span>
                        <span className="text-[0.688rem] text-white/50 font-mono">{log.senderEmail}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5 max-w-[200px]">
                        <span className="font-mono font-bold text-[#CC6600]">{log.intakeId}</span>
                        <span className="text-[0.688rem] text-white/60 truncate" title={log.projectTitle}>
                          {log.projectTitle}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-white/80">
                        {getCategoryIcon(log.detectedPattern)}
                        <span className="font-mono font-medium">{log.detectedPattern.replace(/_/g, " ")}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-[180px]">
                      <span className="px-2 py-1 rounded-[2px] bg-red-950/40 border border-red-500/30 text-red-300 font-mono text-[0.688rem] truncate block" title={log.matchedText}>
                        &ldquo;{log.matchedText}&rdquo;
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {log.reviewedAt ? (
                        <Badge variant="emerald" className="text-[0.625rem] font-mono">
                          Reviewed
                        </Badge>
                      ) : (
                        <Badge variant="amber" className="text-[0.625rem] font-mono">
                          Pending Review
                        </Badge>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenReview(log)}
                        className="cursor-pointer text-xs font-semibold py-1 px-3 rounded-[2px]"
                      >
                        <IconEye size={14} stroke={2} className="mr-1" />
                        <span>Inspect</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalCount > 0 && (
          <div className="border-t border-white/10 p-3 sm:px-6">
            <Pagination
              currentPage={currentPage}
              totalItems={totalCount}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </Card>

      {/* Review Modal */}
      <BlockedMessageReviewModal
        log={selectedLog}
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onReviewed={handleReviewedSuccess}
      />
    </div>
  );
}
