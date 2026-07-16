import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { signReviewLink } from "@/lib/security";
import { sendEmail, getApprovalRecipients } from "@/lib/email/resend";
import ApprovalEmail from "@/emails/approval-email";

export async function sendApprovalEmail(batchId: string): Promise<void> {
  const env = getEnv();
  const batch = await prisma.contentBatch.findUnique({ where: { id: batchId }, include: { candidates: true } });
  if (!batch) throw new Error(`Batch ${batchId} not found for approval email.`);

  const recipients = getApprovalRecipients();
  if (recipients.length === 0) {
    console.warn(`No approval email recipients configured; skipping email for batch ${batchId}.`);
    return;
  }

  const token = signReviewLink(batchId);
  const reviewUrl = `${env.NEXT_PUBLIC_APP_URL}/review/${batchId}?token=${token}`;
  const rejectAllUrl = `${env.NEXT_PUBLIC_APP_URL}/api/batches/${batchId}/reject-all?token=${token}`;
  const requestNewUrl = `${env.NEXT_PUBLIC_APP_URL}/api/batches/${batchId}/regenerate?token=${token}`;

  await sendEmail({
    to: recipients,
    subject: `Social Poster: 3 new candidates ready for review (${batch.candidates.map((c) => c.category).join(", ")})`,
    react: ApprovalEmail({
      batchId,
      generatedDate: batch.generationDate.toISOString().slice(0, 10),
      candidates: batch.candidates.map((c) => ({
        category: c.category,
        hook: c.hook,
        linkedinPreview: c.linkedinCopy.slice(0, 120),
        xPreview: c.xCopy.slice(0, 80),
        imageUrl: c.thumbnailUrl ?? "/samples/liceo-sample-1.svg",
        suggestedTime: c.suggestedPublicationTime ?? "09:00",
      })),
      reviewUrl,
      rejectAllUrl,
      requestNewUrl,
      appUrl: env.NEXT_PUBLIC_APP_URL,
    }),
  });
}
