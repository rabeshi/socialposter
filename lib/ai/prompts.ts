import { Category } from "@prisma/client";

export const CATEGORY_THEMES: Record<Category, { label: string; description: string; exampleTheme: string }> = {
  SAAS_DISCOVERY: {
    label: "SaaS Discovery",
    description: "Why organizations need visibility into software applications used across teams.",
    exampleTheme: "How many applications is your organization actually using?",
  },
  SAAS_COST_OPTIMIZATION: {
    label: "SaaS Cost Optimization",
    description: "Unused licenses, duplicate subscriptions, unnecessary renewals, shelfware, and software cost reduction.",
    exampleTheme: "Unused software is an invisible expense.",
  },
  SAAS_SPRAWL: {
    label: "SaaS Sprawl",
    description: "How rapidly expanding software environments create complexity, fragmented workflows, overlapping applications, and rising costs.",
    exampleTheme: "More software does not always mean more productivity.",
  },
  SHADOW_IT: {
    label: "Shadow IT",
    description: "Applications adopted without the awareness or approval of IT teams and the risks they may introduce.",
    exampleTheme: "The applications you cannot see may create the greatest risks.",
  },
  SOFTWARE_USAGE_LICENSE_MANAGEMENT: {
    label: "Software Usage and License Management",
    description: "Active usage, license utilization, renewal decisions, and whether organizations are receiving value from their subscriptions.",
    exampleTheme: "A purchased license is not necessarily a productive license.",
  },
  AI_POWERED_SAAS_GOVERNANCE: {
    label: "AI-Powered SaaS Governance",
    description: "How AI can help discover applications, classify software, identify risks, surface insights, and support governance decisions.",
    exampleTheme: "AI can turn fragmented software data into actionable insights.",
  },
  SECURITY_RISK_COMPLIANCE: {
    label: "Security, Risk, and Compliance",
    description: "Unapproved software, data exposure, access controls, vendor risk, compliance, offboarding, and responsible software governance.",
    exampleTheme: "Every unmanaged application can create an unseen security gap.",
  },
  SOFTWARE_PROCUREMENT_VENDOR_MANAGEMENT: {
    label: "Software Procurement and Vendor Management",
    description: "Purchasing decisions, contract renewals, vendor consolidation, duplicate tools, and negotiation preparation.",
    exampleTheme: "Better software procurement begins with knowing what you already have.",
  },
  OPERATIONAL_EFFICIENCY_AUTOMATION: {
    label: "Operational Efficiency and Automation",
    description: "Reducing repetitive work, connecting fragmented systems, improving workflows, and enabling collaboration among IT, finance, procurement, security, and operations teams.",
    exampleTheme: "Technology should simplify operations, not create more administrative work.",
  },
  BUILDING_LICEO: {
    label: "Building Liceo",
    description: "Product updates, company milestones, new capabilities, lessons learned, development insights, and Liceo's vision.",
    exampleTheme: "We're building Liceo to help organizations discover, govern, and optimize their software ecosystems.",
  },
};

export const BRAND_VOICE_GUIDELINES = `
Liceo's voice is professional, clear, intelligent, practical, credible, enterprise-focused,
educational, calm and confident, and forward-looking without hype.

Avoid: generic AI prose, unsupported statistics, invented customers, invented partnerships,
invented integrations, invented certifications, invented platform capabilities, unrealistic
promises, excessive emojis, excessive hashtags, aggressive sales language, claims that Liceo
guarantees savings or eliminates all risk, repetitive phrases such as "in today's fast-paced
digital landscape", and excessive em dashes.

Refer to the company primarily as "Liceo". Use American English.
`.trim();

export function buildSystemPrompt(companyDescription: string, productDescription: string): string {
  return [
    `You write social media content for Liceo (https://liceo.io), an AI-powered SaaS discovery,`,
    `governance, cost-optimization, and management platform.`,
    `Company: ${companyDescription}`,
    `Product: ${productDescription}`,
    BRAND_VOICE_GUIDELINES,
  ].join("\n\n");
}

export function buildCandidatePrompt(categories: Category[], recentHooks: string[]): string {
  const categoryBriefs = categories
    .map((c) => `- ${CATEGORY_THEMES[c].label}: ${CATEGORY_THEMES[c].description} (e.g. "${CATEGORY_THEMES[c].exampleTheme}")`)
    .join("\n");

  return [
    `Return one valid JSON object only. Do not include Markdown, commentary, or code fences.`,
    `Generate exactly 3 distinct post candidates, one per category below:`,
    categoryBriefs,
    recentHooks.length
      ? `\nAvoid reusing these recent hooks or opening sentences:\n${recentHooks.map((h) => `- ${h}`).join("\n")}`
      : "",
    `\nFor each candidate produce: category, contentAngle, hook, headline (use null when no separate headline is needed), linkedinCopy (80-180 words,`,
    `3-5 hashtags including #Liceo, ends with an insight or restrained question), xCopy (approximately 180-260`,
    `characters, up to 3 hashtags including #Liceo), hashtags array, imagePrompt, altText,`,
    `suggestedPublicationTime (HH:mm), qualityScore (0-1), performanceReason,`,
    `factualityNotes, and riskNotes. Make each post structurally and rhetorically distinct: vary the opening,`,
    `paragraph rhythm, argument, practical takeaway, and closing question. Never reuse boilerplate across`,
    `candidates. Do not invent customers, partnerships, integrations, or certifications.`,
    `For each imagePrompt, act as a senior advertising art director. Translate that specific post's central`,
    `insight into one concrete, memorable physical metaphor that works without explanatory text. Specify the`,
    `hero subject, supporting objects, environment, camera angle, lighting, materials, and color mood. The three`,
    `concepts must use different hero subjects, settings, angles, and metaphors. Do not use a dashboard, laptop,`,
    `cloud, shield, or floating app tiles as the main subject more than once across the batch. Avoid generic`,
    `'professional graphic' and 'software dashboard with metrics' descriptions, fake text, and unrelated imagery.`,
  ].join("\n");
}

const VISUAL_DIRECTIONS = [
  "Cinematic macro product photograph, low three-quarter angle, tactile hero object in sharp focus, minimal background.",
  "Bright editorial tabletop still life, overhead camera, carefully arranged physical objects telling a visual story.",
  "Premium architectural miniature or diorama, wide eye-level camera, layered depth and realistic scale-model materials.",
  "Sophisticated split-scene comparison showing before versus after without labels, symmetrical wide composition.",
  "Dynamic frozen-motion commercial photograph, strong diagonal movement, one surprising physical transformation.",
  "Clean museum-display scene, centered sculptural metaphor on a pedestal, soft gallery lighting and negative space.",
  "Realistic operations room viewed from behind and above, people secondary, physical workflow metaphor dominant.",
  "Optimistic glass-atrium business scene, natural morning light, expansive framing and an unexpected SaaS metaphor.",
] as const;

export function buildImagePrompt(basePrompt: string, brandColors: string[], seed = 0): string {
  const palette = brandColors.length ? ` Palette accents: ${brandColors.join(", ")}.` : "";
  const direction = VISUAL_DIRECTIONS[Math.abs(seed) % VISUAL_DIRECTIONS.length]!;
  return [
    basePrompt,
    `Composition direction: ${direction}`,
    "Create a premium photorealistic 3D editorial advertising image for an enterprise SaaS company—not a flat",
    "vector graphic, slide, poster, or ordinary screenshot. Honor the supplied post-specific metaphor as the hero;",
    "do not replace it with a generic dashboard. App tiles, screens, charts, clouds, locks, and shields may appear",
    "only when they support this particular concept and must not become the default composition. Use realistic",
    "materials, natural or cinematic light, soft shadows, subtle depth of field, and crisp product-photo",
    "detail, balanced visual hierarchy, and a sophisticated white, navy, blue, and multicolor palette. Make the",
    "specific post insight understandable at a glance. Avoid generic corporate banners, abstract node diagrams, meaningless",
    "charts, excessive interface panels, humanoid robots, glowing AI brains, visual clutter, garbled text, malformed",
    "hands or faces, prominent typography, and copied company logos. Leave some clean negative space.",
    palette,
  ].join(" ");
}
