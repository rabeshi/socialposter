import { NextResponse } from "next/server";
import { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";
import { recordAudit, clientIp } from "@/lib/audit";
import { assertLegalTransition } from "@/lib/scheduling/publishing";

/**
 * Selecting a candidate is a distinct, reversible-in-intent step: it marks
 * the other candidates in the batch NOT_SELECTED and opens this one for
 * editing. It never approves or publishes anything by itself.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const candidate = await prisma.postCandidate.findUnique({ where: { id } });
    if (!candidate) throw new ApiError(404, "Candidate not found");

    assertLegalTransition(candidate.status, ContentStatus.CANDIDATE_SELECTED);

    const [updated] = await prisma.$transaction([
      prisma.postCandidate.update({ where: { id: candidate.id }, data: { status: ContentStatus.CANDIDATE_SELECTED } }),
      prisma.postCandidate.updateMany({
        where: { batchId: candidate.batchId, id: { not: candidate.id }, status: ContentStatus.PENDING_REVIEW },
        data: { status: ContentStatus.NOT_SELECTED },
      }),
      prisma.contentBatch.update({ where: { id: candidate.batchId }, data: { status: ContentStatus.CANDIDATE_SELECTED } }),
    ]);

    await recordAudit({
      userId: session.user.id,
      action: "CANDIDATE_SELECTED",
      objectType: "PostCandidate",
      objectId: candidate.id,
      ipAddress: clientIp(request),
    });

    return NextResponse.json({ candidate: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
