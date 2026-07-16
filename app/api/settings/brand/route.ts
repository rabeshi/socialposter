import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/api-helpers";
import { recordAudit, clientIp } from "@/lib/audit";

export async function GET() {
  try {
    await requireRole(["ADMIN", "REVIEWER", "VIEWER"]);
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
    return NextResponse.json({ brand });
  } catch (error) {
    return handleApiError(error);
  }
}

const updateSchema = z.object({
  companyDescription: z.string().min(1).optional(),
  productDescription: z.string().min(1).optional(),
  brandVoice: z.string().min(1).optional(),
  approvedTerms: z.array(z.string()).optional(),
  prohibitedTerms: z.array(z.string()).optional(),
  brandColors: z.array(z.string()).optional(),
  website: z.string().url().optional(),
  standardHashtags: z.array(z.string()).optional(),
  hashtagMinCount: z.number().int().min(0).optional(),
  hashtagMaxCount: z.number().int().min(0).optional(),
  allowUrlsInLinkedIn: z.boolean().optional(),
  approvalEmailRecipients: z.array(z.string().email()).optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await requireRole(["ADMIN"]);
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const updated = await prisma.brandProfile.upsert({
      where: { id: "singleton" },
      update: parsed.data,
      create: {
        id: "singleton",
        companyDescription: parsed.data.companyDescription ?? "Liceo is an AI-powered SaaS discovery, governance, cost-optimization, and management platform.",
        productDescription: parsed.data.productDescription ?? "Liceo helps organizations discover, govern, and optimize their software ecosystems.",
        brandVoice: parsed.data.brandVoice ?? "Professional, clear, intelligent, practical, credible, enterprise-focused, educational, calm and confident.",
        ...parsed.data,
      },
    });

    await recordAudit({
      userId: session.user.id,
      action: "BRAND_SETTINGS_UPDATED",
      objectType: "BrandProfile",
      objectId: "singleton",
      ipAddress: clientIp(request),
    });

    return NextResponse.json({ brand: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
