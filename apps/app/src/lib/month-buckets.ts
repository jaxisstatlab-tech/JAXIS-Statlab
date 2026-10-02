// Month totals for dashboard charts, counted in Philippine time (a payment at 1 a.m. on the 1st lands in the new month).

const MANILA_OFFSET = 8 * 3_600_000;

export function monthKey(d: Date): string {
  return new Date(d.getTime() + MANILA_OFFSET).toISOString().slice(0, 7);
}

/** The last `count` months, oldest first: keys ("2026-10"), short labels ("Oct"), and the UTC instant the first one starts. */
export function monthWindow(now: Date, count = 6) {
  const local = new Date(now.getTime() + MANILA_OFFSET);
  const keys: string[] = [];
  const labels: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - i, 1));
    keys.push(d.toISOString().slice(0, 7));
    labels.push(d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }));
  }
  const start = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - (count - 1), 1) - MANILA_OFFSET);
  return { keys, labels, start };
}

/** Sums values into the given months; anything outside them is ignored. */
export function bucketByMonth(keys: string[], items: Array<{ at: Date; value: number }>): number[] {
  const sums = new Map(keys.map((k) => [k, 0]));
  for (const { at, value } of items) {
    const k = monthKey(at);
    if (sums.has(k)) sums.set(k, (sums.get(k) ?? 0) + value);
  }
  return keys.map((k) => Math.round((sums.get(k) ?? 0) * 100) / 100);
}
