import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  CRON_SECRET: z.string().min(16),

  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_TEXT_MODEL: z.string().default("gpt-4o"),
  OPENAI_IMAGE_MODEL: z.string().default("gpt-image-1"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),

  BLOB_READ_WRITE_TOKEN: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Liceo Social <social@liceo.io>"),
  APPROVAL_EMAILS: z.string().default(""),

  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_REDIRECT_URI: z.string().optional(),
  LINKEDIN_ORGANIZATION_ID: z.string().optional(),

  X_CLIENT_ID: z.string().optional(),
  X_CLIENT_SECRET: z.string().optional(),
  X_REDIRECT_URI: z.string().optional(),

  TOKEN_ENCRYPTION_KEY: z.string().min(32).optional(),

  DEFAULT_TIMEZONE: z.string().default("America/Los_Angeles"),
  GENERATION_INTERVAL_DAYS: z.coerce.number().int().positive().default(2),
  DEFAULT_GENERATION_HOUR: z.coerce.number().int().min(0).max(23).default(9),
  DEFAULT_GENERATION_MINUTE: z.coerce.number().int().min(0).max(59).default(0),

  SIMULATION_MODE: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * Validates process.env once and caches the result. Called from server-only
 * code (route handlers, server components, cron). Never import this from a
 * "use client" file.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function approvalEmailList(env: Env): string[] {
  return env.APPROVAL_EMAILS.split(",").map((e) => e.trim()).filter(Boolean);
}
