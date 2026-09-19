import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { POST, DELETE } from "@/app/api/uploads/featured-image/route";
import { featuredImageValidationError, MAX_FEATURED_IMAGE_BYTES } from "@/lib/storage/featured-image";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), save: vi.fn(), remove: vi.fn(), upload: vi.fn(), audit: vi.fn(),
  env: { SIMULATION_MODE: true, BLOB_READ_WRITE_TOKEN: "" },
}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/security", () => ({ rateLimit: () => true }));
vi.mock("@/lib/prisma", () => ({ prisma: { brandProfile: { upsert: mocks.save, updateMany: mocks.remove } } }));
vi.mock("@/lib/audit", () => ({ recordAudit: mocks.audit, clientIp: () => null }));
vi.mock("@/lib/storage/blob", () => ({ uploadImageFromBuffer: mocks.upload }));
vi.mock("@/lib/env", () => ({ getEnv: () => mocks.env }));

async function imageRequest(content?: Uint8Array, type = "image/png") {
  const bytes = content ?? await sharp({ create: { width: 20, height: 10, channels: 3, background: "#123456" } }).png().toBuffer();
  const body = new FormData();
  body.append("file", new File([new Uint8Array(bytes)], "featured.png", { type }));
  return new Request("http://localhost/api/uploads/featured-image", { method: "POST", body });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } });
  mocks.env.SIMULATION_MODE = true;
  mocks.env.BLOB_READ_WRITE_TOKEN = "";
  mocks.upload.mockResolvedValue("https://assets.public.blob.vercel-storage.com/featured.webp");
});

describe("brand featured image", () => {
  it("persists the actual uploaded image in simulation and returns a usable preview", async () => {
    const response = await POST(await imageRequest());
    expect(response.status).toBe(200);
    const { featuredImageUrl } = await response.json();
    expect(featuredImageUrl).toMatch(/^data:image\/webp;base64,/);
    const metadata = await sharp(Buffer.from(featuredImageUrl.split(",")[1], "base64")).metadata();
    expect(metadata.width).toBe(20);
    expect(metadata.height).toBe(10);
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ update: { featuredImageUrl } }));
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("saves the permanent storage URL for live uploads", async () => {
    mocks.env.SIMULATION_MODE = false;
    mocks.env.BLOB_READ_WRITE_TOKEN = "test-token";
    const response = await POST(await imageRequest());
    expect(response.status).toBe(200);
    const { featuredImageUrl } = await response.json();
    expect(featuredImageUrl).toBe("https://assets.public.blob.vercel-storage.com/featured.webp");
    expect(mocks.upload).toHaveBeenCalledWith(expect.any(Buffer), "brand/featured", "image/webp");
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ update: { featuredImageUrl } }));
  });

  it("rejects corrupt image bytes without changing the saved image", async () => {
    expect((await POST(await imageRequest(new TextEncoder().encode("not an image")))).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("rejects unsupported, empty, and oversized uploads", async () => {
    expect((await POST(await imageRequest(new TextEncoder().encode("<svg/>"), "image/svg+xml"))).status).toBe(400);
    expect(featuredImageValidationError({ type: "image/png", size: 0 })).toMatch(/empty/);
    expect(featuredImageValidationError({ type: "image/png", size: MAX_FEATURED_IMAGE_BYTES + 1 })).toMatch(/4 MB/);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("does not claim success when live storage is unavailable", async () => {
    mocks.env.SIMULATION_MODE = false;
    expect((await POST(await imageRequest())).status).toBe(503);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("restricts both upload and removal to admins", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "viewer", role: "VIEWER" } });
    expect((await POST(await imageRequest())).status).toBe(403);
    expect((await DELETE(new Request("http://localhost/api/uploads/featured-image", { method: "DELETE" }))).status).toBe(403);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("removes the saved featured image without changing other brand settings", async () => {
    const response = await DELETE(new Request("http://localhost/api/uploads/featured-image", { method: "DELETE" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ featuredImageUrl: null });
    expect(mocks.remove).toHaveBeenCalledWith({ where: { id: "singleton" }, data: { featuredImageUrl: null } });
  });
});
