import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { getEnv } from "@/lib/env";
import { requireRole, handleApiError } from "@/lib/api-helpers";

function base64url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * PHASE 4 — requires an X Developer App with OAuth 2.0 (PKCE) write scope.
 * Generates a PKCE code_verifier/challenge pair and a CSRF `state`, storing
 * both in short-lived HTTP-only cookies for the callback to validate.
 */
export async function GET() {
  try {
    await requireRole(["ADMIN"]);
    const env = getEnv();

    if (!env.X_CLIENT_ID || !env.X_REDIRECT_URI) {
      return NextResponse.json({ error: "X is not configured. Set X_CLIENT_ID, X_CLIENT_SECRET, and X_REDIRECT_URI." }, { status: 501 });
    }

    const state = base64url(randomBytes(24));
    const codeVerifier = base64url(randomBytes(32));
    const codeChallenge = base64url(createHash("sha256").update(codeVerifier).digest());

    const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", env.X_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", env.X_REDIRECT_URI);
    authUrl.searchParams.set("scope", "tweet.read tweet.write users.read offline.access");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    const response = NextResponse.redirect(authUrl);
    response.cookies.set("x_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
    response.cookies.set("x_oauth_verifier", codeVerifier, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
