import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReviewBatchClient } from "@/components/review/review-batch-client";
import { StatusBadge } from "@/components/posts/status-badge";

export const dynamic = "force-dynamic";

export default async function ReviewBatchPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const batch = await prisma.contentBatch.findUnique({
    where: { id: batchId },
    include: { candidates: true },
  });

  if (!batch) notFound();

  const serialized = {
    id: batch.id,
    status: batch.status,
    candidates: batch.candidates.map((c) => ({
      id: c.id,
      category: c.category,
      contentAngle: c.contentAngle,
      hook: c.hook,
      headline: c.headline,
      linkedinCopy: c.linkedinCopy,
      xCopy: c.xCopy,
      hashtags: c.hashtags,
      altText: c.altText,
      thumbnailUrl: c.thumbnailUrl,
      status: c.status,
      qualityScore: c.qualityScore,
      similarityScore: c.similarityScore,
      factualityNotes: c.factualityNotes,
      riskNotes: c.riskNotes,
      suggestedPublicationDate: c.suggestedPublicationDate?.toISOString() ?? null,
      suggestedPublicationTime: c.suggestedPublicationTime,
    })),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Batch #{batch.id.slice(0, 8)}</h1>
          <p className="text-muted-foreground">Generated {batch.generationDate.toISOString().slice(0, 10)}</p>
        </div>
        <StatusBadge status={batch.status} />
      </div>
      <ReviewBatchClient batch={serialized} />
    </div>
  );
}
