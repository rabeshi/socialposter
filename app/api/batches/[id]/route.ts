import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const batch = await prisma.contentBatch.findUnique({
      where: { id },
      include: { candidates: { include: { publications: true, versions: true } } },
    });
    if (!batch) throw new ApiError(404, "Batch not found");
    return NextResponse.json({ batch });
  } catch (error) {
    return handleApiError(error);
  }
}
