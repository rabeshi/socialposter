import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import { requireRole, enforceRateLimit, handleApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { isLinkedInConfigured } from "@/lib/integrations/linkedin";
import { isXConfigured } from "@/lib/integrations/x";

const schema = z.object({ service: z.enum(["openai", "resend", "linkedin", "x", "neon", "blob"]) });

/**
 * Lightweight connectivity checks for the Integrations page. Never returns
 * secret values — only booleans and non-sensitive metadata.
 */
export async function POST(request: Request) {
  try {
    const session = await requireRole(["ADMIN", "REVIEWER"]);
    enforceRateLimit(`integrations:test:${session.user.id}`, 20, 60_000);

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const env = getEnv();

    switch (parsed.data.service) {
      case "openai": {
        if (!env.OPENAI_API_KEY) return NextResponse.json({ connected: false, detail: "OPENAI_API_KEY not set (simulation mode active)." });
        try {
          const res = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` } });
          return NextResponse.json({ connected: res.ok, detail: res.ok ? "Reachable" : `HTTP ${res.status}` });
        } catch {
          return NextResponse.json({ connected: false, detail: "Network error" });
        }
      }
      case "resend": {
        return NextResponse.json({
          connected: Boolean(env.RESEND_API_KEY) && !env.SIMULATION_MODE,
          detail: env.SIMULATION_MODE ? "Simulation mode: emails are logged, not sent." : env.RESEND_API_KEY ? "Configured" : "RESEND_API_KEY not set",
        });
      }
      case "linkedin":
        return NextResponse.json({ connected: isLinkedInConfigured(), detail: isLinkedInConfigured() ? "Configured" : "Not connected" });
      case "x":
        return NextResponse.json({ connected: isXConfigured(), detail: isXConfigured() ? "Configured" : "Not connected" });
      case "neon": {
        try {
          await prisma.$queryRaw`SELECT 1`;
          return NextResponse.json({ connected: true, detail: "Database reachable" });
        } catch {
          return NextResponse.json({ connected: false, detail: "Database unreachable" });
        }
      }
      case "blob":
        return NextResponse.json({
          connected: Boolean(env.BLOB_READ_WRITE_TOKEN),
          detail: env.BLOB_READ_WRITE_TOKEN ? "Configured" : "BLOB_READ_WRITE_TOKEN not set (using local sample images)",
        });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
