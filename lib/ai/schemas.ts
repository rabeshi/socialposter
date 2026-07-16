import { z } from "zod";
import { Category } from "@prisma/client";

export const CATEGORY_VALUES = Object.values(Category) as [Category, ...Category[]];

export const candidateSchema = z.object({
  category: z.enum(CATEGORY_VALUES),
  contentAngle: z.string().min(10).max(200),
  hook: z.string().min(5).max(200),
  headline: z.string().max(80).optional(),
  linkedinCopy: z.string().min(20),
  xCopy: z.string().min(10).max(280),
  hashtags: z.array(z.string().regex(/^#\w+$/)).min(1).max(6),
  imagePrompt: z.string().min(10),
  altText: z.string().min(10).max(250),
  suggestedPublicationTime: z.string().regex(/^\d{2}:\d{2}$/),
  qualityScore: z.number().min(0).max(1),
  performanceReason: z.string().min(5),
  factualityNotes: z.string(),
  riskNotes: z.string(),
});

export type GeneratedCandidate = z.infer<typeof candidateSchema>;

export const candidateBatchSchema = z.object({
  candidates: z.array(candidateSchema).length(3),
});

export type GeneratedCandidateBatch = z.infer<typeof candidateBatchSchema>;

/** Validates and enforces LinkedIn-specific formatting rules beyond basic schema shape. */
export function validateLinkedInCopy(copy: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const words = copy.trim().split(/\s+/).filter(Boolean).length;
  if (words < 60 || words > 220) {
    issues.push(`LinkedIn copy is ${words} words; expected roughly 80-180 (soft bounds 60-220).`);
  }
  if (!/#Liceo\b/i.test(copy)) issues.push("LinkedIn copy must include #Liceo.");
  const hashtagCount = (copy.match(/#\w+/g) ?? []).length;
  if (hashtagCount < 3 || hashtagCount > 5) {
    issues.push(`LinkedIn copy has ${hashtagCount} hashtags; expected 3-5.`);
  }
  return { valid: issues.length === 0, issues };
}

/** Validates X-specific character/hashtag rules. */
export function validateXCopy(copy: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const length = copy.length;
  if (length > 280) issues.push(`X copy is ${length} characters; exceeds the 280 limit.`);
  if (length < 120 || length > 260) {
    issues.push(`X copy is ${length} characters; expected approximately 180-260.`);
  }
  if (!/#Liceo\b/i.test(copy)) issues.push("X copy must include #Liceo.");
  const hashtagCount = (copy.match(/#\w+/g) ?? []).length;
  if (hashtagCount > 3) issues.push(`X copy has ${hashtagCount} hashtags; maximum is 3.`);
  return { valid: issues.length === 0, issues };
}
