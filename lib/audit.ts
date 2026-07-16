import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface AuditEntry {
  userId?: string | null;
  action: string;
  objectType: string;
  objectId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

export async function recordAudit(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: entry.userId ?? null,
      action: entry.action,
      objectType: entry.objectType,
      objectId: entry.objectId ?? null,
      metadata: (entry.metadata as Prisma.InputJsonValue) ?? undefined,
      ipAddress: entry.ipAddress ?? null,
    },
  });
}

export function clientIp(request: Request): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}
