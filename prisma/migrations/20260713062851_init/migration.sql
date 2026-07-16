-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'REVIEWER', 'VIEWER');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('SAAS_DISCOVERY', 'SAAS_COST_OPTIMIZATION', 'SAAS_SPRAWL', 'SHADOW_IT', 'SOFTWARE_USAGE_LICENSE_MANAGEMENT', 'AI_POWERED_SAAS_GOVERNANCE', 'SECURITY_RISK_COMPLIANCE', 'SOFTWARE_PROCUREMENT_VENDOR_MANAGEMENT', 'OPERATIONAL_EFFICIENCY_AUTOMATION', 'BUILDING_LICEO');

-- CreateEnum
CREATE TYPE "GenerationSource" AS ENUM ('SCHEDULED', 'MANUAL');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('LINKEDIN', 'X');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('GENERATING', 'GENERATION_FAILED', 'PENDING_REVIEW', 'REVISION_REQUESTED', 'CANDIDATE_SELECTED', 'NOT_SELECTED', 'REJECTED', 'APPROVED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'PARTIALLY_PUBLISHED', 'PUBLICATION_FAILED', 'READY_FOR_MANUAL_PUBLISHING', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED', 'REVISION_REQUESTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'REVIEWER',
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_profiles" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT 'Liceo',
    "companyDescription" TEXT NOT NULL,
    "productDescription" TEXT NOT NULL,
    "brandVoice" TEXT NOT NULL,
    "approvedTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prohibitedTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "logoUrl" TEXT,
    "brandColors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "website" TEXT NOT NULL DEFAULT 'https://liceo.io',
    "standardHashtags" TEXT[] DEFAULT ARRAY['#Liceo']::TEXT[],
    "hashtagMinCount" INTEGER NOT NULL DEFAULT 3,
    "hashtagMaxCount" INTEGER NOT NULL DEFAULT 5,
    "allowUrlsInLinkedIn" BOOLEAN NOT NULL DEFAULT false,
    "approvalEmailRecipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_settings" (
    "id" TEXT NOT NULL,
    "automationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "generationIntervalDays" INTEGER NOT NULL DEFAULT 2,
    "generationTimezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "preferredLocalGenerationTime" TEXT NOT NULL DEFAULT '09:00',
    "lastSuccessfulGenerationAt" TIMESTAMP(3),
    "nextGenerationAt" TIMESTAMP(3),
    "skipNextGeneration" BOOLEAN NOT NULL DEFAULT false,
    "reminderIntervalHours" INTEGER NOT NULL DEFAULT 24,
    "maxReminders" INTEGER NOT NULL DEFAULT 2,
    "remindersSentForCurrentBatch" INTEGER NOT NULL DEFAULT 0,
    "defaultPlatforms" "Platform"[] DEFAULT ARRAY['LINKEDIN', 'X']::"Platform"[],
    "defaultPublicationHour" INTEGER NOT NULL DEFAULT 9,
    "defaultPublicationMinute" INTEGER NOT NULL DEFAULT 0,
    "publishingPaused" BOOLEAN NOT NULL DEFAULT false,
    "manualPublishingFallback" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_batches" (
    "id" TEXT NOT NULL,
    "generationSource" "GenerationSource" NOT NULL DEFAULT 'MANUAL',
    "generationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ContentStatus" NOT NULL DEFAULT 'GENERATING',
    "categories" "Category"[],
    "model" TEXT NOT NULL DEFAULT 'simulation',
    "idempotencyKey" TEXT NOT NULL,
    "errorDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_candidates" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "contentAngle" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "headline" TEXT,
    "linkedinCopy" TEXT NOT NULL,
    "xCopy" TEXT NOT NULL,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imagePrompt" TEXT NOT NULL,
    "originalImageUrl" TEXT,
    "linkedinLandscapeUrl" TEXT,
    "linkedinSquareUrl" TEXT,
    "xImageUrl" TEXT,
    "thumbnailUrl" TEXT,
    "altText" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "qualityScore" DOUBLE PRECISION,
    "similarityScore" DOUBLE PRECISION,
    "factualityNotes" TEXT,
    "riskNotes" TEXT,
    "suggestedPublicationDate" TIMESTAMP(3),
    "suggestedPublicationTime" TEXT,
    "reviewerConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_versions" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "linkedinCopy" TEXT NOT NULL,
    "xCopy" TEXT NOT NULL,
    "imagePrompt" TEXT,
    "imageUrls" JSONB,
    "changeReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "comments" TEXT,
    "approvedVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'APPROVED',
    "scheduledTime" TIMESTAMP(3),
    "publicationTime" TIMESTAMP(3),
    "platformPostId" TEXT,
    "platformUrl" TEXT,
    "errorType" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_connections" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "externalAccountId" TEXT,
    "connectedByUserId" TEXT,
    "connectedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "content_batches_idempotencyKey_key" ON "content_batches"("idempotencyKey");

-- CreateIndex
CREATE INDEX "content_batches_status_idx" ON "content_batches"("status");

-- CreateIndex
CREATE INDEX "post_candidates_batchId_idx" ON "post_candidates"("batchId");

-- CreateIndex
CREATE INDEX "post_candidates_status_idx" ON "post_candidates"("status");

-- CreateIndex
CREATE UNIQUE INDEX "content_versions_candidateId_version_key" ON "content_versions"("candidateId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "publications_idempotencyKey_key" ON "publications"("idempotencyKey");

-- CreateIndex
CREATE INDEX "publications_candidateId_idx" ON "publications"("candidateId");

-- CreateIndex
CREATE INDEX "publications_status_idx" ON "publications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "platform_connections_platform_key" ON "platform_connections"("platform");

-- CreateIndex
CREATE INDEX "audit_logs_objectType_objectId_idx" ON "audit_logs"("objectType", "objectId");

-- AddForeignKey
ALTER TABLE "post_candidates" ADD CONSTRAINT "post_candidates_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "content_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "post_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "post_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "post_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
