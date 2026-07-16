import { describe, it, expect } from "vitest";
import { ContentStatus } from "@prisma/client";
import {
  assertLegalTransition,
  assertReadyToPublish,
  buildPublicationIdempotencyKey,
  combinePublicationStatuses,
  IllegalTransitionError,
  shouldRetry,
} from "@/lib/scheduling/publishing";

describe("candidate status transitions", () => {
  it("allows PENDING_REVIEW -> CANDIDATE_SELECTED", () => {
    expect(() => assertLegalTransition(ContentStatus.PENDING_REVIEW, ContentStatus.CANDIDATE_SELECTED)).not.toThrow();
  });

  it("blocks PENDING_REVIEW -> PUBLISHED directly", () => {
    expect(() => assertLegalTransition(ContentStatus.PENDING_REVIEW, ContentStatus.PUBLISHED)).toThrow(IllegalTransitionError);
  });

  it("blocks CANDIDATE_SELECTED -> PUBLISHED (must pass through APPROVED)", () => {
    expect(() => assertLegalTransition(ContentStatus.CANDIDATE_SELECTED, ContentStatus.PUBLISHED)).toThrow(IllegalTransitionError);
  });

  it("allows APPROVED -> PUBLISHING", () => {
    expect(() => assertLegalTransition(ContentStatus.APPROVED, ContentStatus.PUBLISHING)).not.toThrow();
  });
});

describe("assertReadyToPublish", () => {
  it("permits APPROVED and SCHEDULED candidates to enter the publish flow", () => {
    expect(() => assertReadyToPublish(ContentStatus.APPROVED)).not.toThrow();
    expect(() => assertReadyToPublish(ContentStatus.SCHEDULED)).not.toThrow();
  });

  it("rejects publishing directly from PENDING_REVIEW or CANDIDATE_SELECTED", () => {
    expect(() => assertReadyToPublish(ContentStatus.PENDING_REVIEW)).toThrow();
    expect(() => assertReadyToPublish(ContentStatus.CANDIDATE_SELECTED)).toThrow();
  });
});

describe("buildPublicationIdempotencyKey", () => {
  it("is deterministic per candidate + platform", () => {
    const key1 = buildPublicationIdempotencyKey("cand123", "LINKEDIN" as never);
    const key2 = buildPublicationIdempotencyKey("cand123", "LINKEDIN" as never);
    expect(key1).toBe(key2);
  });

  it("differs across platforms for the same candidate", () => {
    const li = buildPublicationIdempotencyKey("cand123", "LINKEDIN" as never);
    const x = buildPublicationIdempotencyKey("cand123", "X" as never);
    expect(li).not.toBe(x);
  });
});

describe("combinePublicationStatuses", () => {
  it("reports PUBLISHED when every platform succeeded", () => {
    expect(combinePublicationStatuses([ContentStatus.PUBLISHED, ContentStatus.PUBLISHED])).toBe(ContentStatus.PUBLISHED);
  });

  it("reports PARTIALLY_PUBLISHED when one platform succeeds and another fails", () => {
    expect(combinePublicationStatuses([ContentStatus.PUBLISHED, ContentStatus.PUBLICATION_FAILED])).toBe(
      ContentStatus.PARTIALLY_PUBLISHED
    );
  });

  it("reports PUBLICATION_FAILED when every platform failed", () => {
    expect(combinePublicationStatuses([ContentStatus.PUBLICATION_FAILED, ContentStatus.PUBLICATION_FAILED])).toBe(
      ContentStatus.PUBLICATION_FAILED
    );
  });
});

describe("shouldRetry", () => {
  it("never retries permanent authorization failures", () => {
    expect(shouldRetry(0, "AUTH_REVOKED")).toBe(false);
    expect(shouldRetry(0, "INVALID_PERMISSIONS")).toBe(false);
  });

  it("retries transient errors up to the retry cap", () => {
    expect(shouldRetry(0, "NETWORK_ERROR")).toBe(true);
    expect(shouldRetry(2, "NETWORK_ERROR")).toBe(true);
    expect(shouldRetry(3, "NETWORK_ERROR")).toBe(false);
  });
});
