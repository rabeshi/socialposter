import { getEnv } from "@/lib/env";
import { buildImagePrompt } from "@/lib/ai/prompts";
import { uploadImageFromBuffer } from "@/lib/storage/blob";
import { addBrandLogo, loadBrandLogo } from "@/lib/ai/brand-image";

export interface GeneratedImageSet {
  originalUrl: string;
  linkedinLandscapeUrl: string;
  linkedinSquareUrl: string;
  xImageUrl: string;
  thumbnailUrl: string;
}

export async function featuredImageSet(featuredUrl: string, logoUrl: string | null): Promise<GeneratedImageSet> {
  const env = getEnv();
  let original = featuredUrl;
  if (!env.SIMULATION_MODE) {
    if (!logoUrl) throw new Error("Upload the official Liceo logo before generating the weekly featured post.");
    const [image, logo] = await Promise.all([loadBrandLogo(featuredUrl), loadBrandLogo(logoUrl)]);
    original = await uploadImageFromBuffer(await addBrandLogo(image, logo), "brand/weekly-featured");
  }
  return { originalUrl: original, linkedinLandscapeUrl: original, linkedinSquareUrl: original, xImageUrl: original, thumbnailUrl: original };
}

const SAMPLE_IMAGES = [
  "/samples/liceo-sample-1.svg",
  "/samples/liceo-sample-2.svg",
  "/samples/liceo-sample-3.svg",
];

/**
 * Generates one branded image shared by all platform image fields. In simulation mode
 * (default, or when OPENAI_API_KEY is absent) this returns bundled local
 * sample assets so the review UI and image pipeline can be fully exercised
 * without any paid API calls or Blob storage configured.
 *
 * Live generation loads the official logo before the paid API call, composites
 * it onto the artwork, and uploads only the branded result. Separate platform
 * crops are not yet implemented.
 */
export async function generateImageSet(prompt: string, brandColors: string[], seed: number, logoUrl?: string | null): Promise<GeneratedImageSet> {
  const env = getEnv();

  if (!env.USE_REAL_AI_IMAGES || !env.OPENAI_API_KEY || !env.BLOB_READ_WRITE_TOKEN) {
    if (!env.SIMULATION_MODE) {
      throw new Error("Live branded images require image generation and image storage to be configured.");
    }
    const sample = SAMPLE_IMAGES[seed % SAMPLE_IMAGES.length]!;
    return {
      originalUrl: sample,
      linkedinLandscapeUrl: sample,
      linkedinSquareUrl: sample,
      xImageUrl: sample,
      thumbnailUrl: sample,
    };
  }

  if (!logoUrl) throw new Error("Upload the official Liceo logo in Brand Settings before generating images.");
  const logo = await loadBrandLogo(logoUrl);
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  const fullPrompt = buildImagePrompt(prompt, brandColors, seed);
  const result = await client.images.generate({
    model: env.OPENAI_IMAGE_MODEL,
    prompt: fullPrompt,
    size: "1536x1024",
    quality: "high",
    n: 1,
  });

  const imageUrl = result.data?.[0]?.url;
  const b64 = result.data?.[0]?.b64_json;
  if (!imageUrl && !b64) throw new Error("OpenAI image generation returned no image data.");

  let imageBuffer: Buffer;
  if (b64) {
    imageBuffer = Buffer.from(b64, "base64");
  } else {
    const response = await fetch(imageUrl!, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Failed to fetch generated image: ${response.status}`);
    imageBuffer = Buffer.from(await response.arrayBuffer());
  }
  const original = await uploadImageFromBuffer(await addBrandLogo(imageBuffer, logo), "original");

  // Phase 2 wires actual per-platform resizing (sharp, in a Vercel Function,
  // or the optional Python FastAPI endpoint). For now every crop points at
  // the original until that pipeline is implemented.
  return {
    originalUrl: original,
    linkedinLandscapeUrl: original,
    linkedinSquareUrl: original,
    xImageUrl: original,
    thumbnailUrl: original,
  };
}
