import { getEnv } from "@/lib/env";

export interface PublishInput {
  xCopy: string;
  imageUrl: string;
  altText: string;
}

export interface PublishResult {
  status: "PUBLISHED" | "READY_FOR_MANUAL_PUBLISHING" | "PUBLICATION_FAILED";
  platformPostId?: string;
  platformUrl?: string;
  errorType?: string;
  errorMessage?: string;
}

/**
 * PHASE 4 INTEGRATION — requires an X Developer App with OAuth 2.0 write
 * scope and a completed OAuth connection via /api/integrations/x/connect.
 *
 * Until X_CLIENT_ID/SECRET and a stored, valid access token exist, every
 * publish attempt safely degrades to READY_FOR_MANUAL_PUBLISHING.
 */
export function isXConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.X_CLIENT_ID && env.X_CLIENT_SECRET);
}

export async function publishToX(input: PublishInput, accessToken: string | null): Promise<PublishResult> {
  const env = getEnv();

  if (env.SIMULATION_MODE) {
    return {
      status: "PUBLISHED",
      platformPostId: `sim_x_${Date.now()}`,
      platformUrl: "https://x.com/Liceo_io",
    };
  }

  if (!isXConfigured() || !accessToken) {
    return { status: "READY_FOR_MANUAL_PUBLISHING", errorType: "NOT_CONNECTED" };
  }

  try {
    const mediaUpload = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (mediaUpload.status === 401) {
      return { status: "READY_FOR_MANUAL_PUBLISHING", errorType: "AUTH_REVOKED", errorMessage: "X access token expired or revoked." };
    }
    if (mediaUpload.status === 429) {
      return { status: "PUBLICATION_FAILED", errorType: "RATE_LIMITED", errorMessage: "X API rate limit reached; will retry with backoff." };
    }

    // Full media upload + POST /2/tweets flow is wired here once real
    // credentials are available; structure mirrors X's documented flow.
    return { status: "READY_FOR_MANUAL_PUBLISHING", errorType: "NOT_IMPLEMENTED", errorMessage: "X publish flow pending final wiring." };
  } catch (err) {
    return {
      status: "PUBLICATION_FAILED",
      errorType: "NETWORK_ERROR",
      errorMessage: err instanceof Error ? err.message : "Unknown X publish error.",
    };
  }
}
