import { beforeEach, describe, expect, it, vi } from "vitest";
import { featuredImageWeek, weeklyFeaturedMarker } from "@/lib/scheduling/weekly-featured-image";
import { GET } from "@/app/api/cron/generate-content/route";

const m = vi.hoisted(() => ({
  featured: vi.fn(), generatedImage: vi.fn(), generatedCopy: vi.fn(), createCandidate: vi.fn(),
  findCandidate: vi.fn(), brand: vi.fn(), transaction: vi.fn(),
}));
vi.mock("@/lib/security", () => ({ assertCronAuthorized: vi.fn(), UnauthorizedError: class extends Error {} }));
vi.mock("@/lib/scheduling/generation", () => ({ decideWhetherToGenerate: () => ({ shouldGenerate: true }), computeNextGenerationAt: () => new Date() }));
vi.mock("@/lib/scheduling/publishing", () => ({ buildBatchIdempotencyKey: () => "batch_test_scheduled" }));
vi.mock("@/lib/email/send-approval-email", () => ({ sendApprovalEmail: vi.fn() }));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/lib/duplicate-detection/similarity", () => ({ detectSimilarity: async () => [] }));
vi.mock("@/lib/ai/image-generator", () => ({ generateImageSet: m.generatedImage, featuredImageSet: m.featured }));
vi.mock("@/lib/ai/content-generator", () => ({ generateCandidates: m.generatedCopy }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  automationSettings: { upsert: async () => ({ generationTimezone: "America/Los_Angeles", generationIntervalDays: 2, preferredLocalGenerationTime: "09:00" }), update: vi.fn() },
  brandProfile: { findFirst: m.brand },
  contentBatch: { findFirst: async () => null, create: async () => ({ id: "batch-1" }), update: vi.fn() },
  postCandidate: { findFirst: m.findCandidate, findMany: async () => [], create: m.createCandidate, update: vi.fn() },
  $transaction: m.transaction,
} }));

const images = (url: string) => ({ originalUrl: url, linkedinLandscapeUrl: url, linkedinSquareUrl: url, xImageUrl: url, thumbnailUrl: url });
beforeEach(() => {
  vi.clearAllMocks();
  m.brand.mockResolvedValue({ featuredImageUrl: "https://assets/featured.png", logoUrl: "https://assets/logo.png", brandColors: [] });
  m.findCandidate.mockResolvedValue(null);
  m.featured.mockResolvedValue(images("https://assets/branded-featured.png"));
  m.generatedImage.mockResolvedValue(images("https://assets/illustration.png"));
  m.generatedCopy.mockImplementation(async ({ categories }) => ({ candidates: categories.map((category: string) => ({
    category, hook: `Hook for ${category}`, imagePrompt: "Original topic illustration", altText: "Original alt text", linkedinCopy: "Copy", hashtags: ["#Liceo"],
  })) }));
  m.createCandidate.mockImplementation(async ({ data }) => ({ id: `id-${data.category}`, ...data }));
  m.transaction.mockImplementation(async (operations) => Promise.all(operations));
});

describe("weekly featured image", () => {
  it("uses local Monday boundaries, including DST and year rollover", () => {
    expect(featuredImageWeek(new Date("2026-09-21T06:59:00Z"), "America/Los_Angeles")).toBe("2026-09-14");
    expect(featuredImageWeek(new Date("2026-09-21T07:00:00Z"), "America/Los_Angeles")).toBe("2026-09-21");
    expect(featuredImageWeek(new Date("2026-11-02T07:59:00Z"), "America/Los_Angeles")).toBe("2026-10-26");
    expect(featuredImageWeek(new Date("2026-11-02T08:00:00Z"), "America/Los_Angeles")).toBe("2026-11-02");
    expect(featuredImageWeek(new Date("2027-01-01T12:00:00Z"), "America/Los_Angeles")).toBe("2026-12-28");
  });

  it("adds one actual featured image and two new illustrations to the first scheduled batch", async () => {
    expect((await GET(new Request("http://localhost/api/cron/generate-content"))).status).toBe(200);
    expect(m.featured).toHaveBeenCalledOnce();
    expect(m.featured).toHaveBeenCalledWith("https://assets/featured.png", "https://assets/logo.png");
    expect(m.generatedImage).toHaveBeenCalledTimes(2);
    const data = m.createCandidate.mock.calls.map(([arg]) => arg.data);
    expect(data).toHaveLength(3);
    const featured = data.filter((c) => c.imagePrompt.startsWith("[weekly-feature:"));
    expect(featured).toHaveLength(1);
    expect(featured[0].category).toBe("BUILDING_LICEO");
    expect(featured[0].originalImageUrl).toBe("https://assets/branded-featured.png");
    expect(data.every((c) => c.status === "PENDING_REVIEW")).toBe(true);
    expect(m.transaction).toHaveBeenCalledOnce();
    expect(m.generatedCopy.mock.calls[0]![0].contentBrief).toContain("illustrative");
  });

  it("keeps subsequent batches in the same week creative without repeating the featured image", async () => {
    m.findCandidate.mockResolvedValue({ id: "already-featured" });
    await GET(new Request("http://localhost/api/cron/generate-content"));
    expect(m.featured).not.toHaveBeenCalled();
    expect(m.generatedImage).toHaveBeenCalledTimes(3);
    expect(m.generatedCopy.mock.calls[0]![0].contentBrief).toBeUndefined();
    expect(m.findCandidate.mock.calls[0]![0].where.imagePrompt.startsWith).toBe(weeklyFeaturedMarker(featuredImageWeek(new Date(), "America/Los_Angeles")));
  });

  it("still produces three illustrations when the featured image has been removed", async () => {
    m.brand.mockResolvedValue({ featuredImageUrl: null, logoUrl: "https://assets/logo.png", brandColors: [] });
    await GET(new Request("http://localhost/api/cron/generate-content"));
    expect(m.findCandidate).not.toHaveBeenCalled();
    expect(m.featured).not.toHaveBeenCalled();
    expect(m.generatedImage).toHaveBeenCalledTimes(3);
  });

  it("does not persist a weekly slot when image generation fails", async () => {
    m.featured.mockRejectedValueOnce(new Error("storage unavailable"));
    expect((await GET(new Request("http://localhost/api/cron/generate-content"))).status).toBe(500);
    expect(m.createCandidate).not.toHaveBeenCalled();
    expect(m.transaction).not.toHaveBeenCalled();
  });
});
