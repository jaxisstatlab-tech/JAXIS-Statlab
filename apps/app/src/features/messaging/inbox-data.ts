import { getMyProjectThreads, getProjectMessages } from "./actions";
import { sortThreads } from "./thread-order";
import type { InitialThreadData } from "./components/MessageThread";
import type { ProjectThreadSummaryDTO } from "./schemas";

/**
 * Load a single chat on the server so it shows instantly. With `markRead: false` the chat is
 * left unread (`readPending`) and marks itself read once it's actually on screen.
 */
export async function loadThread(projectId: string, { markRead = true } = {}): Promise<InitialThreadData | null> {
  try {
    const res = await getProjectMessages(projectId, { limit: 30, markRead });
    if (res.success && res.data) {
      return {
        messages: res.data.messages,
        projectInfo: res.data.project,
        hasMore: res.data.hasMore,
        nextCursor: res.data.nextCursor,
        currentUserId: res.data.currentUserId || null,
        currentUserName: res.data.currentUserName || null,
        readPending: !markRead,
      };
    }
  } catch (err) {
    console.error("Failed to load the chat on the server:", err);
  }
  return null;
}

/** Server side: the chat list plus the first chat, loaded before the page shows. */
export async function loadInbox(requestedProjectId: string | null): Promise<{
  initialThreads: ProjectThreadSummaryDTO[];
  initialSelectedProjectId: string | null;
  initialThreadData: InitialThreadData | null;
}> {
  const threadsRes = await getMyProjectThreads();
  const initialThreads = threadsRes.success && threadsRes.data ? threadsRes.data : [];
  // Same order as the inbox list, so the chat that opens first is the one loaded here.
  const target = requestedProjectId || sortThreads(initialThreads)[0]?.projectId || null;
  // A chat picked by link opens on every screen size, so it's read now. The automatic first chat
  // only shows beside the list on wide screens (phones show the list alone), so it waits until seen.
  const initialThreadData = target ? await loadThread(target, { markRead: Boolean(requestedProjectId) }) : null;
  return { initialThreads, initialSelectedProjectId: target, initialThreadData };
}
