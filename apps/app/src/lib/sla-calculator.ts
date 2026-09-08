import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * Normalizes a date to YYYY-MM-DD string for comparison against holiday records
 */
function toDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Computes the contractual SLA due date starting from assignment timestamp.
 * Skips weekends (Saturday, Sunday) and official Philippine holidays.
 */
export async function computeSlaDueDate(
  startAt: Date,
  turnaroundDays: number,
  client?: Prisma.TransactionClient | typeof db
): Promise<Date> {
  const prismaClient = client || db;
  const holidays = await prismaClient.philippineHoliday.findMany({
    where: { date: { gte: startAt } },
    select: { date: true },
  });

  const holidayDates = new Set(holidays.map((h: { date: Date }) => toDateKey(h.date)));

  let daysAdded = 0;
  const current = new Date(startAt);

  while (daysAdded < turnaroundDays) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dateKey = toDateKey(current);

    if (!isWeekend && !holidayDates.has(dateKey)) {
      daysAdded++;
    }
  }

  return current;
}

export interface SlaRemainingInfo {
  isPaused: boolean;
  isOverdue: boolean;
  isUrgent: boolean; // 24-hour pre-deadline alert
  remainingHours: number;
  remainingDays: number;
  label: string;
}

/**
 * Calculates remaining SLA time for live workbench and countdown displays.
 */
export function calculateSlaRemaining(
  slaDueAt: Date | string,
  slaPausedAt?: Date | string | null
): SlaRemainingInfo {
  const dueDate = slaDueAt instanceof Date ? slaDueAt : new Date(slaDueAt);
  const pausedDate = slaPausedAt ? (slaPausedAt instanceof Date ? slaPausedAt : new Date(slaPausedAt)) : null;

  if (pausedDate) {
    return {
      isPaused: true,
      isOverdue: false,
      isUrgent: false,
      remainingHours: 0,
      remainingDays: 0,
      label: "SLA PAUSED",
    };
  }

  const now = new Date();
  const diffMs = dueDate.getTime() - now.getTime();
  const totalHours = Math.round(diffMs / (1000 * 60 * 60));
  const totalDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs <= 0) {
    const overdueDays = Math.abs(totalDays);
    return {
      isPaused: false,
      isOverdue: true,
      isUrgent: true,
      remainingHours: totalHours,
      remainingDays: totalDays,
      label: overdueDays === 0 ? "Overdue today" : `Overdue by ${overdueDays}d`,
    };
  }

  const isUrgent = totalHours <= 24;

  let label = "";
  if (totalHours <= 24) {
    label = `${Math.max(1, totalHours)}h remaining`;
  } else {
    label = `${totalDays}d remaining`;
  }

  return {
    isPaused: false,
    isOverdue: false,
    isUrgent,
    remainingHours: totalHours,
    remainingDays: totalDays,
    label,
  };
}

/**
 * Recalculates due date when an SLA pause is resumed by adding the exact paused duration.
 */
export function computeResumeDueDate(
  originalDue: Date,
  pausedAt: Date,
  resumedAt: Date
): Date {
  const pauseDurationMs = Math.max(0, resumedAt.getTime() - pausedAt.getTime());
  return new Date(originalDue.getTime() + pauseDurationMs);
}
