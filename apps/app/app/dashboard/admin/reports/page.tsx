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
} from "@repo/ui";
import { getReportDataAction } from "@/features/reporting/actions";
import type { ReportType } from "@/features/reporting/schemas";
import {
  IconCalendar,
  IconChartBar,
  IconClock,
  IconDownload,
  IconFileSpreadsheet,
  IconFileText,
  IconGavel,
  IconPrinter,
  IconRefresh,
  IconUserCheck,
  IconUsers,
} from "@tabler/icons-react";

export default function AdminReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>("revenue-summary");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

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
      console.error("Failed to load report data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedReport, startDate, endDate]);

  useEffect(() => {
    loadReport();
    setCurrentPage(1);
  }, [loadReport]);

  const reportTypesList: Array<{ id: ReportType; label: string; icon: any; desc: string }> = [
    { id: "revenue-summary", label: "Revenue Summary", icon: IconChartBar, desc: "Gross income & commission shares" },
    { id: "expert-performance", label: "Staff Performance", icon: IconUserCheck, desc: "QA pass rates & turnaround" },
    { id: "project-volume", label: "Study Volume", icon: IconFileText, desc: "Intake volume & completion status" },
    { id: "turnaround-analytics", label: "Turnaround Analytics", icon: IconClock, desc: "SLA on-time delivery rates" },
    { id: "dispute-refund", label: "Claims & Disputes", icon: IconGavel, desc: "Dispute breakdown & resolutions" },
    { id: "client-acquisition", label: "Client Growth", icon: IconUsers, desc: "New vs repeat researchers" },
    { id: "ledger-export", label: "Treasury Ledger", icon: IconFileSpreadsheet, desc: "Granular per-study financials" },
    { id: "payout-report", label: "Specialist Payouts", icon: IconDownload, desc: "Disbursements & settlements" },
  ];

  const paginatedRecords = useMemo(() => {
    if (!reportData || !reportData.records) return [];
    const start = (currentPage - 1) * pageSize;
    return reportData.records.slice(start, start + pageSize);
  }, [reportData, currentPage, pageSize]);

  // Export to CSV
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
    link.setAttribute("download", `JAXIS_${selectedReport}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading && !reportData) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
        <LoadingState
          variant="page"
          label="Loading System Reports..."
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
          { label: "OPERATIONS", href: "/dashboard/admin" },
          { label: "SYSTEM REPORTS" },
        ]}
        title="Operational & Financial Reports"
        description="Select from 8 standardized analytical reports, configure date intervals, and export audited summaries."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5 rounded-[2px] font-sans text-xs font-semibold"
              onClick={handlePrint}
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

      {/* Report Selector Grid */}
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
            <span>Date Range:</span>
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

          {/* Quick Presets */}
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
          <LoadingState variant="table" label="Generating Report..." description="Aggregating study records and computing statistics" />
        </div>
      ) : !reportData ? (
        <Card className="p-12 text-center text-xs text-white/40">
          No data available for the selected parameters.
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Summary Telemetry KPI Cards */}
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
                    description={`Aggregated for ${selectedReport.replace(/-/g, " ")}`}
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
                Generated {new Date().toLocaleTimeString()}
              </span>
            </div>

            {paginatedRecords.length === 0 ? (
              <div className="py-12 text-center text-xs text-white/40">
                No matching records found in this interval.
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
    </div>
  );
}
