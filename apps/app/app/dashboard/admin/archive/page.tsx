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
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@repo/ui";
import {
  getArchivedProjectsAction,
  purgeExpiredFilesAction,
  getStorageRetentionConfigAction,
} from "@/features/reporting/actions";
import type { ArchivedProjectDTO, StorageRetentionConfigDTO } from "@/features/reporting/schemas";
import {
  IconArchive,
  IconFileText,
  IconSearch,
  IconShieldCheck,
  IconTrash,
  IconX,
  IconEye,
  IconAlertTriangle,
  IconLock,
} from "@tabler/icons-react";

export default function AdminArchivePage() {
  const [archives, setArchives] = useState<ArchivedProjectDTO[]>([]);
  const [retentionConfig, setRetentionConfig] = useState<StorageRetentionConfigDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [packageFilter, setPackageFilter] = useState<string>("ALL");
  const [selectedArchive, setSelectedArchive] = useState<ArchivedProjectDTO | null>(null);
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [isConfirmPurgeOpen, setIsConfirmPurgeOpen] = useState<boolean>(false);

  // Pagination
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
      const [resArchives, resConfig] = await Promise.all([
        getArchivedProjectsAction({
          search,
          packageName: packageFilter,
        }),
        getStorageRetentionConfigAction(),
      ]);

      if (resArchives.success && resArchives.data) {
        setArchives(resArchives.data);
      }
      if (resConfig.success && resConfig.data) {
        setRetentionConfig(resConfig.data);
      }
    } catch (err) {
      console.error("Failed to load archive data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [search, packageFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const paginatedArchives = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return archives.slice(start, start + pageSize);
  }, [archives, currentPage, pageSize]);

  const handleRunPurge = async () => {
    setIsConfirmPurgeOpen(false);
    setIsPurging(true);
    try {
      const res = await purgeExpiredFilesAction();
      if (res.success) {
        const filesDesc = res.purgedFilesCount && res.purgedFilesCount > 0
          ? `Deleted ${res.purgedFilesCount} unprotected files and freed ~${res.freedMB} MB across ${res.purgedCount} expired study records.`
          : res.purgedCount > 0
            ? `Purge check completed for ${res.purgedCount} studies. All files were preserved under active protection rules.`
            : "Storage is already clean. No expired study records reached your cutoff date.";
        setToast({
          variant: "success",
          message: "Storage Purge Completed",
          description: filesDesc,
        });
        loadData();
      } else {
        setToast({
          variant: "danger",
          message: "Purge Failed",
          description: res.error?.message || "Could not execute storage purge.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error executing purge.";
      setToast({ variant: "danger", message: "Error", description: msg });
    } finally {
      setIsPurging(false);
    }
  };

  const retentionDays = retentionConfig?.retentionPeriodDays || 90;

  if (isLoading && archives.length === 0) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto font-sans">
        <LoadingState
          variant="page"
          label="Loading Project Archive..."
          description="Fetching completed studies and storage records."
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
          { label: "PROJECT ARCHIVE" },
        ]}
        title="Project Archive & Retention Vault"
        description={`Search immutable snapshots of completed studies and govern ${retentionDays}-day storage data retention policies.`}
        actions={
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5 text-amber-400 hover:text-amber-300 rounded-[2px] font-sans text-xs font-semibold"
            onClick={() => setIsConfirmPurgeOpen(true)}
            disabled={isPurging}
          >
            <IconTrash size={14} />
            <span>{isPurging ? "Purging Files..." : `Run ${retentionDays}-Day Storage Purge`}</span>
          </Button>
        }
      />

      {/* CEO Policy Indicator Banner */}
      {retentionConfig && (
        <div className="p-4 bg-[#011B38] border border-white/10 rounded-[4px] flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[2px] bg-[#CC6600]/20 text-[#CC6600]">
              <IconShieldCheck size={18} />
            </div>
            <div>
              <span className="font-bold text-white block">
                CEO Active Storage Policy: {retentionConfig.retentionPeriodDays} Days Retention
              </span>
              <span className="text-[0.688rem] text-white/50 block mt-0.5">
                Protected exclusions: {[
                  retentionConfig.keepDatasets && "Datasets",
                  retentionConfig.keepResearchDocs && "Research Docs",
                  retentionConfig.keepQuestionnaires && "Questionnaires",
                  retentionConfig.keepReceiptPhotos && "Receipts",
                  retentionConfig.keepChatHistory && "Messages",
                  retentionConfig.keepDeliverables && "Deliverables",
                ].filter(Boolean).join(" • ")}
              </span>
            </div>
          </div>
          <Badge variant={retentionConfig.autoPurgeEnabled ? "emerald" : "amber"}>
            {retentionConfig.autoPurgeEnabled ? "AUTO-PURGE ACTIVE" : "MANUAL ONLY"}
          </Badge>
        </div>
      )}

      {/* Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <KpiCard
          label="ARCHIVED STUDIES"
          value={archives.length}
          description="Immutable snapshots saved"
        />
        <KpiCard
          label="STORAGE PURGED"
          value={archives.filter((a) => a.filesPurged).length}
          description={`Files purged past ${retentionDays}-day retention`}
        />
        <KpiCard
          label="ACTIVE RETENTION"
          value={archives.filter((a) => !a.filesPurged).length}
          description={`Within ${retentionDays}-day storage window`}
        />
      </div>

      {/* Main Table Card */}
      <Card className="p-6 sm:p-8 flex flex-col gap-6 bg-[#01142B] border border-white/10 rounded-[4px]">
        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-white/10 pb-5">
          {/* Package Filter Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "ALL", label: "All Packages" },
              { id: "JX_01_CORE", label: "Core Consult" },
              { id: "JX_02_START", label: "Standard Stat" },
              { id: "JX_03_COMPRE", label: "Comprehensive" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setPackageFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-[2px] text-xs font-semibold transition-all cursor-pointer ${
                  packageFilter === tab.id
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
            <IconSearch
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              type="text"
              placeholder="Search intake ID, client..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-black/40 border border-white/10 rounded-[2px] pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/30"
            />
          </div>
        </div>

        {/* Archives Table */}
        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <LoadingState variant="table" label="Loading Archive Vault..." description="Fetching immutable study snapshots" />
          </div>
        ) : paginatedArchives.length === 0 ? (
          <div className="py-16 text-center text-white/40 text-xs flex flex-col items-center gap-2">
            <IconArchive size={28} className="text-white/20" />
            <span>No archived study snapshots found matching your criteria.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-black/20 text-white/50 font-mono text-[0.688rem] uppercase tracking-wider">
                  <th className="py-3 px-4">Intake Ref</th>
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Package</th>
                  <th className="py-3 px-4">Archived Date</th>
                  <th className="py-3 px-4">Storage Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {paginatedArchives.map((row) => (
                  <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-mono text-white font-semibold">
                      {row.intakeId}
                    </td>
                    <td className="py-3 px-4 font-sans font-medium text-white">
                      {row.clientName}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="sky" className="text-[0.625rem]">
                        {row.packageName}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono text-white/60 text-[0.688rem]">
                      {new Date(row.archivedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      {row.filesPurged ? (
                        <div className="flex items-center gap-1.5 text-amber-400">
                          <IconTrash size={13} />
                          <span className="text-[0.688rem] font-mono">PURGED</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <IconShieldCheck size={13} />
                          <span className="text-[0.688rem] font-mono">RETAINED</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="secondary"
                        className="text-xs h-7 px-2.5 flex items-center gap-1 ml-auto"
                        onClick={() => setSelectedArchive(row)}
                      >
                        <IconEye size={13} />
                        <span>Inspect Snapshot</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {archives.length > 0 && (
          <div className="border-t border-white/10 pt-4">
            <Pagination
              currentPage={currentPage}
              totalItems={archives.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[5, 10, 20, 50]}
              itemLabel="archived studies"
            />
          </div>
        )}
      </Card>

      {/* Snapshot Inspection Modal */}
      {selectedArchive && (
        <div className="fixed inset-0 z-50 bg-[#010114]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#01142B] border border-white/15 rounded-[4px] max-w-3xl w-full p-6 sm:p-8 flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95 font-sans max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-[2px] bg-sky-500/20 text-sky-400">
                  <IconFileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase">
                    Study Snapshot: {selectedArchive.intakeId}
                  </h3>
                  <span className="text-xs text-white/50">
                    Read-only permanent historical legal & statistical record
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedArchive(null)}
                className="text-white/50 hover:text-white cursor-pointer"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-black/20 rounded-[2px] border border-white/5">
                <span className="text-white/40 block text-[0.688rem]">CLIENT NAME</span>
                <span className="text-white font-semibold mt-0.5 block">{selectedArchive.clientName}</span>
              </div>
              <div className="p-3 bg-black/20 rounded-[2px] border border-white/5">
                <span className="text-white/40 block text-[0.688rem]">PACKAGE</span>
                <span className="text-white font-semibold mt-0.5 block">{selectedArchive.packageName}</span>
              </div>
              <div className="p-3 bg-black/20 rounded-[2px] border border-white/5">
                <span className="text-white/40 block text-[0.688rem]">ARCHIVED AT</span>
                <span className="text-white font-mono mt-0.5 block">{new Date(selectedArchive.archivedAt).toLocaleString()}</span>
              </div>
              <div className="p-3 bg-black/20 rounded-[2px] border border-white/5">
                <span className="text-white/40 block text-[0.688rem]">STORAGE PURGE STATUS</span>
                <span className="text-white font-mono mt-0.5 block">
                  {selectedArchive.filesPurged ? "Files Purged" : "Active In Storage"}
                </span>
              </div>
            </div>

            {/* JSON Snapshot Viewer */}
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[0.688rem] text-white/50 uppercase">
                Raw JSON Snapshot Payload
              </span>
              <pre className="p-4 bg-black/50 border border-white/10 rounded-[2px] font-mono text-[0.688rem] text-sky-300 max-h-60 overflow-y-auto whitespace-pre-wrap">
                {JSON.stringify(selectedArchive.snapshot, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-3 border-t border-white/10">
              <Button variant="secondary" onClick={() => setSelectedArchive(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Styled Purge Confirmation Dialog */}
      <AlertDialog open={isConfirmPurgeOpen} onOpenChange={setIsConfirmPurgeOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-[2px] bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <IconAlertTriangle size={20} />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold text-white font-sans">
                  Confirm Storage File Cleanup
                </AlertDialogTitle>
                <span className="text-xs text-white/50 font-sans block mt-0.5">
                  Reclaiming cloud storage for completed studies past {retentionDays} days
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-3 text-xs font-sans">
              {/* Financial & Project Safety Reassurance */}
              <div className="p-3 bg-[#011E38]/80 border border-emerald-500/30 rounded-[2px] flex items-start gap-2.5">
                <IconShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-white/80 leading-relaxed">
                  <strong className="text-emerald-400 font-semibold block">Finance &amp; Historical Records Remain 100% Safe:</strong>
                  Study project records, client details, payment transactions, GCash/bank proofs, invoices, and accounting ledgers in the Finance Desk are <strong className="text-white">never deleted or modified</strong>.
                </div>
              </div>

              {/* What will be purged vs preserved */}
              <div className="p-3 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <IconTrash size={15} className="text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-white/70 leading-relaxed">
                    <strong className="text-amber-400 font-medium">What gets deleted:</strong> Only raw, unprotected attachment files in Cloudflare R2 storage for completed studies delivered more than <strong className="text-white">{retentionDays} days ago</strong>.
                  </span>
                </div>

                {retentionConfig && (
                  <div className="border-t border-white/5 pt-2 flex items-start gap-2">
                    <IconLock size={15} className="text-sky-400 shrink-0 mt-0.5" />
                    <span className="text-white/60 leading-relaxed text-[0.688rem]">
                      <strong className="text-white/80 font-medium">Currently Protected Categories:</strong>{" "}
                      {[
                        retentionConfig.keepDatasets && "Research Datasets",
                        retentionConfig.keepResearchDocs && "Research Documents",
                        retentionConfig.keepQuestionnaires && "Questionnaires",
                        retentionConfig.keepReceiptPhotos && "Payment Receipts",
                        retentionConfig.keepChatHistory && "Messages",
                        retentionConfig.keepDeliverables && "Final Deliverables",
                      ].filter(Boolean).join(" • ") || "None (all categories eligible)"}
                    </span>
                  </div>
                )}
              </div>

              <span className="text-white/50 text-[0.688rem] italic">
                Note: This operation cannot be undone. Unprotected files will be permanently erased from Cloudflare R2 bucket.
              </span>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-3 gap-2">
            <AlertDialogCancel className="text-xs h-8 px-3 rounded-[2px] font-sans">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRunPurge}
              className="text-xs h-8 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-[2px] font-sans font-semibold cursor-pointer"
            >
              Confirm &amp; Run Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
