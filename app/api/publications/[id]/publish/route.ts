import { NextResponse } from "next/server";
import { ContentStatus, Platform } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, enforceRateLimit, handleApiError, ApiError } from "@/lib/api-helpers";
import { recordAudit, clientIp } from "@/lib/audit";
import { assertReadyToPublish, combinePublicationStatuses } from "@/lib/scheduling/publishing";
import { publishToLinkedIn } from "@/lib/integrations/linkedin";
import { publishToX } from "@/lib/integrations/x";

/**
 * Publish Now. Requires the candidate to be APPROVED or SCHEDULED — this is
 * the only path from those states into PUBLISHING/PUBLISHED, and it is a
 * distinct user action from selection or approval.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    enforceRateLimit(`publications:publish:${session.user.id}`, 10, 60_000);
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const manualOnly = body?.manualOnly === true;

    const publication = await prisma.publication.findUnique({ where: { id }, include: { candidate: true } });
    if (!publication) throw new ApiError(404, "Publication not found");

    const candidate = publication.candidate;
    assertReadyToPublish(candidate.status);

    await prisma.postCandidate.update({ where: { id: candidate.id }, data: { status: ContentStatus.PUBLISHING } });
    await prisma.publication.update({ where: { id: publication.id }, data: { status: ContentStatus.PUBLISHING } });

    // "Save as Ready for Manual Publishing" — the reviewer explicitly opts
    // out of automatic publishing without attempting the platform API call.
    const result = manualOnly
      ? { status: "READY_FOR_MANUAL_PUBLISHING" as const, errorType: "MANUAL_OPT_IN" }
      : publication.platform === Platform.LINKEDIN
        ? await publishToLinkedIn(
            { linkedinCopy: candidate.linkedinCopy, imageUrl: candidate.linkedinLandscapeUrl ?? "", altText: candidate.altText ?? "" },
            null
          )
        : await publishToX(
            { xCopy: candidate.xCopy, imageUrl: candidate.xImageUrl ?? "", altText: candidate.altText ?? "" },
            null
          );

    const updatedPublication = await prisma.publication.update({
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

    const allPublications = await prisma.publication.findMany({ where: { candidateId: candidate.id } });
    const combinedStatus = combinePublicationStatuses(allPublications.map((p) => p.status));
    const updatedCandidate = await prisma.postCandidate.update({ where: { id: candidate.id }, data: { status: combinedStatus } });

    await recordAudit({
      userId: session.user.id,
      action: "PUBLICATION_ATTEMPTED",
      objectType: "Publication",
      objectId: publication.id,
      metadata: { platform: publication.platform, result: result.status },
      ipAddress: clientIp(request),
    });

    return NextResponse.json({ publication: updatedPublication, candidate: updatedCandidate });
  } catch (error) {
    return handleApiError(error);
  }
}
