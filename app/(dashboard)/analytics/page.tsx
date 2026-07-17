import Link from "next/link";
import { Category, ContentStatus, Platform } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/posts/status-badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PUBLISHED: ContentStatus[] = [ContentStatus.PUBLISHED, ContentStatus.PARTIALLY_PUBLISHED];
const SCHEDULED: ContentStatus[] = [ContentStatus.SCHEDULED, ContentStatus.APPROVED];

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ platform?: string }> }) {
  const { platform: requested } = await searchParams;
  const platform = requested === Platform.X ? Platform.X : Platform.LINKEDIN;

  const [publications, candidates, connection] = await Promise.all([
    prisma.publication.findMany({
      where: { platform },
      orderBy: { createdAt: "desc" },
      include: { candidate: { select: { id: true, hook: true, category: true, qualityScore: true } } },
    }),
    prisma.postCandidate.findMany({
      select: { id: true, category: true, qualityScore: true, status: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.platformConnection.findUnique({ where: { platform } }),
  ]);

  const published = publications.filter((item) => PUBLISHED.includes(item.status));
  const scheduled = publications.filter((item) => SCHEDULED.includes(item.status));
  const failed = publications.filter((item) => item.status === ContentStatus.PUBLICATION_FAILED);
  const scored = candidates.filter((item) => item.qualityScore !== null);
  const averageQuality = scored.length ? Math.round((scored.reduce((sum, item) => sum + (item.qualityScore ?? 0), 0) / scored.length) * 100) : null;
  const categoryCounts = candidates.reduce((counts, item) => counts.set(item.category, (counts.get(item.category) ?? 0) + 1), new Map<Category, number>());
  const topCategories = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const connected = Boolean(connection?.connectedAt && !connection.revokedAt);

  return <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold">Social Analytics</h1>
      <p className="text-muted-foreground">Analyze content readiness and publishing performance by platform.</p>
    </div>

    <div className="inline-flex rounded-lg border bg-muted/40 p-1">
      <PlatformTab href="/analytics?platform=LINKEDIN" active={platform === Platform.LINKEDIN}>LinkedIn Analysis</PlatformTab>
      <PlatformTab href="/analytics?platform=X" active={platform === Platform.X}>X Analysis</PlatformTab>
    </div>

    <div className="flex items-center justify-between rounded-lg border bg-card p-4">
      <div><p className="font-semibold">{platform === Platform.LINKEDIN ? "LinkedIn" : "X"} connection</p><p className="text-sm text-muted-foreground">Publishing and external engagement data availability</p></div>
      <Badge variant={connected ? "success" : "warning"}>{connected ? "Connected" : "Not connected"}</Badge>
    </div>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Metric title="Posts generated" value={candidates.length} detail={`Copy prepared for ${platform === Platform.LINKEDIN ? "LinkedIn" : "X"}`} />
      <Metric title="Scheduled / approved" value={scheduled.length} detail="In the publication pipeline" />
      <Metric title="Published" value={published.length} detail="Recorded successful publications" />
      <Metric title="Average quality" value={averageQuality === null ? "—" : `${averageQuality}%`} detail={`${failed.length} failed publication${failed.length === 1 ? "" : "s"}`} />
    </div>

    {!connected && <Card className="border-amber-200 bg-amber-50/60"><CardContent className="pt-6">
      <p className="font-semibold text-amber-950">External engagement analytics are not available yet</p>
      <p className="mt-1 text-sm text-amber-900/80">Connect and authorize {platform === Platform.LINKEDIN ? "LinkedIn" : "X"} before the app can retrieve impressions, reactions, comments, reposts, or clicks. Content and publication analytics below remain available.</p>
      <Link href="/integrations" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">Open integrations →</Link>
    </CardContent></Card>}

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Top content categories</CardTitle></CardHeader><CardContent className="space-y-3">
        {topCategories.length === 0 && <p className="text-sm text-muted-foreground">No content generated yet.</p>}
        {topCategories.map(([category, count]) => <div key={category} className="space-y-1"><div className="flex justify-between text-sm"><span>{label(category)}</span><span className="text-muted-foreground">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, (count / topCategories[0]![1]) * 100)}%` }} /></div></div>)}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Recent publication activity</CardTitle></CardHeader><CardContent className="space-y-3">
        {publications.length === 0 && <p className="text-sm text-muted-foreground">No {platform === Platform.LINKEDIN ? "LinkedIn" : "X"} publication activity yet.</p>}
        {publications.slice(0, 8).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0"><div className="min-w-0"><Link href={`/posts/${item.candidate.id}`} className="block truncate text-sm font-medium hover:underline">{item.candidate.hook}</Link><p className="text-xs text-muted-foreground">{label(item.candidate.category)} · {item.createdAt.toISOString().slice(0, 10)}</p></div><StatusBadge status={item.status} /></div>)}
      </CardContent></Card>
    </div>
  </div>;
}

function PlatformTab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link href={href} className={cn("rounded-md px-4 py-2 text-sm font-medium transition-colors", active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{children}</Link>;
}
function Metric({ title, value, detail }: { title: string; value: string | number; detail: string }) {
  return <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{title}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>;
}
function label(value: string) { return value.toLowerCase().split("_").map((word) => word === "saas" ? "SaaS" : word === "ai" ? "AI" : word.charAt(0).toUpperCase() + word.slice(1)).join(" "); }
