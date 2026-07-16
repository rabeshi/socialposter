import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { requireRole, handleApiError } from "@/lib/api-helpers";
import { encryptToken } from "@/lib/token-encryption";
import { recordAudit } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const session = await requireRole(["ADMIN"]);
    const env = getEnv();
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const cookies = request.headers.get("cookie") ?? "";
    const cookieState = cookies.match(/x_oauth_state=([^;]+)/)?.[1];
    const codeVerifier = cookies.match(/x_oauth_verifier=([^;]+)/)?.[1];

    if (!state || !cookieState || state !== cookieState || !codeVerifier) {
      return NextResponse.json({ error: "Invalid or missing OAuth state/verifier." }, { status: 400 });
    }
    if (!code) return NextResponse.json({ error: "X did not return an authorization code." }, { status: 400 });
    if (!env.X_CLIENT_ID || !env.X_CLIENT_SECRET || !env.X_REDIRECT_URI) {
      return NextResponse.json({ error: "X is not configured." }, { status: 501 });
    }

    const basicAuth = Buffer.from(`${env.X_CLIENT_ID}:${env.X_CLIENT_SECRET}`).toString("base64");
    const tokenResponse = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basicAuth}` },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: env.X_REDIRECT_URI,
        code_verifier: codeVerifier,
        client_id: env.X_CLIENT_ID,
      }),
    });

    if (!tokenResponse.ok) {
      return NextResponse.json({ error: "X token exchange failed." }, { status: 502 });
    }

    const tokenData = (await tokenResponse.json()) as { access_token: string; expires_in: number; refresh_token?: string };

    await prisma.platformConnection.upsert({
      where: { platform: "X" },
      update: {
        accessTokenEncrypted: encryptToken(tokenData.access_token),
        refreshTokenEncrypted: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        connectedByUserId: session.user.id,
        connectedAt: new Date(),
        revokedAt: null,
      },
      create: {
        platform: "X",
        accessTokenEncrypted: encryptToken(tokenData.access_token),
        refreshTokenEncrypted: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        connectedByUserId: session.user.id,
        connectedAt: new Date(),
      },
    });

    await recordAudit({ userId: session.user.id, action: "X_CONNECTED", objectType: "PlatformConnection", objectId: "X" });

    const response = NextResponse.redirect(new URL("/integrations", env.NEXT_PUBLIC_APP_URL));
    response.cookies.delete("x_oauth_state");
    response.cookies.delete("x_oauth_verifier");
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
