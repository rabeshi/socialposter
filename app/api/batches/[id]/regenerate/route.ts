import { NextResponse } from "next/server";
import { ContentStatus, GenerationSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, enforceRateLimit, handleApiError, ApiError } from "@/lib/api-helpers";
import { verifyReviewLink } from "@/lib/security";
import { recordAudit, clientIp } from "@/lib/audit";
import { generateCandidates } from "@/lib/ai/content-generator";
import { generateImageSet } from "@/lib/ai/image-generator";
import { buildBatchIdempotencyKey } from "@/lib/scheduling/publishing";
import { nanoid } from "nanoid";

async function regenerateBatch(originalId: string, actorUserId: string | null) {
  const original = await prisma.contentBatch.findUnique({ where: { id: originalId }, include: { candidates: true } });
  if (!original) throw new ApiError(404, "Batch not found");

  await prisma.postCandidate.updateMany({
    where: { batchId: original.id, status: { notIn: [ContentStatus.PUBLISHED, ContentStatus.PARTIALLY_PUBLISHED] } },
    data: { status: ContentStatus.REJECTED },
  });
  await prisma.contentBatch.update({ where: { id: original.id }, data: { status: ContentStatus.CANCELLED } });

  const brand = await prisma.brandProfile.findFirst();
  const idempotencyKey = buildBatchIdempotencyKey(new Date().toISOString().slice(0, 10), `regenerate-${nanoid(6)}`);

  const batch = await prisma.contentBatch.create({
    data: {
      generationSource: GenerationSource.MANUAL,
      status: ContentStatus.GENERATING,
      categories: original.categories,
      model: "simulation",
      idempotencyKey,
    },
  });

  const generated = await generateCandidates({
    categories: original.categories,
    recentHooks: original.candidates.map((c) => c.hook),
    companyDescription: brand?.companyDescription ?? "Liceo is an AI-powered SaaS discovery, governance, cost-optimization, and management platform.",
    productDescription: brand?.productDescription ?? "Liceo helps organizations discover, govern, and optimize their software ecosystems.",
  });

  for (let i = 0; i < generated.candidates.length; i++) {
    const c = generated.candidates[i]!;
    const images = await generateImageSet(c.imagePrompt, brand?.brandColors ?? [], i);
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
  }

  await prisma.contentBatch.update({ where: { id: batch.id }, data: { status: ContentStatus.PENDING_REVIEW } });

  await recordAudit({
    userId: actorUserId,
    action: "BATCH_REGENERATED",
    objectType: "ContentBatch",
    objectId: batch.id,
    metadata: { previousBatchId: original.id },
  });

  return prisma.contentBatch.findUnique({ where: { id: batch.id }, include: { candidates: true } });
}

/** Authenticated dashboard action: "Request New Candidates" from the review UI. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    enforceRateLimit(`batches:regenerate:${session.user.id}`, 5, 60_000);
    const { id } = await params;
    const batch = await regenerateBatch(id, session.user.id);
    return NextResponse.json({ batch }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/** One-click "Request New Candidates" from the approval email, authenticated by a signed review token. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    const payload = token ? verifyReviewLink(token) : null;
    if (!payload || payload.batchId !== id) {
      return NextResponse.json({ error: "This review link is invalid or has expired." }, { status: 401 });
    }

    const batch = await regenerateBatch(id, null);
    return NextResponse.redirect(new URL(`/review/${batch!.id}`, url.origin));
  } catch (error) {
    return handleApiError(error);
  }
}
