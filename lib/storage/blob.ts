import { getEnv } from "@/lib/env";

const ALLOWED_CONTENT_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

export class InvalidUploadError extends Error {}

export function assertValidImageUpload(contentType: string, byteLength: number): void {
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new InvalidUploadError(`Unsupported image content type: ${contentType}`);
  }
  if (byteLength > MAX_UPLOAD_BYTES) {
    throw new InvalidUploadError(`Image exceeds maximum upload size of ${MAX_UPLOAD_BYTES} bytes.`);
  }
}

/**
 * Uploads a buffer to Vercel Blob. Requires BLOB_READ_WRITE_TOKEN; in
 * simulation mode (or when the token is absent) callers should prefer the
 * local sample assets in lib/ai/image-generator.ts instead of calling this.
 */
export async function uploadImageFromBuffer(buffer: Buffer, pathPrefix: string, contentType = "image/png"): Promise<string> {
  const env = getEnv();
  if (!env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured; cannot upload to Vercel Blob.");
  }
  assertValidImageUpload(contentType, buffer.byteLength);

  const { put } = await import("@vercel/blob");
  const filename = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
  const { url } = await put(filename, buffer, { access: "public", contentType, token: env.BLOB_READ_WRITE_TOKEN });
  return url;
}

export async function uploadImageFromUrl(sourceUrl: string, pathPrefix: string): Promise<string> {
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`Failed to fetch source image: ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());
  return uploadImageFromBuffer(buffer, pathPrefix, contentType);
}

export async function uploadBrandAsset(buffer: Buffer, contentType: string): Promise<string> {
  assertValidImageUpload(contentType, buffer.byteLength);
  return uploadImageFromBuffer(buffer, "brand", contentType);
}

/** Deletes generated Vercel Blob assets, ignoring local sample paths and non-Blob URLs. */
export async function deleteGeneratedImages(urls: Array<string | null>): Promise<void> {
  const env = getEnv();
  if (!env.BLOB_READ_WRITE_TOKEN) return;
  const blobUrls = [...new Set(urls.filter((url): url is string => Boolean(url) && url!.includes("blob.vercel-storage.com")))];
  if (blobUrls.length === 0) return;
  const { del } = await import("@vercel/blob");
  await del(blobUrls, { token: env.BLOB_READ_WRITE_TOKEN });
}
