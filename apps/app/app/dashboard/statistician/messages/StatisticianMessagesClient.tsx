"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader, Card, LoadingState, Badge } from "@repo/ui";
import { getMyProjectThreads } from "@/features/messaging/actions";
import type { ProjectThreadSummaryDTO } from "@/features/messaging/schemas";
import { MessageThread, type InitialThreadData } from "@/features/messaging/components/MessageThread";
import {
  IconMessages,
  IconFolder,
  IconShieldCheck,
  IconClock,
  IconArrowRight,
  IconSearch,
  IconX,
} from "@tabler/icons-react";

interface StatisticianMessagesClientProps {
  initialThreads: ProjectThreadSummaryDTO[];
  initialSelectedProjectId?: string | null;
  initialThreadData?: InitialThreadData | null;
}

export function StatisticianMessagesClient({
  initialThreads,
  initialSelectedProjectId = null,
  initialThreadData = null,
}: StatisticianMessagesClientProps) {
  const [threads, setThreads] = useState<ProjectThreadSummaryDTO[]>(initialThreads);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialSelectedProjectId || initialThreads[0]?.projectId || null
  );
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED">("ALL");

  const loadThreads = useCallback(async () => {
    try {
      const res = await getMyProjectThreads();
      if (res.success && res.data) {
        setThreads(res.data);
      }
    } catch (err) {
      console.error("Failed to load message threads:", err);
    }
  }, []);

  const filteredThreads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return threads.filter((t) => {
      const matchesSearch =
        !q ||
        t.intakeId.toLowerCase().includes(q) ||
        t.researchTitle.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === "ACTIVE") {
        return t.masterStatus !== "COMPLETED" && t.masterStatus !== "ARCHIVED";
      }
      if (statusFilter === "COMPLETED") {
        return t.masterStatus === "COMPLETED" || t.masterStatus === "ARCHIVED";
      }
      return true;
    });
  }, [threads, searchQuery, statusFilter]);

  const selectedThread =
    threads.find((t) => t.projectId === selectedProjectId) ||
    filteredThreads[0] ||
    threads[0] ||
    null;

  return (
    <div className="h-full flex-1 flex flex-col min-h-0 gap-3 w-full animate-content-fade font-sans overflow-hidden">
      {/* Standardized PageHeader (Compact & Responsive) */}
      <div className={`flex-shrink-0 ${mobileView === "chat" ? "hidden lg:block" : "block"}`}>
        <PageHeader
          breadcrumbs={[
            { label: "WORKSPACE", href: "/dashboard" },
            { label: "STATISTICIAN WORKBENCH", href: "/dashboard/statistician" },
            { label: "MESSAGES" },
          ]}
          title="Study Messages & Consultation"
          description="Direct communication with assigned lead researchers for active statistical computations and analysis requirements."
          className="pb-3 sm:pb-6"
          actions={
            <div className="flex items-center gap-2">
              <Badge variant="emerald" className="text-[0.688rem] font-mono flex items-center gap-1">
                <IconShieldCheck size={13} stroke={2} />
                <span>Firewall Protected</span>
              </Badge>
            </div>
          }
        />
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
        {/* Left Column: Assigned Studies Selector */}
        <div
          className={`lg:col-span-4 h-full min-h-0 flex flex-col gap-2.5 overflow-hidden ${
            mobileView === "chat" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Search & Filter Controls */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            <div className="relative">
              <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ID or title..."
                className="w-full pl-9 pr-8 py-2 bg-[#010915] border border-white/15 focus:border-[#CC6600] rounded-[2px] text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-0 ring-0 font-sans transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer outline-none focus:outline-none focus:ring-0 ring-0"
                  aria-label="Clear search"
                >
                  <IconX size={13} stroke={2} />
                </button>
              )}
            </div>

            {/* Segmented Filter Control */}
            <div className="flex items-center p-0.5 rounded-[2px] bg-[#010915] border border-white/10 text-xs font-mono">
              {(["ALL", "ACTIVE", "COMPLETED"] as const).map((tab) => {
                const count = threads.filter((t) => {
                  if (tab === "ACTIVE") return t.masterStatus !== "COMPLETED" && t.masterStatus !== "ARCHIVED";
                  if (tab === "COMPLETED") return t.masterStatus === "COMPLETED" || t.masterStatus === "ARCHIVED";
                  return true;
                }).length;

                const isActive = statusFilter === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStatusFilter(tab)}
                    className={`flex-1 py-1 px-2 text-[0.688rem] font-medium rounded-[2px] transition-colors cursor-pointer flex items-center justify-center gap-1.5 select-none border-0 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ring-0 ${
                      isActive
                        ? "bg-white/[0.08] text-white"
                        : "text-white/40 hover:text-white/70 hover:bg-white/[0.02]"
                    }`}
                  >
                    <span>{tab === "ALL" ? "All" : tab === "ACTIVE" ? "Active" : "Done"}</span>
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

          {/* Studies Scroll Container */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-2">
            {filteredThreads.length === 0 ? (
              <div className="p-6 rounded-[2px] bg-[#01142B] border border-white/10 text-center flex flex-col items-center justify-center gap-2">
                <span className="text-xs text-white/50">No assigned studies match your filter</span>
                {(searchQuery || statusFilter !== "ALL") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("ALL");
                    }}
                    className="text-xs text-white/60 hover:text-white transition-colors cursor-pointer underline underline-offset-4 outline-none focus:outline-none focus:ring-0 ring-0"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = thread.projectId === selectedThread?.projectId;
                return (
                  <button
                    key={thread.projectId}
                    type="button"
                    onClick={() => {
                      setSelectedProjectId(thread.projectId);
                      setMobileView("chat");
                    }}
                    className={`text-left p-3 rounded-[2px] border transition-all cursor-pointer flex flex-col gap-1.5 select-none outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ring-0 ${
                      isSelected
                        ? "bg-[#011B38] border-l-[3px] border-l-[#CC6600] border-t-white/15 border-r-white/15 border-b-white/15 shadow-md"
                        : "bg-[#01142B]/60 border-white/[0.08] hover:bg-[#01142B] hover:border-white/15"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-white/80">
                        <IconFolder size={13} stroke={1.5} className="text-white/30" />
                        <span className="truncate max-w-[140px]">{thread.intakeId || thread.researchTitle}</span>
                      </div>
                      <Badge variant="outline" className="text-[0.625rem] font-mono py-0 px-1 border-white/10 text-white/50 bg-white/[0.02]">
                        {thread.masterStatus.replace(/_/g, " ")}
                      </Badge>
                    </div>

                    <h4 className="text-xs font-bold text-white line-clamp-1 leading-snug">
                      {thread.researchTitle}
                    </h4>

                    {thread.lastMessage ? (
                      <div className="text-[0.688rem] text-white/50 truncate flex items-center gap-1">
                        <span className="text-white/70 font-medium">{thread.lastMessage.senderName}:</span>
                        <span className="truncate">&ldquo;{thread.lastMessage.content}&rdquo;</span>
                      </div>
                    ) : (
                      <div className="text-[0.688rem] text-white/40 italic">
                        No messages exchanged yet
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[0.625rem] text-white/40 pt-1.5 border-t border-white/[0.06] font-mono">
                      <div className="flex items-center gap-1">
                        <IconClock size={11} stroke={1.5} />
                        <span>{thread.masterStatus.replace(/_/g, " ")}</span>
                      </div>
                      {isSelected ? (
                        <div className="flex items-center gap-0.5 text-white/70 font-medium">
                          <span>ACTIVE</span>
                          <IconArrowRight size={10} stroke={2} className="text-white/50" />
                        </div>
                      ) : (
                        thread.lastMessage && (
                          <span className="text-white/35">{new Date(thread.lastMessage.sentAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</span>
                        )
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Message Thread Console */}
        <div
          className={`lg:col-span-8 h-full min-h-0 flex flex-col overflow-hidden ${
            mobileView === "list" ? "hidden lg:flex" : "flex"
          }`}
        >
          {threads.length === 0 ? (
            <Card className="h-full min-h-0 p-12 bg-[#01142B] border-white/10 flex flex-col items-center justify-center text-center gap-3">
              <div className="h-14 w-14 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/40">
                <IconMessages size={28} stroke={1.5} />
              </div>
              <div className="max-w-md">
                <h3 className="text-sm font-bold text-white">No Assigned Studies Found</h3>
                <p className="text-xs text-white/50 mt-1 leading-relaxed">
                  When administration assigns research studies to you, your active client consultation threads will appear here automatically.
                </p>
              </div>
            </Card>
          ) : selectedThread ? (
            <MessageThread
              key={selectedThread.projectId}
              projectId={selectedThread.projectId}
              initialThreadData={
                selectedThread.projectId === selectedProjectId ? initialThreadData : null
              }
              className="h-full min-h-0"
              onBack={() => setMobileView("list")}
            />
          ) : (
            <Card className="h-full min-h-0 p-12 bg-[#01142B] border-white/10 flex flex-col items-center justify-center text-center text-white/50">
              <IconArrowRight size={24} stroke={1.5} className="text-white/40 mb-2" />
              <span className="text-xs text-white font-semibold">Select a research study on the left to start consulting</span>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
