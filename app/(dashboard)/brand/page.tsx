import { prisma } from "@/lib/prisma";
import { BrandSettingsForm } from "@/components/forms/brand-settings-form";

export const dynamic = "force-dynamic";

export default async function BrandPage() {
  const brand = await prisma.brandProfile.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      companyDescription: "Liceo is an AI-powered SaaS discovery, governance, cost-optimization, and management platform.",
      productDescription: "Liceo helps organizations discover, govern, and optimize their software ecosystems.",
      brandVoice: "Professional, clear, intelligent, practical, credible, enterprise-focused, educational, calm and confident.",
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Brand Settings</h1>
        <p className="text-muted-foreground">Voice, terminology, visual identity, and approval routing for Liceo content.</p>
      </div>
      <BrandSettingsForm
        brand={{
          companyDescription: brand.companyDescription,
          productDescription: brand.productDescription,
          brandVoice: brand.brandVoice,
          approvedTerms: brand.approvedTerms.join(", "),
          prohibitedTerms: brand.prohibitedTerms.join(", "),
          brandColors: brand.brandColors.join(", "),
          website: brand.website,
          standardHashtags: brand.standardHashtags.join(", "),
          approvalEmailRecipients: brand.approvalEmailRecipients.join(", "),
          logoUrl: brand.logoUrl,
        }}
      />
    </div>
  );
}
