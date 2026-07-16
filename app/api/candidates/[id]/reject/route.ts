import { NextResponse } from "next/server";
import { z } from "zod";
import { ApprovalDecision, ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";
import { recordAudit, clientIp } from "@/lib/audit";
import { assertLegalTransition } from "@/lib/scheduling/publishing";

const rejectSchema = z.object({ comments: z.string().optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = rejectSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const candidate = await prisma.postCandidate.findUnique({ where: { id } });
    if (!candidate) throw new ApiError(404, "Candidate not found");

    assertLegalTransition(candidate.status, ContentStatus.REJECTED);

    const [updated] = await prisma.$transaction([
      prisma.postCandidate.update({ where: { id: candidate.id }, data: { status: ContentStatus.REJECTED } }),
      prisma.approval.create({
        data: {
          candidateId: candidate.id,
          reviewerId: session.user.id,
          decision: ApprovalDecision.REJECTED,
          comments: parsed.data.comments,
        },
      }),
    ]);

    await recordAudit({
      userId: session.user.id,
      action: "CANDIDATE_REJECTED",
      objectType: "PostCandidate",
      objectId: candidate.id,
      ipAddress: clientIp(request),
    });

    return NextResponse.json({ candidate: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
