"use client";

import { useSyncExternalStore } from "react";
import type { ClientStage } from "./client-stage";

const DAY = 86_400_000;

export const formatShortDate = (value: Date | string) =>
  new Date(value).toLocaleDateString("en-PH", { month: "short", day: "numeric" });

// "Now" only exists in the browser: the server renders without it, so hydration always matches.
let pageLoadedAt = 0;
const subscribeNever = () => () => {};
const useClientNow = () =>
  useSyncExternalStore(
    subscribeNever,
    () => (pageLoadedAt ||= Date.now()),
    () => null
  );

/** "Due Oct 3 · 6 days left" (or just the date before the page has loaded in the browser). */
export function useDueText(due: string | Date, stage: ClientStage, deliveredAt?: string | Date | null) {
  const now = useClientNow();
  if (stage.tone === "done") return deliveredAt ? `Delivered ${formatShortDate(deliveredAt)}` : "Completed";
  const date = `Due ${formatShortDate(due)}`;
  if (now === null || stage.tone === "stopped") return date;
  const days = Math.ceil((new Date(due).getTime() - now) / DAY);
  if (days > 1) return `${date} · ${days} days left`;
  if (days === 1) return `${date} · tomorrow`;
  if (days === 0) return `${date} · today`;
  return `${date} · ${Math.abs(days)} days past`;
}
