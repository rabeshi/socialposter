import { describe, it, expect } from "vitest";
import { detectSimilarity } from "@/lib/duplicate-detection/similarity";

describe("detectSimilarity (lexical fallback in simulation mode)", () => {
  it("warns when a candidate closely repeats a recent post's copy", async () => {
    const recent = [{ id: "r1", hook: "Unused software is an invisible expense.", linkedinCopy: "Unused software is an invisible expense across every renewal cycle.", category: "SAAS_COST_OPTIMIZATION" }];
    const candidates = [{ id: "c1", hook: "Unused software is an invisible expense.", linkedinCopy: "Unused software is an invisible expense across every renewal cycle.", category: "SAAS_COST_OPTIMIZATION" }];

    const results = await detectSimilarity(candidates, recent, 0.5);
    expect(results[0]!.warnings.length).toBeGreaterThan(0);
    expect(results[0]!.score).toBeGreaterThanOrEqual(0.5);
  });

  it("does not warn for genuinely distinct content", async () => {
    const recent = [{ id: "r1", hook: "Old hook", linkedinCopy: "Completely unrelated content about vendor consolidation and procurement.", category: "SOFTWARE_PROCUREMENT_VENDOR_MANAGEMENT" }];
    const candidates = [{ id: "c1", hook: "New hook", linkedinCopy: "A totally different discussion about shadow IT and security risk exposure.", category: "SHADOW_IT" }];

    const results = await detectSimilarity(candidates, recent, 0.82);
    expect(results[0]!.warnings.length).toBe(0);
  });

  it("never returns a score outside [0, 1]", async () => {
    const recent = [{ id: "r1", hook: "h", linkedinCopy: "some words here", category: "SHADOW_IT" }];
    const candidates = [{ id: "c1", hook: "h2", linkedinCopy: "some other words here too", category: "SHADOW_IT" }];
    const [result] = await detectSimilarity(candidates, recent);
    expect(result!.score).toBeGreaterThanOrEqual(0);
    expect(result!.score).toBeLessThanOrEqual(1);
  });
});
