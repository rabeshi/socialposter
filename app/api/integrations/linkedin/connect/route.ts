import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getEnv } from "@/lib/env";
import { requireRole, handleApiError } from "@/lib/api-helpers";

/**
 * PHASE 4 — requires a LinkedIn Developer App with Community Management
 * API access approved for the Liceo organization page. Redirects the
 * authenticated admin into LinkedIn's OAuth consent screen with a signed,
 * single-use `state` value (stored in an HTTP-only cookie) to prevent CSRF
 * on the callback.
 */
export async function GET() {
  try {
    await requireRole(["ADMIN"]);
    const env = getEnv();

    if (!env.LINKEDIN_CLIENT_ID || !env.LINKEDIN_REDIRECT_URI) {
      return NextResponse.json(
        { error: "LinkedIn is not configured. Set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and LINKEDIN_REDIRECT_URI." },
        { status: 501 }
      );
    }

    const state = randomBytes(24).toString("hex");
    const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", env.LINKEDIN_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", env.LINKEDIN_REDIRECT_URI);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", "r_organization_admin w_organization_social rw_organization_admin");

    const response = NextResponse.redirect(authUrl);
    response.cookies.set("li_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
