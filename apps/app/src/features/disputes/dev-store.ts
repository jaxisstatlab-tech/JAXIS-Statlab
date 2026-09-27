import fs from "fs";
import path from "path";
import type { DisputeDTO, DisputeGrounds, DisputeResolutionType, DisputeStatus } from "./schemas";

/**
 * Offline dev only (`npm run dev:offline`): study claims kept in `.dev-disputes.json` so the
 * Revisions & help page can be designed and tested without a database. Never used in production.
 */
export const devDisputesEnabled = () =>
  process.env.NODE_ENV !== "production" && process.env.JAXIS_OFFLINE === "1";

// Fixed file paths (not built from a variable) so the build doesn't trace the whole project.
const DISPUTES_FILE = path.join(/*turbopackIgnore: true*/ process.cwd(), ".dev-disputes.json");
const PROJECTS_FILE = path.join(/*turbopackIgnore: true*/ process.cwd(), ".dev-projects.json");
const QUOTES_FILE = path.join(/*turbopackIgnore: true*/ process.cwd(), ".dev-quotations.json");

export type DevDispute = {
  id: string;
  projectId: string;
  clientId: string;
  grounds: DisputeGrounds;
  description: string;
  evidenceFilePaths: string[];
  status: DisputeStatus;
  resolutionType: DisputeResolutionType | null;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  disputeWindowExpiresAt: string;
  createdAt: string;
  updatedAt: string;
};
type DevProject = {
  id: string;
  intakeId: string;
  researchTitle: string;
  clientId: string;
  packageName?: string | null;
  deliveredAt?: string | null;
  client?: { email?: string };
};

function read<T>(file: string): T[] {
  try {
    return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf-8")) as T[]) : [];
  } catch {
    return [];
  }
}

const owns = (p: DevProject, userId: string, email?: string | null) =>
  p.clientId === userId || (!!email && p.client?.email?.toLowerCase() === email.toLowerCase());

function toDTO(d: DevDispute, p: DevProject, user: { name?: string | null; email?: string | null }): DisputeDTO {
  const quote = read<{ projectId: string; status: string; totalAmount?: number }>(QUOTES_FILE).find(
    (q) => q.projectId === p.id && q.status === "CLIENT_APPROVED"
  );
  return {
    id: d.id,
    projectId: p.id,
    projectIntakeId: p.intakeId,
    projectTitle: p.researchTitle,
    packageName: p.packageName ?? "STANDARD",
    grossAmount: Number(quote?.totalAmount ?? 0),
    clientName: user.name || "Client",
    clientEmail: user.email || "",
    grounds: d.grounds,
    description: d.description,
    evidenceFilePaths: d.evidenceFilePaths,
    status: d.status,
    resolutionType: d.resolutionType,
    resolutionNotes: d.resolutionNotes,
    resolvedBy: d.resolvedAt ? "dev_ceo" : null,
    resolvedAt: d.resolvedAt,
    chargebackTriggeredBy: null,
    chargebackAt: null,
    disputeWindowExpiresAt: d.disputeWindowExpiresAt,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    deliveredAt: p.deliveredAt ?? null,
  };
}

/** The client's claims (newest first) and, per study, its latest claim. */
export function devClientDisputes(user: { id: string; name?: string | null; email?: string | null }) {
  const projects = read<DevProject>(PROJECTS_FILE).filter((p) => owns(p, user.id, user.email));
  const byId = new Map(projects.map((p) => [p.id, p]));
  const claims = read<DevDispute>(DISPUTES_FILE)
    .filter((d) => byId.has(d.projectId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((d) => toDTO(d, byId.get(d.projectId)!, user));
  const latestByProject = new Map<string, DisputeDTO>();
  for (const c of claims) if (!latestByProject.has(c.projectId)) latestByProject.set(c.projectId, c);
  return { claims, latestByProject };
}

/** File a claim offline, with the same rules as the real one (owner, 7-day window, one active claim). */
export function devSubmitDispute(
  user: { id: string; email?: string | null },
  input: { projectId: string; grounds: DisputeGrounds; description: string; evidenceFilePaths: string[] }
): { success: boolean; data?: { disputeId: string }; error?: { message: string } } {
  const project = read<DevProject>(PROJECTS_FILE).find((p) => p.id === input.projectId);
  if (!project) return { success: false, error: { message: "Project not found." } };
  if (!owns(project, user.id, user.email)) return { success: false, error: { message: "Unauthorized to dispute this project." } };
  if (!project.deliveredAt) return { success: false, error: { message: "This study hasn't been delivered yet." } };
  const expires = new Date(new Date(project.deliveredAt).getTime() + 7 * 24 * 60 * 60 * 1000);
  if (expires.getTime() < Date.now()) return { success: false, error: { message: "The 7-day window to file a claim has closed." } };
  const rows = read<DevDispute>(DISPUTES_FILE);
  if (rows.some((d) => d.projectId === project.id && (d.status === "OPEN" || d.status === "UNDER_REVIEW"))) {
    return { success: false, error: { message: "An active dispute is already filed for this study." } };
  }
  const now = new Date().toISOString();
  const row: DevDispute = {
    id: `dev_claim_${Date.now().toString(36)}`,
    projectId: project.id,
    clientId: project.clientId,
    grounds: input.grounds,
    description: input.description,
    evidenceFilePaths: input.evidenceFilePaths,
    status: "OPEN",
    resolutionType: null,
    resolutionNotes: null,
    resolvedAt: null,
    disputeWindowExpiresAt: expires.toISOString(),
    createdAt: now,
    updatedAt: now,
  };
  fs.writeFileSync(DISPUTES_FILE, JSON.stringify([row, ...rows], null, 2));
  return { success: true, data: { disputeId: row.id } };
}
