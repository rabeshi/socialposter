import { getEnv } from "@/lib/env";
import { buildImagePrompt } from "@/lib/ai/prompts";
import { uploadImageFromBuffer, uploadImageFromUrl } from "@/lib/storage/blob";

export interface GeneratedImageSet {
  originalUrl: string;
  linkedinLandscapeUrl: string;
  linkedinSquareUrl: string;
  xImageUrl: string;
  thumbnailUrl: string;
}

const SAMPLE_IMAGES = [
  "/samples/liceo-sample-1.svg",
  "/samples/liceo-sample-2.svg",
  "/samples/liceo-sample-3.svg",
];

/**
 * Generates one image and its platform-specific crops. In simulation mode
 * (default, or when OPENAI_API_KEY is absent) this returns bundled local
 * sample assets so the review UI and image pipeline can be fully exercised
 * without any paid API calls or Blob storage configured.
 *
 * The real path (OpenAI image generation + Blob upload + resizing) is
 * wired for Phase 2: it calls OpenAI's image API, then re-uses the same
 * `uploadImageFromUrl`/`uploadImageFromBuffer` + resize pipeline so the
 * caller's contract never changes between simulation and production.
 */
export async function generateImageSet(prompt: string, brandColors: string[], seed: number): Promise<GeneratedImageSet> {
  const env = getEnv();

  if (!env.USE_REAL_AI_IMAGES || !env.OPENAI_API_KEY || !env.BLOB_READ_WRITE_TOKEN) {
    const sample = SAMPLE_IMAGES[seed % SAMPLE_IMAGES.length]!;
    return {
      originalUrl: sample,
      linkedinLandscapeUrl: sample,
      linkedinSquareUrl: sample,
      xImageUrl: sample,
      thumbnailUrl: sample,
    };
  }

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  const fullPrompt = buildImagePrompt(prompt, brandColors);
  const result = await client.images.generate({
    model: env.OPENAI_IMAGE_MODEL,
    prompt: fullPrompt,
    size: "1792x1024",
    n: 1,
  });

  const imageUrl = result.data?.[0]?.url;
  const b64 = result.data?.[0]?.b64_json;
  if (!imageUrl && !b64) throw new Error("OpenAI image generation returned no image data.");

  const original = imageUrl
    ? await uploadImageFromUrl(imageUrl, "original")
    : await uploadImageFromBuffer(Buffer.from(b64!, "base64"), "original");

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
