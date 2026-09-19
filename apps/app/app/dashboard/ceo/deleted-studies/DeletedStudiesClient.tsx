"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  PageHeader,
  KpiCard,
  Card,
  Button,
  Badge,
  Modal,
  CopyButton,
  Toast,
  LoadingState,
  EmptyState,
} from "@repo/ui";
import {
  ShieldCheck,
  FileText,
  ArrowsClockwise,
  MagnifyingGlass,
  X,
  Code,
  CheckCircle,
} from "@phosphor-icons/react";
import { getDeletedStudiesHistoryAction } from "@/features/reporting/actions";
import type {
  DeletedStudiesHistoryResponseDTO,
  DeletedStudyHistoryItemDTO,
} from "@/features/reporting/schemas";

interface DeletedStudiesClientProps {
  initialData: DeletedStudiesHistoryResponseDTO;
}

export function DeletedStudiesClient({ initialData }: DeletedStudiesClientProps) {
  const [data, setData] = useState<DeletedStudiesHistoryResponseDTO>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<"ALL" | "ADMIN" | "CEO">("ALL");
  const [selectedItem, setSelectedItem] = useState<DeletedStudyHistoryItemDTO | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description: string;
    variant: "success" | "danger" | "warning" | "info";
  } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: '/' to focus search, 'Esc' to clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const res = await getDeletedStudiesHistoryAction();
      if (res.success && res.data) {
        setData(res.data);
        setToastMessage({
          variant: "success",
          message: "Ledger Updated",
          description: "Retrieved the latest deleted study audit entries.",
        });
      } else {
        const errorMsg =
          typeof res.error === "string"
            ? res.error
            : res.error?.message || "Could not retrieve deleted studies history.";
        setToastMessage({
          variant: "danger",
          message: "Refresh Failed",
          description: errorMsg,
        });
      }
    } catch {
      setToastMessage({
        variant: "danger",
        message: "Network Error",
        description: "An unexpected error occurred while refreshing the ledger.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return data.items.filter((item) => {
      // Role filter
      if (selectedRoleFilter !== "ALL" && item.deletedByRole !== selectedRoleFilter) {
        return false;
      }

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.projectId.toLowerCase().includes(q) ||
        item.intakeId.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        item.deletedByName.toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q)
      );
    });
  }, [data.items, selectedRoleFilter, searchQuery]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      {/* ── Standard PageHeader ── */}
      <PageHeader
        title="Deleted Studies Audit Ledger"
        description="Immutable historical log of all permanently deleted research studies, audit reasons, and archived snapshots."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "CEO Portal", href: "/dashboard/ceo" },
          { label: "Deleted Studies" },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="font-sans text-xs font-semibold rounded-[2px] flex items-center gap-1.5"
            >
              <ArrowsClockwise
                size={14}
                weight="bold"
                className={isLoading ? "animate-spin text-[#CC6600]" : "text-white/70"}
              />
              <span>Refresh Log</span>
            </Button>
          </div>
        }
      />

      {/* ── 4-Column Balanced KPI Row (Dashdark X Standard) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          label="TOTAL DELETED STUDIES"
          value={data.kpis.totalDeleted}
          description="Archived immutable snapshots"
        />
        <KpiCard
          label="ADMIN DELETIONS"
          value={data.kpis.adminDeletions}
          description="Executed by administrative triage"
        />
        <KpiCard
          label="CEO DIRECT DELETIONS"
          value={data.kpis.ceoDeletions}
          description="Authorized by executive governance"
        />
        <KpiCard
          label="CLOUD FILES PURGED"
          value={data.kpis.totalFilesPurgedCount}
          description="Datasets & deliverables swept from R2"
        />
      </div>

      {/* ── Main Data Desk Card ── */}
      <Card className="p-0 overflow-hidden bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl">
        {/* Command Ribbon */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-[#010D1F] p-1 rounded-[2px] border border-white/10 self-start sm:self-auto">
            {(["ALL", "ADMIN", "CEO"] as const).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRoleFilter(role)}
                className={`px-3 py-1 text-xs font-sans font-semibold rounded-[2px] transition-all cursor-pointer ${
                  selectedRoleFilter === role
                    ? "bg-[#CC6600] text-white shadow-sm"
                    : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {role === "ALL" ? "All Roles" : `${role} Deletions`}
              </button>
            ))}
          </div>

          {/* Search Input with Keyboard Shortcut Indicator */}
          <div className="relative flex items-center w-full sm:w-80">
            <MagnifyingGlass
              size={15}
              weight="bold"
              className="absolute left-3 text-white/40 pointer-events-none"
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by ID, title, client, or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#010D1F] border border-white/10 rounded-[2px] pl-9 pr-14 py-1.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-[#CC6600] font-sans"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 text-white/40 hover:text-white cursor-pointer p-0.5"
                title="Clear search"
              >
                <X size={13} weight="bold" />
              </button>
            ) : (
              <kbd className="absolute right-2.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.08] text-white/40 border border-white/10 select-none">
                /
              </kbd>
            )}
          </div>
        </div>

        {/* Ledger Table */}
        <div className="w-full overflow-x-auto">
          {isLoading && data.items.length === 0 ? (
            <div className="py-20 flex items-center justify-center">
              <LoadingState variant="table" label="Loading deleted studies audit trail..." />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16">
              <EmptyState
                icon={FileText}
                title="No Deleted Studies Found"
                description={
                  searchQuery || selectedRoleFilter !== "ALL"
                    ? "No audit records match your current filter and search criteria."
                    : "No research studies have been deleted from the system yet."
                }
                action={
                  searchQuery || selectedRoleFilter !== "ALL" ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedRoleFilter("ALL");
                      }}
                      className="font-sans text-xs font-semibold rounded-[2px] mt-2"
                    >
                      Clear Filters
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-[140px] whitespace-nowrap">Study ID</th>
                  <th>Project Title &amp; Client</th>
                  <th className="w-[140px] whitespace-nowrap">Deleted By</th>
                  <th>Reason &amp; Rationale</th>
                  <th className="w-[140px] whitespace-nowrap">Timestamp</th>
                  <th className="w-[100px] text-center whitespace-nowrap">Files Purged</th>
                  <th className="w-[120px] text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="group virtual-row">
                    {/* Study ID */}
                    <td className="font-mono text-xs whitespace-nowrap">
                      <CopyButton
                        variant="badge"
                        value={item.intakeId || item.projectId}
                        label={item.intakeId || item.projectId}
                      />
                    </td>

                    {/* Title & Client */}
                    <td>
                      <div className="flex flex-col gap-0.5">
                        <span
                          className="text-white font-medium text-sm line-clamp-1 group-hover:text-[#CC6600] transition-colors"
                          title={item.title}
                        >
                          {item.title}
                        </span>
                        <span className="text-white/50 text-xs font-sans">
                          {item.clientName}
                        </span>
                      </div>
                    </td>

                    {/* Deleted By */}
                    <td className="whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-white text-xs font-medium font-sans">
                          {item.deletedByName}
                        </span>
                        <Badge
                          variant={item.deletedByRole === "CEO" ? "accent" : "sky"}
                          className="font-mono text-[10px] w-fit py-0 px-1.5"
                        >
                          {item.deletedByRole}
                        </Badge>
                      </div>
                    </td>

                    {/* Reason */}
                    <td>
                      <span
                        className="text-white/70 text-xs font-sans line-clamp-2 leading-relaxed"
                        title={item.reason}
                      >
                        {item.reason}
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="text-white/50 font-mono text-xs whitespace-nowrap">
                      <div>
                        {new Date(item.deletedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-[11px] text-white/30">
                        {new Date(item.deletedAt).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>

                    {/* Files Purged */}
                    <td className="text-center whitespace-nowrap">
                      {item.filesPurged ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-sans text-xs bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-[2px]">
                          <CheckCircle size={12} weight="fill" />
                          Purged
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-white/40 font-sans text-xs bg-white/[0.04] border border-white/10 px-2 py-0.5 rounded-[2px]">
                          Retained
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="text-right whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(item);
                          setShowRawJson(false);
                        }}
                        className="py-1 px-3 h-auto whitespace-nowrap font-sans text-xs rounded-[2px]"
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* ── Read-Only Snapshot Inspector Modal ── */}
      {selectedItem && (
        <Modal
          open={!!selectedItem}
          onClose={() => {
            setSelectedItem(null);
            setShowRawJson(false);
          }}
          title={
            <div className="flex items-center gap-2 text-white">
              <ShieldCheck size={18} weight="fill" className="text-emerald-400 shrink-0" />
              <span className="font-sans font-bold text-base">Archived Study Snapshot</span>
            </div>
          }
          description={`Study: ${selectedItem.intakeId || selectedItem.projectId} — ${selectedItem.title}`}
          size="2xl"
          footer={
            <div className="flex items-center justify-between gap-3 w-full">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowRawJson(!showRawJson)}
                className="font-sans text-xs font-semibold rounded-[2px] flex items-center gap-1.5"
              >
                <Code size={14} weight="bold" />
                <span>{showRawJson ? "Show Formatted Summary" : "View Raw JSON Snapshot"}</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedItem(null);
                  setShowRawJson(false);
                }}
                className="font-sans text-xs font-semibold rounded-[2px] bg-[#CC6600] hover:bg-[#B35500] text-white"
              >
                Done
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-5 text-sm font-sans">
            {/* Audit Metadata Card */}
            <div className="rounded-[2px] bg-[#01142B] border border-white/10 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-white/40 uppercase tracking-wider font-semibold">
                  Deleted By
                </span>
                <p className="text-white font-medium text-sm mt-0.5">
                  {selectedItem.deletedByName}{" "}
                  <span className="text-xs text-white/50">({selectedItem.deletedByRole})</span>
                </p>
              </div>

              <div>
                <span className="text-white/40 uppercase tracking-wider font-semibold">
                  Deletion Timestamp
                </span>
                <p className="text-white font-mono text-sm mt-0.5">
                  {new Date(selectedItem.deletedAt).toLocaleString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
              </div>

              <div className="sm:col-span-2">
                <span className="text-white/40 uppercase tracking-wider font-semibold">
                  Deletion Reason &amp; Rationale
                </span>
                <p className="text-white font-sans text-sm mt-0.5 leading-relaxed bg-white/[0.03] p-2.5 rounded-[2px] border border-white/[0.06]">
                  {selectedItem.reason}
                </p>
              </div>
            </div>

            {/* Toggle View: Formatted Overview or Raw JSON */}
            {showRawJson ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                    Full Forensic JSON Payload
                  </span>
                  <CopyButton
                    variant="badge"
                    value={JSON.stringify(selectedItem.snapshot, null, 2)}
                    label="Copy JSON"
                  />
                </div>
                <pre className="rounded-[2px] bg-[#010D1F] border border-white/10 p-4 font-mono text-xs text-sky-300 max-h-96 overflow-y-auto overflow-x-auto leading-relaxed whitespace-pre-wrap">
                  {JSON.stringify(selectedItem.snapshot, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="rounded-[2px] bg-[#01142B] border border-white/10 p-4 flex flex-col gap-3 text-xs">
                <span className="text-xs font-semibold text-white/60 uppercase tracking-wider border-b border-white/10 pb-2">
                  Original Study Profile
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-white/80">
                  <div>
                    <strong className="text-white font-semibold">Research Title:</strong>{" "}
                    {selectedItem.title}
                  </div>
                  <div>
                    <strong className="text-white font-semibold">Lead Researcher:</strong>{" "}
                    {selectedItem.clientName}
                  </div>
                  <div>
                    <strong className="text-white font-semibold">Study Identifier:</strong>{" "}
                    <span className="font-mono text-amber-400">
                      {selectedItem.intakeId || selectedItem.projectId}
                    </span>
                  </div>
                  <div>
                    <strong className="text-white font-semibold">Cloud Storage Files:</strong>{" "}
                    {selectedItem.filesPurged ? (
                      <span className="text-emerald-400">Swept &amp; Purged from R2</span>
                    ) : (
                      <span className="text-white/60">Retained</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Global Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          description={toastMessage.description}
          variant={toastMessage.variant}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
