import fs from "fs";
import path from "path";
import type { DefenseLabSessionDTO } from "./schemas";

/**
 * Offline dev only (`npm run dev:offline`): the admin DefenseLab desk on the sample sessions in
 * .dev-defenselab.json, with the same rules as the database version. Never used in production.
 */

const FILE = path.join(/*turbopackIgnore: true*/ process.cwd(), ".dev-defenselab.json");
export const devDefenseLabEnabled = () => process.env.NODE_ENV !== "production" && process.env.JAXIS_OFFLINE === "1";

type Result<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } };
const fail = (code: string, message: string) => ({ success: false as const, error: { code, message } });

function readAll(): DefenseLabSessionDTO[] {
  try {
    return fs.existsSync(FILE) ? (JSON.parse(fs.readFileSync(FILE, "utf-8")) as DefenseLabSessionDTO[]) : [];
  } catch {
    return [];
  }
}
const writeAll = (rows: DefenseLabSessionDTO[]) => fs.writeFileSync(FILE, JSON.stringify(rows, null, 2), "utf-8");

export function devAdminSessions() {
  const sessions = readAll().sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt));
  return {
    sessions,
    stats: {
      totalScheduled: sessions.filter((s) => s.status === "SCHEDULED").length,
      totalCompleted: sessions.filter((s) => s.status === "COMPLETED").length,
      pendingMeetingLinks: sessions.filter((s) => s.status === "SCHEDULED" && !s.meetingUrl).length,
      pendingRecordings: sessions.filter((s) => s.status === "COMPLETED" && !s.recordingUrl).length,
      lateNoShows: sessions.filter((s) => s.status === "NO_SHOW_CLIENT").length,
      penaltiesLogged: sessions.filter((s) => s.penaltyApplied).length,
    },
  };
}

const OPEN = ["SCHEDULED", "RESCHEDULED"];

function update(sessionId: string, check: (s: DefenseLabSessionDTO) => string | null, change: (s: DefenseLabSessionDTO) => void): Result<DefenseLabSessionDTO> {
  const rows = readAll();
  const s = rows.find((x) => x.id === sessionId);
  if (!s) return fail("NOT_FOUND", "Session not found.");
  const problem = check(s);
  if (problem) return fail("CLOSED", problem);
  change(s);
  writeAll(rows);
  return { success: true, data: s };
}

export const devSetLink = (sessionId: string, meetingUrl: string) =>
  update(sessionId, (s) => (OPEN.includes(s.status) ? null : "This session already happened or was cancelled, so its link can't change."), (s) => {
    s.meetingUrl = meetingUrl;
  });

export const devComplete = (sessionId: string, recordingUrl?: string, notes?: string) =>
  update(
    sessionId,
    (s) =>
      +new Date(s.scheduledAt) > Date.now()
        ? "This session hasn't started yet."
        : OPEN.includes(s.status)
          ? null
          : "This session is already done, missed or cancelled.",
    (s) => {
      s.status = "COMPLETED";
      s.completedAt = new Date().toISOString();
      if (recordingUrl) s.recordingUrl = recordingUrl;
      if (notes?.trim()) s.notes = notes.trim();
    }
  );

export const devRecording = (sessionId: string, recordingUrl: string) =>
  update(sessionId, (s) => (s.status === "COMPLETED" ? null : "Mark the session done first."), (s) => {
    s.recordingUrl = recordingUrl;
  });

export const devFee = (sessionId: string, reason: string, amount: number | undefined, by: string) =>
  update(
    sessionId,
    (s) => (!s.penaltyApplied && ["SCHEDULED", "RESCHEDULED", "NO_SHOW_CLIENT"].includes(s.status) ? null : "A fee can't be added: the session is done, cancelled, or already has one."),
    (s) => {
      s.penaltyApplied = true;
      s.penaltyReason = reason;
      s.penaltyAmount = amount ?? null;
      s.penaltyDeterminedBy = by;
      s.status = "PENALTY_APPLIED";
    }
  );
