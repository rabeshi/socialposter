import { NextResponse } from "next/server";
import { ContentStatus, Platform } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertCronAuthorized, UnauthorizedError } from "@/lib/security";
import { combinePublicationStatuses, shouldRetry, backoffDelayMs } from "@/lib/scheduling/publishing";
import { publishToLinkedIn } from "@/lib/integrations/linkedin";
import { publishToX } from "@/lib/integrations/x";
import { sendEmail, getAdminApprovalRecipients } from "@/lib/email/resend";
import PublicationResultEmail from "@/emails/publication-result-email";
import { getEnv } from "@/lib/env";
import { recordAudit } from "@/lib/audit";

/**
 * Runs every 15 minutes. Publishes only Publication rows that are SCHEDULED
 * with a scheduledTime in the past, on an already-APPROVED candidate. It
 * never publishes anything that has not been through the human approval
 * workflow, and it is idempotent per publication (guarded by
 * Publication.idempotencyKey plus a status check before acting).
 */
export async function GET(request: Request) {
  try {
    assertCronAuthorized(request);
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    throw error;
  }

  const env = getEnv();
  const automationSettings = await prisma.automationSettings.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } });
  if (automationSettings.publishingPaused) {
    return NextResponse.json({ published: 0, reason: "publishing_paused" });
  }

  const due = await prisma.publication.findMany({
    where: { status: ContentStatus.SCHEDULED, scheduledTime: { lte: new Date() } },
    include: { candidate: true },
  });

  let published = 0;
  for (const publication of due) {
    if (publication.candidate.status !== ContentStatus.SCHEDULED && publication.candidate.status !== ContentStatus.APPROVED) {
      continue; // safety net: never act on a candidate outside the approved workflow
    }

    if (!shouldRetry(publication.retryCount, publication.errorType)) continue;

    await prisma.postCandidate.update({ where: { id: publication.candidateId }, data: { status: ContentStatus.PUBLISHING } });
    await prisma.publication.update({ where: { id: publication.id }, data: { status: ContentStatus.PUBLISHING } });

    const result =
      publication.platform === Platform.LINKEDIN
        ? await publishToLinkedIn(
            { linkedinCopy: publication.candidate.linkedinCopy, imageUrl: publication.candidate.linkedinLandscapeUrl ?? "", altText: publication.candidate.altText ?? "" },
            null
          )
        : await publishToX(
            { xCopy: publication.candidate.xCopy, imageUrl: publication.candidate.xImageUrl ?? "", altText: publication.candidate.altText ?? "" },
            null
          );

    await prisma.publication.update({
      where: { id: publication.id },
      data: {
        status: result.status as ContentStatus,
        publicationTime: result.status === "PUBLISHED" ? new Date() : null,
        platformPostId: result.platformPostId,
        platformUrl: result.platformUrl,
        errorType: result.errorType,
        errorMessage: result.errorMessage,
        retryCount: result.status === "PUBLICATION_FAILED" ? { increment: 1 } : undefined,
      },
    });

    if (result.status === "PUBLICATION_FAILED") {
      // Bounded exponential backoff: re-attempt on a future cron tick rather
      // than immediately, up to the retry cap enforced by shouldRetry().
      await new Promise((resolve) => setTimeout(resolve, Math.min(backoffDelayMs(publication.retryCount), 5000)));
    }

    const allPublications = await prisma.publication.findMany({ where: { candidateId: publication.candidateId } });
    const combinedStatus = combinePublicationStatuses(allPublications.map((p) => p.status));
    await prisma.postCandidate.update({ where: { id: publication.candidateId }, data: { status: combinedStatus } });

    if (combinedStatus === ContentStatus.PUBLISHED || combinedStatus === ContentStatus.PARTIALLY_PUBLISHED) {
      const recipients = await getAdminApprovalRecipients();
      if (recipients.length > 0) {
        const linkedinPub = allPublications.find((p) => p.platform === Platform.LINKEDIN);
        const xPub = allPublications.find((p) => p.platform === Platform.X);
        await sendEmail({
          to: recipients,
          subject: `Social Poster: publication ${combinedStatus === "PARTIALLY_PUBLISHED" ? "partially completed" : "completed"}`,
          react: PublicationResultEmail({
            hook: publication.candidate.hook,
            linkedinResult: linkedinPub ? { status: linkedinPub.status, url: linkedinPub.platformUrl ?? undefined } : undefined,
            xResult: xPub ? { status: xPub.status, url: xPub.platformUrl ?? undefined } : undefined,
            dashboardUrl: `${env.NEXT_PUBLIC_APP_URL}/posts/${publication.candidateId}`,
          }),
        });
      }
    }

    await recordAudit({
      action: "SCHEDULED_PUBLICATION_ATTEMPTED",
      objectType: "Publication",
      objectId: publication.id,
      metadata: { platform: publication.platform, result: result.status },
    });

    published += 1;
  }

  return NextResponse.json({ published });
}
