import { supabaseClient } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Live chat signals over Supabase Realtime broadcast channels (one per study).
 *
 * These channels are public to anyone holding the anon key and the study id, so they carry
 * NO message text: only "something changed" signals with ids. The chat treats a `new_message`
 * signal as a doorbell and fetches the real messages from the server, which checks access and
 * runs the firewall. Anything posted to the channel by someone else can't inject content.
 */

// One live channel per study, shared by the subscriber and the senders on this page.
const activeChannels = new Map<string, RealtimeChannel>();

export interface RealtimeMessageListeners {
  /** Someone saved a new message in this study. Fetch new messages from the server. */
  onNewMessage: (signal: { id?: string; senderId?: string }) => void;
  onDelivered?: (payload: { messageId: string }) => void;
  onSeen?: (payload: { messageIds: string[]; readerId: string; readerName?: string }) => void;
  onTyping?: (payload: { userId: string; name?: string; stopped?: boolean }) => void;
  /** Channel status from Supabase: "SUBSCRIBED" when live, anything else means use the fallback checks. */
  onStatus?: (status: string) => void;
}

const channelFor = (projectId: string) => {
  let channel = activeChannels.get(projectId);
  if (!channel) {
    channel = supabaseClient.channel(`project-messages:${projectId}`, {
      config: { broadcast: { ack: false, self: false } },
    });
    activeChannels.set(projectId, channel);
  }
  return channel;
};

/** Subscribe to a study's live signals. Returns a cleanup function for useEffect. */
export function subscribeToProjectMessages(
  projectId: string,
  listeners: RealtimeMessageListeners
): () => void {
  if (!projectId || typeof window === "undefined" || !supabaseClient) {
    listeners.onStatus?.("UNAVAILABLE");
    return () => {};
  }

  try {
    const channel = channelFor(projectId);
    channel
      .on("broadcast", { event: "new_message" }, ({ payload }) => {
        const p = (payload ?? {}) as { id?: unknown; senderId?: unknown };
        listeners.onNewMessage({
          id: typeof p.id === "string" ? p.id : undefined,
          senderId: typeof p.senderId === "string" ? p.senderId : undefined,
        });
      })
      .on("broadcast", { event: "message_delivered" }, ({ payload }) => {
        if (typeof payload?.messageId === "string") listeners.onDelivered?.({ messageId: payload.messageId });
      })
      .on("broadcast", { event: "messages_seen" }, ({ payload }) => {
        if (Array.isArray(payload?.messageIds) && typeof payload?.readerId === "string") {
          listeners.onSeen?.({
            messageIds: payload.messageIds.filter((id: unknown): id is string => typeof id === "string"),
            readerId: payload.readerId,
            readerName: typeof payload.readerName === "string" ? payload.readerName.slice(0, 80) : undefined,
          });
        }
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (typeof payload?.userId === "string") {
          listeners.onTyping?.({
            userId: payload.userId,
            name: typeof payload.name === "string" ? payload.name.slice(0, 80) : undefined,
            stopped: payload.stopped === true,
          });
        }
      })
      .subscribe((status) => {
        listeners.onStatus?.(status);
      });

    return () => {
      try {
        activeChannels.delete(projectId);
        supabaseClient.removeChannel(channel);
      } catch {
        // ignore teardown errors
      }
    };
  } catch (err) {
    console.warn("[Realtime] Subscription error. Using regular checks instead.", err);
    listeners.onStatus?.("CHANNEL_ERROR");
    return () => {};
  }
}

async function send(projectId: string, event: string, payload: Record<string, unknown>): Promise<boolean> {
  if (!projectId || typeof window === "undefined" || !supabaseClient) return false;
  try {
    const result = await channelFor(projectId).send({ type: "broadcast", event, payload });
    return result === "ok";
  } catch {
    return false;
  }
}

/** Ring the doorbell after the server saved a message (ids only, never the text). */
export const broadcastNewMessage = (projectId: string, messageId: string, senderId: string) =>
  send(projectId, "new_message", { id: messageId, senderId });

/** Tell the sender their message reached this browser. */
export const broadcastMessageDelivered = (projectId: string, messageId: string) =>
  send(projectId, "message_delivered", { messageId });

/** Tell the sender these messages were seen. */
export const broadcastMessagesSeen = (
  projectId: string,
  messageIds: string[],
  readerId: string,
  readerName?: string
) => (messageIds.length ? send(projectId, "messages_seen", { messageIds, readerId, readerName }) : Promise.resolve(false));

/** "… is typing" signal (callers throttle it); `stopped` clears it right away, e.g. on send. */
export const broadcastTyping = (projectId: string, userId: string, name?: string, stopped = false) =>
  send(projectId, "typing", { userId, name, stopped });
