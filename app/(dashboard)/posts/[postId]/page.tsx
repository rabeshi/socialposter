import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/posts/status-badge";
import { ManualPublishingActions } from "@/components/posts/manual-publishing-actions";

export const dynamic = "force-dynamic";

export default async function PostDetailPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const candidate = await prisma.postCandidate.findUnique({
    where: { id: postId },
    include: {
      publications: true,
      versions: { orderBy: { version: "desc" } },
      approvals: { include: { reviewer: { select: { name: true, email: true } } } },
      batch: true,
    },
  });

  if (!candidate) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{candidate.hook}</h1>
          <p className="text-muted-foreground">{candidate.category.replaceAll("_", " ")} · Batch #{candidate.batchId.slice(0, 8)}</p>
        </div>
        <StatusBadge status={candidate.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Content</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {candidate.thumbnailUrl && (
              <div className="relative aspect-[1200/627] w-full overflow-hidden rounded-md border">
                <Image src={candidate.thumbnailUrl} alt={candidate.altText ?? ""} fill className="object-cover" unoptimized />
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-muted-foreground">LinkedIn</p>
              <p className="whitespace-pre-line text-sm">{candidate.linkedinCopy}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">X</p>
              <p className="text-sm">{candidate.xCopy}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Publications</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {candidate.publications.length === 0 && <p className="text-sm text-muted-foreground">No publication attempts yet.</p>}
              {candidate.publications.map((pub) => (
                <div key={pub.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{pub.platform}</span>
                    <StatusBadge status={pub.status} />
                  </div>
                  {pub.platformUrl && (
                    <a href={pub.platformUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {pub.platformUrl}
                    </a>
                  )}
                  {pub.errorMessage && <p className="text-xs text-destructive">{pub.errorMessage}</p>}
                  {pub.status === "READY_FOR_MANUAL_PUBLISHING" && (
                    <ManualPublishingActions
                      platform={pub.platform}
                      copy={pub.platform === "LINKEDIN" ? candidate.linkedinCopy : candidate.xCopy}
                      imageUrl={(pub.platform === "LINKEDIN" ? candidate.linkedinLandscapeUrl : candidate.xImageUrl) ?? candidate.thumbnailUrl ?? ""}
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Approval History</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {candidate.approvals.length === 0 && <p className="text-muted-foreground">No approval decisions recorded.</p>}
              {candidate.approvals.map((a) => (
                <div key={a.id} className="flex items-center justify-between">
                  <span>{a.decision} by {a.reviewer.name}</span>
                  <span className="text-xs text-muted-foreground">{a.createdAt.toISOString().slice(0, 10)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Version History</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {candidate.versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between">
                  <span>v{v.version} — {v.changeReason ?? "Edit"}</span>
                  <span className="text-xs text-muted-foreground">{v.createdAt.toISOString().slice(0, 10)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
