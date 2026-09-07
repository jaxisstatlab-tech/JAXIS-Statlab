import { supabaseClient } from "@/lib/supabase";
import type { MessageDTO } from "@/features/messaging/schemas";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Cache active project channels so sender can broadcast over the same established WebSocket connection
const activeChannels = new Map<string, RealtimeChannel>();

export interface RealtimeMessageListeners {
  onMessage: (message: MessageDTO) => void;
  onDelivered?: (payload: { messageId: string }) => void;
  onSeen?: (payload: { messageIds: string[]; readerId: string; readerName?: string }) => void;
  onStatus?: (status: string) => void;
}

/**
 * Subscribes to Supabase Realtime Phoenix WebSocket channel for a specific project.
 * Receives broadcast messages, delivery confirmations, and read receipts.
 * Returns an unsubscribe teardown function for useEffect cleanup.
 */
export function subscribeToProjectMessages(
  projectId: string,
  onMessageOrListeners: ((message: MessageDTO) => void) | RealtimeMessageListeners,
  legacyOnStatus?: (status: string) => void
): () => void {
  if (!projectId || typeof window === "undefined" || !supabaseClient) {
    return () => {};
  }

  const listeners: RealtimeMessageListeners =
    typeof onMessageOrListeners === "function"
      ? { onMessage: onMessageOrListeners, onStatus: legacyOnStatus }
      : onMessageOrListeners;

  try {
    const channelName = `project-messages:${projectId}`;

    // Reuse existing channel if already connected or initialize fresh
    let channel = activeChannels.get(projectId);
    if (!channel) {
      channel = supabaseClient.channel(channelName, {
        config: {
          broadcast: { ack: false, self: false },
        },
      });
      activeChannels.set(projectId, channel);
    }

    channel
      .on("broadcast", { event: "new_message" }, ({ payload }) => {
        if (payload && (payload as MessageDTO).id) {
          listeners.onMessage(payload as MessageDTO);
        }
      })
      .on("broadcast", { event: "message_delivered" }, ({ payload }) => {
        if (payload && payload.messageId && listeners.onDelivered) {
          listeners.onDelivered(payload);
        }
      })
      .on("broadcast", { event: "messages_seen" }, ({ payload }) => {
        if (payload && payload.messageIds && listeners.onSeen) {
          listeners.onSeen(payload);
        }
      })
      .subscribe((status) => {
        if (listeners.onStatus) listeners.onStatus(status);
        if (status === "CHANNEL_ERROR") {
          console.warn(`[Realtime] Channel error for project ${projectId}. Adaptive polling active.`);
        }
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
    console.warn("[Realtime] Subscription error. Polling fallback active.", err);
    return () => {};
  }
}

/**
 * Broadcasts a verified new message directly across the client's active WebSocket connection.
 * Instantaneous (~10ms) push to all peers currently viewing the same research thread.
 */
export async function broadcastProjectMessage(
  projectId: string,
  message: MessageDTO
): Promise<boolean> {
  if (!projectId || typeof window === "undefined" || !supabaseClient) {
    return false;
  }

  try {
    let channel = activeChannels.get(projectId);
    if (!channel) {
      channel = supabaseClient.channel(`project-messages:${projectId}`);
      activeChannels.set(projectId, channel);
    }

    const result = await channel.send({
      type: "broadcast",
      event: "new_message",
      payload: message,
    });

    return result === "ok";
  } catch (err) {
    console.warn("[Realtime Client Broadcast Error]", err);
    return false;
  }
}

/**
 * Broadcasts an instant delivery receipt when a peer's browser receives a message.
 */
export async function broadcastMessageDelivered(
  projectId: string,
  messageId: string
): Promise<boolean> {
  if (!projectId || !messageId || typeof window === "undefined" || !supabaseClient) {
    return false;
  }

  try {
    let channel = activeChannels.get(projectId);
    if (!channel) {
      channel = supabaseClient.channel(`project-messages:${projectId}`);
      activeChannels.set(projectId, channel);
    }

    const result = await channel.send({
      type: "broadcast",
      event: "message_delivered",
      payload: { messageId },
    });

    return result === "ok";
  } catch (err) {
    console.warn("[Realtime Delivery Acknowledgment Error]", err);
    return false;
  }
}

/**
 * Broadcasts an instant seen / read receipt when a participant views new messages.
 */
export async function broadcastMessagesSeen(
  projectId: string,
  messageIds: string[],
  readerId: string,
  readerName?: string
): Promise<boolean> {
  if (!projectId || !messageIds.length || typeof window === "undefined" || !supabaseClient) {
    return false;
  }

  try {
    let channel = activeChannels.get(projectId);
    if (!channel) {
      channel = supabaseClient.channel(`project-messages:${projectId}`);
      activeChannels.set(projectId, channel);
    }

    const result = await channel.send({
      type: "broadcast",
      event: "messages_seen",
      payload: { messageIds, readerId, readerName },
    });

    return result === "ok";
  } catch (err) {
    console.warn("[Realtime Seen Acknowledgment Error]", err);
    return false;
  }
}

