import Link from "next/link";
import { ContentStatus, Platform } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatInTimezone } from "@/lib/scheduling/generation";
import { isLinkedInConfigured } from "@/lib/integrations/linkedin";
import { isXConfigured } from "@/lib/integrations/x";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/posts/status-badge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [automation, pendingBatches, approvedCount, scheduledCount, recentPublished, failedPublications, categoryUsage, candidates, accountSnapshots, metricSnapshots] =
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
        include: { candidate: { select: { hook: true, category: true } } },
      }),
      prisma.publication.findMany({
        where: { status: ContentStatus.PUBLICATION_FAILED },
        include: { candidate: { select: { hook: true } } },
      }),
      prisma.contentBatch.findMany({ select: { categories: true }, take: 200 }),
      prisma.postCandidate.findMany({ select: { status: true, qualityScore: true } }),
      prisma.socialAccountSnapshot.findMany({ orderBy: { capturedAt: "desc" }, take: 20 }),
      prisma.socialPostMetricSnapshot.findMany({
        orderBy: { capturedAt: "desc" },
        take: 500,
        include: { publication: { select: { id: true, platform: true } } },
      }),
    ]);

  const categoryCounts = new Map<string, number>();
  for (const row of categoryUsage) {
    for (const cat of row.categories) {
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
    }
  }
  const topCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const scored = candidates.filter((candidate) => candidate.qualityScore !== null);
  const averageQuality = scored.length ? Math.round(scored.reduce((sum, candidate) => sum + (candidate.qualityScore ?? 0), 0) / scored.length * 100) : null;
  const reviewed = candidates.filter((candidate) => candidate.status !== ContentStatus.GENERATING && candidate.status !== ContentStatus.PENDING_REVIEW).length;
  const reviewRate = candidates.length ? reviewed / candidates.length * 100 : null;
  const publicationAttempts = recentPublished.length + failedPublications.length;
  const successRate = publicationAttempts ? recentPublished.length / publicationAttempts * 100 : null;
  const latestAccounts = new Map<Platform, (typeof accountSnapshots)[number]>();
  for (const snapshot of accountSnapshots) if (!latestAccounts.has(snapshot.platform)) latestAccounts.set(snapshot.platform, snapshot);
  const latestMetrics = new Map<string, (typeof metricSnapshots)[number]>();
  for (const snapshot of metricSnapshots) if (!latestMetrics.has(snapshot.publication.id)) latestMetrics.set(snapshot.publication.id, snapshot);
  const platformTotals = (platform: Platform) => [...latestMetrics.values()].filter((metric) => metric.publication.platform === platform).reduce((sum, metric) => {
    sum.impressions += metric.impressions ?? 0;
    sum.engagements += (metric.likes ?? 0) + (metric.comments ?? 0) + (metric.reposts ?? 0) + (metric.saves ?? 0) + (metric.clicks ?? 0);
    sum.clicks += metric.clicks ?? 0;
    return sum;
  }, { impressions: 0, engagements: 0, clicks: 0 });
  const linkedin = platformTotals(Platform.LINKEDIN);
  const x = platformTotals(Platform.X);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of content generation, review, and publishing.</p>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div><h2 className="text-xl font-semibold">Performance snapshot</h2><p className="text-sm text-muted-foreground">Content quality, workflow health, and social performance at a glance.</p></div>
        <Link href="/analytics" className="text-sm font-semibold text-primary hover:underline">View full analytics →</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <AnalyticsMetric title="Content created" value={candidates.length} detail="All current posts" />
        <AnalyticsMetric title="Average quality" value={averageQuality === null ? "—" : `${averageQuality}%`} detail="AI quality assessment" />
        <AnalyticsMetric title="Review completion" value={reviewRate === null ? "—" : `${reviewRate.toFixed(0)}%`} detail={`${reviewed} of ${candidates.length} reviewed`} />
        <AnalyticsMetric title="Publish success" value={successRate === null ? "—" : `${successRate.toFixed(0)}%`} detail={`${failedPublications.length} recent failures`} />
        <AnalyticsMetric title="Top category" value={topCategory ? titleCase(topCategory[0]) : "—"} detail={topCategory ? `${topCategory[1]} batches` : "Awaiting content"} compact />
        <AnalyticsMetric title="Pending decisions" value={pendingBatches.reduce((sum, batch) => sum + batch.candidates.length, 0)} detail="Candidates awaiting review" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PlatformAnalyticsCard platform="LinkedIn" totals={linkedin} followers={latestAccounts.get(Platform.LINKEDIN)?.followers} connected={isLinkedInConfigured()} />
        <PlatformAnalyticsCard platform="X" totals={x} followers={latestAccounts.get(Platform.X)?.followers} connected={isXConfigured()} />
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
            {recentPublished.slice(0, 5).map((pub) => (
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
            {failedPublications.slice(0, 5).map((pub) => (
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

function AnalyticsMetric({ title, value, detail, compact = false }: { title: string; value: string | number; detail: string; compact?: boolean }) {
  return <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{title}</p><p className={compact ? "mt-1 truncate text-base font-bold" : "mt-1 text-2xl font-bold"}>{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>;
}

function PlatformAnalyticsCard({ platform, totals, followers, connected }: { platform: string; totals: { impressions: number; engagements: number; clicks: number }; followers?: number | null; connected: boolean }) {
  const rate = totals.impressions ? totals.engagements / totals.impressions * 100 : null;
  return <Card><CardHeader><div className="flex items-center justify-between"><CardTitle>{platform} snapshot</CardTitle><Badge variant={connected ? "success" : "warning"}>{connected ? "Configured" : "Awaiting connection"}</Badge></div></CardHeader><CardContent><div className="grid grid-cols-4 gap-3 text-sm"><DashboardStat label="Followers" value={followers} /><DashboardStat label="Impressions" value={totals.impressions} /><DashboardStat label="Engagement" value={rate === null ? null : `${rate.toFixed(2)}%`} /><DashboardStat label="Clicks" value={totals.clicks} /></div><Link href={`/analytics?platform=${platform === "X" ? "X" : "LINKEDIN"}`} className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">Open {platform} analysis →</Link></CardContent></Card>;
}

function DashboardStat({ label, value }: { label: string; value: string | number | null | undefined }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value === null || value === undefined || value === 0 ? "—" : typeof value === "number" ? value.toLocaleString() : value}</p></div>; }
function titleCase(value: string) { return value.toLowerCase().split("_").map((word) => word === "saas" ? "SaaS" : word === "ai" ? "AI" : word.charAt(0).toUpperCase() + word.slice(1)).join(" "); }
