import { NextResponse } from "next/server";
import { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { assertCronAuthorized, UnauthorizedError, signReviewLink } from "@/lib/security";
import { sendEmail, getApprovalRecipients } from "@/lib/email/resend";
import ReminderEmail from "@/emails/reminder-email";

/**
 * Runs daily. Sends a reminder for any batch that has sat in
 * PENDING_REVIEW longer than AutomationSettings.reminderIntervalHours,
 * capped at AutomationSettings.maxReminders per batch so reminders do not
 * repeat indefinitely.
 */
export async function GET(request: Request) {
  try {
    assertCronAuthorized(request);
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    throw error;
  }

  const env = getEnv();
  const settings = await prisma.automationSettings.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } });
  const recipients = getApprovalRecipients();
  if (recipients.length === 0) return NextResponse.json({ sent: 0, reason: "no_recipients" });

  const cutoff = new Date(Date.now() - settings.reminderIntervalHours * 60 * 60 * 1000);
  const pendingBatches = await prisma.contentBatch.findMany({
    where: { status: ContentStatus.PENDING_REVIEW, createdAt: { lte: cutoff } },
  });

  let sent = 0;
  for (const batch of pendingBatches) {
    if (settings.remindersSentForCurrentBatch >= settings.maxReminders) continue;

    const hoursSince = Math.round((Date.now() - batch.createdAt.getTime()) / (60 * 60 * 1000));
    const token = signReviewLink(batch.id);
    const reviewUrl = `${env.NEXT_PUBLIC_APP_URL}/review/${batch.id}?token=${token}`;

    await sendEmail({
      to: recipients,
      subject: `Reminder: Liceo batch #${batch.id.slice(0, 8)} awaiting review`,
      react: ReminderEmail({
        batchId: batch.id,
        hoursSinceGeneration: hoursSince,
        reviewUrl,
        reminderNumber: settings.remindersSentForCurrentBatch + 1,
        maxReminders: settings.maxReminders,
      }),
    });

    await prisma.automationSettings.update({
      where: { id: "singleton" },
      data: { remindersSentForCurrentBatch: { increment: 1 } },
    });
    sent += 1;
  }

  return NextResponse.json({ sent });
}
