import { supabaseClient } from "@/lib/supabase";
import type { MessageDTO } from "@/features/messaging/schemas";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Cache active project channels so sender can broadcast over the same established WebSocket connection
const activeChannels = new Map<string, RealtimeChannel>();

/**
 * Subscribes to Supabase Realtime Phoenix WebSocket channel for a specific project.
 * Receives broadcast messages from both peer browsers and server REST broadcasts.
 * Returns an unsubscribe teardown function for useEffect cleanup.
 */
export function subscribeToProjectMessages(
  projectId: string,
  onMessage: (message: MessageDTO) => void,
  onStatus?: (status: string) => void
): () => void {
  if (!projectId || typeof window === "undefined" || !supabaseClient) {
    return () => {};
  }

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
          onMessage(payload as MessageDTO);
        }
      })
      .subscribe((status) => {
        if (onStatus) onStatus(status);
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

