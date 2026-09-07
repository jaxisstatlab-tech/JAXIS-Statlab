"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { MessageDTO } from "../schemas";
import { getProjectMessages, syncNewMessages, sendMessage, markMessagesAsRead } from "../actions";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { LoadingState, Badge } from "@repo/ui";
import {
  IconMessages,
  IconShieldCheck,
  IconLoader2,
  IconHistory,
  IconArrowLeft,
  IconLock,
  IconUser,
  IconCalculator,
  IconAward,
  IconClock,
  IconDatabase,
  IconReportAnalytics,
  IconArrowRight,
  IconArrowDown,
} from "@tabler/icons-react";
import {
  subscribeToProjectMessages,
  broadcastProjectMessage,
  broadcastMessageDelivered,
  broadcastMessagesSeen,
} from "@/lib/messaging/realtime";

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
  } | null;
  hasMore?: boolean;
  nextCursor?: string | null;
  currentUserId?: string | null;
  currentUserName?: string | null;
}

interface MessageThreadProps {
  projectId: string;
  className?: string;
  onBack?: () => void;
  initialThreadData?: InitialThreadData | null;
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  projectId,
  className = "",
  onBack,
  initialThreadData,
}) => {
  const CACHE_KEY = `jaxis_chat_cache_${projectId}`;

  // Read initial cache synchronously if available
  const [messages, setMessages] = useState<MessageDTO[]>(() => {
    if (initialThreadData?.messages && initialThreadData.messages.length > 0) {
      return initialThreadData.messages;
    }
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.messages)) return parsed.messages;
        }
      } catch {
        // ignore
      }
    }
    return [];
  });

  const [hasMore, setHasMore] = useState<boolean>(initialThreadData?.hasMore ?? false);
  const [nextCursor, setNextCursor] = useState<string | null>(initialThreadData?.nextCursor ?? null);
  const [isLoadingOlder, setIsLoadingOlder] = useState<boolean>(false);
  const [projectInfo, setProjectInfo] = useState<{
    id: string;
    intakeId: string;
    researchTitle: string;
    masterStatus: string;
    clientName: string;
    statisticianName: string | null;
    qaLeadName: string | null;
  } | null>(() => {
    if (initialThreadData?.projectInfo) {
      return initialThreadData.projectInfo;
    }
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem(`jaxis_chat_cache_${projectId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.project) return parsed.project;
        }
      } catch {
        // ignore
      }
    }
    return null;
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    if (initialThreadData?.currentUserId) {
      return initialThreadData.currentUserId;
    }
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem(`jaxis_chat_cache_${projectId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.currentUserId) return parsed.currentUserId;
        }
      } catch {
        // ignore
      }
    }
    return null;
  });
  const currentUserIdRef = useRef<string | null>(currentUserId);
  currentUserIdRef.current = currentUserId;

  const [currentUserName, setCurrentUserName] = useState<string | null>(() => {
    return initialThreadData?.currentUserName || null;
  });
  const currentUserNameRef = useRef<string | null>(currentUserName);
  currentUserNameRef.current = currentUserName;

  const [presetPrompt, setPresetPrompt] = useState<string>("");
  const [newIncomingIds, setNewIncomingIds] = useState<Set<string>>(new Set());
  const [unreadBelowCount, setUnreadBelowCount] = useState<number>(0);

  // Only show skeleton if we have zero cached messages & zero projectInfo and no initial data
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (initialThreadData?.projectInfo || (initialThreadData?.messages && initialThreadData.messages.length > 0)) {
      return false;
    }
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem(`jaxis_chat_cache_${projectId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.project || (parsed.messages && parsed.messages.length > 0)) {
            return false; // Instant 0ms render from cache!
          }
        }
      } catch {
        // ignore
      }
    }
    return true;
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef<boolean>(true);
  const messagesRef = useRef<MessageDTO[]>([]);
  messagesRef.current = messages;
  const projectInfoRef = useRef(projectInfo);
  projectInfoRef.current = projectInfo;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;
  const nextCursorRef = useRef(nextCursor);
  nextCursorRef.current = nextCursor;

  // Checks whether the user's viewport is at or near the bottom (within 150px)
  const checkIfNearBottom = useCallback(() => {
    if (!chatContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 150;
  }, []);

  // Multi-frame robust scroll-to-bottom that guarantees sticking to the bottom-most pixel
  const scrollToBottom = useCallback((smooth = false) => {
    const doScroll = () => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight + 10000;
      }
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: smooth ? "smooth" : "auto",
          block: "end",
        });
      }
    };

    doScroll();
    requestAnimationFrame(doScroll);
    setTimeout(doScroll, 40);
    setTimeout(doScroll, 120);
  }, []);

  // Warm sessionStorage cache immediately when initialThreadData is provided
  useEffect(() => {
    if (initialThreadData?.projectInfo && typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          `jaxis_chat_cache_${projectId}`,
          JSON.stringify({
            project: initialThreadData.projectInfo,
            messages: initialThreadData.messages || [],
            hasMore: initialThreadData.hasMore ?? false,
            nextCursor: initialThreadData.nextCursor ?? null,
            currentUserId: initialThreadData.currentUserId || currentUserIdRef.current,
          })
        );
      } catch {
        // ignore
      }
    }
  }, [initialThreadData, projectId]);

  const loadInitialMessages = useCallback(async () => {
    // If no cache and no initial data, mark loading
    if (messagesRef.current.length === 0 && !projectInfoRef.current && !initialThreadData?.projectInfo) {
      setIsLoading(true);
    }
    isNearBottomRef.current = true;

    try {
      const res = await getProjectMessages(projectId, { limit: 20 });
      if (res.success && res.data) {
        if (res.data.currentUserId) {
          setCurrentUserId(res.data.currentUserId);
        }
        if (res.data.currentUserName) {
          setCurrentUserName(res.data.currentUserName);
        }
        setProjectInfo(res.data.project);
        setMessages(res.data.messages);
        setHasMore(res.data.hasMore);
        setNextCursor(res.data.nextCursor);

        // Broadcast seen receipt to peers for any unread messages from others
        const unreadFromOthers = res.data.messages
          .filter((m) => !m.isMine && m.status !== "seen")
          .map((m) => m.id);
        if (unreadFromOthers.length > 0 && res.data.currentUserId) {
          broadcastMessagesSeen(
            projectId,
            unreadFromOthers,
            res.data.currentUserId,
            res.data.currentUserName || undefined
          ).catch(() => {});

          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("jaxis:unread-count-updated"));
          }
        }

        // Cache snapshot to browser sessionStorage for instant 0ms reload
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem(
              `jaxis_chat_cache_${projectId}`,
              JSON.stringify({
                project: res.data.project,
                messages: res.data.messages,
                hasMore: res.data.hasMore,
                nextCursor: res.data.nextCursor,
                currentUserId: res.data.currentUserId || currentUserIdRef.current,
              })
            );
          } catch {
            // ignore quota errors
          }
        }

        // Stick to bottom-most once initial server messages arrive
        scrollToBottom(false);
      }
    } catch (err) {
      console.error("Failed to load initial project messages:", err);
    } finally {
      setIsLoading(false);
    }
  }, [initialThreadData?.projectInfo, projectId, scrollToBottom]);

  const loadOlderMessages = useCallback(async () => {
    if (!hasMore || isLoadingOlder || !nextCursor) return;

    setIsLoadingOlder(true);
    const prevScrollHeight = chatContainerRef.current?.scrollHeight || 0;

    try {
      const res = await getProjectMessages(projectId, { cursor: nextCursor, limit: 20 });
      if (res.success && res.data) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const olderUnique = res.data!.messages.filter((m) => !existingIds.has(m.id));
          const updated = [...olderUnique, ...prev];

          if (typeof window !== "undefined") {
            try {
              sessionStorage.setItem(
                `jaxis_chat_cache_${projectId}`,
                JSON.stringify({
                  project: projectInfoRef.current,
                  messages: updated,
                  hasMore: res.data!.hasMore,
                  nextCursor: res.data!.nextCursor,
                })
              );
            } catch {
              // ignore
            }
          }

          return updated;
        });
        setHasMore(res.data.hasMore);
        setNextCursor(res.data.nextCursor);

        // Preserve scroll position relative to previous top content
        requestAnimationFrame(() => {
          if (chatContainerRef.current) {
            const newScrollHeight = chatContainerRef.current.scrollHeight;
            chatContainerRef.current.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });
      }
    } catch (err) {
      console.error("Failed to load older messages:", err);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [hasMore, isLoadingOlder, nextCursor, projectId]);

  // Scroll listener for top reverse cursor pagination & near-bottom tracking
  const handleScroll = () => {
    if (chatContainerRef.current) {
      const nearBottom = checkIfNearBottom();
      isNearBottomRef.current = nearBottom;
      if (nearBottom) {
        setUnreadBelowCount(0);
      }
      if (chatContainerRef.current.scrollTop <= 40 && hasMore && !isLoadingOlder) {
        loadOlderMessages();
      }
    }
  };

  useEffect(() => {
    loadInitialMessages();
  }, [loadInitialMessages]);

  // Always scroll to bottom-most when opening or switching projects
  useEffect(() => {
    isNearBottomRef.current = true;
    scrollToBottom(false);
  }, [projectId, scrollToBottom]);

  // Stick to bottom-most whenever loading finishes or initial messages render
  useEffect(() => {
    if (!isLoading && messages.length > 0 && isNearBottomRef.current) {
      scrollToBottom(false);
    }
  }, [isLoading, messages.length, scrollToBottom]);

  // Automatic resize observer: if layout expands or font loads, remain stuck to bottom
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    let timer: NodeJS.Timeout;
    const observer = new ResizeObserver(() => {
      if (isNearBottomRef.current && chatContainerRef.current) {
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight + 10000;
          }
        }, 20);
      }
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  // Delta Sync: Fetches new incoming messages since the last known timestamp
  const syncDelta = useCallback(async () => {
    if (!projectId) return;
    const lastMsg = messagesRef.current[messagesRef.current.length - 1];
    const sinceIso = lastMsg ? lastMsg.sentAt : new Date(Date.now() - 60000).toISOString();

    try {
      const syncRes = await syncNewMessages(projectId, sinceIso);
      if (syncRes.success && syncRes.data && syncRes.data.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = syncRes.data!.filter((m) => !existingIds.has(m.id));
          if (fresh.length === 0) return prev;
          const updated = [...prev, ...fresh];

          if (typeof window !== "undefined") {
            try {
              sessionStorage.setItem(
                `jaxis_chat_cache_${projectId}`,
                JSON.stringify({
                  project: projectInfoRef.current,
                  messages: updated,
                  hasMore: hasMoreRef.current,
                  nextCursor: nextCursorRef.current,
                })
              );
            } catch {
              // ignore
            }
          }

          return updated;
        });
        scrollToBottom(true);
      }
    } catch (err) {
      console.error("Failed to sync realtime delta messages:", err);
    }
  }, [projectId, scrollToBottom]);

  // Immediate Realtime message handler (0ms UI update on incoming WebSocket push)
  const handleIncomingRealtimeMessage = useCallback(
    (incoming: MessageDTO) => {
      if (!incoming || !incoming.id) return;

      setMessages((prev) => {
        // Prevent duplicate messages
        const existingIdx = prev.findIndex((m) => m.id === incoming.id);
        if (existingIdx !== -1) {
          return prev;
        }

        // Check if there is a matching optimistic bubble from the current sender
        const isMine = Boolean(
          currentUserIdRef.current && incoming.senderId === currentUserIdRef.current
        );
        const optimisticIdx = prev.findIndex(
          (m) =>
            m.id.startsWith("optimistic_") &&
            m.content === incoming.content &&
            isMine
        );

        const calibratedMessage: MessageDTO = {
          ...incoming,
          isMine,
          status: isMine ? (incoming.status || "sent") : "delivered",
        };

        let updated: MessageDTO[];
        if (optimisticIdx !== -1) {
          updated = [...prev];
          updated[optimisticIdx] = calibratedMessage;
        } else {
          updated = [...prev, calibratedMessage];
        }

        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem(
              `jaxis_chat_cache_${projectId}`,
              JSON.stringify({
                project: projectInfoRef.current,
                messages: updated,
                hasMore: hasMoreRef.current,
                nextCursor: nextCursorRef.current,
                currentUserId: currentUserIdRef.current,
              })
            );
          } catch {
            // ignore
          }
        }

        return updated;
      });

      const isMine = Boolean(
        currentUserIdRef.current && incoming.senderId === currentUserIdRef.current
      );

      if (!isMine) {
        setNewIncomingIds((prev) => new Set([...prev, incoming.id]));
        setTimeout(() => {
          setNewIncomingIds((prev) => {
            const next = new Set(prev);
            next.delete(incoming.id);
            return next;
          });
        }, 2500);

        if (!isNearBottomRef.current) {
          setUnreadBelowCount((prev) => prev + 1);
        } else {
          scrollToBottom(true);
        }
      } else {
        scrollToBottom(true);
      }
    },
    [projectId, scrollToBottom]
  );

  // 3. Real-time Subscription via Supabase Phoenix Channels + Adaptive 2-second Polling Safety Net
  useEffect(() => {
    if (!projectId) return;

    // Instant WebSocket push trigger for sub-50ms peer-to-peer delivery
    const cleanup = subscribeToProjectMessages(projectId, {
      onMessage: (incomingMessage) => {
        handleIncomingRealtimeMessage(incomingMessage);

        // Immediate acknowledgment: notify sender that their message was delivered
        if (currentUserIdRef.current && incomingMessage.senderId !== currentUserIdRef.current) {
          broadcastMessageDelivered(projectId, incomingMessage.id).catch(() => {});

          // If current tab is active and visible, also acknowledge seen
          if (typeof document !== "undefined" && document.visibilityState === "visible") {
            markMessagesAsRead(projectId, [incomingMessage.id]).catch(() => {});
            broadcastMessagesSeen(
              projectId,
              [incomingMessage.id],
              currentUserIdRef.current,
              currentUserNameRef.current || undefined
            ).catch(() => {});
          }
        }
      },
      onDelivered: ({ messageId }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId && m.status === "sent"
              ? { ...m, status: "delivered" }
              : m
          )
        );
      },
      onSeen: ({ messageIds, readerName }) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (messageIds.includes(m.id)) {
              const updatedNames = readerName
                ? Array.from(new Set([...(m.seenByNames || []), readerName]))
                : m.seenByNames || [];
              return {
                ...m,
                status: "seen",
                isRead: true,
                seenByNames: updatedNames,
              };
            }
            return m;
          })
        );
      },
    });

    // Fallback polling safety net (catches edge cases if socket drops)
    const pollInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return; // sleep when tab is hidden
      }
      syncDelta();
    }, 20000);

    // Instant sync when user tabs back into the consultation
    const handleVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        syncDelta();
        const unreadFromOthers = messagesRef.current
          .filter((m) => !m.isMine && m.status !== "seen")
          .map((m) => m.id);

        if (unreadFromOthers.length > 0 && currentUserIdRef.current) {
          markMessagesAsRead(projectId, unreadFromOthers).catch(() => {});
          broadcastMessagesSeen(
            projectId,
            unreadFromOthers,
            currentUserIdRef.current,
            currentUserNameRef.current || undefined
          ).catch(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cleanup();
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [projectId, handleIncomingRealtimeMessage, syncDelta]);

  // Optimistic Message Sender (Instant 0ms bubble display + Instant <20ms WebSocket peer broadcast)
  const handleSendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return { success: false };

    const tempId = `optimistic_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMessage: MessageDTO = {
      id: tempId,
      projectId,
      senderId: currentUserIdRef.current || "current_user",
      senderName: currentUserNameRef.current || "You",
      senderRole: "CLIENT",
      content: trimmed,
      isBlocked: false,
      blockedReason: null,
      sentAt: new Date().toISOString(),
      isMine: true,
      isRead: false,
      readByCount: 0,
      status: "sent",
      seenByNames: [],
    };

    // 1. Paint optimistic bubble immediately on screen (0ms delay) with "sent" status
    setMessages((prev) => [...prev, optimisticMessage]);
    scrollToBottom(true);

    // 2. Broadcast immediately over WebSocket so recipients receive it in <20ms (zero wait for DB HTTP write)
    broadcastProjectMessage(projectId, {
      ...optimisticMessage,
      isMine: false,
      status: "delivered",
    }).catch((err) => {
      console.warn("[Realtime Instant Peer Broadcast Warning]", err);
    });

    try {
      // 3. Persist to server in background via ultra-fast REST Route Handler
      let res: { success: boolean; data?: MessageDTO; blocked?: boolean; warning?: string; error?: { code?: string; message: string } };
      try {
        const fetchRes = await fetch("/api/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, content: trimmed }),
        });
        res = await fetchRes.json();
      } catch {
        res = await sendMessage({ projectId, content: trimmed });
      }

      if (res.success && res.data) {
        const confirmedMsg: MessageDTO = {
          ...res.data,
          isMine: true,
          status: "sent",
        };

        // Swap temporary optimistic bubble ID with confirmed server database record
        setMessages((prev) => {
          const updated = prev.map((m) => (m.id === tempId ? confirmedMsg : m));
          if (typeof window !== "undefined") {
            try {
              sessionStorage.setItem(
                `jaxis_chat_cache_${projectId}`,
                JSON.stringify({
                  project: projectInfo,
                  messages: updated,
                  hasMore,
                  nextCursor,
                  currentUserId: currentUserIdRef.current,
                })
              );
            } catch {
              // ignore
            }
          }
          return updated;
        });

        return { success: true };
      }

      // If blocked or server returned error, rollback optimistic bubble
      setMessages((prev) => prev.filter((m) => m.id !== tempId));

      if (res.error?.code === "FIREWALL_BLOCKED") {
        return { success: false, blocked: true, warning: res.error.message };
      }
      return { success: false, warning: res.error?.message };
    } catch (err) {
      // Rollback on network failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return { success: false, warning: (err as Error).message || "Failed to deliver message." };
    }
  };

  if (isLoading) {
    return (
      <div className={`h-full min-h-0 p-8 sm:p-12 bg-[#01142B] border border-white/10 rounded-[4px] flex flex-col items-center justify-center shadow-2xl ${className}`}>
        <LoadingState
          variant="card"
          label="Loading Conversation..."
          description="Please wait while we load your research consultation thread"
        />
      </div>
    );
  }

  const isAssigned = Boolean(projectInfo?.statisticianName || projectInfo?.qaLeadName);

  return (
    <div className={`relative h-full min-h-0 flex flex-col bg-[#01142B] border border-white/10 rounded-[4px] overflow-hidden shadow-2xl ${className}`}>
      {/* Thread Header — STATIC FIXED HEIGHT (Zero layout shift & Clean Minimalist Palette) */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-3 border-b border-white/10 bg-[#010114]/90 flex flex-col gap-1.5 sm:gap-2 font-sans">
        {/* Top Row: Navigation, Study ID, Status & Security Indicator */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="lg:hidden p-1.5 rounded-[2px] bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-white/80 hover:text-white cursor-pointer transition-colors shrink-0"
                aria-label="Back to studies list"
              >
                <IconArrowLeft size={16} stroke={2} />
              </button>
            )}
            <div className="hidden xs:flex p-1.5 rounded-[2px] bg-white/[0.04] border border-white/10 text-white/50 shrink-0">
              <IconMessages size={15} stroke={1.5} />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <span className="text-xs font-mono font-semibold text-white/90 tracking-wider shrink-0 select-all">
                {projectInfo?.intakeId || "STUDY THREAD"}
              </span>

              <Badge variant="outline" className="text-[0.625rem] font-mono px-1.5 py-0 border-white/10 text-white/60 bg-white/[0.02] shrink-0">
                {!isAssigned || projectInfo?.masterStatus === "ACTIVE"
                  ? "ACTIVE"
                  : projectInfo?.masterStatus.replace(/_/g, " ") || "ACTIVE"}
              </Badge>

              {/* Desktop Study Title */}
              <span className="text-white/20 hidden md:inline select-none">&bull;</span>
              <h2 className="hidden md:block text-xs sm:text-sm font-semibold text-white/90 tracking-tight truncate min-w-0">
                {projectInfo?.researchTitle || "Research Study Discussion"}
              </h2>
            </div>
          </div>

          {/* Security Status Pill */}
          <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-[2px] bg-white/[0.02] border border-white/10 text-white/50 text-[0.688rem] font-sans select-none shrink-0">
            <IconShieldCheck size={13} stroke={1.5} className="text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">Encrypted Consultation</span>
            <span className="sm:hidden text-[0.625rem] font-mono text-emerald-400/80">ENCRYPTED</span>
          </div>
        </div>

        {/* Mobile Study Title (Single Line Truncated) */}
        {projectInfo?.researchTitle && (
          <div className="md:hidden min-w-0 -mt-0.5">
            <h2 className="text-xs font-medium text-white/70 tracking-tight truncate">
              {projectInfo.researchTitle}
            </h2>
          </div>
        )}

        {/* Mobile Team Summary: Single clean line */}
        {isAssigned ? (
          <div className="flex sm:hidden items-center gap-1.5 text-[0.688rem] text-white/55 min-w-0 truncate">
            <span className="text-[0.625rem] font-mono text-white/40 uppercase tracking-wider shrink-0 select-none">
              Team:
            </span>
            <span className="truncate text-white/75 font-sans">
              {[
                projectInfo?.clientName,
                projectInfo?.statisticianName,
                projectInfo?.qaLeadName,
              ]
                .filter(Boolean)
                .join(" • ")}
            </span>
          </div>
        ) : (
          <div className="flex sm:hidden items-center gap-1 text-[0.688rem] text-white/40 font-mono">
            <IconLock size={11} stroke={1.5} className="text-white/30 shrink-0" />
            <span>Awaiting Specialist Assignment</span>
          </div>
        )}

        {/* Tablet & Desktop: Rich Team Participant Chips */}
        <div className="hidden sm:flex items-center gap-2 flex-wrap min-w-0 pt-0.5">
          {!isAssigned ? (
            <div className="flex items-center gap-1.5 text-xs text-white/50 bg-white/[0.02] px-2.5 py-0.5 rounded-[2px] border border-white/10">
              <IconLock size={12} stroke={1.5} className="text-white/40 shrink-0" />
              <span className="text-[0.688rem] font-mono">
                Team: Awaiting Specialist Assignment
              </span>
            </div>
          ) : (
            <>
              <span className="text-[0.688rem] font-mono text-white/40 uppercase tracking-wider shrink-0 mr-1 select-none">
                Consultation Team:
              </span>

              {/* Client Chip */}
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] bg-white/[0.03] border border-white/10 text-xs text-white/80 shrink-0">
                <IconUser size={13} stroke={1.5} className="text-white/40 shrink-0" />
                <span className="text-white/40 text-[0.688rem] font-mono">Client:</span>
                <span className="font-medium text-white/90 truncate max-w-[140px]">
                  {projectInfo?.clientName || "Client"}
                </span>
              </div>

              {/* Statistician Chip */}
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] bg-white/[0.03] border border-white/10 text-xs text-white/80 shrink-0">
                <IconCalculator size={13} stroke={1.5} className="text-white/40 shrink-0" />
                <span className="text-white/40 text-[0.688rem] font-mono">Statistician:</span>
                <span className="font-medium text-white/90 truncate max-w-[150px]">
                  {projectInfo?.statisticianName || "Unassigned"}
                </span>
              </div>

              {/* QA Lead Chip */}
              {projectInfo?.qaLeadName && (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] bg-white/[0.03] border border-white/10 text-xs text-white/80 shrink-0">
                  <IconAward size={13} stroke={1.5} className="text-white/40 shrink-0" />
                  <span className="text-white/40 text-[0.688rem] font-mono">QA:</span>
                  <span className="font-medium text-white/90 truncate max-w-[140px]">
                    {projectInfo.qaLeadName}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Messages Stream Container — ONLY THIS SCROLLS */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className={`flex-1 min-h-0 ${
          messages.length === 0 ? "overflow-hidden" : "overflow-y-auto"
        } p-3 sm:p-4 flex flex-col gap-2.5 bg-[#010114]/30 custom-scrollbar`}
      >
        {/* Older Messages Pagination Trigger / Indicator */}
        {isLoadingOlder ? (
          <div className="py-2 flex items-center justify-center gap-2 text-xs text-white/40 font-mono">
            <IconLoader2 size={14} className="animate-spin" />
            <span>Loading older messages...</span>
          </div>
        ) : hasMore ? (
          <div className="py-1.5 flex items-center justify-center">
            <button
              type="button"
              onClick={loadOlderMessages}
              className="px-3 py-1 rounded-[2px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[0.688rem] font-mono text-white/60 hover:text-white flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
            >
              <IconHistory size={13} stroke={1.5} className="text-white/40" />
              <span>Load older messages</span>
            </button>
          </div>
        ) : messages.length > 0 ? (
          <div className="py-2 flex items-center justify-center gap-3 text-[0.625rem] font-mono text-white/30 uppercase tracking-wider select-none">
            <span className="h-px bg-white/10 flex-1" />
            <span className="flex items-center gap-1.5">
              <IconShieldCheck size={12} stroke={1.5} className="text-white/40" />
              <span>Direct Consultation Channel • Protected</span>
            </span>
            <span className="h-px bg-white/10 flex-1" />
          </div>
        ) : null}

        {/* Empty / Locked State */}
        {!isAssigned && messages.length === 0 ? (
          <div className="my-auto py-4 px-6 max-w-md mx-auto rounded-[2px] bg-[#01142B]/60 border border-white/10 flex flex-col items-center justify-center text-center gap-3 shadow-xl animate-content-fade">
            <div className="h-9 w-9 rounded-[2px] bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/40">
              <IconLock size={18} stroke={1.5} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">Consultation Channel Locked</h3>
              <p className="text-xs text-white/50 leading-relaxed font-sans">
                Your deposit has been verified. This consultation thread will automatically unlock as soon as an administrator assigns your Lead Statistician and QA Lead.
              </p>
            </div>
            <div className="px-2.5 py-0.5 rounded-[2px] bg-white/[0.02] border border-white/[0.08] text-[0.688rem] font-mono text-white/40 tracking-wider">
              Status: Pending Specialist Assignment
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="my-auto py-2 px-4 sm:px-6 max-w-md mx-auto flex flex-col items-center justify-center text-center gap-3 animate-content-fade">
            <div className="h-9 w-9 rounded-[2px] bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/40">
              <IconMessages size={18} stroke={1.5} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Study Consultation Active
              </h3>
              <p className="text-xs text-white/50 leading-relaxed max-w-sm font-sans">
                Communicate directly with your assigned research specialists regarding methodology, data format requirements, and timeline expectations.
              </p>
            </div>

            {/* Clickable Starter Prompts */}
            <div className="w-full flex flex-col gap-1.5 pt-1 text-left">
              <span className="text-[0.625rem] font-mono text-white/35 uppercase tracking-wider text-center block">
                Suggested Consultation Inquiries
              </span>

              <button
                type="button"
                onClick={() =>
                  setPresetPrompt(
                    "Hello team, I would like to inquire about our expected analysis timeline and upcoming review milestones."
                  )
                }
                className="w-full p-2 rounded-[2px] bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-white/20 text-left text-xs text-white/70 hover:text-white flex items-center justify-between gap-2 transition-all cursor-pointer group select-none"
              >
                <div className="flex items-center gap-2">
                  <IconClock size={13} stroke={1.5} className="text-white/40 shrink-0" />
                  <span>Inquire about analysis timeline &amp; milestones</span>
                </div>
                <IconArrowRight
                  size={12}
                  stroke={1.5}
                  className="text-white/25 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all"
                />
              </button>

              <button
                type="button"
                onClick={() =>
                  setPresetPrompt(
                    "Hello team, could you please review my uploaded dataset to verify if the file format and variable coding meet all specifications?"
                  )
                }
                className="w-full p-2 rounded-[2px] bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-white/20 text-left text-xs text-white/70 hover:text-white flex items-center justify-between gap-2 transition-all cursor-pointer group select-none"
              >
                <div className="flex items-center gap-2">
                  <IconDatabase size={13} stroke={1.5} className="text-white/40 shrink-0" />
                  <span>Confirm dataset format &amp; variable requirements</span>
                </div>
                <IconArrowRight
                  size={12}
                  stroke={1.5}
                  className="text-white/25 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all"
                />
              </button>

              <button
                type="button"
                onClick={() =>
                  setPresetPrompt(
                    "Hello team, I would like to clarify the statistical hypotheses and specific tests planned for this study."
                  )
                }
                className="w-full p-2 rounded-[2px] bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-white/20 text-left text-xs text-white/70 hover:text-white flex items-center justify-between gap-2 transition-all cursor-pointer group select-none"
              >
                <div className="flex items-center gap-2">
                  <IconReportAnalytics size={13} stroke={1.5} className="text-white/40 shrink-0" />
                  <span>Clarify research hypothesis &amp; statistical tests</span>
                </div>
                <IconArrowRight
                  size={12}
                  stroke={1.5}
                  className="text-white/25 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all"
                />
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isNew={newIncomingIds.has(msg.id)}
            />
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating "New Message" Jump Pill when user is scrolled up */}
      {unreadBelowCount > 0 && (
        <div className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-30 animate-content-fade pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              isNearBottomRef.current = true;
              scrollToBottom(true);
              setUnreadBelowCount(0);
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-[2px] bg-[#01142B]/95 hover:bg-[#011B38] border border-[#38BDF8]/60 hover:border-[#38BDF8] text-xs font-sans text-white shadow-2xl backdrop-blur-md transition-all cursor-pointer select-none group"
          >
            <span className="h-2 w-2 rounded-full bg-[#38BDF8] animate-pulse" />
            <span className="font-medium">
              {unreadBelowCount === 1 ? "New message received" : `${unreadBelowCount} new messages`}
            </span>
            <IconArrowDown size={13} stroke={2} className="text-[#38BDF8] group-hover:translate-y-0.5 transition-transform" />
          </button>
        </div>
      )}

      {/* Message Input Footer — PINNED AT BOTTOM */}
      <div className="flex-shrink-0 p-2.5 sm:p-4 border-t border-white/10 bg-[#010114]/80">
        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={!isAssigned}
          disabledReason={!isAssigned ? "Channel locked • Waiting for administrator to assign research team" : undefined}
          placeholder={!isAssigned ? "Consultation channel will open once your research team is assigned..." : undefined}
          externalText={presetPrompt}
          onExternalTextConsumed={() => setPresetPrompt("")}
        />
      </div>
    </div>
  );
};
