import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { signReviewLink, verifyReviewLink } from "@/lib/security";

describe("signed review links", () => {
  it("round-trips a valid token back to its batchId", () => {
    const token = signReviewLink("batch_abc123");
    const payload = verifyReviewLink(token);
    expect(payload?.batchId).toBe("batch_abc123");
  });

  it("rejects a token signed with a different secret", () => {
    const forged = jwt.sign({ batchId: "batch_abc123", purpose: "review" }, "wrong-secret");
    expect(verifyReviewLink(forged)).toBeNull();
  });

  it("rejects an expired token", () => {
    const expired = jwt.sign({ batchId: "batch_abc123", purpose: "review" }, process.env.AUTH_SECRET!, { expiresIn: -10 });
    expect(verifyReviewLink(expired)).toBeNull();
  });

  it("rejects a token with the wrong purpose claim", () => {
    const wrongPurpose = jwt.sign({ batchId: "batch_abc123", purpose: "other" }, process.env.AUTH_SECRET!);
    expect(verifyReviewLink(wrongPurpose)).toBeNull();
  });

  it("rejects garbage input", () => {
    expect(verifyReviewLink("not-a-real-token")).toBeNull();
  });
});
