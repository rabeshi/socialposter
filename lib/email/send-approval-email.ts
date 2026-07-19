import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { signReviewLink } from "@/lib/security";
import { sendEmail, getAdminApprovalRecipients } from "@/lib/email/resend";
import ApprovalEmail from "@/emails/approval-email-v2";

export async function sendApprovalEmail(batchId: string): Promise<void> {
  const env = getEnv();
  const batch = await prisma.contentBatch.findUnique({ where: { id: batchId }, include: { candidates: true } });
  if (!batch) throw new Error(`Batch ${batchId} not found for approval email.`);

  const recipients = await getAdminApprovalRecipients();
  if (recipients.length === 0) {
    console.warn(`No approval email recipients configured; skipping email for batch ${batchId}.`);
    return;
  }

  const token = signReviewLink(batchId);
  const reviewUrl = `${env.NEXT_PUBLIC_APP_URL}/review/${batchId}?token=${token}`;
  const rejectAllUrl = `${env.NEXT_PUBLIC_APP_URL}/api/batches/${batchId}/reject-all?token=${token}`;
  const requestNewUrl = `${env.NEXT_PUBLIC_APP_URL}/api/batches/${batchId}/regenerate?token=${token}`;
  const absoluteImageUrl = (value: string | null) => new URL(value ?? "/samples/liceo-sample-1.svg", env.NEXT_PUBLIC_APP_URL).toString();
  const categoryLabel = (value: string) => value.toLowerCase().split("_").map((word) => word === "saas" ? "SaaS" : word === "ai" ? "AI" : word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  const publishingTime = (value: string | null) => { const [hours = "9", minutes = "00"] = (value ?? "09:00").split(":"); const hour = Number(hours); return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? "PM" : "AM"}`; };

  await sendEmail({
    to: recipients,
    subject: `Liceo Social | ${batch.candidates.length} Posts Ready for Review`,
    react: ApprovalEmail({
      generatedDate: batch.generationDate.toISOString().slice(0, 10),
      candidates: batch.candidates.map((c) => ({
        category: categoryLabel(c.category),
        hook: c.hook,
        linkedinPreview: c.linkedinCopy.slice(0, 220),
        xPreview: c.xCopy.slice(0, 160),
        imageUrl: absoluteImageUrl(c.thumbnailUrl),
        suggestedTime: publishingTime(c.suggestedPublicationTime),
      })),
      reviewUrl,
      rejectAllUrl,
      requestNewUrl,
      appUrl: env.NEXT_PUBLIC_APP_URL,
    }),
  });
}
