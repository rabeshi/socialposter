import { describe, it, expect } from "vitest";
import { computeNextGenerationAt, decideWhetherToGenerate, formatInTimezone } from "@/lib/scheduling/generation";

describe("computeNextGenerationAt", () => {
  it("advances by the configured number of calendar days at the configured local time", () => {
    // 11:00 Pacific on July 12 (unambiguous local calendar date).
    const anchor = new Date("2026-07-12T18:00:00Z");
    const next = computeNextGenerationAt(anchor, 2, "America/Los_Angeles", "09:00");
    // 2 days later at 09:00 Pacific (UTC-7 in July, PDT) is 16:00 UTC.
    expect(next.toISOString()).toBe("2026-07-14T16:00:00.000Z");
  });

  it("handles a DST transition without shifting the intended local hour", () => {
    // Nov 1 2026 is before the US fall-back (Nov 1, 2026); +2 days crosses into
    // standard time. The local wall-clock hour should remain 09:00 regardless.
    const anchor = new Date("2026-10-30T12:00:00Z");
    const next = computeNextGenerationAt(anchor, 2, "America/Los_Angeles", "09:00");
    const localHour = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "2-digit",
      hour12: false,
    }).format(next);
    expect(localHour.replace(/^24$/, "00")).toBe("09");
  });
});

describe("decideWhetherToGenerate", () => {
  const base = {
    automationEnabled: true,
    generationIntervalDays: 2,
    generationTimezone: "America/Los_Angeles",
    preferredLocalGenerationTime: "09:00",
    lastSuccessfulGenerationAt: null,
    nextGenerationAt: null as Date | null,
    skipNextGeneration: false,
  };

  it("does not generate when automation is disabled", () => {
    const result = decideWhetherToGenerate({ ...base, automationEnabled: false });
    expect(result.shouldGenerate).toBe(false);
    expect(result.reason).toBe("automation_disabled");
  });

  it("does not generate when skip was requested, even if due", () => {
    const result = decideWhetherToGenerate({ ...base, skipNextGeneration: true, nextGenerationAt: new Date(Date.now() - 1000) });
    expect(result.shouldGenerate).toBe(false);
    expect(result.reason).toBe("skip_requested");
  });

  it("generates when nextGenerationAt has no value (first run)", () => {
    const result = decideWhetherToGenerate({ ...base, nextGenerationAt: null });
    expect(result.shouldGenerate).toBe(true);
  });

  it("does not generate before nextGenerationAt arrives", () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const result = decideWhetherToGenerate({ ...base, nextGenerationAt: future });
    expect(result.shouldGenerate).toBe(false);
    expect(result.reason).toBe("not_due");
  });

  it("generates once nextGenerationAt has passed", () => {
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const result = decideWhetherToGenerate({ ...base, nextGenerationAt: past });
    expect(result.shouldGenerate).toBe(true);
  });

  it("a daily cron invocation on a non-due day never generates (true 2-day interval)", () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const result = decideWhetherToGenerate({ ...base, nextGenerationAt: tomorrow });
    expect(result.shouldGenerate).toBe(false);
  });
});

describe("formatInTimezone", () => {
  it("formats a UTC instant using the target time zone", () => {
    const formatted = formatInTimezone(new Date("2026-07-14T16:00:00.000Z"), "America/Los_Angeles", "HH:mm");
    expect(formatted).toBe("09:00");
  });
});
