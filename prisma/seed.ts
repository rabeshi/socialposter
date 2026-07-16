import "dotenv/config";
import { PrismaClient, Category, ContentStatus, GenerationSource, Platform, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SAMPLE_IMAGES = [
  "/samples/liceo-sample-1.svg",
  "/samples/liceo-sample-2.svg",
  "/samples/liceo-sample-3.svg",
];

async function main() {
  console.log("Seeding Liceo Social simulation data...");

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPasswordValue = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME?.trim() || "Administrator";

  if (!adminEmail || !adminPasswordValue) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set before seeding.");
  }

  if (adminPasswordValue.length < 12) {
    throw new Error("ADMIN_PASSWORD must contain at least 12 characters.");
  }

  const adminPassword = await bcrypt.hash(adminPasswordValue, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      role: UserRole.ADMIN,
      passwordHash: adminPassword,
    },
    create: {
      name: adminName,
      email: adminEmail,
      role: UserRole.ADMIN,
      passwordHash: adminPassword,
    },
  });

  await prisma.brandProfile.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      companyName: "Liceo",
      companyDescription:
        "Liceo is an AI-powered SaaS discovery, governance, cost-optimization, and management platform.",
      productDescription:
        "Liceo helps organizations understand the software applications used across teams, identify unnecessary spending, improve license utilization, reduce software-related risks, and govern increasingly complex software environments.",
      brandVoice: "Professional, clear, intelligent, practical, credible, enterprise-focused, educational, calm and confident, forward-looking without hype.",
      approvedTerms: ["SaaS discovery", "SaaS governance", "license utilization", "shadow IT", "SaaS sprawl"],
      prohibitedTerms: ["guaranteed savings", "eliminate all risk", "in today's fast-paced digital landscape"],
      brandColors: ["#0B2545", "#134074", "#8DA9C4"],
      website: "https://liceo.io",
      standardHashtags: ["#Liceo", "#SaaSManagement", "#ITGovernance"],
      approvalEmailRecipients: [adminEmail],
    },
  });

  await prisma.automationSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      automationEnabled: false,
      generationIntervalDays: 2,
      generationTimezone: "America/Los_Angeles",
      preferredLocalGenerationTime: "09:00",
      defaultPlatforms: [Platform.LINKEDIN, Platform.X],
    },
  });

  const existingBatch = await prisma.contentBatch.findFirst();
  if (!existingBatch) {
    const batch = await prisma.contentBatch.create({
      data: {
        generationSource: GenerationSource.MANUAL,
        status: ContentStatus.PENDING_REVIEW,
        categories: [Category.SAAS_DISCOVERY, Category.SAAS_COST_OPTIMIZATION, Category.SECURITY_RISK_COMPLIANCE],
        model: "simulation",
        idempotencyKey: "seed-batch-1",
      },
    });

    const candidateData = [
      {
        category: Category.SAAS_DISCOVERY,
        contentAngle: "Why organizations need visibility into software applications used across teams.",
        hook: "How many applications is your organization actually using?",
        headline: "How many apps are you really running?",
        linkedinCopy:
          "How many applications is your organization actually using?\n\nMost leadership teams can name their major platforms. Far fewer can account for the dozens of smaller tools adopted by individual teams over time.\n\nThat gap matters. Every unaccounted-for application is a blind spot for cost, security, and compliance.\n\nLiceo gives IT, security, and finance teams a shared, accurate view of the software actually in use, so decisions rest on evidence instead of assumptions.\n\nWhat would a full inventory reveal about your organization today?\n\n#Liceo #SaaSDiscovery #ITGovernance #ShadowIT",
        xCopy:
          "How many applications is your organization actually using? Most teams can name the big platforms, but the long tail of smaller tools is where real risk and cost hide. #Liceo #SaaSDiscovery",
        hashtags: ["#Liceo", "#SaaSDiscovery", "#ITGovernance", "#ShadowIT"],
        imagePrompt: "Modern office network diagram, muted blue palette, clean enterprise visualization, space for headline text.",
        altText: "Abstract network diagram representing software discovery across an organization.",
        qualityScore: 0.81,
      },
      {
        category: Category.SAAS_COST_OPTIMIZATION,
        contentAngle: "Unused licenses, duplicate subscriptions, unnecessary renewals, shelfware.",
        hook: "Unused software is an invisible expense.",
        headline: "The cost of shelfware",
        linkedinCopy:
          "Unused software is an invisible expense.\n\nIt does not show up as a single line item. It is scattered across dozens of subscriptions renewed by default, seats no one is using, and tools quietly duplicating each other.\n\nFinding it requires more than a spreadsheet. It requires an accurate, current view of what is actually being used, by whom, and how often.\n\nLiceo helps teams see utilization clearly, so renewal decisions are based on real usage rather than habit.\n\nWhat would a closer look at your renewals reveal?\n\n#Liceo #SaaSCostOptimization #Shelfware #ITSpend",
        xCopy:
          "Unused software is an invisible expense, scattered across renewals no one reviews. Liceo helps teams see real usage before the next renewal date. #Liceo #SaaSCostOptimization",
        hashtags: ["#Liceo", "#SaaSCostOptimization", "#Shelfware", "#ITSpend"],
        imagePrompt: "Clean dashboard-style illustration of subscription cards, muted professional palette, ample negative space.",
        altText: "Illustration representing unused software licenses and subscription costs.",
        qualityScore: 0.76,
      },
      {
        category: Category.SECURITY_RISK_COMPLIANCE,
        contentAngle: "Unapproved software, data exposure, access controls, vendor risk, offboarding.",
        hook: "Every unmanaged application can create an unseen security gap.",
        headline: "Unseen apps, unseen risk",
        linkedinCopy:
          "Every unmanaged application can create an unseen security gap.\n\nWhen software is adopted outside of formal review, it often comes without the access controls, offboarding steps, or vendor scrutiny your other systems receive.\n\nThe risk is not the tool itself. It is the absence of visibility into how it is used and who still has access to it.\n\nLiceo helps security and IT teams surface these applications so governance can catch up with adoption.\n\nHow confident are you in your current offboarding process?\n\n#Liceo #SecurityRisk #ShadowIT #Compliance",
        xCopy:
          "Every unmanaged application can create an unseen security gap, especially around offboarding and access. Liceo helps surface what's actually in use. #Liceo #SecurityRisk #ShadowIT",
        hashtags: ["#Liceo", "#SecurityRisk", "#ShadowIT", "#Compliance"],
        imagePrompt: "Abstract security shield and access-control visualization, dark navy palette, professional enterprise style.",
        altText: "Illustration representing security risk from unmanaged software applications.",
        qualityScore: 0.79,
      },
    ];

    for (let i = 0; i < candidateData.length; i++) {
      const c = candidateData[i]!;
      await prisma.postCandidate.create({
        data: {
          batchId: batch.id,
          category: c.category,
          contentAngle: c.contentAngle,
          hook: c.hook,
          headline: c.headline,
          linkedinCopy: c.linkedinCopy,
          xCopy: c.xCopy,
          hashtags: c.hashtags,
          imagePrompt: c.imagePrompt,
          originalImageUrl: SAMPLE_IMAGES[i % SAMPLE_IMAGES.length],
          linkedinLandscapeUrl: SAMPLE_IMAGES[i % SAMPLE_IMAGES.length],
          linkedinSquareUrl: SAMPLE_IMAGES[i % SAMPLE_IMAGES.length],
          xImageUrl: SAMPLE_IMAGES[i % SAMPLE_IMAGES.length],
          thumbnailUrl: SAMPLE_IMAGES[i % SAMPLE_IMAGES.length],
          altText: c.altText,
          status: ContentStatus.PENDING_REVIEW,
          qualityScore: c.qualityScore,
          similarityScore: 0.12,
          factualityNotes: "No statistics, customers, or capabilities claimed beyond general positioning.",
          riskNotes: "No compliance or legal claims made; safe for general publication.",
          suggestedPublicationDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          suggestedPublicationTime: "09:00",
        },
      });
    }

    console.log(`Created seed batch ${batch.id} with 3 pending-review candidates.`);
  }

  console.log(`Seed complete. Administrator login: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
