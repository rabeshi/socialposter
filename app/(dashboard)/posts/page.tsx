import Link from "next/link";
import { Category, ContentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/posts/status-badge";
import { PostsFilterBar } from "@/components/posts/posts-filter-bar";
import { DeletePostButton } from "@/components/posts/delete-post-button";

export const dynamic = "force-dynamic";

interface SearchParams {
  status?: string;
  category?: string;
  keyword?: string;
  from?: string;
  to?: string;
}

export default async function PostsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const where: Prisma.PostCandidateWhereInput = {};

  if (params.status && Object.values(ContentStatus).includes(params.status as ContentStatus)) {
    where.status = params.status as ContentStatus;
  }
  if (params.category && Object.values(Category).includes(params.category as Category)) {
    where.category = params.category as Category;
  }
  if (params.keyword) {
    where.OR = [
      { hook: { contains: params.keyword, mode: "insensitive" } },
      { linkedinCopy: { contains: params.keyword, mode: "insensitive" } },
    ];
  }
  if (params.from || params.to) {
    where.createdAt = {
      ...(params.from ? { gte: new Date(params.from) } : {}),
      ...(params.to ? { lte: new Date(params.to) } : {}),
    };
  }

  const candidates = await prisma.postCandidate.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { publications: true, approvals: { include: { reviewer: { select: { name: true } } } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Post History</h1>
        <p className="text-muted-foreground">Filter by date, status, platform, category, keyword, reviewer, or result.</p>
      </div>

      <PostsFilterBar initial={params} />

      <div className="space-y-3">
        {candidates.length === 0 && (
          <Card><CardContent className="pt-6 text-sm text-muted-foreground">No posts match these filters.</CardContent></Card>
        )}
        {candidates.map((c) => (
          <Card key={c.id} className="transition-colors hover:border-primary">
            <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Link href={`/posts/${c.id}`} className="min-w-0 flex-1">
                <div>
                  <p className="font-medium">{c.hook}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.category.replaceAll("_", " ")} · {c.createdAt.toISOString().slice(0, 10)}
                    {c.approvals[0]?.reviewer?.name ? ` · reviewed by ${c.approvals[0].reviewer.name}` : ""}
                  </p>
                </div>
              </Link>
                <div className="flex items-center gap-2">
                  {c.publications.map((p) => (
                    <StatusBadge key={p.id} status={`${p.platform}: ${p.status}`.length > 24 ? p.status : `${p.platform} ${p.status}`} />
                  ))}
                  <StatusBadge status={c.status} />
                  <DeletePostButton postId={c.id} hook={c.hook} />
                </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
