"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabase";

/**
 * Who is online right now (has the app open), shared by the whole dashboard.
 *
 * Live: one Supabase presence channel keyed by user id. It carries ids only (no names), since
 * anyone with the public key could read it.
 * Fallback (offline dev): check-ins to /api/v1/presence, which returns 404 in production.
 */

type Snapshot = { live: boolean; known: boolean; online: ReadonlySet<string> };
const EMPTY: Snapshot = { live: false, known: false, online: new Set() };

let snapshot: Snapshot = EMPTY;
const subscribers = new Set<() => void>();
const emit = (next: Partial<Snapshot>) => {
  snapshot = { ...snapshot, ...next };
  subscribers.forEach((fn) => fn());
};
const subscribe = (fn: () => void) => {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
};

let started: { id: string; stop: () => void } | null = null;
let fallbackAvailable = true;

/** Start announcing this user as online. Called once by the dashboard shell. */
export function startPresence(userId: string): () => void {
  if (typeof window === "undefined" || !userId) return () => {};
  if (started?.id === userId) return started.stop;
  started?.stop();

  let channel: RealtimeChannel | null = null;
  try {
    const ch = supabaseClient.channel("jaxis-online", { config: { presence: { key: userId } } });
    channel = ch;
    ch.on("presence", { event: "sync" }, () => {
      emit({ online: new Set(Object.keys(ch.presenceState())), known: true, live: true });
    }).subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void ch.track({ at: Date.now() });
        emit({ live: true });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        emit({ live: false });
      }
    });
  } catch {
    // no live connection: the fallback below covers offline dev
  }

  const checkIn = async () => {
    if (!fallbackAvailable || snapshot.live) return;
    try {
      const r = await fetch("/api/v1/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (r.status === 404) fallbackAvailable = false;
    } catch {
      // try again next time
    }
  };
  void checkIn();
  const timer = setInterval(checkIn, 10_000);

  const stop = () => {
    clearInterval(timer);
    if (channel) supabaseClient.removeChannel(channel);
    started = null;
    emit(EMPTY);
  };
  started = { id: userId, stop };
  return stop;
}

/** Send a typing signal through the offline fallback (live mode uses the chat channel). */
export async function sendFallbackTyping(projectId: string, stopped = false): Promise<void> {
  if (!fallbackAvailable) return;
  try {
    const r = await fetch("/api/v1/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typingIn: projectId, stoppedTyping: stopped }),
    });
    if (r.status === 404) fallbackAvailable = false;
  } catch {
    // ignore
  }
}

export type TypingUser = { userId: string; name: string };

/**
 * Online status for some people, plus (with a projectId) who is typing there when the chat's
 * live channel is down. `known` is false until we have an answer, so callers show nothing
 * rather than a wrong "Offline".
 */
export function usePresence(ids: Array<string | null | undefined>, projectId?: string) {
  const live = useSyncExternalStore(subscribe, () => snapshot, () => EMPTY);
  const [fallback, setFallback] = useState<{ known: boolean; online: ReadonlySet<string>; typing: TypingUser[] }>({
    known: false,
    online: new Set(),
    typing: [],
  });
  const key = ids.filter(Boolean).join(",");

  useEffect(() => {
    if (!fallbackAvailable || (live.live && !projectId) || (!key && !projectId)) return;
    let stopped = false;
    const poll = async () => {
      if (!fallbackAvailable || stopped || document.visibilityState === "hidden") return;
      try {
        const qs = new URLSearchParams({ ids: key });
        if (projectId) qs.set("projectId", projectId);
        const r = await fetch(`/api/v1/presence?${qs}`, { cache: "no-store" });
        if (r.status === 404) {
          fallbackAvailable = false;
          return;
        }
        const body = (await r.json()) as { online?: string[]; typing?: TypingUser[] };
        if (!stopped) {
          setFallback({ known: true, online: new Set(body.online ?? []), typing: body.typing ?? [] });
        }
      } catch {
        // try again next time
      }
    };
    void poll();
    const timer = setInterval(poll, projectId ? 2000 : 5000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [key, projectId, live.live]);

  const source = live.live ? live : fallback;
  return {
    known: source.known,
    isOnline: (id?: string | null) => Boolean(id && source.online.has(id)),
    /** Typing from the offline fallback only (live typing arrives on the chat channel). */
    typing: fallback.typing,
  };
}
