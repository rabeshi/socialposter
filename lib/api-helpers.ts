import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/security";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new ApiError(401, "Unauthorized");
  return session;
}

export async function requireRole(roles: string[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) throw new ApiError(403, "Forbidden");
  return session;
}

export function enforceRateLimit(key: string, limit = 20, windowMs = 60_000) {
  if (!rateLimit(key, limit, windowMs)) {
    throw new ApiError(429, "Too many requests. Please slow down.");
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
