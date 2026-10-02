import type { ProjectStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { db, withDbTimeout } from "@/lib/db";
import { isOfflineDev } from "@/lib/app-settings";
import { getProjects } from "@/features/projects/actions";
import { bucketByMonth as bucket, monthWindow } from "@/lib/month-buckets";
import {
  STUDY_LIMIT,
  type AttentionItem,
  type CeoOverview,
  type OverviewStudy,
  type StageKey,
} from "./overview-types";

// Everything on the CEO Overview, read on the server from real records (no sample or estimated figures).
// Offline development has no database: studies come from the sample files and money totals are zero.

const STAGE_OF: Record<ProjectStatus, StageKey> = {
  NEW_REQUEST: "new",
  AWAITING_INFORMATION: "new",
  UNDER_EVALUATION: "new",
  QUOTE_SENT: "price",
  CLIENT_APPROVED: "price",
  SOW_PENDING: "price",
  SOW_SIGNED: "deposit",
  AWAITING_PAYMENT: "deposit",
  ACTIVE: "analysis",
  EXPERT_ASSIGNED: "analysis",
  IN_PROGRESS: "analysis",
  SCOPE_CREEP_HALTED: "analysis",
  SLA_PAUSED: "analysis",
  REASSIGNMENT_NEEDED: "analysis",
  FOR_QA: "check",
  QA_REVISION: "check",
  DELIVERED: "delivered",
  REVISION_REQUESTED: "delivered",
  CLOSED: "delivered",
  HALTED: "stopped",
  CANCELLED: "stopped",
  DISPUTED: "stopped",
  ETHICAL_BREACH: "stopped",
  EXPIRED: "stopped",
};

export function stageOf(status: ProjectStatus): StageKey {
  return STAGE_OF[status] ?? "new";
}

/** Stages where the study is still being worked on (it can run late, and money can still be owed). */
const UNDERWAY: StageKey[] = ["new", "price", "deposit", "analysis", "check"];
const UNDERWAY_STATUSES = (Object.keys(STAGE_OF) as ProjectStatus[]).filter((s) => UNDERWAY.includes(STAGE_OF[s]));
/** Statuses where an accepted price exists and the client may still owe part of it. */
const OWING_STATUSES = (Object.keys(STAGE_OF) as ProjectStatus[]).filter((s) =>
  ["deposit", "analysis", "check"].includes(STAGE_OF[s])
);
const PAID_STATUSES = ["VERIFIED", "FULLY_PAID"] as const;

const DAY = 86_400_000;
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function emptyStages(): Record<StageKey, number> {
  return { new: 0, price: 0, deposit: 0, analysis: 0, check: 0, delivered: 0, stopped: 0 };
}

function deliveryStats(rows: Array<{ deliveredAt: Date; startAt: Date; dueAt: Date | null }>) {
  const withDue = rows.filter((r) => r.dueAt);
  return {
    count: rows.length,
    withDue: withDue.length,
    onTime: withDue.filter((r) => r.deliveredAt.getTime() <= r.dueAt!.getTime()).length,
    medianDays: median(rows.map((r) => Math.max(0, (r.deliveredAt.getTime() - r.startAt.getTime()) / DAY))),
  };
}

export async function getCeoOverview(): Promise<CeoOverview> {
  await requireRole("CEO");
  const now = new Date();
  const { keys, labels, start } = monthWindow(now);
  return isOfflineDev() ? offlineOverview(now, keys, labels) : liveOverview(now, keys, labels, start);
}

async function liveOverview(now: Date, keys: string[], labels: string[], windowStart: Date): Promise<CeoOverview> {
  const since90 = new Date(now.getTime() - 90 * DAY);
  const due = (p: { deadlineRequested: Date; assignment: { slaDueAt: Date } | null }) =>
    p.assignment?.slaDueAt ?? p.deadlineRequested;

  const [
    stageGroups,
    payments,
    newStudies,
    owing,
    delivered,
    latest,
    paymentsToCheck,
    pastDue,
    openClaims,
    deletionRequests,
    leaveRequests,
    unpaidPayslips,
  ] = await withDbTimeout(
    Promise.all([
      db.project.groupBy({ by: ["masterStatus"], _count: { _all: true } }),
      db.payment.findMany({
        where: { paymentStatus: { in: [...PAID_STATUSES] }, verifiedAt: { gte: windowStart } },
        select: { amountSubmitted: true, verifiedAt: true },
      }),
      db.project.findMany({ where: { createdAt: { gte: windowStart } }, select: { createdAt: true } }),
      db.project.findMany({
        where: { masterStatus: { in: OWING_STATUSES } },
        select: {
          clientId: true,
          quotations: { where: { status: "CLIENT_APPROVED" }, select: { totalAmount: true }, orderBy: { createdAt: "desc" }, take: 1 },
          payments: { where: { paymentStatus: { in: [...PAID_STATUSES] } }, select: { amountSubmitted: true } },
        },
      }),
      db.project.findMany({
        where: { deliveredAt: { gte: since90 } },
        select: {
          deliveredAt: true,
          createdAt: true,
          deadlineRequested: true,
          assignment: { select: { slaDueAt: true, slaStartAt: true } },
        },
      }),
      db.project.findMany({
        orderBy: { createdAt: "desc" },
        take: STUDY_LIMIT,
        select: {
          id: true,
          intakeId: true,
          researchTitle: true,
          masterStatus: true,
          packageName: true,
          createdAt: true,
          deadlineRequested: true,
          deliveredAt: true,
          client: { select: { fullName: true } },
          assignment: { select: { slaDueAt: true } },
          quotations: { where: { status: "CLIENT_APPROVED" }, select: { totalAmount: true }, orderBy: { createdAt: "desc" }, take: 1 },
          payments: { where: { paymentStatus: { in: [...PAID_STATUSES] } }, select: { amountSubmitted: true } },
        },
      }),
      db.payment.count({ where: { paymentStatus: "PROOF_SUBMITTED" } }),
      db.project.count({
        where: {
          masterStatus: { in: UNDERWAY_STATUSES },
          OR: [
            { assignment: { slaDueAt: { lt: now } } },
            { assignment: null, deadlineRequested: { lt: now } },
          ],
        },
      }),
      db.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
      db.dataDeletionRequest.count({ where: { status: "PENDING" } }),
      db.user.count({ where: { status: "LEAVE_PENDING" } }),
      db.payslip.count({ where: { status: { in: ["DRAFT", "APPROVED"] } } }),
    ]),
    12000
  );

  const stageCounts = emptyStages();
  let totalStudies = 0;
  for (const g of stageGroups) {
    stageCounts[stageOf(g.masterStatus)] += g._count._all;
    totalStudies += g._count._all;
  }

  let owed = 0;
  let owedStudies = 0;
  for (const p of owing) {
    const price = Number(p.quotations[0]?.totalAmount ?? 0);
    const paid = p.payments.reduce((sum, x) => sum + Number(x.amountSubmitted), 0);
    if (price - paid > 0.5) {
      owed += price - paid;
      owedStudies++;
    }
  }

  const studies: OverviewStudy[] = latest.map((p) => {
    const stage = stageOf(p.masterStatus);
    const dueAt = due(p);
    return {
      id: p.id,
      intakeId: p.intakeId,
      title: p.researchTitle,
      client: p.client.fullName,
      packageName: p.packageName,
      status: p.masterStatus,
      stage,
      createdAt: p.createdAt.toISOString(),
      dueAt: dueAt.toISOString(),
      deliveredAt: p.deliveredAt?.toISOString() ?? null,
      price: p.quotations[0] ? Number(p.quotations[0].totalAmount) : null,
      paid: p.payments.reduce((sum, x) => sum + Number(x.amountSubmitted), 0),
      pastDue: UNDERWAY.includes(stage) && dueAt.getTime() < now.getTime(),
    };
  });

  return {
    offline: false,
    months: labels,
    collectedByMonth: bucket(
      keys,
      payments.filter((p) => p.verifiedAt).map((p) => ({ at: p.verifiedAt!, value: Number(p.amountSubmitted) }))
    ),
    newStudiesByMonth: bucket(keys, newStudies.map((p) => ({ at: p.createdAt, value: 1 }))),
    owed: Math.round(owed * 100) / 100,
    owedStudies,
    stageCounts,
    totalStudies,
    delivered90: deliveryStats(
      delivered
        .filter((p) => p.deliveredAt)
        .map((p) => ({
          deliveredAt: p.deliveredAt!,
          startAt: p.assignment?.slaStartAt ?? p.createdAt,
          dueAt: p.assignment?.slaDueAt ?? p.deadlineRequested,
        }))
    ),
    clientsUnderway: new Set(owing.map((p) => p.clientId)).size,
    attention: attentionList({
      paymentsToCheck,
      newRequests: stageCounts.new,
      pastDue,
      openClaims,
      deletionRequests,
      leaveRequests,
      unpaidPayslips,
    }),
    studies,
  };
}

async function offlineOverview(now: Date, keys: string[], labels: string[]): Promise<CeoOverview> {
  const res = await getProjects();
  const rows = res.success ? res.data : [];
  const stageCounts = emptyStages();
  const studies: OverviewStudy[] = rows
    .map((p) => {
      const stage = stageOf(p.masterStatus);
      const dueAt = p.deadlineRequested ? new Date(p.deadlineRequested) : null;
      stageCounts[stage]++;
      return {
        id: p.id,
        intakeId: p.intakeId,
        title: p.researchTitle,
        client: p.client?.fullName ?? "",
        packageName: p.packageName,
        status: p.masterStatus,
        stage,
        createdAt: new Date(p.createdAt).toISOString(),
        dueAt: dueAt ? dueAt.toISOString() : null,
        deliveredAt: p.deliveredAt ? new Date(p.deliveredAt).toISOString() : null,
        price: p.financialSummary?.totalAmount ?? null,
        paid: p.financialSummary?.verifiedPaid ?? 0,
        pastDue: UNDERWAY.includes(stage) && Boolean(dueAt && dueAt.getTime() < now.getTime()),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const delivered = studies.filter((s) => s.deliveredAt && new Date(s.deliveredAt).getTime() >= now.getTime() - 90 * DAY);

  return {
    offline: true,
    months: labels,
    collectedByMonth: keys.map(() => 0),
    newStudiesByMonth: bucket(keys, studies.map((s) => ({ at: new Date(s.createdAt), value: 1 }))),
    owed: 0,
    owedStudies: 0,
    stageCounts,
    totalStudies: studies.length,
    delivered90: deliveryStats(
      delivered.map((s) => ({
        deliveredAt: new Date(s.deliveredAt!),
        startAt: new Date(s.createdAt),
        dueAt: s.dueAt ? new Date(s.dueAt) : null,
      }))
    ),
    clientsUnderway: new Set(rows.filter((p) => UNDERWAY.includes(stageOf(p.masterStatus))).map((p) => p.clientId)).size,
    attention: attentionList({
      paymentsToCheck: rows.filter((p) => p.hasPendingPaymentVerification).length,
      newRequests: stageCounts.new,
      pastDue: studies.filter((s) => s.pastDue).length,
      openClaims: rows.filter((p) => p.hasActiveDispute).length,
      deletionRequests: 0,
      leaveRequests: 0,
      unpaidPayslips: 0,
    }),
    studies: studies.slice(0, STUDY_LIMIT),
  };
}

function attentionList(c: {
  paymentsToCheck: number;
  newRequests: number;
  pastDue: number;
  openClaims: number;
  deletionRequests: number;
  leaveRequests: number;
  unpaidPayslips: number;
}): AttentionItem[] {
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
  const items: AttentionItem[] = [
    {
      key: "past-due",
      label: plural(c.pastDue, "Study past its due date", "Studies past their due date"),
      detail: "Still being worked on after the date we promised.",
      count: c.pastDue,
      href: "#studies",
    },
    {
      key: "payments",
      label: plural(c.paymentsToCheck, "Payment to check", "Payments to check"),
      detail: "Clients sent a receipt that finance hasn't checked yet.",
      count: c.paymentsToCheck,
      href: "/dashboard/finance/payments",
    },
    {
      key: "claims",
      label: plural(c.openClaims, "Open claim", "Open claims"),
      detail: "Clients asking for a refund or a fix that needs a decision.",
      count: c.openClaims,
      href: "/dashboard/ceo/disputes",
    },
    {
      key: "new",
      label: plural(c.newRequests, "New request to price", "New requests to price"),
      detail: "Waiting for a price or more information.",
      count: c.newRequests,
      href: "/dashboard/admin/intake",
    },
    {
      key: "deletions",
      label: plural(c.deletionRequests, "Request to delete a study", "Requests to delete a study"),
      detail: "Clients asked us to remove a study and its files.",
      count: c.deletionRequests,
      href: "/dashboard/ceo/deleted-studies",
    },
    {
      key: "leave",
      label: plural(c.leaveRequests, "Leave request", "Leave requests"),
      detail: "Staff waiting for an answer about time off.",
      count: c.leaveRequests,
      href: "/dashboard/finance/leaves",
    },
    {
      key: "payslips",
      label: plural(c.unpaidPayslips, "Payslip not paid yet", "Payslips not paid yet"),
      detail: "Made but not yet approved or paid out.",
      count: c.unpaidPayslips,
      href: "/dashboard/ceo/payroll",
    },
  ];
  return items.filter((i) => i.count > 0);
}
