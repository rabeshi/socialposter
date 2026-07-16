import { prisma } from "@/lib/prisma";
import { AutomationControls } from "@/components/forms/automation-controls";

export const dynamic = "force-dynamic";

export default async function AutomationPage() {
  const settings = await prisma.automationSettings.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Automation</h1>
        <p className="text-muted-foreground">
          Generation runs on a two-day cycle but never publishes automatically — every post still requires human
          review and a separate publish action.
        </p>
      </div>
      <AutomationControls
        settings={{
          automationEnabled: settings.automationEnabled,
          generationIntervalDays: settings.generationIntervalDays,
          generationTimezone: settings.generationTimezone,
          preferredLocalGenerationTime: settings.preferredLocalGenerationTime,
          nextGenerationAt: settings.nextGenerationAt?.toISOString() ?? null,
          lastSuccessfulGenerationAt: settings.lastSuccessfulGenerationAt?.toISOString() ?? null,
          skipNextGeneration: settings.skipNextGeneration,
          reminderIntervalHours: settings.reminderIntervalHours,
          maxReminders: settings.maxReminders,
          defaultPlatforms: settings.defaultPlatforms,
          publishingPaused: settings.publishingPaused,
          manualPublishingFallback: settings.manualPublishingFallback,
        }}
      />
    </div>
  );
}
