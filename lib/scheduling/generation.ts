import { fromZonedTime, toZonedTime, format } from "date-fns-tz";
import { addDays, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";

export interface AutomationScheduleState {
  automationEnabled: boolean;
  generationIntervalDays: number;
  generationTimezone: string;
  preferredLocalGenerationTime: string; // "HH:mm"
  lastSuccessfulGenerationAt: Date | null;
  nextGenerationAt: Date | null;
  skipNextGeneration: boolean;
}

/**
 * Computes the next UTC generation timestamp, N calendar days from now
 * (or from a given anchor), at the configured local time-of-day.
 *
 * "N calendar days later" is computed in the target time zone so DST
 * transitions don't silently shift the intended local hour.
 */
export function computeNextGenerationAt(
  anchor: Date,
  intervalDays: number,
  timezone: string,
  localTime: string
): Date {
  const [hourStr, minuteStr] = localTime.split(":");
  const hour = Number(hourStr ?? 9);
  const minute = Number(minuteStr ?? 0);

  const zonedAnchor = toZonedTime(anchor, timezone);
  const zonedTarget = setMilliseconds(
    setSeconds(setMinutes(setHours(addDays(zonedAnchor, intervalDays), hour), minute), 0),
    0
  );

  return fromZonedTime(zonedTarget, timezone);
}

export type GenerationDecision =
  | { shouldGenerate: true; reason: "due" }
  | {
      shouldGenerate: false;
      reason: "automation_disabled" | "not_due" | "skip_requested";
      nextGenerationAt: Date | null;
    };

/**
 * Pure decision function used by the daily cron endpoint. It never mutates
 * state — the caller is responsible for acquiring a lock, generating the
 * batch, and persisting the new nextGenerationAt.
 */
export function decideWhetherToGenerate(
  state: AutomationScheduleState,
  now: Date = new Date()
): GenerationDecision {
  if (!state.automationEnabled) {
    return { shouldGenerate: false, reason: "automation_disabled", nextGenerationAt: state.nextGenerationAt };
  }

  if (state.skipNextGeneration) {
    return { shouldGenerate: false, reason: "skip_requested", nextGenerationAt: state.nextGenerationAt };
  }

  if (!state.nextGenerationAt || state.nextGenerationAt.getTime() <= now.getTime()) {
    return { shouldGenerate: true, reason: "due" };
  }

  return { shouldGenerate: false, reason: "not_due", nextGenerationAt: state.nextGenerationAt };
}

/** Formats a UTC instant for display in the configured business time zone. */
export function formatInTimezone(date: Date, timezone: string, pattern = "yyyy-MM-dd HH:mm zzz"): string {
  return format(toZonedTime(date, timezone), pattern, { timeZone: timezone });
}
