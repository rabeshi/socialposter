import { ContentStatus, Platform } from "@prisma/client";
import { nanoid } from "nanoid";

/**
 * Legal predecessor statuses for each workflow transition. Enforced in the
 * API layer so "Pending Review -> Published" (or any other skip) is
 * structurally impossible regardless of client input.
 */
export const CANDIDATE_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  GENERATING: [],
  GENERATION_FAILED: [],
  PENDING_REVIEW: [ContentStatus.GENERATING],
  CANDIDATE_SELECTED: [ContentStatus.PENDING_REVIEW],
  NOT_SELECTED: [ContentStatus.PENDING_REVIEW],
  REVISION_REQUESTED: [ContentStatus.CANDIDATE_SELECTED],
  REJECTED: [ContentStatus.PENDING_REVIEW, ContentStatus.CANDIDATE_SELECTED],
  APPROVED: [ContentStatus.CANDIDATE_SELECTED, ContentStatus.REVISION_REQUESTED],
  SCHEDULED: [ContentStatus.APPROVED],
  PUBLISHING: [ContentStatus.APPROVED, ContentStatus.SCHEDULED],
  READY_FOR_MANUAL_PUBLISHING: [ContentStatus.APPROVED, ContentStatus.SCHEDULED, ContentStatus.PUBLISHING],
  PUBLISHED: [ContentStatus.PUBLISHING],
  PARTIALLY_PUBLISHED: [ContentStatus.PUBLISHING],
  PUBLICATION_FAILED: [ContentStatus.PUBLISHING],
  CANCELLED: [
    ContentStatus.PENDING_REVIEW,
    ContentStatus.CANDIDATE_SELECTED,
    ContentStatus.APPROVED,
    ContentStatus.SCHEDULED,
  ],
};

export class IllegalTransitionError extends Error {
  constructor(from: ContentStatus, to: ContentStatus) {
    super(`Illegal candidate status transition: ${from} -> ${to}`);
    this.name = "IllegalTransitionError";
  }
}

export function assertLegalTransition(from: ContentStatus, to: ContentStatus): void {
  const allowedFrom = CANDIDATE_TRANSITIONS[to];
  if (!allowedFrom.includes(from)) {
    throw new IllegalTransitionError(from, to);
  }
}

/**
 * A candidate may only ever move to PUBLISHING (and therefore acquire
 * Publication rows) from APPROVED or SCHEDULED — never directly from
 * PENDING_REVIEW or CANDIDATE_SELECTED. This is the single choke point that
 * guarantees "select" and "publish" remain separate actions.
 */
export function assertReadyToPublish(status: ContentStatus): void {
  if (status !== ContentStatus.APPROVED && status !== ContentStatus.SCHEDULED) {
    throw new IllegalTransitionError(status, ContentStatus.PUBLISHING);
  }
}

export function buildPublicationIdempotencyKey(candidateId: string, platform: Platform): string {
  return `pub_${candidateId}_${platform}`;
}

export function buildBatchIdempotencyKey(dateKey: string, source: string): string {
  return `batch_${dateKey}_${source}_${nanoid(8)}`;
}

/** Combined status across LINKEDIN + X publications for a candidate. */
export function combinePublicationStatuses(statuses: ContentStatus[]): ContentStatus {
  if (statuses.length === 0) return ContentStatus.APPROVED;
  const allPublished = statuses.every((s) => s === ContentStatus.PUBLISHED);
  if (allPublished) return ContentStatus.PUBLISHED;

  const anyPublished = statuses.some((s) => s === ContentStatus.PUBLISHED);
  const anyFailed = statuses.some(
    (s) => s === ContentStatus.PUBLICATION_FAILED || s === ContentStatus.READY_FOR_MANUAL_PUBLISHING
  );
  if (anyPublished && anyFailed) return ContentStatus.PARTIALLY_PUBLISHED;

  if (statuses.every((s) => s === ContentStatus.PUBLICATION_FAILED)) return ContentStatus.PUBLICATION_FAILED;

  return ContentStatus.PUBLISHING;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export function backoffDelayMs(retryCount: number): number {
  return BASE_DELAY_MS * 2 ** retryCount;
}

export function shouldRetry(retryCount: number, errorType: string | null | undefined): boolean {
  if (retryCount >= MAX_RETRIES) return false;
  // Permanent authorization failures must never be retried automatically.
  if (errorType === "AUTH_REVOKED" || errorType === "INVALID_PERMISSIONS") return false;
  return true;
}
