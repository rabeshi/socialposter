import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, enforceRateLimit, handleApiError, ApiError } from "@/lib/api-helpers";
import { recordAudit, clientIp } from "@/lib/audit";
import { uploadBrandAsset, InvalidUploadError } from "@/lib/storage/blob";
import { getEnv } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const session = await requireRole(["ADMIN"]);
    enforceRateLimit(`uploads:logo:${session.user.id}`, 5, 60_000);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "No file provided.");

    const buffer = Buffer.from(await file.arrayBuffer());

    const env = getEnv();
    if (env.SIMULATION_MODE || !env.BLOB_READ_WRITE_TOKEN) {
      // Simulation mode: accept and validate the upload, but do not require
      // Blob storage to be configured. The brand profile is left pointing at
      // a placeholder sample so the "logo present" UI can still be exercised.
      const brand = await prisma.brandProfile.upsert({
        where: { id: "singleton" },
        update: { logoUrl: "/samples/liceo-sample-1.svg" },
        create: { id: "singleton", companyDescription: "Liceo", productDescription: "Liceo", brandVoice: "Professional", logoUrl: "/samples/liceo-sample-1.svg" },
      });
      return NextResponse.json({ brand, simulated: true });
    }

    const url = await uploadBrandAsset(buffer, file.type);
    const brand = await prisma.brandProfile.upsert({
      where: { id: "singleton" },
      update: { logoUrl: url },
      create: { id: "singleton", companyDescription: "Liceo", productDescription: "Liceo", brandVoice: "Professional", logoUrl: url },
    });

    await recordAudit({
      userId: session.user.id,
      action: "LOGO_UPLOADED",
      objectType: "BrandProfile",
      objectId: "singleton",
      ipAddress: clientIp(request),
    });

    return NextResponse.json({ brand });
  } catch (error) {
    if (error instanceof InvalidUploadError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleApiError(error);
  }
}
