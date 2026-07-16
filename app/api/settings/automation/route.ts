import { NextResponse } from "next/server";
import { z } from "zod";
import { Platform } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/api-helpers";
import { recordAudit, clientIp } from "@/lib/audit";
import { computeNextGenerationAt } from "@/lib/scheduling/generation";

export async function GET() {
  try {
    await requireRole(["ADMIN", "REVIEWER"]);
    const settings = await prisma.automationSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });
    return NextResponse.json({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}

const updateSchema = z.object({
  action: z.enum([
    "update",
    "enable",
    "disable",
    "generate_now",
    "skip_next",
    "resume_after_skip",
    "set_next_date",
    "set_time",
    "set_timezone",
  ]),
  generationIntervalDays: z.number().int().positive().optional(),
  generationTimezone: z.string().optional(),
  preferredLocalGenerationTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  nextGenerationAt: z.string().datetime().optional(),
  defaultPlatforms: z.array(z.nativeEnum(Platform)).optional(),
  publishingPaused: z.boolean().optional(),
  manualPublishingFallback: z.boolean().optional(),
  reminderIntervalHours: z.number().int().positive().optional(),
  maxReminders: z.number().int().min(0).optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await requireRole(["ADMIN"]);
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const current = await prisma.automationSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });

    const data: Record<string, unknown> = {};

    switch (parsed.data.action) {
      case "enable":
        data.automationEnabled = true;
        data.skipNextGeneration = false;
        if (!current.nextGenerationAt) {
          data.nextGenerationAt = computeNextGenerationAt(
            new Date(),
            current.generationIntervalDays,
            current.generationTimezone,
            current.preferredLocalGenerationTime
          );
        }
        break;
      case "disable":
        data.automationEnabled = false;
        break;
      case "generate_now":
        // Marker only; the actual generation happens via POST /api/batches
        // from the client immediately after this call succeeds.
        data.nextGenerationAt = new Date();
        break;
      case "skip_next":
        data.skipNextGeneration = true;
        break;
      case "resume_after_skip":
        data.skipNextGeneration = false;
        break;
      case "set_next_date":
        if (parsed.data.nextGenerationAt) data.nextGenerationAt = new Date(parsed.data.nextGenerationAt);
        break;
      case "set_time":
        if (parsed.data.preferredLocalGenerationTime) data.preferredLocalGenerationTime = parsed.data.preferredLocalGenerationTime;
        break;
      case "set_timezone":
        if (parsed.data.generationTimezone) data.generationTimezone = parsed.data.generationTimezone;
        break;
      case "update":
        if (parsed.data.generationIntervalDays) data.generationIntervalDays = parsed.data.generationIntervalDays;
        if (parsed.data.generationTimezone) data.generationTimezone = parsed.data.generationTimezone;
        if (parsed.data.preferredLocalGenerationTime) data.preferredLocalGenerationTime = parsed.data.preferredLocalGenerationTime;
        if (parsed.data.defaultPlatforms) data.defaultPlatforms = parsed.data.defaultPlatforms;
        if (parsed.data.publishingPaused !== undefined) data.publishingPaused = parsed.data.publishingPaused;
        if (parsed.data.manualPublishingFallback !== undefined) data.manualPublishingFallback = parsed.data.manualPublishingFallback;
        if (parsed.data.reminderIntervalHours) data.reminderIntervalHours = parsed.data.reminderIntervalHours;
        if (parsed.data.maxReminders !== undefined) data.maxReminders = parsed.data.maxReminders;
        break;
    }

    const updated = await prisma.automationSettings.update({ where: { id: "singleton" }, data });

    await recordAudit({
      userId: session.user.id,
      action: `AUTOMATION_SETTINGS_${parsed.data.action.toUpperCase()}`,
      objectType: "AutomationSettings",
      objectId: "singleton",
      metadata: data,
      ipAddress: clientIp(request),
    });

    return NextResponse.json({ settings: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
