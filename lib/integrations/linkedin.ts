import { getEnv } from "@/lib/env";

export interface PublishInput {
  linkedinCopy: string;
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
 * PHASE 4 INTEGRATION — requires a LinkedIn Developer App with Community
 * Management API access approved for the Liceo organization page, plus an
 * OAuth connection completed via /api/integrations/linkedin/connect.
 *
 * Until LINKEDIN_CLIENT_ID/SECRET and a stored, valid access token exist,
 * every publish attempt safely degrades to READY_FOR_MANUAL_PUBLISHING —
 * it never claims success it cannot verify.
 */
export function isLinkedInConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET && env.LINKEDIN_ORGANIZATION_ID);
}

export async function publishToLinkedIn(input: PublishInput, accessToken: string | null): Promise<PublishResult> {
  const env = getEnv();

  if (env.SIMULATION_MODE) {
    return {
      status: "PUBLISHED",
      platformPostId: `sim_li_${Date.now()}`,
      platformUrl: "https://www.linkedin.com/company/liceo-inc/posts/?feedView=all",
    };
  }

  if (!isLinkedInConfigured() || !accessToken) {
    return { status: "READY_FOR_MANUAL_PUBLISHING", errorType: "NOT_CONNECTED" };
  }

  try {
    const initResponse = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202401",
      },
      body: JSON.stringify({
        initializeUploadRequest: { owner: `urn:li:organization:${env.LINKEDIN_ORGANIZATION_ID}` },
      }),
    });

    if (initResponse.status === 401) {
      return { status: "READY_FOR_MANUAL_PUBLISHING", errorType: "AUTH_REVOKED", errorMessage: "LinkedIn access token expired or revoked." };
    }
    if (initResponse.status === 403) {
      return { status: "READY_FOR_MANUAL_PUBLISHING", errorType: "INVALID_PERMISSIONS", errorMessage: "Missing organization posting permissions." };
    }
    if (!initResponse.ok) {
      return { status: "PUBLICATION_FAILED", errorType: "LINKEDIN_API_ERROR", errorMessage: `Image upload init failed: ${initResponse.status}` };
    }

    // Full multi-step upload (fetch binary -> PUT to uploadUrl -> create post
    // via /rest/posts) is wired here once real credentials are available.
    // The structure above intentionally mirrors LinkedIn's documented flow
    // so this function only needs its network calls filled in, not redesigned.
    return { status: "READY_FOR_MANUAL_PUBLISHING", errorType: "NOT_IMPLEMENTED", errorMessage: "LinkedIn publish flow pending final wiring." };
  } catch (err) {
    return {
      status: "PUBLICATION_FAILED",
      errorType: "NETWORK_ERROR",
      errorMessage: err instanceof Error ? err.message : "Unknown LinkedIn publish error.",
    };
  }
}
