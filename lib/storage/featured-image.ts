export const FEATURED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_FEATURED_IMAGE_BYTES = 4 * 1024 * 1024;

export function featuredImageValidationError(file: { type: string; size: number }): string | null {
  if (!FEATURED_IMAGE_TYPES.includes(file.type)) return "Choose a PNG, JPEG, or WebP image.";
  if (file.size === 0) return "The image file is empty.";
  if (file.size > MAX_FEATURED_IMAGE_BYTES) return "Choose an image smaller than 4 MB.";
  return null;
}
