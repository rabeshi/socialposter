import Link from "next/link";
import { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/posts/status-badge";

export const dynamic = "force-dynamic";

export default async function ReviewListPage() {
  const batches = await prisma.contentBatch.findMany({
    where: { status: { in: [ContentStatus.PENDING_REVIEW, ContentStatus.CANDIDATE_SELECTED, ContentStatus.REVISION_REQUESTED] } },
    orderBy: { createdAt: "desc" },
    include: { candidates: { select: { id: true, category: true, hook: true, status: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Review</h1>
        <p className="text-muted-foreground">Batches requiring action.</p>
      </div>

      {batches.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No batches are awaiting review right now.
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {batches.map((batch) => (
          <Link key={batch.id} href={`/review/${batch.id}`} className="block">
            <Card className="transition-colors hover:border-primary">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Batch #{batch.id.slice(0, 8)}</CardTitle>
                <StatusBadge status={batch.status} />
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                {batch.candidates.map((c) => (
                  <span key={c.id} className="rounded-full bg-muted px-2 py-1">
                    {c.category.replaceAll("_", " ")}
                  </span>
                ))}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
