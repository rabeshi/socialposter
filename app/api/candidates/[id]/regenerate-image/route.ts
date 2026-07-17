import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, enforceRateLimit, handleApiError, ApiError } from "@/lib/api-helpers";
import { recordAudit, clientIp } from "@/lib/audit";
import { generateImageSet } from "@/lib/ai/image-generator";

const bodySchema = z.object({
  imagePrompt: z.string().optional(),
  style: z.enum(["more_realistic", "simplify", "remove_people", "default"]).optional(),
});

const STYLE_SUFFIX: Record<string, string> = {
  more_realistic: " Emphasize photorealistic lighting and materials.",
  simplify: " Simplify the composition; reduce the number of visual elements.",
  remove_people: " Do not include any people in the scene.",
  default: "",
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    enforceRateLimit(`candidates:regen-image:${session.user.id}`, 10, 60_000);
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const candidate = await prisma.postCandidate.findUnique({ where: { id } });
    if (!candidate) throw new ApiError(404, "Candidate not found");

    const brand = await prisma.brandProfile.findFirst();
    const prompt = (parsed.data.imagePrompt ?? candidate.imagePrompt) + (STYLE_SUFFIX[parsed.data.style ?? "default"] ?? "");
    const images = await generateImageSet(prompt, brand?.brandColors ?? [], Math.floor(Math.random() * 10_000));

    const updated = await prisma.postCandidate.update({
      where: { id: candidate.id },
      data: {
        imagePrompt: prompt,
        originalImageUrl: images.originalUrl,
        linkedinLandscapeUrl: images.linkedinLandscapeUrl,
        linkedinSquareUrl: images.linkedinSquareUrl,
        xImageUrl: images.xImageUrl,
        thumbnailUrl: images.thumbnailUrl,
        reviewerConfirmed: false,
      },
    });

    await recordAudit({
      userId: session.user.id,
      action: "CANDIDATE_IMAGE_REGENERATED",
      objectType: "PostCandidate",
      objectId: candidate.id,
      metadata: { style: parsed.data.style },
      ipAddress: clientIp(request),
    });

    return NextResponse.json({ candidate: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
