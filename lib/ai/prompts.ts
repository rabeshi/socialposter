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
    `\nFor each candidate produce: category, contentAngle, hook, optional headline, linkedinCopy (80-180 words,`,
    `3-5 hashtags including #Liceo, ends with an insight or restrained question), xCopy (approximately 180-260`,
    `characters, up to 3 hashtags including #Liceo), hashtags array, imagePrompt (realistic, professionally`,
    `art-directed, enterprise SaaS concept, no humanoid robots or glowing brains, no fake chart text, leaves`,
    `space for a headline), altText, suggestedPublicationTime (HH:mm), qualityScore (0-1), performanceReason,`,
    `factualityNotes, and riskNotes. Make each post structurally and rhetorically distinct: vary the opening,`,
    `paragraph rhythm, argument, practical takeaway, and closing question. Never reuse boilerplate across`,
    `candidates. Do not invent customers, partnerships, integrations, or certifications.`,
  ].join("\n");
}

export function buildImagePrompt(basePrompt: string, brandColors: string[]): string {
  const palette = brandColors.length ? ` Palette accents: ${brandColors.join(", ")}.` : "";
  return [
    basePrompt,
    "Create a photorealistic, premium commercial photograph for an enterprise software company—not a vector",
    "illustration, infographic, slide, poster, or flat UI mockup. Show a believable modern workplace with a",
    "laptop or large monitor displaying a polished SaaS-management dashboard and a grid of distinct colorful",
    "generic software application tiles. The applications should feel familiar and relatable through varied",
    "icon shapes and colors, but must not copy real company logos or contain readable brand names.",
    "Use natural office lighting, realistic materials, subtle depth of field, restrained navy and neutral tones,",
    "and an editorial corporate-photography composition. Avoid abstract circles, floating nodes, meaningless",
    "charts, humanoid robots, glowing AI brains, visual clutter, garbled interface text, malformed hands or",
    "faces, prominent typography, and recreated company logos. Leave clear negative space for an optional headline.",
    palette,
  ].join(" ");
}
