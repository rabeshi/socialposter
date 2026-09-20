import sharp from "sharp";
import { getEnv } from "@/lib/env";
import { assertValidImageUpload } from "@/lib/storage/blob";

export async function loadBrandLogo(logoUrl: string): Promise<Buffer> {
  const app = new URL(getEnv().NEXT_PUBLIC_APP_URL);
  const url = new URL(logoUrl, app);
  if (url.protocol !== "https:" ||
      (url.origin !== app.origin && !url.hostname.endsWith(".public.blob.vercel-storage.com")) ||
      url.pathname.startsWith("/samples/")) {
    throw new Error("Upload the official Liceo logo in Brand Settings before generating images.");
  }
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Logo download failed: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  assertValidImageUpload(response.headers.get("content-type")?.split(";")[0] ?? "", buffer.length);
  return buffer;
}

/** Composite the authentic artwork, preserving its proportions, onto the final image. */
export async function addBrandLogo(image: Buffer, logo: Buffer): Promise<Buffer> {
  const base = await sharp(image).rotate().png().toBuffer();
  const { width, height } = await sharp(base).metadata();
  if (!width || !height) throw new Error("Generated image has no dimensions.");
  const margin = Math.max(1, Math.round(Math.min(width, height) * 0.025));
  const padding = Math.max(1, Math.round(margin * 0.5));
  const mark = await sharp(logo).resize({
    width: Math.max(1, Math.round(width * 0.16)),
    height: Math.max(1, Math.round(height * 0.08)),
    fit: "inside",
  }).flatten({ background: "#ffffff" }).extend({
    top: padding, bottom: padding, left: padding, right: padding, background: "#ffffff",
  }).png().toBuffer();
  const bounds = await sharp(mark).metadata();
  return sharp(base).composite([{
    input: mark,
    left: width - bounds.width! - margin,
    top: height - bounds.height! - margin,
  }]).png().toBuffer();
}
