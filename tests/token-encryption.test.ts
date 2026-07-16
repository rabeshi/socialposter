import { describe, it, expect } from "vitest";
import { encryptToken, decryptToken } from "@/lib/token-encryption";

describe("token encryption", () => {
  it("round-trips a plaintext token", () => {
    const plaintext = "super-secret-access-token-value";
    const encrypted = encryptToken(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(decryptToken(encrypted)).toBe(plaintext);
  });

  it("produces different ciphertext for the same plaintext (random IV)", () => {
    const a = encryptToken("same-value");
    const b = encryptToken("same-value");
    expect(a).not.toBe(b);
  });

  it("fails to decrypt tampered ciphertext", () => {
    const encrypted = encryptToken("value");
    const tampered = encrypted.slice(0, -4) + "abcd";
    expect(() => decryptToken(tampered)).toThrow();
  });
});
