import { getEnv, approvalEmailList } from "@/lib/env";

export interface SendEmailInput {
  to: string[];
  subject: string;
  react: React.ReactElement;
}

export interface SendEmailResult {
  simulated: boolean;
  id?: string;
  previewedTo: string[];
}

/**
 * Sends transactional email via Resend. Publishing and AI generation can
 * remain simulated while SEND_REAL_EMAILS independently enables inbox tests.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const env = getEnv();

  if (!env.SEND_REAL_EMAILS || !env.RESEND_API_KEY) {
    console.info(`[simulation] Would send email "${input.subject}" to: ${input.to.join(", ")}`);
    return { simulated: true, previewedTo: input.to };
  }

  const { Resend } = await import("resend");
  const resend = new Resend(env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    react: input.react,
  });

  if (error) throw new Error(`Resend send failed: ${error.message}`);
  return { simulated: false, id: data?.id, previewedTo: input.to };
}

export function getApprovalRecipients(): string[] {
  const env = getEnv();
  return approvalEmailList(env);
}
