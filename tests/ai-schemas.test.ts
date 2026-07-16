import { describe, it, expect } from "vitest";
import { validateLinkedInCopy, validateXCopy, candidateBatchSchema } from "@/lib/ai/schemas";

describe("validateLinkedInCopy", () => {
  it("accepts copy within the 80-180 word range with #Liceo and 3-5 hashtags", () => {
    const words = Array.from({ length: 100 }, (_, i) => `word${i}`).join(" ");
    const copy = `${words} #Liceo #SaaSManagement #ITGovernance`;
    expect(validateLinkedInCopy(copy).valid).toBe(true);
  });

  it("flags copy missing #Liceo", () => {
    const words = Array.from({ length: 100 }, (_, i) => `word${i}`).join(" ");
    const result = validateLinkedInCopy(`${words} #SaaSManagement #ITGovernance #Cloud`);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes("#Liceo"))).toBe(true);
  });

  it("flags copy that is too short", () => {
    const result = validateLinkedInCopy("Too short. #Liceo #A #B #C");
    expect(result.valid).toBe(false);
  });

  it("flags too many hashtags", () => {
    const words = Array.from({ length: 100 }, (_, i) => `word${i}`).join(" ");
    const result = validateLinkedInCopy(`${words} #Liceo #A #B #C #D #E #F`);
    expect(result.valid).toBe(false);
  });
});

describe("validateXCopy", () => {
  it("accepts copy within limits", () => {
    const copy = "A" + "b".repeat(200) + " #Liceo #SaaS";
    expect(validateXCopy(copy).valid).toBe(true);
  });

  it("rejects copy exceeding 280 characters", () => {
    const copy = "a".repeat(281) + " #Liceo";
    const result = validateXCopy(copy);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes("280"))).toBe(true);
  });

  it("rejects more than 3 hashtags", () => {
    const copy = "b".repeat(200) + " #Liceo #A #B #C";
    const result = validateXCopy(copy);
    expect(result.valid).toBe(false);
  });

  it("requires #Liceo", () => {
    const copy = "b".repeat(200) + " #SaaS #Cloud";
    expect(validateXCopy(copy).valid).toBe(false);
  });
});

describe("candidateBatchSchema", () => {
  it("rejects a batch that does not contain exactly 3 candidates", () => {
    const result = candidateBatchSchema.safeParse({ candidates: [] });
    expect(result.success).toBe(false);
  });
});
