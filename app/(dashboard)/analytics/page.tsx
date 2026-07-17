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

  const [publications, candidates, connection, accountSnapshots, conversions] = await Promise.all([
    prisma.publication.findMany({
      where: { platform },
      orderBy: { createdAt: "desc" },
      include: {
        candidate: { select: { id: true, hook: true, category: true, qualityScore: true, hashtags: true, linkedinCopy: true, xCopy: true } },
        metricSnapshots: { orderBy: { capturedAt: "desc" }, take: 1 },
      },
    }),
    prisma.postCandidate.findMany({
      select: { id: true, category: true, qualityScore: true, status: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.platformConnection.findUnique({ where: { platform } }),
    prisma.socialAccountSnapshot.findMany({ where: { platform }, orderBy: { capturedAt: "desc" }, take: 30 }),
    prisma.websiteConversionEvent.findMany({ where: { platform }, orderBy: { occurredAt: "desc" }, take: 500 }),
  ]);

  const published = publications.filter((item) => PUBLISHED.includes(item.status));
  const scheduled = publications.filter((item) => SCHEDULED.includes(item.status));
  const failed = publications.filter((item) => item.status === ContentStatus.PUBLICATION_FAILED);
  const scored = candidates.filter((item) => item.qualityScore !== null);
  const averageQuality = scored.length ? Math.round((scored.reduce((sum, item) => sum + (item.qualityScore ?? 0), 0) / scored.length) * 100) : null;
  const categoryCounts = candidates.reduce((counts, item) => counts.set(item.category, (counts.get(item.category) ?? 0) + 1), new Map<Category, number>());
  const topCategories = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const connected = Boolean(connection?.connectedAt && !connection.revokedAt);
  const account = accountSnapshots[0];
  const totals = publications.reduce((sum, item) => {
    const metric = item.metricSnapshots[0];
    sum.impressions += metric?.impressions ?? 0; sum.reach += metric?.reach ?? 0;
    sum.engagements += (metric?.likes ?? 0) + (metric?.comments ?? 0) + (metric?.reposts ?? 0) + (metric?.saves ?? 0) + (metric?.clicks ?? 0);
    sum.clicks += metric?.clicks ?? 0; return sum;
  }, { impressions: 0, reach: 0, engagements: 0, clicks: 0 });
  const engagementRate = totals.impressions ? (totals.engagements / totals.impressions) * 100 : null;
  const ctr = totals.impressions ? (totals.clicks / totals.impressions) * 100 : null;
  const drafts = candidates.filter((item) => item.status === ContentStatus.PENDING_REVIEW).length;
  const weekdayCounts = published.reduce((map, item) => { const day = (item.publicationTime ?? item.createdAt).toLocaleDateString("en-US", { weekday: "long" }); map.set(day, (map.get(day) ?? 0) + 1); return map; }, new Map<string, number>());
  const bestDay = [...weekdayCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

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

    <SectionTitle title="Platform overview" description="Account and engagement metrics from the selected network." />
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <CompactMetric title="Followers" value={format(account?.followers)} />
      <CompactMetric title="New followers" value={format(account?.newFollowers)} />
      <CompactMetric title="Impressions" value={format(totals.impressions || account?.impressions)} />
      <CompactMetric title="Reach" value={format(totals.reach || account?.reach)} />
      <CompactMetric title="Engagement rate" value={percent(engagementRate)} />
      <CompactMetric title="CTR" value={percent(ctr)} />
      <CompactMetric title={platform === Platform.LINKEDIN ? "Page views" : "Profile visits"} value={format(platform === Platform.LINKEDIN ? account?.pageViews : account?.profileViews)} />
      <CompactMetric title="Website clicks" value={format(account?.websiteClicks ?? account?.linkClicks ?? totals.clicks)} />
      <CompactMetric title={platform === Platform.LINKEDIN ? "Leads" : "Mentions"} value={format(platform === Platform.LINKEDIN ? account?.leads : account?.mentions)} />
      <CompactMetric title="Conversions" value={conversions.length || "—"} />
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

    <SectionTitle title="Growth analytics" description="Follower, visibility, engagement, and click trends across captured snapshots." />
    <Card><CardContent className="pt-6"><div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Trend title="Follower growth" snapshots={accountSnapshots} field="followers" />
      <Trend title="Impressions trend" snapshots={accountSnapshots} field="impressions" />
      <Trend title="Engagement trend" snapshots={accountSnapshots} field="engagements" />
      <Trend title="Click trend" snapshots={accountSnapshots} field={platform === Platform.LINKEDIN ? "websiteClicks" : "linkClicks"} />
    </div></CardContent></Card>

    <SectionTitle title={platform === Platform.LINKEDIN ? "Post performance" : "Tweet performance"} description="Latest captured performance for every published item." />
    <Card><CardContent className="overflow-x-auto pt-6"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b text-xs uppercase text-muted-foreground"><tr><th className="pb-3">Post</th><th>Date</th><th>Category</th><th>Impressions</th><th>Reach</th><th>Likes</th><th>Comments</th><th>{platform === Platform.LINKEDIN ? "Reposts" : "Replies"}</th><th>Clicks</th><th>Eng. rate</th></tr></thead><tbody>
      {published.length === 0 && <tr><td colSpan={10} className="py-8 text-center text-muted-foreground">No published performance data yet.</td></tr>}
      {published.slice(0, 20).map((item) => { const m = item.metricSnapshots[0]; const e = (m?.likes ?? 0) + (m?.comments ?? 0) + (m?.reposts ?? 0) + (m?.saves ?? 0) + (m?.clicks ?? 0); return <tr key={item.id} className="border-b last:border-0"><td className="max-w-[240px] py-3"><Link href={`/posts/${item.candidate.id}`} className="block truncate font-medium hover:underline">{item.candidate.hook}</Link></td><td>{(item.publicationTime ?? item.createdAt).toISOString().slice(0, 10)}</td><td>{label(item.candidate.category)}</td><td>{format(m?.impressions)}</td><td>{format(m?.reach)}</td><td>{format(m?.likes)}</td><td>{format(m?.comments)}</td><td>{format(platform === Platform.LINKEDIN ? m?.reposts : m?.replies)}</td><td>{format(m?.clicks)}</td><td>{percent(m?.impressions ? e / m.impressions * 100 : null)}</td></tr>; })}
    </tbody></table></CardContent></Card>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <InsightCard title="Posting analytics" items={[`Best observed day: ${bestDay}`, `Drafts awaiting review: ${drafts}`, `Scheduled or approved: ${scheduled.length}`, `Published: ${published.length}`]} />
      <InsightCard title="Website analytics" items={[`Attributed events: ${conversions.length}`, `Website clicks: ${format(account?.websiteClicks ?? totals.clicks)}`, `Leads or sign-ups: ${format(account?.leads)}`, connected ? "Tracking ready for platform data" : "Connect platform to begin attribution"]} />
      <InsightCard title="AI insights" items={published.length < 5 ? ["At least 5 published posts with metrics are required for reliable insights.", "Insights will compare category, timing, post length, format, and CTR."] : [`${label(topCategories[0]?.[0] ?? "content")} is your most-used category.`, `${bestDay} is your most frequent publishing day.`, "More performance history is being collected."]} />
    </div>

    <SectionTitle title="Advanced analysis" description="These modules activate as platform and website data becomes available." />
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <LockedModule title="Audience analytics" text={platform === Platform.LINKEDIN ? "Country, city, industry, company size, function, seniority and language." : "Country, language, interests, device type and follower retention."} ready={Boolean(account?.audience)} />
      <LockedModule title="Hashtag analytics" text="Top hashtags, reach, engagement, click rate and category comparisons." ready={publications.some((item) => item.metricSnapshots.length > 0)} />
      <LockedModule title={platform === Platform.LINKEDIN ? "Comment analytics" : "Conversation analytics"} text="Sentiment, common topics, questions, mentions, response time and response rate." ready={false} />
      <LockedModule title="Video analytics" text="Views, watch time, completion, retention, engagement and click-through rate." ready={false} />
    </div>
  </div>;
}

function PlatformTab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link href={href} className={cn("rounded-md px-4 py-2 text-sm font-medium transition-colors", active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{children}</Link>;
}
function Metric({ title, value, detail }: { title: string; value: string | number; detail: string }) {
  return <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{title}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>;
}
function SectionTitle({ title, description }: { title: string; description: string }) { return <div><h2 className="text-xl font-semibold">{title}</h2><p className="text-sm text-muted-foreground">{description}</p></div>; }
function CompactMetric({ title, value }: { title: string; value: string | number }) { return <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{title}</p><p className="mt-1 text-xl font-bold">{value}</p></CardContent></Card>; }
function Trend({ title, snapshots, field }: { title: string; snapshots: Array<Record<string, unknown>>; field: string }) { const values = snapshots.map((item) => item[field]).filter((v): v is number => typeof v === "number").reverse(); const delta = values.length > 1 ? values.at(-1)! - values[0]! : null; return <div><p className="text-xs text-muted-foreground">{title}</p><p className="mt-1 text-lg font-semibold">{values.length ? format(values.at(-1)) : "—"}</p><p className="text-xs text-muted-foreground">{delta === null ? "Awaiting snapshots" : `${delta >= 0 ? "+" : ""}${delta.toLocaleString()} in period`}</p></div>; }
function InsightCard({ title, items }: { title: string; items: string[] }) { return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-2">{items.map((item) => <p key={item} className="text-sm text-muted-foreground">• {item}</p>)}</CardContent></Card>; }
function LockedModule({ title, text, ready }: { title: string; text: string; ready: boolean }) { return <Card><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base">{title}</CardTitle><Badge variant={ready ? "success" : "outline"}>{ready ? "Data available" : "Awaiting data"}</Badge></div></CardHeader><CardContent><p className="text-sm text-muted-foreground">{text}</p></CardContent></Card>; }
function format(value: number | null | undefined) { return value === null || value === undefined || value === 0 ? "—" : value.toLocaleString(); }
function percent(value: number | null | undefined) { return value === null || value === undefined ? "—" : `${value.toFixed(2)}%`; }
function label(value: string) { return value.toLowerCase().split("_").map((word) => word === "saas" ? "SaaS" : word === "ai" ? "AI" : word.charAt(0).toUpperCase() + word.slice(1)).join(" "); }
