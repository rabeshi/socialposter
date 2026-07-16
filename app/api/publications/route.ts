import { NextResponse } from "next/server";
import { z } from "zod";
import { ContentStatus, Platform } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";
import { recordAudit, clientIp } from "@/lib/audit";
import { assertReadyToPublish, buildPublicationIdempotencyKey } from "@/lib/scheduling/publishing";

export async function GET() {
  try {
    await requireSession();
    const publications = await prisma.publication.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { candidate: { select: { id: true, hook: true, category: true, headline: true } } },
    });
    return NextResponse.json({ publications });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  candidateId: z.string(),
  platforms: z.array(z.nativeEnum(Platform)).min(1),
});

/**
 * Creates (or reuses, idempotently) Publication rows for an approved
 * candidate. This does not publish anything — it only prepares the record
 * that /publish or /schedule will act on next, keeping "approve" and
 * "publish" as separate steps.
 */
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const candidate = await prisma.postCandidate.findUnique({ where: { id: parsed.data.candidateId } });
    if (!candidate) throw new ApiError(404, "Candidate not found");
    assertReadyToPublish(candidate.status);

    const publications = [];
    for (const platform of parsed.data.platforms) {
      const idempotencyKey = buildPublicationIdempotencyKey(candidate.id, platform);
      const publication = await prisma.publication.upsert({
        where: { idempotencyKey },
        update: {},
        create: {
          candidateId: candidate.id,
          platform,
          status: ContentStatus.APPROVED,
          idempotencyKey,
        },
      });
      publications.push(publication);
    }

    await recordAudit({
      userId: session.user.id,
      action: "PUBLICATIONS_PREPARED",
      objectType: "PostCandidate",
      objectId: candidate.id,
      metadata: { platforms: parsed.data.platforms },
      ipAddress: clientIp(request),
    });

    return NextResponse.json({ publications }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
