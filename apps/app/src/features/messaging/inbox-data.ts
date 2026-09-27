import { getMyProjectThreads, getProjectMessages } from "./actions";
import { sortThreads } from "./thread-order";
import type { InitialThreadData } from "./components/MessageThread";
import type { ProjectThreadSummaryDTO } from "./schemas";

/** Load a single chat on the server so it shows instantly. */
export async function loadThread(projectId: string): Promise<InitialThreadData | null> {
  try {
    const res = await getProjectMessages(projectId, { limit: 30 });
    if (res.success && res.data) {
      return {
        messages: res.data.messages,
        projectInfo: res.data.project,
        hasMore: res.data.hasMore,
        nextCursor: res.data.nextCursor,
        currentUserId: res.data.currentUserId || null,
        currentUserName: res.data.currentUserName || null,
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
  const initialThreadData = target ? await loadThread(target) : null;
  return { initialThreads, initialSelectedProjectId: target, initialThreadData };
}
