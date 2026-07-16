import Link from "next/link";
import { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatInTimezone } from "@/lib/scheduling/generation";
import { isLinkedInConfigured } from "@/lib/integrations/linkedin";
import { isXConfigured } from "@/lib/integrations/x";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/posts/status-badge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [automation, pendingBatches, approvedCount, scheduledCount, recentPublished, failedPublications, categoryUsage] =
    await Promise.all([
      prisma.automationSettings.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } }),
      prisma.contentBatch.findMany({
        where: { status: ContentStatus.PENDING_REVIEW },
        orderBy: { createdAt: "desc" },
        include: { candidates: { select: { id: true } } },
      }),
      prisma.postCandidate.count({ where: { status: ContentStatus.APPROVED } }),
      prisma.postCandidate.count({ where: { status: ContentStatus.SCHEDULED } }),
      prisma.publication.findMany({
        where: { status: { in: [ContentStatus.PUBLISHED, ContentStatus.PARTIALLY_PUBLISHED] } },
        orderBy: { publicationTime: "desc" },
        take: 5,
        include: { candidate: { select: { hook: true, category: true } } },
      }),
      prisma.publication.findMany({
        where: { status: ContentStatus.PUBLICATION_FAILED },
        take: 5,
        include: { candidate: { select: { hook: true } } },
      }),
      prisma.contentBatch.findMany({ select: { categories: true }, take: 200 }),
    ]);

  const categoryCounts = new Map<string, number>();
  for (const row of categoryUsage) {
    for (const cat of row.categories) {
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of content generation, review, and publishing.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Next Generation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {automation.nextGenerationAt ? formatInTimezone(automation.nextGenerationAt, automation.generationTimezone) : "Not scheduled"}
            </p>
            <Badge variant={automation.automationEnabled ? "success" : "outline"} className="mt-2">
              Automation {automation.automationEnabled ? "enabled" : "disabled"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Last Successful Generation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {automation.lastSuccessfulGenerationAt ? formatInTimezone(automation.lastSuccessfulGenerationAt, automation.generationTimezone) : "Never"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pendingBatches.length}</p>
            <Link href="/review" className="text-sm text-primary hover:underline">Go to review →</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Approved / Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{approvedCount} / {scheduledCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recently Published</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPublished.length === 0 && <p className="text-sm text-muted-foreground">Nothing published yet.</p>}
            {recentPublished.map((pub) => (
              <div key={pub.id} className="flex items-center justify-between text-sm">
                <span className="truncate pr-2">{pub.candidate.hook}</span>
                <StatusBadge status={pub.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Failed Publications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {failedPublications.length === 0 && <p className="text-sm text-muted-foreground">No failures.</p>}
            {failedPublications.map((pub) => (
              <div key={pub.id} className="flex items-center justify-between text-sm">
                <span className="truncate pr-2">{pub.candidate.hook}</span>
                <Badge variant="destructive">{pub.errorType ?? "FAILED"}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform Connection Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>LinkedIn</span>
              <Badge variant={isLinkedInConfigured() ? "success" : "warning"}>
                {isLinkedInConfigured() ? "Configured" : "Not connected"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>X</span>
              <Badge variant={isXConfigured() ? "success" : "warning"}>{isXConfigured() ? "Configured" : "Not connected"}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {[...categoryCounts.entries()].length === 0 && <p className="text-muted-foreground">No batches yet.</p>}
            {[...categoryCounts.entries()].map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <span>{category.replaceAll("_", " ")}</span>
                <span className="text-muted-foreground">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
