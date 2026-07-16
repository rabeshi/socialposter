import { NextResponse } from "next/server";
import { z } from "zod";
import { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";
import { recordAudit, clientIp } from "@/lib/audit";
import { assertReadyToPublish } from "@/lib/scheduling/publishing";

const scheduleSchema = z.object({ scheduledTime: z.string().datetime() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await request.json();
    const parsed = scheduleSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const scheduledTime = new Date(parsed.data.scheduledTime);
    if (scheduledTime.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Scheduled time must be in the future." }, { status: 400 });
    }

    const publication = await prisma.publication.findUnique({ where: { id }, include: { candidate: true } });
    if (!publication) throw new ApiError(404, "Publication not found");
    assertReadyToPublish(publication.candidate.status);

    const [updatedPublication] = await prisma.$transaction([
      prisma.publication.update({ where: { id: publication.id }, data: { status: ContentStatus.SCHEDULED, scheduledTime } }),
      prisma.postCandidate.update({ where: { id: publication.candidateId }, data: { status: ContentStatus.SCHEDULED } }),
    ]);

    await recordAudit({
      userId: session.user.id,
      action: "PUBLICATION_SCHEDULED",
      objectType: "Publication",
      objectId: publication.id,
      metadata: { scheduledTime },
      ipAddress: clientIp(request),
    });

    return NextResponse.json({ publication: updatedPublication });
  } catch (error) {
    return handleApiError(error);
  }
}
