import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { requireRole, handleApiError } from "@/lib/api-helpers";
import { encryptToken } from "@/lib/token-encryption";
import { recordAudit } from "@/lib/audit";

/**
 * PHASE 4 — exchanges the authorization code for an access token and
 * stores it encrypted. Validates `state` against the cookie set in
 * /connect to prevent CSRF; rejects the callback outright if it does not
 * match.
 */
export async function GET(request: Request) {
  try {
    const session = await requireRole(["ADMIN"]);
    const env = getEnv();
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const cookieState = request.headers.get("cookie")?.match(/li_oauth_state=([^;]+)/)?.[1];

    if (!state || !cookieState || state !== cookieState) {
      return NextResponse.json({ error: "Invalid or missing OAuth state." }, { status: 400 });
    }
    if (!code) {
      return NextResponse.json({ error: "LinkedIn did not return an authorization code." }, { status: 400 });
    }
    if (!env.LINKEDIN_CLIENT_ID || !env.LINKEDIN_CLIENT_SECRET || !env.LINKEDIN_REDIRECT_URI) {
      return NextResponse.json({ error: "LinkedIn is not configured." }, { status: 501 });
    }

    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: env.LINKEDIN_REDIRECT_URI,
        client_id: env.LINKEDIN_CLIENT_ID,
        client_secret: env.LINKEDIN_CLIENT_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      return NextResponse.json({ error: "LinkedIn token exchange failed." }, { status: 502 });
    }

    const tokenData = (await tokenResponse.json()) as { access_token: string; expires_in: number; refresh_token?: string };

    await prisma.platformConnection.upsert({
      where: { platform: "LINKEDIN" },
      update: {
        accessTokenEncrypted: encryptToken(tokenData.access_token),
        refreshTokenEncrypted: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        connectedByUserId: session.user.id,
        connectedAt: new Date(),
        revokedAt: null,
        externalAccountId: env.LINKEDIN_ORGANIZATION_ID,
      },
      create: {
        platform: "LINKEDIN",
        accessTokenEncrypted: encryptToken(tokenData.access_token),
        refreshTokenEncrypted: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        connectedByUserId: session.user.id,
        connectedAt: new Date(),
        externalAccountId: env.LINKEDIN_ORGANIZATION_ID,
      },
    });

    await recordAudit({ userId: session.user.id, action: "LINKEDIN_CONNECTED", objectType: "PlatformConnection", objectId: "LINKEDIN" });

    const response = NextResponse.redirect(new URL("/integrations", env.NEXT_PUBLIC_APP_URL));
    response.cookies.delete("li_oauth_state");
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
