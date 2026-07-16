import { NextResponse } from "next/server";
import { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyReviewLink } from "@/lib/security";
import { recordAudit } from "@/lib/audit";

/**
 * One-click "Reject All" from the approval email. Authenticated by a
 * signed, time-limited review token rather than a login session, since it
 * is invoked directly from an email link. The token only ever encodes a
 * batchId — no secrets, credentials, or database internals are exposed in
 * the URL.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const payload = token ? verifyReviewLink(token) : null;

  if (!payload || payload.batchId !== id) {
    return NextResponse.json({ error: "This review link is invalid or has expired." }, { status: 401 });
  }

  const batch = await prisma.contentBatch.findUnique({ where: { id } });
  if (!batch) return NextResponse.json({ error: "Batch not found." }, { status: 404 });

  await prisma.postCandidate.updateMany({
    where: { batchId: batch.id, status: { in: [ContentStatus.PENDING_REVIEW, ContentStatus.CANDIDATE_SELECTED] } },
    data: { status: ContentStatus.REJECTED },
  });
  await prisma.contentBatch.update({ where: { id: batch.id }, data: { status: ContentStatus.CANCELLED } });

  await recordAudit({ action: "BATCH_REJECTED_ALL_VIA_EMAIL", objectType: "ContentBatch", objectId: batch.id });

  const env = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return NextResponse.redirect(new URL(`/review/${batch.id}?rejected=1`, env));
}
