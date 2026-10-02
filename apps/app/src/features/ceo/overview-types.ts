import type { ProjectStatus } from "@prisma/client";

// Shapes and labels for the CEO Overview, shared by the server loader and the page (no server code here).

export type StageKey = "new" | "price" | "deposit" | "analysis" | "check" | "delivered" | "stopped";

export const STAGES: Array<{ key: StageKey; label: string }> = [
  { key: "new", label: "New request" },
  { key: "price", label: "Price and agreement" },
  { key: "deposit", label: "Waiting for deposit" },
  { key: "analysis", label: "Analysis" },
  { key: "check", label: "Quality check" },
  { key: "delivered", label: "Delivered" },
  { key: "stopped", label: "Stopped" },
];

export interface OverviewStudy {
  id: string;
  intakeId: string;
  title: string;
  client: string;
  packageName: string | null;
  status: ProjectStatus;
  stage: StageKey;
  createdAt: string;
  dueAt: string | null;
  deliveredAt: string | null;
  price: number | null;
  paid: number;
  pastDue: boolean;
}

export interface AttentionItem {
  key: string;
  label: string;
  detail: string;
  count: number;
  href: string;
}

export interface CeoOverview {
  offline: boolean;
  /** Last 6 months, oldest first, e.g. ["May", …, "Oct"]. */
  months: string[];
  collectedByMonth: number[];
  newStudiesByMonth: number[];
  owed: number;
  owedStudies: number;
  stageCounts: Record<StageKey, number>;
  totalStudies: number;
  delivered90: { count: number; withDue: number; onTime: number; medianDays: number | null };
  clientsUnderway: number;
  attention: AttentionItem[];
  /** Newest studies first (at most STUDY_LIMIT). */
  studies: OverviewStudy[];
}


/** The studies table shows at most this many (newest first). */
export const STUDY_LIMIT = 200;
