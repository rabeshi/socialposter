import { NextResponse } from "next/server";
import { z } from "zod";
import { Category, ContentStatus, GenerationSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, enforceRateLimit, handleApiError } from "@/lib/api-helpers";
import { recordAudit, clientIp } from "@/lib/audit";
import { generateCandidates } from "@/lib/ai/content-generator";
import { generateImageSet } from "@/lib/ai/image-generator";
import { detectSimilarity } from "@/lib/duplicate-detection/similarity";
import { buildBatchIdempotencyKey } from "@/lib/scheduling/publishing";
import { nanoid } from "nanoid";
import { sendApprovalEmail } from "@/lib/email/send-approval-email";

const CATEGORY_VALUES = Object.values(Category) as [Category, ...Category[]];

const manualGenerateSchema = z.object({
  categories: z.array(z.enum(CATEGORY_VALUES)).length(3),
});

export async function GET() {
  try {
    await requireSession();
    const batches = await prisma.contentBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { candidates: { select: { id: true, category: true, status: true, qualityScore: true } } },
    });
    return NextResponse.json({ batches });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    enforceRateLimit(`batches:create:${session.user.id}`, 5, 60_000);

    const body = await request.json();
    const parsed = manualGenerateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { categories } = parsed.data;

    const brand = await prisma.brandProfile.findFirst();
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const recentCandidates = await prisma.postCandidate.findMany({
      where: { createdAt: { gte: sixtyDaysAgo }, status: { in: [ContentStatus.PUBLISHED, ContentStatus.PARTIALLY_PUBLISHED] } },
      select: { id: true, hook: true, linkedinCopy: true, category: true },
      take: 100,
    });

    const idempotencyKey = buildBatchIdempotencyKey(new Date().toISOString().slice(0, 10), `manual-${nanoid(6)}`);

    const batch = await prisma.contentBatch.create({
      data: {
        generationSource: GenerationSource.MANUAL,
        status: ContentStatus.GENERATING,
        categories,
        model: "simulation",
        idempotencyKey,
      },
    });

    try {
      const generated = await generateCandidates({
        categories,
        recentHooks: recentCandidates.map((c) => c.hook),
        companyDescription: brand?.companyDescription ?? "Liceo is an AI-powered SaaS discovery, governance, cost-optimization, and management platform.",
        productDescription: brand?.productDescription ?? "Liceo helps organizations discover, govern, and optimize their software ecosystems.",
      });

      const created = [];
      for (let i = 0; i < generated.candidates.length; i++) {
        const c = generated.candidates[i]!;
        const images = await generateImageSet(c.imagePrompt, brand?.brandColors ?? [], i);
        const candidate = await prisma.postCandidate.create({
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
            originalImageUrl: images.originalUrl,
            linkedinLandscapeUrl: images.linkedinLandscapeUrl,
            linkedinSquareUrl: images.linkedinSquareUrl,
            xImageUrl: images.xImageUrl,
            thumbnailUrl: images.thumbnailUrl,
            altText: c.altText,
            status: ContentStatus.PENDING_REVIEW,
            qualityScore: c.qualityScore,
            factualityNotes: c.factualityNotes,
            riskNotes: c.riskNotes,
            suggestedPublicationTime: c.suggestedPublicationTime,
          },
        });
        created.push(candidate);
      }

      const similarity = await detectSimilarity(
        created.map((c) => ({ id: c.id, hook: c.hook, linkedinCopy: c.linkedinCopy, category: c.category })),
        recentCandidates
      );
      for (const result of similarity) {
        await prisma.postCandidate.update({
          where: { id: result.candidateId },
          data: { similarityScore: result.score },
        });
      }

      await prisma.contentBatch.update({ where: { id: batch.id }, data: { status: ContentStatus.PENDING_REVIEW } });

      try {
        await sendApprovalEmail(batch.id);
      } catch (emailError) {
        console.error("Manual batch generated, but approval email failed:", emailError);
      }

      await recordAudit({
        userId: session.user.id,
        action: "BATCH_GENERATED_MANUAL",
        objectType: "ContentBatch",
        objectId: batch.id,
        metadata: { categories },
        ipAddress: clientIp(request),
      });

      const fullBatch = await prisma.contentBatch.findUnique({ where: { id: batch.id }, include: { candidates: true } });
      return NextResponse.json({ batch: fullBatch }, { status: 201 });
    } catch (genError) {
      await prisma.contentBatch.update({
        where: { id: batch.id },
        data: { status: ContentStatus.GENERATION_FAILED, errorDetails: genError instanceof Error ? genError.message : "Unknown generation error" },
      });
      throw genError;
    }
  } catch (error) {
    return handleApiError(error);
  }
}
