import { beforeEach, describe, expect, it, vi } from "vitest";
import { featuredImageSet, generateImageSet } from "@/lib/ai/image-generator";
const m = vi.hoisted(() => ({
  env: { SIMULATION_MODE: false, USE_REAL_AI_IMAGES: false, OPENAI_API_KEY: "", BLOB_READ_WRITE_TOKEN: "test" },
  load: vi.fn(), composite: vi.fn(), upload: vi.fn(),
}));
vi.mock("@/lib/env", () => ({ getEnv: () => m.env }));
vi.mock("@/lib/ai/brand-image", () => ({ loadBrandLogo: m.load, addBrandLogo: m.composite }));
vi.mock("@/lib/storage/blob", () => ({ uploadImageFromBuffer: m.upload }));
beforeEach(() => {
  vi.clearAllMocks();
  m.load.mockImplementation(async (url) => Buffer.from(url));
  m.composite.mockResolvedValue(Buffer.from("branded screenshot"));
  m.upload.mockResolvedValue("https://assets/branded-featured.png");
});
describe("branded image policy", () => {
  it("does not silently substitute unbranded placeholders in live mode", async () => {
    await expect(generateImageSet("An illustration", [], 0, "https://assets/logo.png")).rejects.toThrow("Live branded images");
  });
  it("reuses the actual featured image and composites the official logo before storage", async () => {
    const result = await featuredImageSet("https://assets/featured.png", "https://assets/logo.png");
    expect(m.composite).toHaveBeenCalledWith(Buffer.from("https://assets/featured.png"), Buffer.from("https://assets/logo.png"));
    expect(m.upload).toHaveBeenCalledWith(Buffer.from("branded screenshot"), "brand/weekly-featured");
    expect(result.originalUrl).toBe("https://assets/branded-featured.png");
  });
});
