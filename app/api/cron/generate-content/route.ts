import { NextResponse } from "next/server";
import { Category, ContentStatus, GenerationSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertCronAuthorized, UnauthorizedError } from "@/lib/security";
import { decideWhetherToGenerate, computeNextGenerationAt } from "@/lib/scheduling/generation";
import { generateCandidates } from "@/lib/ai/content-generator";
import { generateImageSet, featuredImageSet } from "@/lib/ai/image-generator";
import { detectSimilarity } from "@/lib/duplicate-detection/similarity";
import { buildBatchIdempotencyKey } from "@/lib/scheduling/publishing";
import { sendApprovalEmail } from "@/lib/email/send-approval-email";
import { recordAudit } from "@/lib/audit";

import { featuredImageWeek, weeklyFeaturedMarker, WEEKLY_FEATURED_BRIEF, WEEKLY_FEATURED_ALT } from "@/lib/scheduling/weekly-featured-image";

const ALL_CATEGORIES = Object.values(Category);

/**
 * Runs once daily via Vercel Cron. Only actually generates a batch when
 * AutomationSettings.nextGenerationAt has arrived — the daily invocation is
 * a due-date check, not a trigger to generate every time it runs. This is
 * what makes the business requirement a true 2-day interval rather than
 * "whatever the cron schedule happens to be".
 */
export async function GET(request: Request) {
  try {
    assertCronAuthorized(request);
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    throw error;
  }

  const settings = await prisma.automationSettings.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } });

  const decision = decideWhetherToGenerate({
    automationEnabled: settings.automationEnabled,
    generationIntervalDays: settings.generationIntervalDays,
    generationTimezone: settings.generationTimezone,
    preferredLocalGenerationTime: settings.preferredLocalGenerationTime,
    lastSuccessfulGenerationAt: settings.lastSuccessfulGenerationAt,
    nextGenerationAt: settings.nextGenerationAt,
    skipNextGeneration: settings.skipNextGeneration,
  });

  if (!decision.shouldGenerate) {
    // Skip requests only apply to a single upcoming cycle: consume the flag
    // and advance the schedule so automation doesn't stay skipped forever.
    if (decision.reason === "skip_requested") {
      const nextGenerationAt = computeNextGenerationAt(
        new Date(),
        settings.generationIntervalDays,
        settings.generationTimezone,
        settings.preferredLocalGenerationTime
      );
      await prisma.automationSettings.update({
        where: { id: "singleton" },
        data: { skipNextGeneration: false, nextGenerationAt },
      });
    }
    return NextResponse.json({ generated: false, reason: decision.reason });
  }

  // Idempotency: claim today's slot with a deterministic key derived from
  // the due date, so a duplicate/near-simultaneous cron invocation cannot
  // create two batches for the same cycle.
  const dateKey = new Date().toISOString().slice(0, 10);
  const idempotencyKey = buildBatchIdempotencyKey(dateKey, "scheduled");

  const alreadyRanToday = await prisma.contentBatch.findFirst({
    where: { generationSource: GenerationSource.SCHEDULED, idempotencyKey: { startsWith: `batch_${dateKey}_scheduled` } },
    orderBy: { createdAt: "desc" },
  });
  if (alreadyRanToday) {
    const staleGeneration =
      alreadyRanToday.status === ContentStatus.GENERATING &&
      alreadyRanToday.createdAt.getTime() <= Date.now() - 15 * 60 * 1000;

    if (staleGeneration) {
      await prisma.contentBatch.update({
        where: { id: alreadyRanToday.id },
        data: {
          status: ContentStatus.GENERATION_FAILED,
          errorDetails: "Generation exceeded the execution window and was automatically recovered for retry.",
        },
      });
    } else if (alreadyRanToday.status !== ContentStatus.GENERATION_FAILED) {
      return NextResponse.json({ generated: false, reason: "already_generated_today" });
    }
  }

  const brand = await prisma.brandProfile.findFirst();
  const week = featuredImageWeek(new Date(), settings.generationTimezone);
  const featuredMarker = weeklyFeaturedMarker(week);
  const existingFeatured = brand?.featuredImageUrl ? await prisma.postCandidate.findFirst({
    where: { imagePrompt: { startsWith: featuredMarker }, batch: { status: { not: ContentStatus.GENERATION_FAILED } } },
    select: { id: true },
  }) : null;
  const featureThisWeek = Boolean(brand?.featuredImageUrl && !existingFeatured);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const recentCandidates = await prisma.postCandidate.findMany({
    where: { createdAt: { gte: sixtyDaysAgo }, status: { in: [ContentStatus.PENDING_REVIEW, ContentStatus.APPROVED, ContentStatus.PUBLISHED, ContentStatus.PARTIALLY_PUBLISHED] } },
    select: { id: true, hook: true, linkedinCopy: true, category: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const lastBatch = await prisma.contentBatch.findFirst({
    where: { status: { in: [ContentStatus.PENDING_REVIEW, ContentStatus.APPROVED, ContentStatus.PUBLISHED, ContentStatus.PARTIALLY_PUBLISHED] } },
    orderBy: { createdAt: "desc" },
  });
  const excludedCategories = new Set(lastBatch?.categories ?? []);
  const eligibleCategories = ALL_CATEGORIES.filter((c) => !excludedCategories.has(c));
  const pool = eligibleCategories.length >= 3 ? eligibleCategories : ALL_CATEGORIES;
  const categories = featureThisWeek
    ? [Category.BUILDING_LICEO, ...shuffle(pool.filter((c) => c !== Category.BUILDING_LICEO)).slice(0, 2)]
    : shuffle(pool).slice(0, 3);

  const batch = await prisma.contentBatch.create({
    data: {
      generationSource: GenerationSource.SCHEDULED,
      status: ContentStatus.GENERATING,
      categories,
      model: "simulation",
      idempotencyKey,
    },
  });

  try {
    const generated = await generateCandidates({
      categories,
      contentBrief: featureThisWeek ? WEEKLY_FEATURED_BRIEF : undefined,
      recentHooks: recentCandidates.map((c) => c.hook),
      companyDescription: brand?.companyDescription ?? "Liceo is an AI-powered SaaS discovery, governance, cost-optimization, and management platform.",
      productDescription: brand?.productDescription ?? "Liceo helps organizations discover, govern, and optimize their software ecosystems.",
    });

    // Image generation dominates runtime. Run the three independent calls
    // concurrently so the cron stays within Vercel's execution window.
    const candidatesWithImages = await Promise.all(
      generated.candidates.map(async (candidate) => ({
        candidate: featureThisWeek && candidate.category === Category.BUILDING_LICEO
          ? { ...candidate, imagePrompt: `${featuredMarker} Use the saved featured screenshot.`, altText: WEEKLY_FEATURED_ALT }
          : candidate,
        images: featureThisWeek && candidate.category === Category.BUILDING_LICEO
          ? await featuredImageSet(brand!.featuredImageUrl!, brand!.logoUrl)
          : await generateImageSet(candidate.imagePrompt, brand?.brandColors ?? [], Math.floor(Math.random() * 10_000), brand?.logoUrl),
      }))
    );

    const created = await prisma.$transaction(candidatesWithImages.map(({ candidate: c, images }) =>
      prisma.postCandidate.create({
        data: {
          batchId: batch.id,
          category: c.category,
          contentAngle: c.contentAngle,
          hook: c.hook,
          headline: c.headline,
          linkedinCopy: c.linkedinCopy,
            facebookCopy: c.facebookCopy,
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
      })
    ));

    const similarity = await detectSimilarity(
      created.map((c) => ({ id: c.id, hook: c.hook, linkedinCopy: c.linkedinCopy, category: c.category })),
      recentCandidates
    );
    for (const result of similarity) {
      await prisma.postCandidate.update({ where: { id: result.candidateId }, data: { similarityScore: result.score } });
    }

    await prisma.contentBatch.update({ where: { id: batch.id }, data: { status: ContentStatus.PENDING_REVIEW } });

    const nextGenerationAt = computeNextGenerationAt(
      new Date(),
      settings.generationIntervalDays,
      settings.generationTimezone,
      settings.preferredLocalGenerationTime
    );
    await prisma.automationSettings.update({
      where: { id: "singleton" },
      data: { lastSuccessfulGenerationAt: new Date(), nextGenerationAt, remindersSentForCurrentBatch: 0 },
    });

    try {
      await sendApprovalEmail(batch.id);
    } catch (emailError) {
      // Keep a successfully generated batch reviewable even when an email
      // provider rejects every recipient. Reminders can retry delivery later.
      console.error("Scheduled batch generated, but approval email failed:", emailError);
    }

    await recordAudit({
      action: "BATCH_GENERATED_SCHEDULED",
      objectType: "ContentBatch",
      objectId: batch.id,
      metadata: { categories },
    });

    return NextResponse.json({ generated: true, batchId: batch.id });
  } catch (genError) {
    await prisma.contentBatch.update({
      where: { id: batch.id },
      data: { status: ContentStatus.GENERATION_FAILED, errorDetails: genError instanceof Error ? genError.message : "Unknown error" },
    });
    return NextResponse.json({ generated: false, reason: "generation_failed" }, { status: 500 });
  }
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}
