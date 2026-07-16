import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("LinkedIn integration", () => {
  it("returns a simulated PUBLISHED result in simulation mode (no network call)", async () => {
    const { publishToLinkedIn } = await import("@/lib/integrations/linkedin");
    const result = await publishToLinkedIn({ linkedinCopy: "copy", imageUrl: "https://example.com/i.png", altText: "alt" }, null);
    expect(result.status).toBe("PUBLISHED");
    expect(result.platformPostId).toMatch(/^sim_li_/);
    expect(result.platformUrl).toContain("linkedin.com");
  });

  it("degrades to READY_FOR_MANUAL_PUBLISHING when not configured outside simulation mode", async () => {
    vi.resetModules();
    process.env.SIMULATION_MODE = "false";
    const { publishToLinkedIn } = await import("@/lib/integrations/linkedin");
    const result = await publishToLinkedIn({ linkedinCopy: "copy", imageUrl: "u", altText: "a" }, null);
    expect(result.status).toBe("READY_FOR_MANUAL_PUBLISHING");
    expect(result.errorType).toBe("NOT_CONNECTED");
    process.env.SIMULATION_MODE = "true";
    vi.resetModules();
  });
});

describe("X integration", () => {
  it("returns a simulated PUBLISHED result in simulation mode (no network call)", async () => {
    const { publishToX } = await import("@/lib/integrations/x");
    const result = await publishToX({ xCopy: "copy", imageUrl: "https://example.com/i.png", altText: "alt" }, null);
    expect(result.status).toBe("PUBLISHED");
    expect(result.platformPostId).toMatch(/^sim_x_/);
    expect(result.platformUrl).toContain("x.com");
  });

  it("degrades to READY_FOR_MANUAL_PUBLISHING when not configured outside simulation mode", async () => {
    vi.resetModules();
    process.env.SIMULATION_MODE = "false";
    const { publishToX } = await import("@/lib/integrations/x");
    const result = await publishToX({ xCopy: "copy", imageUrl: "u", altText: "a" }, null);
    expect(result.status).toBe("READY_FOR_MANUAL_PUBLISHING");
    expect(result.errorType).toBe("NOT_CONNECTED");
    process.env.SIMULATION_MODE = "true";
    vi.resetModules();
  });
});

describe("Resend email (simulation mode)", () => {
  it("logs and returns simulated:true instead of calling the Resend API", async () => {
    const { sendEmail } = await import("@/lib/email/resend");
    const result = await sendEmail({ to: ["reviewer@liceo.io"], subject: "Test", react: null as unknown as React.ReactElement });
    expect(result.simulated).toBe(true);
    expect(result.previewedTo).toEqual(["reviewer@liceo.io"]);
  });
});

describe("Vercel Blob upload guards", () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    global.fetch = originalFetch;
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("rejects unsupported content types before attempting any upload", async () => {
    const { assertValidImageUpload, InvalidUploadError } = await import("@/lib/storage/blob");
    expect(() => assertValidImageUpload("application/pdf", 1024)).toThrow(InvalidUploadError);
  });

  it("rejects oversized uploads", async () => {
    const { assertValidImageUpload, InvalidUploadError } = await import("@/lib/storage/blob");
    expect(() => assertValidImageUpload("image/png", 11 * 1024 * 1024)).toThrow(InvalidUploadError);
  });

  it("refuses to upload when BLOB_READ_WRITE_TOKEN is not configured", async () => {
    const { uploadImageFromBuffer } = await import("@/lib/storage/blob");
    await expect(uploadImageFromBuffer(Buffer.from("fake"), "original")).rejects.toThrow(/BLOB_READ_WRITE_TOKEN/);
  });
});
