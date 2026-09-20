import { formatInTimeZone } from "date-fns-tz";

/** Monday's local calendar date, stable across DST and year boundaries. */
export function featuredImageWeek(now: Date, timeZone: string): string {
  const localDate = formatInTimeZone(now, timeZone, "yyyy-MM-dd");
  const monday = new Date(`${localDate}T00:00:00.000Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

export function weeklyFeaturedMarker(week: string): string {
  return `[weekly-feature:${week}]`;
}

export const WEEKLY_FEATURED_BRIEF =
  "For the BUILDING_LICEO candidate only, write a fresh product-visibility post to accompany the actual " +
  "uploaded Liceo overview screenshot. It shows software cost, licenses, seats, utilization, renewals, " +
  "and an assistant panel. Explain one practical question this overview helps a team investigate. " +
  "Treat screenshot figures as illustrative, not customer results or guaranteed savings. Do not " +
  "invent product capabilities. The screenshot itself will be attached, not newly generated. " +
  "The other two candidates must cover different subjects and use original conceptual illustrations.";

export const WEEKLY_FEATURED_ALT =
  "Liceo overview screenshot showing software costs, licenses, seat utilization, and an assistant panel. " +
  "The figures are illustrative. Includes the official Liceo logo.";
