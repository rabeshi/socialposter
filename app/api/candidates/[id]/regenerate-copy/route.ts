import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, enforceRateLimit, handleApiError, ApiError } from "@/lib/api-helpers";
import { recordAudit, clientIp } from "@/lib/audit";
import { generateCandidates } from "@/lib/ai/content-generator";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    enforceRateLimit(`candidates:regen-copy:${session.user.id}`, 10, 60_000);
    const { id } = await params;

    const candidate = await prisma.postCandidate.findUnique({ where: { id }, include: { versions: true } });
    if (!candidate) throw new ApiError(404, "Candidate not found");

    const brand = await prisma.brandProfile.findFirst();
    const generated = await generateCandidates({
      categories: [candidate.category],
      recentHooks: [candidate.hook],
      companyDescription: brand?.companyDescription ?? "Liceo is an AI-powered SaaS discovery, governance, cost-optimization, and management platform.",
      productDescription: brand?.productDescription ?? "Liceo helps organizations discover, govern, and optimize their software ecosystems.",
    });
    const fresh = generated.candidates[0]!;
    const nextVersion = (candidate.versions.at(0)?.version ?? 0) + 1;

    const [updated] = await prisma.$transaction([
      prisma.postCandidate.update({
        where: { id: candidate.id },
        data: {
          contentAngle: fresh.contentAngle,
          hook: fresh.hook,
          headline: fresh.headline,
          linkedinCopy: fresh.linkedinCopy,
          xCopy: fresh.xCopy,
          hashtags: fresh.hashtags,
          qualityScore: fresh.qualityScore,
          factualityNotes: fresh.factualityNotes,
          riskNotes: fresh.riskNotes,
          reviewerConfirmed: false,
        },
      }),
      prisma.contentVersion.create({
        data: {
          candidateId: candidate.id,
          version: nextVersion,
          linkedinCopy: fresh.linkedinCopy,
          xCopy: fresh.xCopy,
          changeReason: "Regenerated copy",
          createdById: session.user.id,
        },
      }),
    ]);

    await recordAudit({
      userId: session.user.id,
      action: "CANDIDATE_COPY_REGENERATED",
      objectType: "PostCandidate",
      objectId: candidate.id,
      ipAddress: clientIp(request),
    });

    return NextResponse.json({ candidate: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
