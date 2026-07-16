import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";
import { recordAudit, clientIp } from "@/lib/audit";
import { validateLinkedInCopy, validateXCopy } from "@/lib/ai/schemas";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const candidate = await prisma.postCandidate.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: "desc" } }, publications: true, approvals: true, batch: true },
    });
    if (!candidate) throw new ApiError(404, "Candidate not found");
    return NextResponse.json({ candidate });
  } catch (error) {
    return handleApiError(error);
  }
}

const editSchema = z.object({
  linkedinCopy: z.string().min(1).optional(),
  xCopy: z.string().min(1).max(280).optional(),
  headline: z.string().max(80).nullable().optional(),
  hashtags: z.array(z.string()).optional(),
  imagePrompt: z.string().optional(),
  altText: z.string().optional(),
  suggestedPublicationDate: z.string().datetime().nullable().optional(),
  suggestedPublicationTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  changeReason: z.string().optional(),
});

/** Edits the LinkedIn/X copy (independently), image prompt, or schedule of a candidate, recording a new ContentVersion. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await request.json();
    const parsed = editSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const candidate = await prisma.postCandidate.findUnique({ where: { id }, include: { versions: true } });
    if (!candidate) throw new ApiError(404, "Candidate not found");

    const warnings: string[] = [];
    const nextLinkedin = parsed.data.linkedinCopy ?? candidate.linkedinCopy;
    const nextX = parsed.data.xCopy ?? candidate.xCopy;
    if (parsed.data.linkedinCopy) warnings.push(...validateLinkedInCopy(nextLinkedin).issues);
    if (parsed.data.xCopy) warnings.push(...validateXCopy(nextX).issues);

    const nextVersion = (candidate.versions.at(0)?.version ?? 0) + 1;

    const [updated] = await prisma.$transaction([
      prisma.postCandidate.update({
        where: { id: candidate.id },
        data: {
          linkedinCopy: nextLinkedin,
          xCopy: nextX,
          headline: parsed.data.headline ?? candidate.headline,
          hashtags: parsed.data.hashtags ?? candidate.hashtags,
          imagePrompt: parsed.data.imagePrompt ?? candidate.imagePrompt,
          altText: parsed.data.altText ?? candidate.altText,
          suggestedPublicationDate: parsed.data.suggestedPublicationDate
            ? new Date(parsed.data.suggestedPublicationDate)
            : candidate.suggestedPublicationDate,
          suggestedPublicationTime: parsed.data.suggestedPublicationTime ?? candidate.suggestedPublicationTime,
          reviewerConfirmed: false,
        },
      }),
      prisma.contentVersion.create({
        data: {
          candidateId: candidate.id,
          version: nextVersion,
          linkedinCopy: nextLinkedin,
          xCopy: nextX,
          imagePrompt: parsed.data.imagePrompt ?? candidate.imagePrompt,
          changeReason: parsed.data.changeReason ?? "Manual edit",
          createdById: session.user.id,
        },
      }),
    ]);

    await recordAudit({
      userId: session.user.id,
      action: "CANDIDATE_EDITED",
      objectType: "PostCandidate",
      objectId: candidate.id,
      metadata: { version: nextVersion },
      ipAddress: clientIp(request),
    });

    return NextResponse.json({ candidate: updated, warnings });
  } catch (error) {
    return handleApiError(error);
  }
}
