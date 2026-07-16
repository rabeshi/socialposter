import { prisma } from "@/lib/prisma";
import { CalendarView } from "@/components/calendar/calendar-view";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const [batches, candidates, publications] = await Promise.all([
    prisma.contentBatch.findMany({ orderBy: { generationDate: "desc" }, take: 60 }),
    prisma.postCandidate.findMany({
      where: { suggestedPublicationDate: { not: null } },
      select: { id: true, hook: true, category: true, status: true, suggestedPublicationDate: true },
      take: 200,
    }),
    prisma.publication.findMany({
      where: { OR: [{ scheduledTime: { not: null } }, { publicationTime: { not: null } }] },
      select: { id: true, platform: true, status: true, scheduledTime: true, publicationTime: true, candidateId: true, candidate: { select: { hook: true, category: true } } },
      take: 200,
    }),
  ]);

  const events = [
    ...batches.map((b) => ({
      id: `gen-${b.id}`,
      date: b.generationDate.toISOString(),
      type: "generation" as const,
      label: `Batch #${b.id.slice(0, 8)} generated`,
      status: b.status,
    })),
    ...candidates.map((c) => ({
      id: `sugg-${c.id}`,
      date: c.suggestedPublicationDate!.toISOString(),
      type: "suggested" as const,
      label: c.hook,
      status: c.status,
      category: c.category,
    })),
    ...publications.map((p) => ({
      id: `pub-${p.id}`,
      date: (p.publicationTime ?? p.scheduledTime)!.toISOString(),
      type: "publication" as const,
      label: p.candidate.hook,
      status: p.status,
      category: p.candidate.category,
      platform: p.platform,
    })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-muted-foreground">Generation dates, approved, scheduled, published, and failed posts.</p>
      </div>
      <CalendarView events={events} />
    </div>
  );
}
