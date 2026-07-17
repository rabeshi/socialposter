CREATE TABLE "social_account_snapshots" (
  "id" TEXT NOT NULL,
  "platform" "Platform" NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "followers" INTEGER,
  "newFollowers" INTEGER,
  "impressions" INTEGER,
  "reach" INTEGER,
  "engagements" INTEGER,
  "profileViews" INTEGER,
  "pageViews" INTEGER,
  "websiteClicks" INTEGER,
  "linkClicks" INTEGER,
  "mentions" INTEGER,
  "leads" INTEGER,
  "audience" JSONB,
  CONSTRAINT "social_account_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_post_metric_snapshots" (
  "id" TEXT NOT NULL,
  "publicationId" TEXT NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "impressions" INTEGER,
  "reach" INTEGER,
  "likes" INTEGER,
  "comments" INTEGER,
  "reposts" INTEGER,
  "saves" INTEGER,
  "clicks" INTEGER,
  "replies" INTEGER,
  "quotes" INTEGER,
  "bookmarks" INTEGER,
  "videoViews" INTEGER,
  "watchTimeSeconds" INTEGER,
  "videoCompletionRate" DOUBLE PRECISION,
  CONSTRAINT "social_post_metric_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "website_conversion_events" (
  "id" TEXT NOT NULL,
  "platform" "Platform",
  "publicationId" TEXT,
  "eventType" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  CONSTRAINT "website_conversion_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "social_account_snapshots_platform_capturedAt_idx" ON "social_account_snapshots"("platform", "capturedAt");
CREATE INDEX "social_post_metric_snapshots_publicationId_capturedAt_idx" ON "social_post_metric_snapshots"("publicationId", "capturedAt");
CREATE INDEX "website_conversion_events_platform_occurredAt_idx" ON "website_conversion_events"("platform", "occurredAt");
CREATE INDEX "website_conversion_events_publicationId_idx" ON "website_conversion_events"("publicationId");

ALTER TABLE "social_post_metric_snapshots" ADD CONSTRAINT "social_post_metric_snapshots_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "website_conversion_events" ADD CONSTRAINT "website_conversion_events_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "publications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
