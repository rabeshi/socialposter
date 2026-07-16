import { NextResponse } from "next/server";
import { z } from "zod";
import { ApprovalDecision, ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";
import { recordAudit, clientIp } from "@/lib/audit";
import { assertLegalTransition } from "@/lib/scheduling/publishing";

const approveSchema = z.object({
  reviewerConfirmed: z.literal(true, {
    errorMap: () => ({ message: "Reviewer must confirm they have checked the content before approving." }),
  }),
  comments: z.string().optional(),
});

/**
 * Final approval. Requires the explicit "I have checked this content"
 * checkbox. This is the last step before a candidate becomes eligible for
 * Publish Now / Schedule / Ready for Manual Publishing — it still does not
 * publish anything.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await request.json();
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const candidate = await prisma.postCandidate.findUnique({ where: { id } });
    if (!candidate) throw new ApiError(404, "Candidate not found");

    assertLegalTransition(candidate.status, ContentStatus.APPROVED);

    const [updated] = await prisma.$transaction([
      prisma.postCandidate.update({
        where: { id: candidate.id },
        data: { status: ContentStatus.APPROVED, reviewerConfirmed: true },
      }),
      prisma.approval.create({
        data: {
          candidateId: candidate.id,
          reviewerId: session.user.id,
          decision: ApprovalDecision.APPROVED,
          comments: parsed.data.comments,
        },
      }),
    ]);

    await recordAudit({
      userId: session.user.id,
      action: "CANDIDATE_APPROVED",
      objectType: "PostCandidate",
      objectId: candidate.id,
      ipAddress: clientIp(request),
    });

    return NextResponse.json({ candidate: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
