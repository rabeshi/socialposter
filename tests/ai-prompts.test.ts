import { describe, expect, it } from "vitest";
import { Category } from "@prisma/client";
import { buildCandidatePrompt, buildImagePrompt } from "@/lib/ai/prompts";

describe("OpenAI candidate prompt", () => {
  it("explicitly requests JSON when JSON response mode is used", () => {
    const prompt = buildCandidatePrompt(
      [Category.SAAS_DISCOVERY, Category.SAAS_COST_OPTIMIZATION, Category.SHADOW_IT],
      []
    );

    expect(prompt.toLowerCase()).toContain("json");
  });

  it("rotates composition direction for regenerated images", () => {
    const brief = "A procurement team untangling duplicate software contracts.";
    expect(buildImagePrompt(brief, [], 1)).not.toBe(buildImagePrompt(brief, [], 2));
  });
});
