-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('TRAINING_CENTRE', 'DISTRICT_OFFICER', 'QUALITY_OFFICER', 'STATE_OFFICER', 'ADMIN');

-- CreateEnum
CREATE TYPE "batch_status" AS ENUM ('DRAFT', 'SUBMITTED', 'DISTRICT_REVIEW', 'QUALITY_REVIEW', 'STATE_REVIEW', 'APPROVED', 'ISSUING', 'ISSUED', 'RETURNED', 'REJECTED');

-- CreateEnum
CREATE TYPE "approval_stage" AS ENUM ('DISTRICT', 'QUALITY', 'STATE');

-- CreateEnum
CREATE TYPE "approval_decision" AS ENUM ('APPROVED', 'REJECTED', 'RETURNED');

-- CreateEnum
CREATE TYPE "certificate_status" AS ENUM ('PENDING_GENERATION', 'ISSUED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "delivery_status" AS ENUM ('NOT_STARTED', 'PENDING', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "delivery_attempt_status" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'TIMEOUT', 'RETRY_SCHEDULED');

-- CreateEnum
CREATE TYPE "ai_analysis_status" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ai_chat_role" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "outbox_status" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED');

-- CreateTable
CREATE TABLE "districts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "state_name" VARCHAR(120) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_centres" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "district_id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "contact_email" VARCHAR(320),
    "contact_phone" VARCHAR(32),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "training_centres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(320) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "role" "user_role" NOT NULL,
    "district_id" UUID,
    "training_centre_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_number" VARCHAR(64) NOT NULL,
    "training_centre_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "district_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "current_version_id" UUID,
    "current_version_number" INTEGER NOT NULL DEFAULT 0,
    "current_status" "batch_status" NOT NULL DEFAULT 'DRAFT',
    "row_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_working_drafts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "notes" TEXT,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "batch_working_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_draft_candidates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "working_draft_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "registration_id" VARCHAR(64),
    "candidate_id" UUID,
    "full_name" VARCHAR(200) NOT NULL,
    "phone_e164" VARCHAR(32),
    "email" VARCHAR(320),
    "date_of_birth" DATE,
    "payload" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "batch_draft_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "batch_status" NOT NULL,
    "candidate_count" INTEGER NOT NULL,
    "quality_review_threshold_applied" INTEGER NOT NULL,
    "requires_quality_review" BOOLEAN NOT NULL,
    "district_approvals_required" INTEGER NOT NULL,
    "quality_approvals_required" INTEGER NOT NULL,
    "state_approvals_required" INTEGER NOT NULL,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL,
    "submitted_by_user_id" UUID NOT NULL,
    "return_reason" TEXT,
    "reject_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "batch_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "registration_id" VARCHAR(64),
    "full_name" VARCHAR(200) NOT NULL,
    "date_of_birth" DATE,
    "gender" VARCHAR(32),
    "phone_e164" VARCHAR(32),
    "email" VARCHAR(320),
    "address_line" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_candidates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_version_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "registration_id_snapshot" VARCHAR(64),
    "result_status" VARCHAR(32) NOT NULL,
    "import_payload" JSONB,
    "is_eligible_for_certificate" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "batch_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_version_id" UUID NOT NULL,
    "stage" "approval_stage" NOT NULL,
    "decision" "approval_decision" NOT NULL,
    "officer_id" UUID NOT NULL,
    "reason" TEXT,
    "decided_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_corrections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "approval_id" UUID NOT NULL,
    "correction_number" INTEGER NOT NULL,
    "corrected_decision" "approval_decision" NOT NULL,
    "reason" TEXT NOT NULL,
    "corrected_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_candidate_id" UUID NOT NULL,
    "certificate_number" VARCHAR(64) NOT NULL,
    "issuance_year" INTEGER NOT NULL,
    "certificate_status" "certificate_status" NOT NULL DEFAULT 'PENDING_GENERATION',
    "delivery_status" "delivery_status" NOT NULL DEFAULT 'NOT_STARTED',
    "issued_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "cancelled_by_user_id" UUID,
    "cancellation_reason" TEXT,
    "file_storage_key" VARCHAR(512),
    "verification_code" VARCHAR(64),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "certificate_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "channel" VARCHAR(32) NOT NULL DEFAULT 'WHATSAPP',
    "provider" VARCHAR(64) NOT NULL,
    "provider_message_id" VARCHAR(128),
    "idempotency_key" VARCHAR(128) NOT NULL,
    "status" "delivery_attempt_status" NOT NULL,
    "error_code" VARCHAR(64),
    "error_message" TEXT,
    "request_payload_hash" VARCHAR(128),
    "attempted_at" TIMESTAMPTZ(3) NOT NULL,
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(64) NOT NULL,
    "entity_id" UUID NOT NULL,
    "batch_id" UUID,
    "batch_version_id" UUID,
    "ip_address" INET,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_type" VARCHAR(100) NOT NULL,
    "aggregate_type" VARCHAR(64) NOT NULL,
    "aggregate_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "idempotency_key" VARCHAR(128) NOT NULL,
    "status" "outbox_status" NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMPTZ(3) NOT NULL,
    "locked_at" TIMESTAMPTZ(3),
    "processed_at" TIMESTAMPTZ(3),
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(3),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analyses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_version_id" UUID NOT NULL,
    "requested_by_user_id" UUID,
    "provider" VARCHAR(64) NOT NULL,
    "model_name" VARCHAR(128) NOT NULL,
    "status" "ai_analysis_status" NOT NULL,
    "summary" TEXT,
    "raw_response_ref" VARCHAR(512),
    "prompt_version" VARCHAR(64),
    "started_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_findings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ai_analysis_id" UUID NOT NULL,
    "severity" VARCHAR(64) NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "detail" TEXT NOT NULL,
    "related_batch_candidate_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_finding_feedback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ai_finding_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" VARCHAR(32) NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_finding_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_chat_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "batch_id" UUID,
    "batch_version_id" UUID,
    "title" VARCHAR(255),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ai_chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_chat_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "role" "ai_chat_role" NOT NULL,
    "content" TEXT NOT NULL,
    "token_count" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "districts_code_key" ON "districts"("code");

-- CreateIndex
CREATE INDEX "districts_is_active_idx" ON "districts"("is_active");

-- CreateIndex
CREATE INDEX "districts_name_idx" ON "districts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "training_centres_code_key" ON "training_centres"("code");

-- CreateIndex
CREATE INDEX "training_centres_district_id_idx" ON "training_centres"("district_id");

-- CreateIndex
CREATE INDEX "training_centres_is_active_idx" ON "training_centres"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "courses_code_key" ON "courses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_is_active_idx" ON "users"("role", "is_active");

-- CreateIndex
CREATE INDEX "users_district_id_idx" ON "users"("district_id");

-- CreateIndex
CREATE INDEX "users_training_centre_id_idx" ON "users"("training_centre_id");

-- CreateIndex
CREATE UNIQUE INDEX "batches_batch_number_key" ON "batches"("batch_number");

-- CreateIndex
CREATE INDEX "batches_training_centre_id_current_status_idx" ON "batches"("training_centre_id", "current_status");

-- CreateIndex
CREATE INDEX "batches_district_id_current_status_idx" ON "batches"("district_id", "current_status");

-- CreateIndex
CREATE INDEX "batches_current_status_updated_at_idx" ON "batches"("current_status", "updated_at");

-- CreateIndex
CREATE INDEX "batches_course_id_idx" ON "batches"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "batch_working_drafts_batch_id_key" ON "batch_working_drafts"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "batch_draft_candidates_working_draft_id_row_number_key" ON "batch_draft_candidates"("working_draft_id", "row_number");

-- CreateIndex
CREATE INDEX "batch_versions_batch_id_version_number_idx" ON "batch_versions"("batch_id", "version_number" DESC);

-- CreateIndex
CREATE INDEX "batch_versions_status_submitted_at_idx" ON "batch_versions"("status", "submitted_at");

-- CreateIndex
CREATE INDEX "batch_versions_requires_quality_review_status_idx" ON "batch_versions"("requires_quality_review", "status");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "batch_versions_batch_id_version_number_key" ON "batch_versions"("batch_id", "version_number");

-- CreateIndex
CREATE INDEX "candidates_phone_e164_idx" ON "candidates"("phone_e164");

-- CreateIndex
CREATE INDEX "candidates_full_name_idx" ON "candidates"("full_name");

-- CreateIndex
CREATE INDEX "batch_candidates_candidate_id_idx" ON "batch_candidates"("candidate_id");

-- CreateIndex
CREATE INDEX "batch_candidates_batch_version_id_is_eligible_for_certifica_idx" ON "batch_candidates"("batch_version_id", "is_eligible_for_certificate");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "batch_candidates_batch_version_id_candidate_id_key" ON "batch_candidates"("batch_version_id", "candidate_id");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "batch_candidates_batch_version_id_row_number_key" ON "batch_candidates"("batch_version_id", "row_number");

-- CreateIndex
CREATE INDEX "approvals_batch_version_id_stage_decision_idx" ON "approvals"("batch_version_id", "stage", "decision");

-- CreateIndex
CREATE INDEX "approvals_officer_id_decided_at_idx" ON "approvals"("officer_id", "decided_at" DESC);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "approvals_batch_version_id_stage_officer_id_key" ON "approvals"("batch_version_id", "stage", "officer_id");

-- CreateIndex
CREATE INDEX "approval_corrections_approval_id_idx" ON "approval_corrections"("approval_id");

-- CreateIndex
CREATE INDEX "approval_corrections_created_at_idx" ON "approval_corrections"("created_at");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "approval_corrections_approval_id_correction_number_key" ON "approval_corrections"("approval_id", "correction_number");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_batch_candidate_id_key" ON "certificates"("batch_candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_certificate_number_key" ON "certificates"("certificate_number");

-- CreateIndex
CREATE INDEX "certificates_certificate_status_idx" ON "certificates"("certificate_status");

-- CreateIndex
CREATE INDEX "certificates_delivery_status_idx" ON "certificates"("delivery_status");

-- CreateIndex
CREATE INDEX "certificates_issuance_year_idx" ON "certificates"("issuance_year");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_attempts_idempotency_key_key" ON "delivery_attempts"("idempotency_key");

-- CreateIndex
CREATE INDEX "delivery_attempts_certificate_id_attempted_at_idx" ON "delivery_attempts"("certificate_id", "attempted_at" DESC);

-- CreateIndex
CREATE INDEX "delivery_attempts_status_attempted_at_idx" ON "delivery_attempts"("status", "attempted_at");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "delivery_attempts_certificate_id_attempt_number_key" ON "delivery_attempts"("certificate_id", "attempt_number");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_batch_id_created_at_idx" ON "audit_logs"("batch_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at" DESC);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "outbox_events_idempotency_key_key" ON "outbox_events"("idempotency_key");

-- CreateIndex
CREATE INDEX "outbox_events_status_available_at_idx" ON "outbox_events"("status", "available_at");

-- CreateIndex
CREATE INDEX "outbox_events_aggregate_type_aggregate_id_idx" ON "outbox_events"("aggregate_type", "aggregate_id");

-- CreateIndex
CREATE INDEX "outbox_events_locked_at_idx" ON "outbox_events"("locked_at");

-- CreateIndex
CREATE INDEX "ai_analyses_batch_version_id_created_at_idx" ON "ai_analyses"("batch_version_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ai_analyses_status_idx" ON "ai_analyses"("status");

-- CreateIndex
CREATE INDEX "ai_findings_ai_analysis_id_idx" ON "ai_findings"("ai_analysis_id");

-- CreateIndex
CREATE INDEX "ai_findings_severity_idx" ON "ai_findings"("severity");

-- CreateIndex
CREATE INDEX "ai_finding_feedback_ai_finding_id_idx" ON "ai_finding_feedback"("ai_finding_id");

-- CreateIndex
CREATE INDEX "ai_finding_feedback_rating_idx" ON "ai_finding_feedback"("rating");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "ai_finding_feedback_ai_finding_id_user_id_key" ON "ai_finding_feedback"("ai_finding_id", "user_id");

-- CreateIndex
CREATE INDEX "ai_chat_sessions_user_id_idx" ON "ai_chat_sessions"("user_id");

-- CreateIndex
CREATE INDEX "ai_chat_messages_session_id_created_at_idx" ON "ai_chat_messages"("session_id", "created_at");

-- CertiFlow PostgreSQL-specific constraints

-- Optional secondary verification codes must be unique when present
CREATE UNIQUE INDEX "certificates_verification_code_key"
  ON "certificates"("verification_code")
  WHERE "verification_code" IS NOT NULL;

-- Outbox retry counter invariant
ALTER TABLE "outbox_events"
  ADD CONSTRAINT "outbox_events_attempt_count_check"
  CHECK ("attempt_count" >= 0);

-- =========================================
-- CUSTOM CONSTRAINTS: USER ROLE VALIDATION
-- =========================================

ALTER TABLE "users"
ADD CONSTRAINT "users_role_scope_check"
CHECK (
    (
        "role" <> 'TRAINING_CENTRE'
        OR "training_centre_id" IS NOT NULL
    )
    AND
    (
        "role" <> 'DISTRICT_OFFICER'
        OR "district_id" IS NOT NULL
    )
);


-- =========================================
-- CUSTOM CONSTRAINT: BATCH DISTRICT MATCH
-- =========================================

ALTER TABLE "training_centres"
ADD CONSTRAINT "training_centres_id_district_id_key"
UNIQUE ("id", "district_id");

ALTER TABLE "batches"
ADD CONSTRAINT "batches_centre_district_fkey"
FOREIGN KEY ("training_centre_id", "district_id")
REFERENCES "training_centres" ("id", "district_id")
ON DELETE RESTRICT
ON UPDATE CASCADE;


-- =========================================
-- CUSTOM CONSTRAINTS: BATCH
-- =========================================

ALTER TABLE "batches"
ADD CONSTRAINT "batches_current_version_number_check"
CHECK ("current_version_number" >= 0);

ALTER TABLE "batches"
ADD CONSTRAINT "batches_row_version_check"
CHECK ("row_version" >= 1);


-- =========================================
-- CUSTOM CONSTRAINTS: BATCH VERSIONS
-- =========================================

ALTER TABLE "batch_versions"
ADD CONSTRAINT "batch_versions_version_number_check"
CHECK ("version_number" >= 1);

ALTER TABLE "batch_versions"
ADD CONSTRAINT "batch_versions_candidate_count_check"
CHECK ("candidate_count" >= 0);

ALTER TABLE "batch_versions"
ADD CONSTRAINT "batch_versions_quality_threshold_check"
CHECK ("quality_review_threshold_applied" >= 1);

ALTER TABLE "batch_versions"
ADD CONSTRAINT "batch_versions_approval_requirements_check"
CHECK (
    "district_approvals_required" >= 0
    AND "quality_approvals_required" >= 0
    AND "state_approvals_required" >= 0
);

ALTER TABLE "batch_versions"
ADD CONSTRAINT "batch_versions_quality_review_check"
CHECK (
    "requires_quality_review" =
    ("candidate_count" >= "quality_review_threshold_applied")
);


-- =========================================
-- CUSTOM CONSTRAINTS: APPROVALS
-- =========================================

ALTER TABLE "approvals"
ADD CONSTRAINT "approvals_reason_required_check"
CHECK (
    "decision" NOT IN ('REJECTED', 'RETURNED')
    OR "reason" IS NOT NULL
);


-- =========================================
-- CUSTOM CONSTRAINTS: APPROVAL CORRECTIONS
-- =========================================

ALTER TABLE "approval_corrections"
ADD CONSTRAINT "approval_corrections_number_check"
CHECK ("correction_number" >= 1);


-- =========================================
-- CUSTOM CONSTRAINTS: CERTIFICATES
-- =========================================

ALTER TABLE "certificates"
ADD CONSTRAINT "certificates_number_format_check"
CHECK (
    "certificate_number" ~ '^CF-[0-9]{4}-.+$'
    AND split_part("certificate_number", '-', 2) = "issuance_year"::TEXT
);

ALTER TABLE "certificates"
ADD CONSTRAINT "certificates_status_fields_check"
CHECK (
    (
        "certificate_status" = 'PENDING_GENERATION'
        AND "issued_at" IS NULL
    )
    OR
    (
        "certificate_status" = 'ISSUED'
        AND "issued_at" IS NOT NULL
        AND "file_storage_key" IS NOT NULL
    )
    OR
    (
        "certificate_status" = 'CANCELLED'
        AND "cancelled_at" IS NOT NULL
    )
);

-- =========================================
-- CUSTOM CONSTRAINTS: DELIVERY ATTEMPTS
-- =========================================

ALTER TABLE "delivery_attempts"
ADD CONSTRAINT "delivery_attempts_number_check"
CHECK ("attempt_number" >= 1);


-- =========================================
-- CUSTOM CONSTRAINTS: AI CHAT MESSAGES
-- =========================================

ALTER TABLE "ai_chat_messages"
ADD CONSTRAINT "ai_chat_messages_token_count_check"
CHECK ("token_count" IS NULL OR "token_count" >= 0);