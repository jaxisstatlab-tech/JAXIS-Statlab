"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import type { MessageDTO } from "../schemas";
import { getProjectMessages, sendMessage } from "../actions";
import { MessageBubble, type ChatMessage } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { LoadingState, CopyButton, Toast } from "@repo/ui";
import { ArrowLeft, ArrowDown, Lock, CircleNotch, ArrowRight } from "@phosphor-icons/react";
import {
  subscribeToProjectMessages,
  broadcastNewMessage,
  broadcastMessageDelivered,
  broadcastMessagesSeen,
  broadcastTyping,
} from "@/lib/messaging/realtime";
import { dayLabel, firstName, initials, sameGroup } from "./chat-format";
import { GroupAvatar, PresenceAvatar } from "./PresenceAvatar";
import { usePresence, sendFallbackTyping } from "@/lib/presence";

export interface InitialThreadData {
  messages?: MessageDTO[];
  projectInfo?: {
    id: string;
    intakeId: string;
    researchTitle: string;
    masterStatus: string;
    clientName: string;
    statisticianName: string | null;
    qaLeadName: string | null;
    clientId?: string;
    statisticianId?: string | null;
    qaLeadId?: string | null;
  } | null;
  hasMore?: boolean;
  nextCursor?: string | null;
  currentUserId?: string | null;
  currentUserName?: string | null;
}

type ProjectInfo = NonNullable<InitialThreadData["projectInfo"]>;
type SendResult = { success: boolean; blocked?: boolean; warning?: string };
type ServerResult = {
  success: boolean;
  data?: MessageDTO;
  blocked?: boolean;
  warning?: string;
  error?: { code?: string; message: string };
};

interface MessageThreadProps {
  projectId: string;
  className?: string;
  onBack?: () => void;
  initialThreadData?: InitialThreadData | null;
  /** Who is reading: "client" sees their team, "staff" sees the client. */
  viewer?: "client" | "staff";
  /** Adds a "View Study" link to the header. */
  studyHref?: string;
  /** Draw the thread's own border (turn off when a parent already frames it). */
  framed?: boolean;
  /** Called with the newest saved message whenever it changes (for inbox previews). */
  onLatestMessage?: (message: MessageDTO) => void;
  /** Shown inside a study page that already shows the study title and ID above. */
  inStudy?: boolean;
}

// How often the chat checks the server for new messages.
const CHECK_EVERY_MS = 3000; // while live updates aren't connected
const CHECK_EVERY_LIVE_MS = 15000; // safety net while live updates are connected
const OVERLAP_MS = 5000; // re-ask for the last few seconds so nothing slips between two saves
const TYPING_SHOW_MS = 4000;
const TYPING_SEND_EVERY_MS = 2500;
const PAGE_SIZE = 30;

const isPending = (m: ChatMessage) => m.id.startsWith("optimistic_");

const cacheKey = (projectId: string) => `jaxis_chat_cache_${projectId}`;
function readCache(projectId: string) {
  try {
    const raw = sessionStorage.getItem(cacheKey(projectId));
    return raw
      ? (JSON.parse(raw) as {
          project?: ProjectInfo;
          messages?: MessageDTO[];
          hasMore?: boolean;
          nextCursor?: string | null;
          currentUserId?: string | null;
        })
      : null;
  } catch {
    return null;
  }
}
function writeCache(projectId: string, data: Record<string, unknown>) {
  try {
    sessionStorage.setItem(cacheKey(projectId), JSON.stringify(data));
  } catch {
    // storage full or blocked: the chat still works without the cache
  }
}

function friendlyError(code?: string, message?: string): string {
  switch (code) {
    case "THREAD_LOCKED":
      return "Chat opens once your team is assigned.";
    case "FORBIDDEN":
      return "You can't send messages in this chat.";
    case "UNAUTHORIZED":
      return "Please log in again.";
    case "VALIDATION_ERROR":
      return "Messages can be up to 5,000 characters.";
    case "NETWORK":
      return "Check your connection.";
    default:
      return message && message.length < 120 ? message : "Please try again.";
  }
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  projectId,
  className = "",
  onBack,
  initialThreadData,
  viewer = "staff",
  studyHref,
  framed = true,
  onLatestMessage,
  inStudy = false,
}) => {
  const hasInitial = Boolean(initialThreadData?.projectInfo);

  const [messages, setMessages] = useState<ChatMessage[]>(initialThreadData?.messages ?? []);
  const [project, setProject] = useState<ProjectInfo | null>(initialThreadData?.projectInfo ?? null);
  const [me, setMe] = useState<{ id: string | null; name: string | null }>({
    id: initialThreadData?.currentUserId ?? null,
    name: initialThreadData?.currentUserName ?? null,
  });
  const [hasMore, setHasMore] = useState<boolean>(initialThreadData?.hasMore ?? false);
  const [nextCursor, setNextCursor] = useState<string | null>(initialThreadData?.nextCursor ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(!hasInitial);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [typing, setTyping] = useState<{ userId: string; name: string; until: number } | null>(null);
  const [unreadBelow, setUnreadBelow] = useState(0);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [preset, setPreset] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;
  const meRef = useRef(me);
  meRef.current = me;
  const projectRef = useRef(project);
  projectRef.current = project;
  const pagingRef = useRef({ hasMore, nextCursor });
  pagingRef.current = { hasMore, nextCursor };
  const typingRef = useRef(typing);
  typingRef.current = typing;

  // Newest time the server has told us about (drives "what's new since…").
  const latestAtRef = useRef<number>(latestOf(initialThreadData?.messages));
  // The first load decides where catching up starts; don't catch up before it.
  const readyRef = useRef<boolean>(hasInitial);
  const liveRef = useRef(false);
  const sendChainRef = useRef<Promise<unknown>>(Promise.resolve());
  const syncingRef = useRef(false);
  const syncAgainRef = useRef(false);
  const pendingSyncRef = useRef(false);
  const lastTypingSentRef = useRef(0);

  const saveCache = useCallback(
    (list: ChatMessage[]) =>
      writeCache(projectId, {
        project: projectRef.current,
        messages: list.filter((m) => !isPending(m) && !m.failed),
        hasMore: pagingRef.current.hasMore,
        nextCursor: pagingRef.current.nextCursor,
        currentUserId: meRef.current.id,
      }),
    [projectId]
  );

  // ── Scrolling ────────────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((smooth = false) => {
    const go = () => {
      const el = containerRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight + 10000, behavior: smooth ? "smooth" : "auto" });
    };
    go();
    requestAnimationFrame(go);
    setTimeout(go, 60);
  }, []);

  // Stay pinned to the bottom when the layout or fonts change.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (isNearBottomRef.current) el.scrollTop = el.scrollHeight + 10000;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [isLoading]);

  useEffect(() => {
    isNearBottomRef.current = true;
    scrollToBottom(false);
  }, [projectId, isLoading, scrollToBottom]);

  // ── Seen / delivered ─────────────────────────────────────────────────────────
  const announceSeen = useCallback(
    (ids: string[]) => {
      if (!ids.length || !meRef.current.id) return;
      void broadcastMessagesSeen(projectId, ids, meRef.current.id, meRef.current.name ?? undefined);
      window.dispatchEvent(new CustomEvent("jaxis:unread-count-updated"));
    },
    [projectId]
  );

  // ── Merge messages from the server (catch-up checks) ─────────────────────────
  const mergeFromServer = useCallback(
    (fresh: MessageDTO[]) => {
      if (!fresh.length) return;
      latestAtRef.current = Math.max(latestAtRef.current, latestOf(fresh));
      const known = new Set(messagesRef.current.map((m) => m.id));
      const othersNew = fresh.filter((m) => !m.isMine && !known.has(m.id));

      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        let next = prev;
        const added: ChatMessage[] = [];
        for (const m of fresh) {
          if (ids.has(m.id)) continue;
          ids.add(m.id);
          if (m.isMine) {
            // Saved from this tab and the check won the race: swap the pending bubble.
            const i = next.findIndex((p) => isPending(p) && !p.failed && p.content === m.content);
            if (i !== -1) {
              next = next === prev ? [...prev] : next;
              next[i] = { ...m, status: "sent" };
              continue;
            }
          }
          added.push(m);
        }
        if (!added.length) return next;
        const saved = [...next.filter((m) => !isPending(m)), ...added].sort(
          (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
        );
        const updated = [...saved, ...next.filter(isPending)];
        saveCache(updated);
        return updated;
      });

      if (othersNew.length) {
        const ids = othersNew.map((m) => m.id);
        ids.forEach((id) => void broadcastMessageDelivered(projectId, id));
        if (document.visibilityState === "visible") announceSeen(ids);
        if (typingRef.current && othersNew.some((m) => m.senderId === typingRef.current?.userId)) setTyping(null);
        setNewIds((prev) => new Set([...prev, ...ids]));
        setTimeout(
          () =>
            setNewIds((prev) => {
              const next = new Set(prev);
              ids.forEach((id) => next.delete(id));
              return next;
            }),
          2500
        );
        if (isNearBottomRef.current) scrollToBottom(true);
        else setUnreadBelow((n) => n + othersNew.length);
      }
    },
    [projectId, announceSeen, saveCache, scrollToBottom]
  );

  /** Ask the server for anything new. Overlapping calls are merged into one follow-up. */
  const catchUp = useCallback(async () => {
    if (!readyRef.current) return;
    if (syncingRef.current) {
      syncAgainRef.current = true;
      return;
    }
    syncingRef.current = true;
    try {
      do {
        syncAgainRef.current = false;
        const since = new Date(Math.max(0, latestAtRef.current - OVERLAP_MS)).toISOString();
        const res = await fetch(
          `/api/v1/messages?projectId=${encodeURIComponent(projectId)}&since=${encodeURIComponent(since)}`,
          { cache: "no-store" }
        );
        if (!res.ok) break;
        const body = (await res.json()) as { success?: boolean; data?: MessageDTO[] };
        if (body.success && Array.isArray(body.data)) mergeFromServer(body.data);
      } while (syncAgainRef.current);
    } catch {
      // offline for a moment: the next check tries again
    } finally {
      syncingRef.current = false;
    }
  }, [projectId, mergeFromServer]);

  // ── First load ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    if (hasInitial) {
      saveCache(messagesRef.current);
      const unread = messagesRef.current.filter((m) => !m.isMine && m.status !== "seen").map((m) => m.id);
      announceSeen(unread);
      void catchUp(); // the page may have been served from cache: pick up anything newer
      return;
    }

    const cached = readCache(projectId);
    if (cached?.project) {
      setProject(cached.project);
      setMessages(cached.messages ?? []);
      setHasMore(cached.hasMore ?? false);
      setNextCursor(cached.nextCursor ?? null);
      if (cached.currentUserId) setMe((m) => ({ ...m, id: m.id ?? cached.currentUserId ?? null }));
      setIsLoading(false);
    }

    (async () => {
      try {
        const res = await getProjectMessages(projectId, { limit: PAGE_SIZE });
        if (cancelled || !res.success || !res.data) return;
        const d = res.data;
        setMe({ id: d.currentUserId ?? meRef.current.id, name: d.currentUserName ?? meRef.current.name });
        setProject(d.project);
        setHasMore(d.hasMore);
        setNextCursor(d.nextCursor);
        latestAtRef.current = latestOf(d.messages);
        setMessages((prev) => {
          const updated = [...d.messages, ...prev.filter(isPending)];
          return updated;
        });
        writeCache(projectId, {
          project: d.project,
          messages: d.messages,
          hasMore: d.hasMore,
          nextCursor: d.nextCursor,
          currentUserId: d.currentUserId,
        });
        announceSeen(d.messages.filter((m) => !m.isMine && m.status !== "seen").map((m) => m.id));
        readyRef.current = true;
        isNearBottomRef.current = true;
        scrollToBottom(false);
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Runs once per study; the thread is keyed by study in every page that switches studies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // ── Older messages ───────────────────────────────────────────────────────────
  const loadOlder = useCallback(async () => {
    const { hasMore: more, nextCursor: cursor } = pagingRef.current;
    if (!more || !cursor || isLoadingOlder) return;
    setIsLoadingOlder(true);
    const prevHeight = containerRef.current?.scrollHeight ?? 0;
    try {
      const res = await getProjectMessages(projectId, { cursor, limit: PAGE_SIZE });
      if (res.success && res.data) {
        const older = res.data.messages;
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          return [...older.filter((m) => !ids.has(m.id)), ...prev];
        });
        setHasMore(res.data.hasMore);
        setNextCursor(res.data.nextCursor);
        requestAnimationFrame(() => {
          const el = containerRef.current;
          if (el) el.scrollTop = el.scrollHeight - prevHeight;
        });
      }
    } catch (err) {
      console.error("Failed to load older messages:", err);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [projectId, isLoadingOlder]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    isNearBottomRef.current = nearBottom;
    if (nearBottom && unreadBelow) setUnreadBelow(0);
    if (el.scrollTop <= 40 && pagingRef.current.hasMore && !isLoadingOlder) void loadOlder();
  };

  // ── Live updates + regular checks ───────────────────────────────────────────
  useEffect(() => {
    const cleanup = subscribeToProjectMessages(projectId, {
      onNewMessage: () => {
        // A doorbell only: fetch the real message from the server.
        if (document.visibilityState === "hidden") pendingSyncRef.current = true;
        else void catchUp();
      },
      onDelivered: ({ messageId }) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId && m.isMine && m.status === "sent" ? { ...m, status: "delivered" } : m))
        ),
      onSeen: ({ messageIds, readerId, readerName }) => {
        if (readerId === meRef.current.id) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.isMine && messageIds.includes(m.id)
              ? {
                  ...m,
                  status: "seen",
                  isRead: true,
                  seenByNames: readerName
                    ? Array.from(new Set([...(m.seenByNames ?? []), readerName]))
                    : m.seenByNames,
                }
              : m
          )
        );
      },
      onTyping: ({ userId, name, stopped }) => {
        if (userId === meRef.current.id) return;
        if (stopped) setTyping((cur) => (cur?.userId === userId ? null : cur));
        else setTyping({ userId, name: name || "Someone", until: Date.now() + TYPING_SHOW_MS });
      },
      onStatus: (status) => {
        liveRef.current = status === "SUBSCRIBED";
      },
    });

    let ticks = 0;
    const timer = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      ticks += 1;
      const every = liveRef.current ? CHECK_EVERY_LIVE_MS / CHECK_EVERY_MS : 1;
      if (ticks % every === 0) void catchUp();
    }, CHECK_EVERY_MS);

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      pendingSyncRef.current = false;
      void catchUp();
      const unseen = messagesRef.current.filter((m) => !m.isMine && m.status !== "seen").map((m) => m.id);
      announceSeen(unseen);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cleanup();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [projectId, catchUp, announceSeen]);

  // Hide "… is typing" a few seconds after the last signal.
  useEffect(() => {
    if (!typing) return;
    const t = setTimeout(() => setTyping((cur) => (cur && cur.until <= Date.now() ? null : cur)), TYPING_SHOW_MS + 50);
    return () => clearTimeout(t);
  }, [typing]);

  // ── Sending ──────────────────────────────────────────────────────────────────
  const persist = useCallback(
    async (pending: ChatMessage): Promise<SendResult> => {
      let res: ServerResult;
      try {
        const r = await fetch("/api/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, content: pending.content }),
        });
        res = (await r.json()) as ServerResult;
      } catch {
        try {
          res = await sendMessage({ projectId, content: pending.content });
        } catch {
          res = { success: false, error: { code: "NETWORK", message: "Check your connection." } };
        }
      }

      if (res.success && res.data) {
        const saved: ChatMessage = { ...res.data, isMine: true, status: "sent" };
        setMessages((prev) => {
          const updated = prev.some((m) => m.id === saved.id)
            ? prev.filter((m) => m.id !== pending.id)
            : prev.map((m) => (m.id === pending.id ? saved : m));
          saveCache(updated);
          return updated;
        });
        if (!meRef.current.id) setMe((m) => ({ ...m, id: saved.senderId }));
        void broadcastNewMessage(projectId, saved.id, saved.senderId);
        return { success: true };
      }

      if (res.blocked || res.error?.code === "FIREWALL_BLOCKED") {
        setMessages((prev) => prev.filter((m) => m.id !== pending.id));
        return { success: false, blocked: true, warning: res.warning || res.error?.message };
      }

      const reason = friendlyError(res.error?.code, res.error?.message);
      setMessages((prev) => prev.map((m) => (m.id === pending.id ? { ...m, failed: true, failReason: reason } : m)));
      return { success: false, warning: reason };
    },
    [projectId, saveCache]
  );

  const handleSend = useCallback(
    (content: string): Promise<SendResult> => {
      const text = content.trim();
      if (!text) return Promise.resolve({ success: false });
      const pending: ChatMessage = {
        id: `optimistic_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        projectId,
        senderId: meRef.current.id || "me",
        senderName: meRef.current.name || "You",
        senderRole: viewer === "client" ? "CLIENT" : "STATISTICIAN",
        content: text,
        isBlocked: false,
        blockedReason: null,
        sentAt: new Date().toISOString(),
        isMine: true,
        isRead: false,
        readByCount: 0,
        status: "sending",
        seenByNames: [],
      };
      setMessages((prev) => [...prev, pending]);
      // Sending ends "is typing" on the other side right away.
      lastTypingSentRef.current = 0;
      if (liveRef.current && meRef.current.id) {
        void broadcastTyping(projectId, meRef.current.id, meRef.current.name ?? undefined, true);
      } else {
        void sendFallbackTyping(projectId, true);
      }
      isNearBottomRef.current = true;
      scrollToBottom(true);

      // Save one at a time so messages keep the order they were typed in.
      const job = sendChainRef.current.then(() => persist(pending));
      sendChainRef.current = job.catch(() => undefined);
      return job;
    },
    [projectId, viewer, persist, scrollToBottom]
  );

  const retry = (m: ChatMessage) => {
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
    void handleSend(m.content);
  };
  const discard = (m: ChatMessage) => setMessages((prev) => prev.filter((x) => x.id !== m.id));

  const handleTyping = useCallback(() => {
    const now = Date.now();
    if (!meRef.current.id || now - lastTypingSentRef.current < TYPING_SEND_EVERY_MS) return;
    lastTypingSentRef.current = now;
    if (liveRef.current) void broadcastTyping(projectId, meRef.current.id, meRef.current.name ?? undefined);
    else void sendFallbackTyping(projectId);
  }, [projectId]);

  // Tell the inbox about the newest saved message.
  const onLatestRef = useRef(onLatestMessage);
  onLatestRef.current = onLatestMessage;
  const latestSaved = useMemo(
    () => [...messages].reverse().find((m) => !isPending(m) && !m.failed),
    [messages]
  );
  useEffect(() => {
    if (latestSaved) onLatestRef.current?.(latestSaved);
  }, [latestSaved]);

  // ── View ─────────────────────────────────────────────────────────────────────
  const lastMineId = useMemo(() => [...messages].reverse().find((m) => m.isMine && !m.failed)?.id, [messages]);

  const frame = framed ? "rounded-[2px] border border-white/[0.07]" : "";

  // Everyone else on this study, most relevant first, with online status.
  const presence = usePresence([project?.clientId, project?.statisticianId, project?.qaLeadId], projectId);
  const people = (
    [
      { id: project?.clientId, name: project?.clientName, role: "Client" },
      { id: project?.statisticianId, name: project?.statisticianName, role: "Statistician" },
      { id: project?.qaLeadId, name: project?.qaLeadName, role: "Reviewer" },
    ] as Array<{ id?: string | null; name?: string | null; role: string }>
  ).filter(
    (p) =>
      p.name &&
      !(p.id && p.id === me.id) &&
      !(viewer === "client" && p.role === "Client") &&
      !(viewer === "staff" && !p.id && p.name === me.name)
  );
  const fallbackTyper = presence.typing.find((t) => t.userId !== me.id);
  const shownTyping = typing ?? (fallbackTyper ? { ...fallbackTyper, until: 0 } : null);
  const someoneTyping = Boolean(shownTyping);
  useEffect(() => {
    if (someoneTyping && isNearBottomRef.current) scrollToBottom(true);
  }, [someoneTyping, scrollToBottom]);

  if (isLoading) {
    return (
      <div className={`flex h-full min-h-0 items-center justify-center bg-[#0A0A18] ${frame} ${className}`}>
        <LoadingState variant="card" label="Loading messages..." />
      </div>
    );
  }

  const isAssigned = Boolean(project?.statisticianName || project?.qaLeadName);
  const locked = viewer === "client" && !isAssigned;
  // A group chat: named after the study, with everyone else listed underneath.
  const title = inStudy ? "Team chat" : project?.researchTitle || "Study chat";
  const teamNames = people.map((p) => firstName(p.name) || p.name).filter(Boolean) as string[];
  const greetNames = teamNames.length > 1 ? `${teamNames.slice(0, -1).join(", ")} and ${teamNames[teamNames.length - 1]}` : teamNames[0] || "your team";

  return (
    <div className={`relative flex h-full min-h-0 flex-col overflow-hidden bg-[#0A0A18] ${frame} ${className}`}>
      {toast ? (
        <Toast
          message="Study ID copied"
          description={`${toast} is on your clipboard.`}
          variant="info"
          onClose={() => setToast(null)}
        />
      ) : null}

      {/* Header: who you're talking to, and the study */}
      <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.07] px-3 py-3 sm:px-5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] text-white/70 hover:bg-white/[0.06] hover:text-white lg:hidden"
            aria-label="Back to all chats"
          >
            <ArrowLeft size={18} weight="fill" />
          </button>
        ) : null}
        {locked || people.length === 0 ? (
          <PresenceAvatar name={title}>
            <Lock size={16} weight="fill" className="text-white/45" />
          </PresenceAvatar>
        ) : (
          <GroupAvatar people={people.map((p) => ({ name: p.name, online: presence.isOnline(p.id) }))} />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.938rem] font-semibold text-white">{title}</p>
          <p className="truncate text-xs text-white/50">
            {shownTyping ? (
              <span className="text-[#F08A2E]">{firstName(shownTyping.name) || shownTyping.name} is typing…</span>
            ) : locked || people.length === 0 ? (
              "Chat opens once your team is assigned"
            ) : (
              people.map((p, idx) => {
                const on = presence.isOnline(p.id);
                return (
                  <span key={p.role} title={presence.known && p.id ? (on ? "Online" : "Offline") : undefined}>
                    {idx > 0 ? ", " : ""}
                    {on ? <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 align-middle" /> : null}
                    <span className={on ? "text-white/80" : ""}>{p.name}</span>
                    <span className="text-white/35"> ({p.role.toLowerCase()})</span>
                  </span>
                );
              })
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {project?.intakeId && !inStudy ? (
            <span className="hidden md:inline-flex">
              <CopyButton value={project.intakeId} label={project.intakeId} variant="badge" onCopy={(v) => setToast(v)} />
            </span>
          ) : null}
          {studyHref ? (
            <Link
              href={studyHref}
              className="inline-flex h-9 items-center gap-1.5 rounded-[2px] border border-white/15 px-3 text-xs font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white"
            >
              <span className="hidden sm:inline">View Study</span>
              <span className="sm:hidden">Study</span>
              <ArrowRight size={13} weight="fill" />
            </Link>
          ) : null}
        </div>
      </div>

      {/* Messages: the only part that scrolls */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-4 pt-2 sm:px-5"
        aria-live="polite"
        aria-relevant="additions"
      >
        {isLoadingOlder ? (
          <p className="flex items-center justify-center gap-2 py-3 text-xs text-white/40">
            <CircleNotch size={14} className="animate-spin" /> Loading older messages…
          </p>
        ) : hasMore ? (
          <button
            type="button"
            onClick={() => void loadOlder()}
            className="mx-auto my-2 rounded-[2px] px-3 py-1.5 text-xs text-white/55 hover:bg-white/[0.05] hover:text-white"
          >
            Show older messages
          </button>
        ) : null}

        {locked ? (
          <EmptyState
            icon={<Lock size={18} weight="fill" />}
            title="Chat opens once we assign your statistician"
            body="This happens right after we confirm your deposit. We'll send you a notification when your team is ready."
          />
        ) : messages.length === 0 ? (
          <EmptyState
            icon={<span className="text-sm font-semibold">{initials(people[0]?.name)}</span>}
            title={`Say hi to ${greetNames}`}
            body={
              viewer === "client"
                ? "Ask anything about your study. Your statistician and reviewer both see this chat."
                : "No messages yet. Everyone on this study sees this chat."
            }
          >
            {viewer === "client" ? (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {[
                  "When will my results be ready?",
                  "Can you check my data file?",
                  "Which tests will you use for my study?",
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setPreset(q)}
                    className="rounded-[2px] border border-white/12 bg-white/[0.03] px-3 py-1.5 text-xs text-white/75 transition-colors hover:border-white/25 hover:text-white"
                  >
                    {q}
                  </button>
                ))}
              </div>
            ) : null}
          </EmptyState>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const day = dayLabel(m.sentAt);
            const newDay = !prev || dayLabel(prev.sentAt) !== day;
            const first = newDay || !sameGroup(prev, m);
            const last = !next || !sameGroup(m, next) || dayLabel(next.sentAt) !== day;
            return (
              <React.Fragment key={m.id}>
                {newDay ? (
                  <div className="mb-1 mt-5 flex items-center gap-3 select-none first:mt-2" role="separator">
                    <span className="h-px flex-1 bg-white/[0.07]" />
                    <span className="text-[0.688rem] font-medium text-white/45">{day}</span>
                    <span className="h-px flex-1 bg-white/[0.07]" />
                  </div>
                ) : null}
                <MessageBubble
                  message={m}
                  firstInGroup={first}
                  lastInGroup={last}
                  showStatus={m.id === lastMineId}
                  isNew={newIds.has(m.id)}
                  onRetry={retry}
                  onDiscard={discard}
                />
              </React.Fragment>
            );
          })
        )}

        {shownTyping ? (
          <div className="mt-3 flex items-center gap-3 animate-message-pop" aria-label={`${shownTyping.name} is typing`}>
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] bg-white/[0.08] text-[0.688rem] font-semibold text-white/75"
            >
              {initials(shownTyping.name)}
            </span>
            <p className="flex items-center gap-2 text-xs text-white/50">
              <span className="flex items-center gap-1">
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-white" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-white" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              {firstName(shownTyping.name) || shownTyping.name} is typing…
            </p>
          </div>
        ) : null}

        <div ref={endRef} />
      </div>

      {unreadBelow > 0 ? (
        <button
          type="button"
          onClick={() => {
            isNearBottomRef.current = true;
            scrollToBottom(true);
            setUnreadBelow(0);
          }}
          className="absolute bottom-24 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-[2px] border border-white/15 bg-[#0F0F1D] px-3.5 py-2 text-xs font-medium text-white shadow-lg animate-content-fade"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#CC6600]" />
          {unreadBelow === 1 ? "1 new message" : `${unreadBelow} new messages`}
          <ArrowDown size={13} weight="fill" className="text-white/60" />
        </button>
      ) : null}

      {/* Composer */}
      <div className="shrink-0 border-t border-white/[0.07] px-3 py-3 sm:px-5">
        <MessageInput
          onSendMessage={handleSend}
          onTyping={handleTyping}
          disabled={locked}
          disabledReason={locked ? "You can send messages once your statistician is assigned." : undefined}
          externalText={preset}
          onExternalTextConsumed={() => setPreset("")}
        />
      </div>
    </div>
  );
};

function latestOf(list?: MessageDTO[]): number {
  if (!list?.length) return 0;
  return list.reduce((max, m) => Math.max(max, new Date(m.sentAt).getTime() || 0), 0);
}

function EmptyState({
  icon,
  title,
  body,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="m-auto flex max-w-md flex-col items-center px-4 py-10 text-center animate-content-fade">
      <span className="flex h-12 w-12 items-center justify-center rounded-[2px] bg-white/[0.06] text-white/60">
        {icon}
      </span>
      <p className="mt-4 text-[0.938rem] font-semibold text-white">{title}</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">{body}</p>
      {children}
    </div>
  );
}
