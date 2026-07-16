import jwt from "jsonwebtoken";
import { getEnv } from "@/lib/env";

/**
 * Signed, expiring tokens used for one-click review links in approval
 * emails. Payload only ever contains a batchId — never database secrets,
 * OAuth tokens, or anything else sensitive.
 */
export interface ReviewLinkPayload {
  batchId: string;
  purpose: "review";
}

const REVIEW_LINK_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function signReviewLink(batchId: string): string {
  const env = getEnv();
  const payload: ReviewLinkPayload = { batchId, purpose: "review" };
  return jwt.sign(payload, env.AUTH_SECRET, { expiresIn: REVIEW_LINK_TTL_SECONDS });
}

export function verifyReviewLink(token: string): ReviewLinkPayload | null {
  const env = getEnv();
  try {
    const decoded = jwt.verify(token, env.AUTH_SECRET) as ReviewLinkPayload;
    if (decoded.purpose !== "review" || !decoded.batchId) return null;
    return decoded;
  } catch {
    return null;
  }
}

/** Constant-time-ish comparison for the cron secret header. */
export function assertCronAuthorized(request: Request): void {
  const env = getEnv();
  const header = request.headers.get("authorization");
  const expected = `Bearer ${env.CRON_SECRET}`;
  if (!header || header.length !== expected.length || header !== expected) {
    throw new UnauthorizedError("Invalid or missing cron secret");
  }
}

export class UnauthorizedError extends Error {}

// ---------------------------------------------------------------------------
// Minimal in-memory rate limiter for sensitive endpoints (per Vercel Function
// instance). Adequate for low-volume admin/reviewer actions; swap for a
// durable store (e.g. Upstash) if traffic grows.
// ---------------------------------------------------------------------------

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/** Redacts anything that looks like a secret before it reaches logs. */
export function redactSecrets(input: string): string {
  return input
    .replace(/Bearer\s+[\w.\-]+/gi, "Bearer [REDACTED]")
    .replace(/([\"']?(?:token|secret|key|password)[\"']?\s*[:=]\s*)[\"']?[\w.\-]{8,}[\"']?/gi, "$1[REDACTED]");
}
