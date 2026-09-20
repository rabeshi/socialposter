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
    `3-5 hashtags including #Liceo, ends with an insight or restrained question), facebookCopy (60-140 words, conversational, explicitly mentions Liceo, ends with a restrained question and uses no more than 3 hashtags), xCopy (approximately 180-260`,
    `characters, up to 3 hashtags including #Liceo), hashtags array, imagePrompt, altText,`,
    `suggestedPublicationTime (HH:mm), qualityScore (0-1), performanceReason,`,
    `factualityNotes, and riskNotes. Make each post structurally and rhetorically distinct: vary the opening,`,
    `paragraph rhythm, argument, practical takeaway, and closing question. Never reuse boilerplate across`,
    `candidates. Do not invent customers, partnerships, integrations, or certifications.`,
    `For each imagePrompt, create a clear editorial illustration in the approved Liceo style: white or`,
    `off-white backgrounds, navy sans-serif headlines, electric-blue and teal accents, rounded surfaces,`,
    `soft shadows, subtle depth, and generous whitespace. Use a short headline and a purposeful visual`,
    `metaphor for the post. Vary subjects and layouts across renewals, discovery, offboarding, license`,
    `usage, collaboration, and governance. Do not make every post about dashboards. No invented metrics`,
    `or product interfaces, photorealistic office scenes, robots, unrelated styles, or third-party logos.`,
    `Reserve quiet white space at bottom right for the official Liceo logo to be composited later.`,
  ].join("\n");
}

const VISUAL_DIRECTIONS = [
  "A short headline above one clear conceptual illustration with generous whitespace.",
  "A left-aligned headline balanced by a flowing illustration on the right.",
  "Three simple illustrated steps with short labels, visually connected by a fine blue line.",
  "A before-and-after illustration with rounded objects and restrained typography.",
  "An airy top-down arrangement of meaningful objects with subtle depth and soft shadows.",
  "A central focal illustration with a few carefully spaced supporting objects.",
] as const;

export function buildImagePrompt(basePrompt: string, brandColors: string[], seed = 0): string {
  const direction = VISUAL_DIRECTIONS[Math.abs(seed) % VISUAL_DIRECTIONS.length]!;
  return [
    basePrompt,
    `Composition direction: ${direction}`,
    "Keep the approved Liceo visual identity: white or off-white background, deep navy sans-serif",
    "headlines, electric-blue and teal accents, rounded surfaces, soft shadows, subtle illustrative",
    "depth, and generous whitespace. Use a concise headline tied to the post and one purposeful",
    "conceptual illustration. Vary the subject and composition without changing the brand style.",
    "Reference concepts include a renewal calendar and contract, app discovery through a magnifying",
    "glass, or an employee badge connected to handover steps. Invent fresh concepts, not copies.",
    "No fabricated dashboards, product screenshots, statistics, capabilities, third-party logos,",
    "photorealistic office scenes, robots, or unrelated cinematic styles. Keep text legible and brief.",
    "Do not draw or typeset the Liceo logo. Reserve the bottom-right 22% of width and 15% of height",
    "as quiet white space for the exact official logo added afterward. Maintain safe margins.",
    brandColors.length ? `Additional brand palette: ${brandColors.join(", ")}.` : "",
  ].join(" ");
}
