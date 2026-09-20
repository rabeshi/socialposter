import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { addBrandLogo, loadBrandLogo } from "@/lib/ai/brand-image";

describe("brand image", () => {
  it("places the logo in the bottom right with an inset, preserving the image and logo proportions", async () => {
    const base = await sharp({ create: { width: 1000, height: 600, channels: 3, background: "#000000" } }).png().toBuffer();
    const logo = await sharp({ create: { width: 200, height: 50, channels: 4, background: "#ff0000" } }).png().toBuffer();
    const output = await addBrandLogo(base, logo);
    const { data, info } = await sharp(output).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    expect([info.width, info.height]).toEqual([1000, 600]);
    const pixel = (x: number, y: number) => [...data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3)];
    expect(pixel(900, 555)).toEqual([255, 0, 0]);
    expect(pixel(810, 530)).toEqual([255, 255, 255]);
    expect(pixel(999, 599)).toEqual([0, 0, 0]);
    expect(pixel(500, 300)).toEqual([0, 0, 0]);
    let redPixels = 0;
    for (let i = 0; i < data.length; i += 3) if (data[i] === 255 && data[i + 1] === 0 && data[i + 2] === 0) redPixels++;
    expect(redPixels).toBe(160 * 40);
  });

  it("rejects external sources and simulated placeholder logos", async () => {
    await expect(loadBrandLogo("https://example.com/logo.png")).rejects.toThrow("official Liceo logo");
    await expect(loadBrandLogo("/samples/liceo-sample-1.svg")).rejects.toThrow("official Liceo logo");
  });
});
