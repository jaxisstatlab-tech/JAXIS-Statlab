// Delivery times, set by the CEO in the price list (Money & Pay Rates): each package's standard delivery in
// working days, and how many days each faster delivery add-on (Rush, Express, Emergency) takes. Used by the
// intake form (to pre-pick a faster delivery), the agreement (its promised delivery) and the analyst's deadline.
// Saved price lists from before these fields existed fall back to the defaults below, which are the days
// agreements have always promised.

export const DEFAULT_USUAL_WORKING_DAYS: Record<string, number> = {
  JX_01_DATACHECK: 3,
  JX_02_START: 3,
  JX_03_CORE: 5,
  JX_04_ADVANCED: 7,
};

export const DEFAULT_READY_IN_DAYS: Record<string, number> = {
  RUSH: 3,
  EXPRESS: 2,
  EMERGENCY: 1,
};

/** What the intake form needs from the price list: delivery times, what's switched on, and the public prices
 * (the same ranges and fees as the website). */
export interface DeliveryConfig {
  /** Package code → price range (max null = no upper limit). */
  packagePrices: Record<string, { min: number; max: number | null }>;
  /** Add-on code → fee. */
  addOnPrices: Record<string, number>;
  /** Package code → usual working days. Only packages that are switched on. */
  packages: Record<string, number>;
  /** Faster delivery add-ons that are switched on, each with its days. */
  speeds: Array<{ code: string; readyInDays: number }>;
  /** Every add-on code that is switched on (to hide switched-off ones on the form). */
  activeAddOns: string[];
}

type CatalogLike = {
  packages: Record<string, { usualWorkingDays?: number | null; isActive?: boolean; minPrice?: number; maxPrice?: number | null }>;
  addOns: Record<string, { readyInDays?: number | null; isActive?: boolean; defaultPrice?: number }>;
};

export function usualWorkingDaysOf(code: string, pkg?: { usualWorkingDays?: number | null }): number {
  const v = Number(pkg?.usualWorkingDays);
  return v > 0 ? v : (DEFAULT_USUAL_WORKING_DAYS[code] ?? 7);
}

/** Days a faster delivery add-on takes, or null when the add-on isn't a delivery speed. */
export function readyInDaysOf(code: string, addOn?: { readyInDays?: number | null }): number | null {
  if (addOn && "readyInDays" in addOn) {
    const v = Number(addOn.readyInDays);
    return addOn.readyInDays != null && v > 0 ? v : null;
  }
  return DEFAULT_READY_IN_DAYS[code] ?? null;
}

export function deliveryConfigFrom(catalog: CatalogLike): DeliveryConfig {
  const packages: Record<string, number> = {};
  const packagePrices: DeliveryConfig["packagePrices"] = {};
  for (const [code, pkg] of Object.entries(catalog.packages)) {
    if (pkg.isActive === false) continue;
    packages[code] = usualWorkingDaysOf(code, pkg);
    packagePrices[code] = { min: Number(pkg.minPrice) || 0, max: pkg.maxPrice == null ? null : Number(pkg.maxPrice) };
  }
  const activeAddOns = Object.entries(catalog.addOns)
    .filter(([, a]) => a.isActive !== false)
    .map(([code]) => code);
  const speeds = activeAddOns
    .map((code) => ({ code, readyInDays: readyInDaysOf(code, catalog.addOns[code]) }))
    .filter((s): s is { code: string; readyInDays: number } => s.readyInDays !== null)
    .sort((a, b) => b.readyInDays - a.readyInDays);
  const addOnPrices = Object.fromEntries(activeAddOns.map((code) => [code, Number(catalog.addOns[code]?.defaultPrice) || 0]));
  return { packages, packagePrices, addOnPrices, speeds, activeAddOns };
}

/** What an agreement promises: a speed add-on's days (calendar days, e.g. Express = 2), or else the
 * package's standard working days. With more than one speed on a quote, the fastest wins. */
export interface AgreementDelivery {
  turnaroundDays: number;
  /** true for a speed add-on (counted in calendar days: Express 48 hours = 2 days). */
  calendarDays: boolean;
  /** The speed add-on's code (RUSH, EXPRESS, EMERGENCY), or null for standard delivery. */
  speed: string | null;
}

export function agreementDelivery(packageCode: string, addOnCodes: string[], catalog: CatalogLike): AgreementDelivery {
  const speeds = addOnCodes
    .map((code) => ({ code, days: readyInDaysOf(code, catalog.addOns[code]) }))
    .filter((s): s is { code: string; days: number } => s.days !== null)
    .sort((a, b) => a.days - b.days);
  if (speeds[0]) return { turnaroundDays: speeds[0].days, calendarDays: true, speed: speeds[0].code };
  return { turnaroundDays: usualWorkingDaysOf(packageCode, catalog.packages[packageCode]), calendarDays: false, speed: null };
}

/** Whether a saved agreement's delivery counts calendar days (a speed add-on); older agreements count working days. */
export function snapshotCalendarDays(snapshot: unknown): boolean {
  const delivery = (snapshot as { delivery?: { calendarDays?: unknown } } | null)?.delivery;
  return delivery?.calendarDays === true;
}

/** "2 days (Express)" or "5 working days", for the agreement. */
export function deliveryLabel(d: { turnaroundDays: number; calendarDays?: boolean; speedName?: string | null }): string {
  const n = d.turnaroundDays;
  if (d.calendarDays) return `${n} ${n === 1 ? "day" : "days"}${d.speedName ? ` (${d.speedName})` : ""}`;
  return `${n} working ${n === 1 ? "day" : "days"}`;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Calendar days from today to the date ("2026-10-14"), 0 when it's today or past. */
export function calendarDaysUntil(date: string, today = new Date()): number {
  const target = startOfDay(new Date(`${date}T00:00:00`));
  return Math.max(0, Math.round((+target - +startOfDay(today)) / 86_400_000));
}

/** Working days (Monday to Friday) after today, up to and including the date. */
export function workingDaysUntil(date: string, today = new Date()): number {
  const days = calendarDaysUntil(date, today);
  let count = 0;
  const d = startOfDay(today);
  for (let i = 0; i < days; i++) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) count++;
  }
  return count;
}

export interface SpeedPick {
  /** The add-on to pick, or null when the usual time is enough. */
  speed: string | null;
  /** Even the fastest switched-on option takes longer than the time left. */
  tooTight: boolean;
  usualDays: number;
  workingDaysLeft: number;
  calendarDaysLeft: number;
}

/**
 * The faster delivery a date needs: none when the package's usual time fits; otherwise the slowest speed that
 * still makes the date (it's also the cheapest); if none does, the fastest one, marked tooTight.
 * "UNSURE" (or an unknown package) uses the Core Thesis Package's time.
 */
export function pickSpeed(date: string, packageCode: string, config: DeliveryConfig, today = new Date()): SpeedPick {
  const usualDays = config.packages[packageCode] ?? config.packages.JX_03_CORE ?? DEFAULT_USUAL_WORKING_DAYS.JX_03_CORE!;
  const workingDaysLeft = workingDaysUntil(date, today);
  const calendarDaysLeft = calendarDaysUntil(date, today);
  const base = { usualDays, workingDaysLeft, calendarDaysLeft };
  if (workingDaysLeft >= usualDays || config.speeds.length === 0) return { speed: null, tooTight: workingDaysLeft < usualDays, ...base };
  const fits = config.speeds.find((s) => s.readyInDays <= calendarDaysLeft);
  if (fits) return { speed: fits.code, tooTight: false, ...base };
  return { speed: config.speeds[config.speeds.length - 1]!.code, tooTight: true, ...base };
}
