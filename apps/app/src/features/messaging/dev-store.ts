import fs from "fs";
import path from "path";
import type { RoleName } from "@prisma/client";
import { getDevUserByEmail } from "@/lib/mock-data/users.data";
import { runFirewall, getFirewallWarningMessage } from "@/lib/messaging/firewall";
import type {
  MessageDTO,
  MessagingActionResult,
  ProjectThreadSummaryDTO,
} from "./schemas";

/**
 * Offline dev only (`npm run dev:offline`): chat threads stored in `.dev-messages.json` next to the
 * other local stores, so the messaging UI can be designed and tested without a database.
 * Never used in production or against the hosted database.
 */
export const devMessagingEnabled = () =>
  process.env.NODE_ENV !== "production" && process.env.JAXIS_OFFLINE === "1";

type DevUser = { id?: string | null; email?: string | null; role?: RoleName | string; name?: string | null; fullName?: string | null };

type DevProject = {
  id: string;
  intakeId: string;
  researchTitle: string;
  masterStatus: string;
  packageName?: string | null;
  clientId: string;
  updatedAt?: string;
  client?: { id?: string; fullName?: string; email?: string };
  assignment?: {
    statisticianId?: string | null;
    qaLeadId?: string | null;
    statistician?: { fullName?: string } | null;
    qaLead?: { fullName?: string } | null;
  } | null;
};

export type DevMessage = {
  id: string;
  projectId: string;
  senderId: string;
  senderName: string;
  senderRole: RoleName;
  content: string;
  sentAt: string;
  readBy: string[];
};

// Fixed file paths (not built from a variable) so the build doesn't trace the whole project.
const PROJECTS_FILE = path.join(/*turbopackIgnore: true*/ process.cwd(), ".dev-projects.json");
const MESSAGES_FILE = path.join(/*turbopackIgnore: true*/ process.cwd(), ".dev-messages.json");

function readJson<T>(full: string): T[] {
  try {
    return fs.existsSync(full) ? (JSON.parse(fs.readFileSync(full, "utf-8")) as T[]) : [];
  } catch {
    return [];
  }
}

const readProjects = () => readJson<DevProject>(PROJECTS_FILE);
const readMessages = () => readJson<DevMessage>(MESSAGES_FILE);
const writeMessages = (rows: DevMessage[]) =>
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(rows, null, 2));

/** The session id and the dev account id can differ; treat both as "me". */
function myIds(user: DevUser): Set<string> {
  const ids = new Set<string>();
  if (user.id) ids.add(user.id);
  const dev = user.email ? getDevUserByEmail(user.email) : undefined;
  if (dev?.id) ids.add(dev.id);
  return ids;
}

function myId(user: DevUser): string {
  const dev = user.email ? getDevUserByEmail(user.email) : undefined;
  return dev?.id || user.id || "dev_user";
}

function canSee(project: DevProject, user: DevUser): boolean {
  const ids = myIds(user);
  const role = (user.role as RoleName) || "CLIENT";
  if (role === "ADMIN" || role === "CEO") return true;
  if (ids.has(project.clientId)) return true;
  if (user.email && project.client?.email?.toLowerCase() === user.email.toLowerCase()) return true;
  const a = project.assignment;
  return Boolean(a && ((a.statisticianId && ids.has(a.statisticianId)) || (a.qaLeadId && ids.has(a.qaLeadId))));
}

function toDTO(m: DevMessage, user: DevUser): MessageDTO {
  const ids = myIds(user);
  const isMine = ids.has(m.senderId);
  const others = m.readBy.filter((id) => id !== m.senderId);
  const seenByNames = others
    .map((id) => Object.values(devNames()).find((u) => u.id === id)?.fullName)
    .filter(Boolean) as string[];
  const seen = others.length > 0;
  return {
    id: m.id,
    projectId: m.projectId,
    senderId: m.senderId,
    senderName: m.senderName,
    senderRole: m.senderRole,
    content: m.content,
    isBlocked: false,
    blockedReason: null,
    sentAt: m.sentAt,
    isMine,
    isRead: seen,
    readByCount: others.length,
    status: isMine ? (seen ? "seen" : "delivered") : [...ids].some((id) => m.readBy.includes(id)) ? "seen" : "delivered",
    seenByNames,
  };
}

function devNames(): Record<string, { id: string; fullName: string }> {
  const out: Record<string, { id: string; fullName: string }> = {};
  for (const email of ["client@jaxis.dev", "stat@jaxis.dev", "qa@jaxis.dev", "admin@jaxis.dev", "ceo@jaxis.dev"]) {
    const u = getDevUserByEmail(email);
    if (u) out[email] = { id: u.id, fullName: u.fullName };
  }
  return out;
}

function markRead(rows: DevMessage[], projectId: string, user: DevUser, onlyIds?: string[]): boolean {
  const me = myId(user);
  const ids = myIds(user);
  let changed = false;
  for (const m of rows) {
    if (m.projectId !== projectId || ids.has(m.senderId)) continue;
    if (onlyIds && !onlyIds.includes(m.id)) continue;
    if (!m.readBy.includes(me)) {
      m.readBy.push(me);
      changed = true;
    }
  }
  return changed;
}

export function devThreads(user: DevUser): ProjectThreadSummaryDTO[] {
  const messages = readMessages();
  const ids = myIds(user);
  return readProjects()
    .filter((p) => canSee(p, user))
    .map((p) => {
      const thread = messages.filter((m) => m.projectId === p.id).sort((a, b) => a.sentAt.localeCompare(b.sentAt));
      const last = thread[thread.length - 1];
      const unread = thread.filter((m) => !ids.has(m.senderId) && ![...ids].some((id) => m.readBy.includes(id))).length;
      return {
        projectId: p.id,
        intakeId: p.intakeId,
        researchTitle: p.researchTitle,
        masterStatus: p.masterStatus,
        packageName: p.packageName ?? null,
        clientName: p.client?.fullName || "Client",
        statisticianName: p.assignment?.statistician?.fullName || null,
        qaLeadName: p.assignment?.qaLead?.fullName || null,
        clientId: p.clientId,
        statisticianId: p.assignment?.statisticianId ?? null,
        qaLeadId: p.assignment?.qaLeadId ?? null,
        lastMessage: last
          ? { content: last.content, sentAt: last.sentAt, senderName: last.senderName, senderRole: last.senderRole }
          : null,
        unreadCount: unread,
        totalMessagesCount: thread.length,
      };
    })
    .sort((a, b) => (b.lastMessage?.sentAt || "").localeCompare(a.lastMessage?.sentAt || ""));
}

export function devUnreadCount(user: DevUser): number {
  return devThreads(user).reduce((sum, t) => sum + t.unreadCount, 0);
}

export function devProjectMessages(
  projectId: string,
  user: DevUser,
  options?: { cursor?: string; limit?: number }
) {
  const project = readProjects().find((p) => p.id === projectId || p.intakeId === projectId);
  if (!project || !canSee(project, user)) return null;
  const rows = readMessages();
  if (markRead(rows, project.id, user)) writeMessages(rows);

  const limit = options?.limit ?? 20;
  let thread = rows.filter((m) => m.projectId === project.id).sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  if (options?.cursor) {
    const cursor = thread.find((m) => m.id === options.cursor);
    if (cursor) thread = thread.filter((m) => m.sentAt < cursor.sentAt);
  }
  const page = thread.slice(-limit);
  const hasMore = thread.length > limit;
  return {
    project: {
      id: project.id,
      intakeId: project.intakeId,
      researchTitle: project.researchTitle,
      masterStatus: project.masterStatus,
      clientName: project.client?.fullName || "Client",
      statisticianName: project.assignment?.statistician?.fullName || null,
      qaLeadName: project.assignment?.qaLead?.fullName || null,
      clientId: project.clientId,
      statisticianId: project.assignment?.statisticianId ?? null,
      qaLeadId: project.assignment?.qaLeadId ?? null,
    },
    messages: page.map((m) => toDTO(m, user)),
    hasMore,
    nextCursor: hasMore ? (page[0]?.id ?? null) : null,
    currentUserId: myId(user),
    currentUserName: user.fullName || user.name || null,
  };
}

export function devSyncSince(projectId: string, user: DevUser, sinceIso: string): MessageDTO[] {
  const rows = readMessages();
  const fresh = rows
    .filter((m) => m.projectId === projectId && m.sentAt > sinceIso)
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  if (fresh.length && markRead(rows, projectId, user, fresh.map((m) => m.id))) writeMessages(rows);
  return fresh.map((m) => toDTO(m, user));
}

export function devMarkRead(projectId: string, user: DevUser, messageIds: string[]): number {
  const rows = readMessages();
  const changed = markRead(rows, projectId, user, messageIds);
  if (changed) writeMessages(rows);
  return changed ? messageIds.length : 0;
}

export function devSendMessage(
  projectId: string,
  user: DevUser,
  content: string
): MessagingActionResult<MessageDTO> {
  const project = readProjects().find((p) => p.id === projectId);
  if (!project) return { success: false, error: { code: "PROJECT_NOT_FOUND", message: "Study not found." } };
  if (!canSee(project, user)) {
    return { success: false, error: { code: "FORBIDDEN", message: "You do not have access to this study's messaging thread." } };
  }
  const isClient = myIds(user).has(project.clientId);
  if (isClient && !project.assignment?.statisticianId && !project.assignment?.qaLeadId) {
    return {
      success: false,
      error: { code: "THREAD_LOCKED", message: "Chat opens once we assign your statistical analyst." },
    };
  }
  const firewall = runFirewall(content);
  if (firewall.blocked) {
    const warning = getFirewallWarningMessage(firewall.detection.ruleName);
    return { success: false, blocked: true, warning, error: { code: "FIREWALL_BLOCKED", message: warning } };
  }

  const me = myId(user);
  const row: DevMessage = {
    id: `dev_msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    projectId: project.id,
    senderId: me,
    senderName: user.fullName || user.name || "You",
    senderRole: ((user.role as RoleName) || "CLIENT"),
    content: content.trim(),
    sentAt: new Date().toISOString(),
    readBy: [me],
  };
  const rows = readMessages();
  rows.push(row);
  writeMessages(rows);
  return { success: true, data: { ...toDTO(row, user), status: "sent" } };
}
