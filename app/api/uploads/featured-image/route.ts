import { NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { requireRole, enforceRateLimit, handleApiError, ApiError } from "@/lib/api-helpers";
import { recordAudit, clientIp } from "@/lib/audit";
import { uploadImageFromBuffer } from "@/lib/storage/blob";
import { featuredImageValidationError } from "@/lib/storage/featured-image";
import { getEnv } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const session = await requireRole(["ADMIN"]);
    enforceRateLimit(`uploads:featured-image:${session.user.id}`, 5, 60_000);
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "No file provided.");
    const validationError = featuredImageValidationError(file);
    if (validationError) throw new ApiError(400, validationError);

    let image: Buffer;
    try {
      const source = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 });
      const metadata = await source.metadata();
      if (!["png", "jpeg", "webp"].includes(metadata.format ?? "")) throw new Error("Invalid format");
      image = await source.rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 90 }).toBuffer();
    } catch {
      throw new ApiError(400, "This image could not be read. Choose a valid PNG, JPEG, or WebP image up to 40 megapixels.");
    }

    const env = getEnv();
    if (!env.SIMULATION_MODE && !env.BLOB_READ_WRITE_TOKEN) {
      throw new ApiError(503, "Image storage is not configured. Please contact your administrator.");
    }
    const featuredImageUrl = env.SIMULATION_MODE
      ? `data:image/webp;base64,${image.toString("base64")}`
      : await uploadImageFromBuffer(image, "brand/featured", "image/webp");
    await prisma.brandProfile.upsert({
      where: { id: "singleton" },
      update: { featuredImageUrl },
      create: { id: "singleton", companyDescription: "Liceo", productDescription: "Liceo", brandVoice: "Professional", featuredImageUrl },
    });
    await recordAudit({ userId: session.user.id, action: "FEATURED_IMAGE_UPLOADED", objectType: "BrandProfile", objectId: "singleton", ipAddress: clientIp(request) });
    return NextResponse.json({ featuredImageUrl });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireRole(["ADMIN"]);
    enforceRateLimit(`uploads:featured-image:${session.user.id}`, 5, 60_000);
    await prisma.brandProfile.updateMany({ where: { id: "singleton" }, data: { featuredImageUrl: null } });
    await recordAudit({ userId: session.user.id, action: "FEATURED_IMAGE_REMOVED", objectType: "BrandProfile", objectId: "singleton", ipAddress: clientIp(request) });
    return NextResponse.json({ featuredImageUrl: null });
  } catch (error) {
    return handleApiError(error);
  }
}
