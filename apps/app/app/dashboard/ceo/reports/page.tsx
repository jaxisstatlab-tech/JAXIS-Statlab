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
  Peso,
  Toast,
} from "@repo/ui";
import {
  getReportDataAction,
  getStorageRetentionConfigAction,
  updateStorageRetentionConfigAction,
} from "@/features/reporting/actions";
import type { ReportType, StorageRetentionConfigDTO } from "@/features/reporting/schemas";
import {
  IconCalendar,
  IconClock,
  IconDownload,
  IconFileSpreadsheet,
  IconFileText,
  IconGavel,
  IconPrinter,
  IconRefresh,
  IconUserCheck,
  IconUsers,
  IconTrendingUp,
  IconSettings,
  IconX,
  IconDeviceFloppy,
  IconDatabase,
} from "@tabler/icons-react";

export default function CeoReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>("revenue-summary");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Storage Retention Policy State (CEO Configurable)
  const [retentionModalOpen, setRetentionModalOpen] = useState<boolean>(false);
  const [retentionConfig, setRetentionConfig] = useState<StorageRetentionConfigDTO>({
    retentionPeriodDays: 90,
    purgeInactiveDays: 180,
    autoPurgeEnabled: true,
    keepDatasets: true,
    keepResearchDocs: true,
    keepQuestionnaires: true,
    keepReceiptPhotos: true,
    keepChatHistory: true,
    keepDeliverables: true,
    updatedAt: "",
    updatedBy: null,
  });
  const [isSavingPolicy, setIsSavingPolicy] = useState<boolean>(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getReportDataAction({
        reportType: selectedReport,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (res.success && res.data) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error("Failed to load CEO report data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedReport, startDate, endDate]);

  const loadRetentionPolicy = useCallback(async () => {
    try {
      const res = await getStorageRetentionConfigAction();
      if (res.success && res.data) {
        setRetentionConfig(res.data);
      }
    } catch (err) {
      console.error("Failed to load retention settings:", err);
    }
  }, []);

  useEffect(() => {
    loadReport();
    loadRetentionPolicy();
    setCurrentPage(1);
  }, [loadReport, loadRetentionPolicy]);

  const handleSaveRetentionPolicy = async () => {
    setIsSavingPolicy(true);
    try {
      const res = await updateStorageRetentionConfigAction({
        retentionPeriodDays: Number(retentionConfig.retentionPeriodDays),
        purgeInactiveDays: Number(retentionConfig.purgeInactiveDays),
        autoPurgeEnabled: Boolean(retentionConfig.autoPurgeEnabled),
        keepDatasets: Boolean(retentionConfig.keepDatasets),
        keepResearchDocs: Boolean(retentionConfig.keepResearchDocs),
        keepQuestionnaires: Boolean(retentionConfig.keepQuestionnaires),
        keepReceiptPhotos: Boolean(retentionConfig.keepReceiptPhotos),
        keepChatHistory: Boolean(retentionConfig.keepChatHistory),
        keepDeliverables: Boolean(retentionConfig.keepDeliverables),
      });

      if (res.success) {
        setToast({
          variant: "success",
          message: "Retention Policy Saved",
          description: `Storage retention window configured to ${retentionConfig.retentionPeriodDays} days with updated file exclusions.`,
        });
        setRetentionModalOpen(false);
        loadRetentionPolicy();
      } else {
        setToast({
          variant: "danger",
          message: "Failed to Save Policy",
          description: res.error?.message || "Could not update policy settings.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unexpected error saving policy.";
      setToast({ variant: "danger", message: "Error", description: msg });
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const reportTypesList: Array<{ id: ReportType; label: string; icon: any; desc: string }> = [
    { id: "revenue-summary", label: "Executive Revenue", icon: IconTrendingUp, desc: "Platform margins & gross profit" },
    { id: "ledger-export", label: "Financial Ledger", icon: IconFileSpreadsheet, desc: "Complete per-study gross & fees" },
    { id: "payout-report", label: "Consultant Payouts", icon: IconDownload, desc: "Specialist milestone disbursements" },
    { id: "expert-performance", label: "Specialist Audit", icon: IconUserCheck, desc: "QA pass rates & team metrics" },
    { id: "turnaround-analytics", label: "Turnaround SLA", icon: IconClock, desc: "SLA compliance & speed analytics" },
    { id: "project-volume", label: "Consultation Volume", icon: IconFileText, desc: "Intake pipeline & active studies" },
    { id: "dispute-refund", label: "Arbitration & Claims", icon: IconGavel, desc: "Claim volume & refund metrics" },
    { id: "client-acquisition", label: "Client Retention", icon: IconUsers, desc: "Researcher loyalty & repeat orders" },
  ];

  const paginatedRecords = useMemo(() => {
    if (!reportData || !reportData.records) return [];
    const start = (currentPage - 1) * pageSize;
    return reportData.records.slice(start, start + pageSize);
  }, [reportData, currentPage, pageSize]);

  const handleExportCSV = () => {
    if (!reportData || !reportData.records || reportData.records.length === 0) return;
    const headers = Object.keys(reportData.records[0]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...reportData.records.map((r: any) =>
          headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `JAXIS_CEO_${selectedReport}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading && !reportData) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
        <LoadingState
          variant="page"
          label="Loading Intelligence Reports..."
          description="Please wait while we load your research workspace"
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
          { label: "EXECUTIVE", href: "/dashboard/ceo" },
          { label: "INTELLIGENCE REPORTS" },
        ]}
        title="Executive Intelligence & Reporting"
        description="Comprehensive business analytics, platform margins, team productivity benchmarks, and financial ledgers."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5 text-amber-400 hover:text-amber-300 rounded-[2px] font-sans text-xs font-semibold"
              onClick={() => setRetentionModalOpen(true)}
            >
              <IconSettings size={15} />
              <span>Storage &amp; Purge Policy</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5 rounded-[2px] font-sans text-xs font-semibold"
              onClick={() => window.print()}
            >
              <IconPrinter size={15} />
              <span>Print / PDF</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="gap-1.5 bg-[#CC6600] hover:bg-[#E67300] text-white rounded-[2px] font-sans text-xs font-semibold"
              onClick={handleExportCSV}
              disabled={!reportData || !reportData.records || reportData.records.length === 0}
            >
              <IconFileSpreadsheet size={15} />
              <span>Export CSV</span>
            </Button>
          </div>
        }
      />

      {/* Report Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {reportTypesList.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedReport === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSelectedReport(item.id)}
              className={`p-3.5 rounded-[4px] border text-left transition-all flex flex-col gap-2 cursor-pointer ${
                isSelected
                  ? "bg-[#011B38] border-[#CC6600] shadow-sm ring-1 ring-[#CC6600]"
                  : "bg-[#01142B] border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-1.5 rounded-[2px] ${isSelected ? "bg-[#CC6600] text-white" : "bg-white/5 text-white/60"}`}>
                  <Icon size={16} />
                </div>
                {isSelected && <Badge variant="emerald" className="text-[0.625rem]">ACTIVE</Badge>}
              </div>
              <div>
                <span className="text-xs font-bold text-white block">{item.label}</span>
                <span className="text-[0.688rem] text-white/50 leading-tight block mt-0.5">{item.desc}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter and Date Range Card */}
      <Card className="p-4 sm:p-5 bg-[#01142B] border border-white/10 rounded-[4px] flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-white/50">
            <IconCalendar size={15} />
            <span>Date Interval:</span>
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-black/30 border border-white/10 rounded-[2px] px-2.5 py-1 text-xs text-white outline-none focus:border-white/30"
          />
          <span className="text-white/30 text-xs">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-black/30 border border-white/10 rounded-[2px] px-2.5 py-1 text-xs text-white outline-none focus:border-white/30"
          />

          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 30);
                setStartDate(d.toISOString().split("T")[0] || "");
                setEndDate(new Date().toISOString().split("T")[0] || "");
              }}
              className="px-2 py-0.5 rounded-[2px] text-[0.688rem] bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => {
                const year = new Date().getFullYear();
                setStartDate(`${year}-01-01`);
                setEndDate(new Date().toISOString().split("T")[0] || "");
              }}
              className="px-2 py-0.5 rounded-[2px] text-[0.688rem] bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
            >
              Year to Date
            </button>
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="px-2 py-0.5 rounded-[2px] text-[0.688rem] bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
            >
              All Time
            </button>
          </div>
        </div>

        <Button
          variant="secondary"
          className="text-xs h-7 px-2.5 flex items-center gap-1"
          onClick={loadReport}
        >
          <IconRefresh size={13} />
          <span>Refresh Data</span>
        </Button>
      </Card>

      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <LoadingState variant="table" label="Compiling Executive Analytics..." description="Querying treasury ledger and operations databases" />
        </div>
      ) : !reportData ? (
        <Card className="p-12 text-center text-xs text-white/40">
          No records found for the selected timeframe.
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Executive Telemetry KPI Cards */}
          {reportData.summary && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {Object.entries(reportData.summary).map(([key, val]: [string, any]) => {
                const isCurrency = key.toLowerCase().includes("revenue") || key.toLowerCase().includes("margin") || key.toLowerCase().includes("payout") || key.toLowerCase().includes("gross") || key.toLowerCase().includes("disbursed");
                const label = key.replace(/([A-Z])/g, " $1").toUpperCase();
                return (
                  <KpiCard
                    key={key}
                    label={label}
                    value={
                      isCurrency ? (
                        <span>
                          <Peso />
                          {Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        String(val)
                      )
                    }
                    description={`Executive metric for ${selectedReport.replace(/-/g, " ")}`}
                  />
                );
              })}
            </div>
          )}

          {/* Granular Report Data Table */}
          <Card className="p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[4px] flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                {selectedReport.replace(/-/g, " ")} Records ({reportData.records?.length || 0})
              </h3>
              <span className="text-[0.688rem] text-white/40 font-mono">
                Verified at {new Date().toLocaleTimeString()}
              </span>
            </div>

            {paginatedRecords.length === 0 ? (
              <div className="py-12 text-center text-xs text-white/40">
                No matching records in this interval.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-black/20 text-white/50 font-mono text-[0.688rem] uppercase tracking-wider">
                      {Object.keys(paginatedRecords[0]).map((col) => (
                        <th key={col} className="py-3 px-4">
                          {col.replace(/([A-Z])/g, " $1")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white/80">
                    {paginatedRecords.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        {Object.entries(row).map(([key, cell]: [string, any], cIdx) => {
                          const isMoney = key.toLowerCase().includes("revenue") || key.toLowerCase().includes("margin") || key.toLowerCase().includes("payout") || key.toLowerCase().includes("amount") || key.toLowerCase().includes("gross") || key.toLowerCase().includes("fee") || key.toLowerCase().includes("share");
                          return (
                            <td key={cIdx} className="py-3 px-4 font-sans">
                              {isMoney && typeof cell === "number" ? (
                                <span className="font-mono text-white font-semibold">
                                  <Peso />
                                  {cell.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </span>
                              ) : typeof cell === "boolean" ? (
                                cell ? (
                                  <Badge variant="emerald">YES</Badge>
                                ) : (
                                  <Badge variant="danger">NO</Badge>
                                )
                              ) : (
                                <span className={key.toLowerCase().includes("id") ? "font-mono text-white" : ""}>
                                  {String(cell ?? "—")}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {reportData.records?.length > 0 && (
              <div className="border-t border-white/10 pt-4">
                <Pagination
                  currentPage={currentPage}
                  totalItems={reportData.records.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  pageSizeOptions={[5, 10, 20, 50]}
                  itemLabel="records"
                />
              </div>
            )}
          </Card>
        </div>
      )}

      {/* CEO Storage Retention & Data Purge Policy Modal */}
      {retentionModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#010114]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#01142B] border border-white/15 rounded-[4px] max-w-2xl w-full p-6 sm:p-8 flex flex-col gap-6 shadow-2xl animate-in fade-in zoom-in-95 font-sans max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-[2px] bg-[#CC6600]/15 text-[#CC6600]">
                  <IconDatabase size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Storage Retention & Purge Policy</h3>
                  <span className="text-xs text-white/50">
                    Configure data retention timeframes and protect key research documents from deletion.
                  </span>
                </div>
              </div>
              <button
                onClick={() => setRetentionModalOpen(false)}
                className="text-white/50 hover:text-white cursor-pointer"
              >
                <IconX size={20} />
              </button>
            </div>

            {/* Form Content */}
            <div className="flex flex-col gap-6 text-xs">
              {/* Retention Timeframe */}
              <div className="p-4 bg-black/30 border border-white/10 rounded-[4px] flex flex-col gap-4">
                <span className="font-mono text-[0.688rem] uppercase text-sky-400 font-bold tracking-wider">
                  Retention Timeframe Settings
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Delivered Projects Retention */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-white/80 font-semibold">
                      Completed Studies Retention (Days):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={3650}
                        value={retentionConfig.retentionPeriodDays}
                        onChange={(e) =>
                          setRetentionConfig({
                            ...retentionConfig,
                            retentionPeriodDays: Math.max(1, Number(e.target.value)),
                          })
                        }
                        className="bg-black/50 border border-white/15 rounded-[2px] px-3 py-1.5 text-xs text-white font-mono w-24 outline-none focus:border-[#CC6600]"
                      />
                      <span className="text-white/50 text-[0.688rem]">
                        ({(retentionConfig.retentionPeriodDays / 30).toFixed(1)} months post-delivery)
                      </span>
                    </div>
                    <span className="text-[0.625rem] text-white/40 leading-relaxed">
                      Files will be queued for purge after this many days from delivery completion.
                    </span>
                  </div>

                  {/* Inactive Studies Retention */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-white/80 font-semibold">
                      Inactive Studies Retention (Days):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={3650}
                        value={retentionConfig.purgeInactiveDays}
                        onChange={(e) =>
                          setRetentionConfig({
                            ...retentionConfig,
                            purgeInactiveDays: Math.max(1, Number(e.target.value)),
                          })
                        }
                        className="bg-black/50 border border-white/15 rounded-[2px] px-3 py-1.5 text-xs text-white font-mono w-24 outline-none focus:border-[#CC6600]"
                      />
                      <span className="text-white/50 text-[0.688rem]">
                        ({(retentionConfig.purgeInactiveDays / 30).toFixed(1)} months of inactivity)
                      </span>
                    </div>
                    <span className="text-[0.625rem] text-white/40 leading-relaxed">
                      Unpaid drafts and abandoned consultations without recent activity.
                    </span>
                  </div>
                </div>

                {/* Automatic Purge Engine Toggle */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">Enable Automated Daily Purge Schedule</span>
                    <span className="text-[0.688rem] text-white/40">
                      Runs background storage cleanup automatically per policy schedule.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setRetentionConfig({
                        ...retentionConfig,
                        autoPurgeEnabled: !retentionConfig.autoPurgeEnabled,
                      })
                    }
                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors cursor-pointer ${
                      retentionConfig.autoPurgeEnabled ? "bg-[#CC6600]" : "bg-white/20"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        retentionConfig.autoPurgeEnabled ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Categorical File Protection Checkboxes */}
              <div className="p-4 bg-black/30 border border-white/10 rounded-[4px] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[0.688rem] uppercase text-emerald-400 font-bold tracking-wider">
                    Protected File Categories (Do Not Purge)
                  </span>
                  <span className="text-[0.625rem] text-white/40">
                    Checked items will NEVER be deleted during automated purges
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {[
                    {
                      key: "keepDatasets",
                      label: "Research Datasets & Codebooks",
                      desc: "Raw & cleaned CSV, Excel, SPSS (.sav) data files",
                    },
                    {
                      key: "keepResearchDocs",
                      label: "Chapters 1–3 & Methodology Drafts",
                      desc: "Theoretical frameworks and proposal documents",
                    },
                    {
                      key: "keepQuestionnaires",
                      label: "Survey Questionnaires & Instruments",
                      desc: "Google Forms, Likert scales, test instruments",
                    },
                    {
                      key: "keepReceiptPhotos",
                      label: "Payment Receipts & Deposit Proofs",
                      desc: "Bank transfer & e-wallet screenshots for tax audit",
                    },
                    {
                      key: "keepChatHistory",
                      label: "Study Messages & Communication Logs",
                      desc: "Researcher-statistician message threads",
                    },
                    {
                      key: "keepDeliverables",
                      label: "Final Deliverable Output Reports",
                      desc: "APA-compliant statistical tables & final writeups",
                    },
                  ].map((item) => {
                    const isChecked = (retentionConfig as any)[item.key];
                    return (
                      <label
                        key={item.key}
                        className={`p-3 rounded-[3px] border flex items-start gap-3 cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-[#011B38] border-white/20 text-white"
                            : "bg-black/20 border-white/5 text-white/60 hover:bg-white/[0.02]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            setRetentionConfig({
                              ...retentionConfig,
                              [item.key]: e.target.checked,
                            })
                          }
                          className="mt-0.5 accent-[#CC6600] cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-white">{item.label}</span>
                          <span className="text-[0.625rem] text-white/40 leading-tight mt-0.5">
                            {item.desc}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-white/10">
              <span className="text-[0.688rem] text-white/40 font-mono">
                Executive Storage Governance Policy
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setRetentionModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="bg-[#CC6600] flex items-center gap-1.5"
                  onClick={handleSaveRetentionPolicy}
                  disabled={isSavingPolicy}
                >
                  <IconDeviceFloppy size={14} />
                  <span>{isSavingPolicy ? "Saving Policy..." : "Save Retention Policy"}</span>
                </Button>
              </div>
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
