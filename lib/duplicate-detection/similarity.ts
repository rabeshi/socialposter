import { getEnv } from "@/lib/env";

export interface SimilarityCandidate {
  id: string;
  hook: string;
  linkedinCopy: string;
  category: string;
}

export interface SimilarityResult {
  candidateId: string;
  mostSimilarToId: string | null;
  score: number; // 0 (unique) - 1 (near-duplicate)
  warnings: string[];
}

const DEFAULT_SIMILARITY_THRESHOLD = 0.82;

/**
 * Compares new candidates against posts from the preceding 60 days.
 * Uses OpenAI embeddings when configured; otherwise falls back to a
 * lightweight lexical Jaccard-similarity heuristic so duplicate detection
 * still runs end-to-end in simulation mode. Either path only ever warns —
 * it never auto-approves or auto-rejects content.
 */
export async function detectSimilarity(
  candidates: SimilarityCandidate[],
  recentPosts: SimilarityCandidate[],
  threshold = DEFAULT_SIMILARITY_THRESHOLD
): Promise<SimilarityResult[]> {
  const env = getEnv();

  if (!env.SIMULATION_MODE && env.OPENAI_API_KEY) {
    return detectSimilarityWithEmbeddings(candidates, recentPosts, threshold);
  }

  return candidates.map((candidate) => {
    let best = { id: null as string | null, score: 0 };
    for (const recent of recentPosts) {
      const score = jaccardSimilarity(normalize(candidate.linkedinCopy), normalize(recent.linkedinCopy));
      if (score > best.score) best = { id: recent.id, score };
    }
    const warnings: string[] = [];
    if (best.score >= threshold) {
      warnings.push(`Similarity to a recent post is ${(best.score * 100).toFixed(0)}%, above the ${(threshold * 100).toFixed(0)}% threshold.`);
    }
    const repeatedHook = recentPosts.some((r) => normalize(r.hook) === normalize(candidate.hook));
    if (repeatedHook) warnings.push("This hook matches a hook used in the preceding 60 days.");

    return { candidateId: candidate.id, mostSimilarToId: best.id, score: best.score, warnings };
  });
}

async function detectSimilarityWithEmbeddings(
  candidates: SimilarityCandidate[],
  recentPosts: SimilarityCandidate[],
  threshold: number
): Promise<SimilarityResult[]> {
  const env = getEnv();
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY! });

  const embed = async (texts: string[]) => {
    if (texts.length === 0) return [];
    const res = await client.embeddings.create({ model: env.OPENAI_EMBEDDING_MODEL, input: texts });
    return res.data.map((d) => d.embedding);
  };

  const candidateEmbeddings = await embed(candidates.map((c) => c.linkedinCopy));
  const recentEmbeddings = await embed(recentPosts.map((r) => r.linkedinCopy));

  return candidates.map((candidate, i) => {
    let best = { id: null as string | null, score: 0 };
    const embA = candidateEmbeddings[i];
    if (embA) {
      recentEmbeddings.forEach((embB, j) => {
        const score = cosineSimilarity(embA, embB);
        if (score > best.score) best = { id: recentPosts[j]!.id, score };
      });
    }
    const warnings: string[] = [];
    if (best.score >= threshold) {
      warnings.push(`Semantic similarity to a recent post is ${(best.score * 100).toFixed(0)}%, above the ${(threshold * 100).toFixed(0)}% threshold.`);
    }
    return { candidateId: candidate.id, mostSimilarToId: best.id, score: best.score, warnings };
  });
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, "").trim();
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(/\s+/).filter(Boolean));
  const setB = new Set(b.split(/\s+/).filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! ** 2;
    normB += b[i]! ** 2;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
