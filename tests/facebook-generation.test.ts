import { describe, expect, it, vi } from "vitest";
import { Category } from "@prisma/client";
import { generateCandidates } from "@/lib/ai/content-generator";
import { candidateBatchSchema, validateFacebookCopy } from "@/lib/ai/schemas";
vi.mock("@/lib/env", () => ({ getEnv: () => ({ USE_REAL_AI_TEXT: false }) }));

describe("Facebook generation", () => {
  it("includes independent Facebook copy for all three generated candidates", async () => {
    const batch = await generateCandidates({
      categories: [Category.SAAS_DISCOVERY, Category.SHADOW_IT, Category.BUILDING_LICEO],
      recentHooks: [], companyDescription: "Liceo", productDescription: "Software management",
    });
    expect(candidateBatchSchema.safeParse(batch).success).toBe(true);
    for (const candidate of batch.candidates) {
      expect(validateFacebookCopy(candidate.facebookCopy).valid).toBe(true);
      expect(candidate.facebookCopy).not.toBe(candidate.linkedinCopy);
      expect(candidate.facebookCopy).not.toBe(candidate.xCopy);
    }
    const withoutFacebook = { candidates: batch.candidates.map(({ facebookCopy, ...other }) => other) };
    expect(candidateBatchSchema.safeParse(withoutFacebook).success).toBe(false);
  });
});
