import { Category } from "@prisma/client";
import { getEnv } from "@/lib/env";
import { candidateBatchSchema, type GeneratedCandidateBatch } from "@/lib/ai/schemas";
import { buildCandidatePrompt, buildSystemPrompt, CATEGORY_THEMES } from "@/lib/ai/prompts";

export interface GenerateCandidatesInput {
  categories: Category[];
  recentHooks: string[];
  companyDescription: string;
  productDescription: string;
}

/**
 * Produces 3 validated post candidates. In simulation mode (default, and
 * whenever OPENAI_API_KEY is absent) this returns realistic mock content so
 * the full workflow can be exercised without any paid API calls. When a key
 * is configured this calls the OpenAI Responses API with a strict JSON
 * schema and validates the result with Zod before returning it — invalid or
 * malformed structured output is rejected rather than silently accepted.
 */
export async function generateCandidates(input: GenerateCandidatesInput): Promise<GeneratedCandidateBatch> {
  const env = getEnv();

  if (!env.USE_REAL_AI_TEXT || !env.OPENAI_API_KEY) {
    return generateMockCandidates(input);
  }

  const { default: OpenAI } = await import("openai");
  const { zodResponseFormat } = await import("openai/helpers/zod");
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  const systemPrompt = buildSystemPrompt(input.companyDescription, input.productDescription);
  const userPrompt = buildCandidatePrompt(input.categories, input.recentHooks);

  const response = await client.chat.completions.parse({
    model: env.OPENAI_TEXT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: zodResponseFormat(candidateBatchSchema, "liceo_candidate_batch"),
  });

  const message = response.choices[0]?.message;
  if (message?.refusal) throw new Error(`OpenAI refused candidate generation: ${message.refusal}`);
  if (!message?.parsed) throw new Error("OpenAI returned no validated candidate batch.");
  return message.parsed;
}

function generateMockCandidates(input: GenerateCandidatesInput): GeneratedCandidateBatch {
  const candidates = input.categories.slice(0, 3).map((category) => buildMockCandidate(category));
  return { candidates };
}

function buildMockCandidate(category: Category): GeneratedCandidateBatch["candidates"][number] {
  const theme = CATEGORY_THEMES[category];
  const hook = theme.exampleTheme;

  const linkedinCopy = [
    `${hook}`,
    ``,
    `Most organizations underestimate how fragmented their software environment has become. ${theme.description}`,
    ``,
    `Liceo gives IT, finance, procurement, and security teams a shared, accurate view of the applications`,
    `actually in use, so decisions about renewals, access, and spend are based on evidence rather than guesswork.`,
    ``,
    `Governance does not have to mean more overhead. It can mean fewer surprises.`,
    ``,
    `What would your team find if you looked closely at your software footprint today?`,
    ``,
    `#Liceo #SaaSManagement #ITGovernance #SoftwareSpend`,
  ].join("\n");

  const xCopy = `${hook} Liceo helps teams see what software is really in use, so renewal and access decisions rest on evidence, not guesswork. #Liceo #SaaSGovernance`;

  return {
    category,
    contentAngle: theme.description,
    hook,
    headline: theme.exampleTheme.length <= 60 ? theme.exampleTheme : null,
    linkedinCopy,
    xCopy,
    hashtags: ["#Liceo", "#SaaSManagement", "#ITGovernance", "#SoftwareSpend"],
    imagePrompt: `Clean modern enterprise office scene representing ${theme.label.toLowerCase()}, muted professional palette, ample negative space for a headline, no on-screen text or logos.`,
    altText: `Illustration representing ${theme.label.toLowerCase()} for an enterprise software governance platform.`,
    suggestedPublicationTime: "09:00",
    qualityScore: 0.78,
    performanceReason: `Speaks directly to a recognizable pain point (${theme.label.toLowerCase()}) with a concrete, non-hyped call to reflect.`,
    factualityNotes: "No statistics, customers, or capabilities are claimed beyond Liceo's general positioning.",
    riskNotes: "No compliance or legal claims made; safe for general publication.",
  };
}
