import type { ProjectThreadSummaryDTO } from "./schemas";

/** A chat is open once the study has a statistician or reviewer. */
export const threadIsOpen = (t: ProjectThreadSummaryDTO) => Boolean(t.statisticianName || t.qaLeadName);

/**
 * Inbox order, like a messenger app: open chats with the newest message first, then open chats
 * with no messages yet, then studies whose chat hasn't opened.
 */
export function sortThreads(threads: ProjectThreadSummaryDTO[]): ProjectThreadSummaryDTO[] {
  const rank = (t: ProjectThreadSummaryDTO) => (!threadIsOpen(t) ? 2 : t.lastMessage ? 0 : 1);
  return [...threads].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    return (b.lastMessage?.sentAt ?? "").localeCompare(a.lastMessage?.sentAt ?? "");
  });
}
