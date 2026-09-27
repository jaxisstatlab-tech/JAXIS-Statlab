"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@repo/ui";
import type { MessageDTO, ProjectThreadSummaryDTO } from "../schemas";
import { getMyProjectThreads } from "../actions";
import { MessageThread, type InitialThreadData } from "./MessageThread";
import { firstName, listTimeLabel } from "./chat-format";
import { GroupAvatar, PresenceAvatar } from "./PresenceAvatar";
import { usePresence } from "@/lib/presence";
import { sortThreads, threadIsOpen } from "../thread-order";
import { ChatsCircle, Lock, MagnifyingGlass, X } from "@phosphor-icons/react";

/** Whose inbox this is. Decides who is "the team" on each chat and a few labels. */
export type InboxRole = "CLIENT" | "STATISTICIAN" | "SENIOR_QA_LEAD";

type Filter = "all" | "unread" | "finished";
const FINISHED = new Set(["DELIVERED", "CLOSED", "COMPLETED", "ARCHIVED", "CANCELLED"]);
const REFRESH_LIST_MS = 30_000;

export interface MessagesInboxProps {
  role: InboxRole;
  initialThreads: ProjectThreadSummaryDTO[];
  initialSelectedProjectId?: string | null;
  initialThreadData?: InitialThreadData | null;
  breadcrumbs: Array<{ label: string; href?: string }>;
  title: string;
  description: string;
  /** Where "View Study" goes for a chat. */
  studyHref: (projectId: string) => string;
  empty: { title: string; body: string; action?: { label: string; href: string } };
}

/** People on a chat other than the reader, in a fixed order. */
function teamFor(t: ProjectThreadSummaryDTO, role: InboxRole) {
  return [
    { key: "CLIENT", id: t.clientId, name: t.clientName, label: "client" },
    { key: "STATISTICIAN", id: t.statisticianId, name: t.statisticianName, label: "statistician" },
    { key: "SENIOR_QA_LEAD", id: t.qaLeadId, name: t.qaLeadName, label: "reviewer" },
  ].filter((p) => p.name && p.key !== role);
}

export function MessagesInbox({
  role,
  initialThreads,
  initialSelectedProjectId = null,
  initialThreadData = null,
  breadcrumbs,
  title,
  description,
  studyHref,
  empty,
}: MessagesInboxProps) {
  const isClient = role === "CLIENT";
  const searchParams = useSearchParams();
  const queryProjectId = searchParams.get("projectId");

  // The chat loaded on the server was marked read while loading, so it starts with no badge.
  const [threads, setThreads] = useState<ProjectThreadSummaryDTO[]>(() =>
    sortThreads(initialThreads).map((t) =>
      t.projectId === initialThreadData?.projectInfo?.id ? { ...t, unreadCount: 0 } : t
    )
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    queryProjectId || initialSelectedProjectId || sortThreads(initialThreads)[0]?.projectId || null
  );
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const [mobileView, setMobileView] = useState<"list" | "chat">(queryProjectId ? "chat" : "list");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" jumps to search, Esc clears it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchRef.current) {
        setQuery("");
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (queryProjectId) {
      setSelectedId(queryProjectId);
      setMobileView("chat");
    }
  }, [queryProjectId]);

  // Keep the list fresh (new messages in other chats) while the page is open.
  useEffect(() => {
    const refresh = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await getMyProjectThreads();
        if (!res.success || !res.data) return;
        const fresh = res.data;
        setThreads(
          sortThreads(fresh.map((t) => (t.projectId === selectedRef.current ? { ...t, unreadCount: 0 } : t)))
        );
      } catch {
        // keep the current list
      }
    };
    const timer = setInterval(refresh, REFRESH_LIST_MS);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const open = (projectId: string) => {
    setSelectedId(projectId);
    setMobileView("chat");
    // Opening a chat reads it.
    setThreads((prev) => prev.map((t) => (t.projectId === projectId ? { ...t, unreadCount: 0 } : t)));
  };

  // Keep the open chat's preview line in step with what happens in it.
  const handleLatest = useCallback((projectId: string, m: MessageDTO) => {
    setThreads((prev) => {
      const t = prev.find((x) => x.projectId === projectId);
      if (!t || t.lastMessage?.sentAt === m.sentAt) return prev;
      return sortThreads(
        prev.map((x) =>
          x.projectId === projectId
            ? {
                ...x,
                unreadCount: 0,
                lastMessage: { content: m.content, sentAt: m.sentAt, senderName: m.senderName, senderRole: m.senderRole },
              }
            : x
        )
      );
    });
  }, []);

  const counts = useMemo(
    () => ({
      all: threads.length,
      unread: threads.filter((t) => t.unreadCount > 0).length,
      finished: threads.filter((t) => FINISHED.has(t.masterStatus)).length,
    }),
    [threads]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads.filter((t) => {
      if (filter === "unread" && t.unreadCount === 0) return false;
      if (filter === "finished" && !FINISHED.has(t.masterStatus)) return false;
      if (!q) return true;
      return [t.intakeId, t.researchTitle, t.clientName, t.statisticianName, t.qaLeadName].some((v) =>
        v?.toLowerCase().includes(q)
      );
    });
  }, [threads, query, filter]);

  // Green dots for everyone on these chats.
  const presence = usePresence(threads.flatMap((t) => teamFor(t, role).map((p) => p.id)));
  const openChats = filtered.filter(threadIsOpen);
  const waiting = filtered.filter((t) => !threadIsOpen(t));
  const selected = threads.find((t) => t.projectId === selectedId) ?? threads[0] ?? null;
  const filtering = Boolean(query.trim()) || filter !== "all";

  return (
    <div
      data-portal={isClient ? "client" : undefined}
      className="flex h-full min-h-0 w-full flex-1 flex-col gap-6 overflow-hidden font-sans animate-content-fade"
    >
      <div className={`shrink-0 ${mobileView === "chat" ? "hidden lg:block" : "block"}`}>
        <PageHeader breadcrumbs={breadcrumbs} title={title} description={description} />
      </div>

      {threads.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-[2px] border border-white/[0.07] bg-[#0A0A18] px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-[2px] bg-white/[0.06] text-white/55">
            <ChatsCircle size={22} weight="fill" />
          </span>
          <p className="mt-4 text-[0.938rem] font-semibold text-white">{empty.title}</p>
          <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-white/55">{empty.body}</p>
          {empty.action ? (
            <Link
              href={empty.action.href}
              className="mt-5 inline-flex h-9 items-center rounded-[2px] bg-[#CC6600] px-4 text-sm font-medium text-white hover:bg-[#E07000]"
            >
              {empty.action.label}
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-[2px] border border-white/[0.07] bg-[#0A0A18] lg:grid-cols-[21rem_minmax(0,1fr)]">
          {/* Chats list */}
          <aside
            aria-label="Chats"
            className={`min-h-0 flex-col border-white/[0.07] lg:flex lg:border-r ${mobileView === "chat" ? "hidden" : "flex"}`}
          >
            <div className="shrink-0 space-y-2.5 border-b border-white/[0.07] p-3">
              <div className="relative">
                <MagnifyingGlass
                  size={15}
                  weight="fill"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search chats"
                  aria-label="Search chats by study, ID, or name"
                  className="h-10 w-full rounded-[2px] border border-white/12 bg-[#050513] pl-9 pr-9 text-base text-white placeholder:text-white/35 outline-none transition-colors focus:border-[#CC6600] sm:text-sm"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      searchRef.current?.focus();
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/45 hover:text-white"
                    aria-label="Clear search"
                  >
                    <X size={14} weight="fill" />
                  </button>
                ) : (
                  <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-[2px] border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-white/40 sm:block">
                    /
                  </kbd>
                )}
              </div>

              {!isClient ? (
                <div role="tablist" aria-label="Show" className="flex gap-1">
                  {(
                    [
                      ["all", "All"],
                      ["unread", "Unread"],
                      ["finished", "Finished"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={filter === key}
                      onClick={() => setFilter(key)}
                      className={`flex h-8 items-center gap-1.5 rounded-[2px] px-2.5 text-xs font-medium transition-colors ${
                        filter === key ? "bg-white/[0.08] text-white" : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
                      }`}
                    >
                      {label}
                      <span
                        className={`font-mono text-[10px] ${
                          key === "unread" && counts.unread > 0 ? "text-[#F08A2E]" : "text-white/35"
                        }`}
                      >
                        {counts[key]}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm text-white/60">
                    {query.trim() ? <>No chats match &ldquo;{query.trim()}&rdquo;</> : "No chats here."}
                  </p>
                  {filtering ? (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setFilter("all");
                      }}
                      className="mt-2 text-sm font-medium text-white underline-offset-4 hover:underline"
                    >
                      Clear Filters
                    </button>
                  ) : null}
                </div>
              ) : null}

              {openChats.map((t) => (
                <ChatRow
                  key={t.projectId}
                  thread={t}
                  role={role}
                  isOnline={presence.isOnline}
                  selected={selected?.projectId === t.projectId}
                  onOpen={() => open(t.projectId)}
                />
              ))}

              {waiting.length > 0 ? (
                <>
                  <p className="px-4 pb-1.5 pt-5 text-[0.688rem] font-medium text-white/40">
                    Opens once your statistician is assigned
                  </p>
                  {waiting.map((t) => (
                    <ChatRow
                      key={t.projectId}
                      thread={t}
                      role={role}
                      selected={selected?.projectId === t.projectId}
                      onOpen={() => open(t.projectId)}
                    />
                  ))}
                </>
              ) : null}
            </div>
          </aside>

          {/* Open chat */}
          <section
            aria-label="Chat"
            className={`min-h-0 flex-col lg:flex ${mobileView === "list" ? "hidden" : "flex"}`}
          >
            {selected ? (
              <MessageThread
                key={selected.projectId}
                projectId={selected.projectId}
                viewer={isClient ? "client" : "staff"}
                framed={false}
                studyHref={studyHref(selected.projectId)}
                initialThreadData={
                  initialThreadData?.projectInfo?.id === selected.projectId ? initialThreadData : null
                }
                onLatestMessage={(m) => handleLatest(selected.projectId, m)}
                className="h-full min-h-0"
                onBack={() => setMobileView("list")}
              />
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}

function ChatRow({
  thread: t,
  role,
  selected,
  isOnline,
  onOpen,
}: {
  thread: ProjectThreadSummaryDTO;
  role: InboxRole;
  selected: boolean;
  isOnline?: (id?: string | null) => boolean;
  onOpen: () => void;
}) {
  const isOpen = threadIsOpen(t);
  const unread = t.unreadCount > 0;
  // A group chat per study: the study is the name, everyone else is listed underneath.
  const team = teamFor(t, role);
  const last = t.lastMessage;
  const preview = !isOpen
    ? "Chat isn't open yet"
    : last
      ? `${last.senderRole === role ? "You" : firstName(last.senderName) || last.senderName}: ${last.content}`
      : "No messages yet.";

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={selected ? "true" : undefined}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
        selected ? "hover:bg-white/[0.03] lg:bg-white/[0.06] lg:shadow-[inset_2px_0_0_#CC6600]" : "hover:bg-white/[0.03]"
      }`}
    >
      {isOpen ? (
        <GroupAvatar people={team.map((p) => ({ name: p.name, online: isOnline?.(p.id) }))} />
      ) : (
        <PresenceAvatar>
          <Lock size={15} weight="fill" className="text-white/35" />
        </PresenceAvatar>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={`truncate text-sm ${unread ? "font-semibold text-white" : "font-medium text-white/85"}`}>
            {t.researchTitle}
          </span>
          {last ? (
            <span className={`shrink-0 text-[0.688rem] ${unread ? "font-semibold text-[#E07000]" : "text-white/40"}`}>
              {listTimeLabel(last.sentAt)}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-xs text-white/40">
          {isOpen ? (
            team.map((p, i) => (
              <span key={p.key}>
                {i > 0 ? ", " : ""}
                {isOnline?.(p.id) ? (
                  <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 align-middle" />
                ) : null}
                {p.name} ({p.label})
              </span>
            ))
          ) : (
            <span className="font-mono">{t.intakeId}</span>
          )}
        </span>
        <span className="mt-1 flex items-center justify-between gap-2">
          <span
            className={`truncate text-[13px] ${
              unread ? "font-medium text-white" : isOpen ? "text-white/55" : "text-white/35"
            }`}
          >
            {preview}
          </span>
          {unread ? (
            <span className="shrink-0 rounded-[2px] bg-[#CC6600] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
              {t.unreadCount}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}
