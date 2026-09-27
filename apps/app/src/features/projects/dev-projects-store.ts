import fs from "fs";
import path from "path";
import { getDevUserByEmail } from "@/lib/mock-data/users.data";

/**
 * Offline dev only (`npm run dev:offline`): saves a newly sent study into `.dev-projects.json`
 * so the "Send a new study" flow can be tested end to end without a database.
 * Never used in production.
 */
export const devProjectsEnabled = () =>
  process.env.NODE_ENV !== "production" && process.env.JAXIS_OFFLINE === "1";

// Fixed file path (not built from a variable) so the build doesn't trace the whole project.
const PROJECTS_FILE = path.join(/*turbopackIgnore: true*/ process.cwd(), ".dev-projects.json");

export function devCreateProject(
  user: { id?: string | null; email?: string | null; name?: string | null; fullName?: string | null },
  input: {
    intakeId: string;
    researchTitle: string;
    researchQuestions: string;
    researchObjectives: string;
    hypotheses: string | null;
    deadlineRequested: Date;
    chapters13: string | null;
    questionnaire: string | null;
    files: Array<{ fileName: string; filePath: string; fileType: string; fileCategory: string }>;
  }
) {
  const dev = user.email ? getDevUserByEmail(user.email) : undefined;
  const clientId = dev?.id || user.id || "dev_client";
  const now = new Date().toISOString();
  const id = `dev_proj_${Date.now().toString(36)}`;
  const row = {
    id,
    intakeId: input.intakeId,
    clientId,
    researchTitle: input.researchTitle,
    researchQuestions: input.researchQuestions,
    researchObjectives: input.researchObjectives,
    hypotheses: input.hypotheses,
    chapters13: input.chapters13,
    questionnaire: input.questionnaire,
    deadlineRequested: input.deadlineRequested.toISOString(),
    masterStatus: "NEW_REQUEST",
    packageName: null,
    missingInfoReason: null,
    deliveredAt: null,
    filesPurgeAt: null,
    filesPurged: false,
    hasActiveDispute: false,
    hasPendingRefund: false,
    createdAt: now,
    updatedAt: now,
    client: {
      id: clientId,
      fullName: dev?.fullName || user.fullName || user.name || "Client",
      email: user.email || "",
    },
    assignment: null,
    financialSummary: null,
    files: input.files.map((f, i) => ({ id: `${id}_file_${i}`, ...f, uploadedAt: now })),
  };
  let rows: unknown[] = [];
  try {
    rows = fs.existsSync(PROJECTS_FILE) ? (JSON.parse(fs.readFileSync(PROJECTS_FILE, "utf-8")) as unknown[]) : [];
  } catch {
    rows = [];
  }
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify([row, ...rows], null, 2));
  return row;
}
