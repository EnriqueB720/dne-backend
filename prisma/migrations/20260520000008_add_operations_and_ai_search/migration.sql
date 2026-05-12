-- Add operations tables (CalendarEvent, Notification, MediaAsset, AuditLog,
-- ScrapeSource) and AI/search infra (EmbeddingJob, SearchLog).

-- =====================================================================
-- Enums
-- =====================================================================

CREATE TYPE "EventType"   AS ENUM ('BOOKING', 'TENTATIVE', 'BLOCKED', 'EXTERNAL', 'RECURRING');
CREATE TYPE "EventStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'COMPLETED');

CREATE TYPE "NotificationChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'PUSH', 'IN_APP', 'SMS');
CREATE TYPE "NotificationStatus"  AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

CREATE TYPE "EmbeddingStatus" AS ENUM ('QUEUED', 'PROCESSING', 'DONE', 'FAILED');

-- =====================================================================
-- calendar_event
-- =====================================================================

CREATE TABLE "calendar_event" (
    "calendar_event_id"     SERIAL          NOT NULL,
    "supplier_id"           INTEGER         NOT NULL,
    "event_type"            "EventType"     NOT NULL,
    "title"                 TEXT            NOT NULL,
    "notes"                 TEXT,
    "starts_at"             TIMESTAMP(3)    NOT NULL,
    "ends_at"               TIMESTAMP(3)    NOT NULL,
    "all_day"               BOOLEAN         NOT NULL DEFAULT false,
    "timezone"              TEXT            NOT NULL DEFAULT 'America/Costa_Rica',
    "booking_id"            INTEGER,
    "quote_id"              INTEGER,
    "location"              TEXT,
    "recurrence_rule"       TEXT,
    "external_calendar_id"  TEXT,
    "external_event_id"     TEXT,
    "status"                "EventStatus"   NOT NULL DEFAULT 'ACTIVE',
    "created_at"            TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"            TIMESTAMP(3)    NOT NULL,

    CONSTRAINT "calendar_event_pkey" PRIMARY KEY ("calendar_event_id")
);

CREATE UNIQUE INDEX "calendar_event_booking_id_key" ON "calendar_event"("booking_id");
CREATE INDEX "calendar_event_supplier_id_starts_at_ends_at_idx"
  ON "calendar_event"("supplier_id", "starts_at", "ends_at");
CREATE INDEX "calendar_event_status_idx" ON "calendar_event"("status");

ALTER TABLE "calendar_event"
  ADD CONSTRAINT "calendar_event_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "calendar_event"
  ADD CONSTRAINT "calendar_event_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "booking"("booking_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================================
-- notification
-- =====================================================================

CREATE TABLE "notification" (
    "notification_id"   SERIAL                  NOT NULL,
    "user_id"           INTEGER                 NOT NULL,
    "channel"           "NotificationChannel"   NOT NULL,
    "template"          TEXT                    NOT NULL,
    "subject"           TEXT,
    "body"              TEXT                    NOT NULL,
    "entity_type"       TEXT,
    "entity_id"         INTEGER,
    "status"            "NotificationStatus"    NOT NULL DEFAULT 'QUEUED',
    "sent_at"           TIMESTAMP(3),
    "delivered_at"      TIMESTAMP(3),
    "read_at"           TIMESTAMP(3),
    "failed_reason"     TEXT,
    "external_ref"      TEXT,
    "created_at"        TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("notification_id")
);

CREATE INDEX "notification_user_id_status_idx" ON "notification"("user_id", "status");
CREATE INDEX "notification_created_at_idx" ON "notification"("created_at");

ALTER TABLE "notification"
  ADD CONSTRAINT "notification_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("user_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================================
-- media_asset (polymorphic ownership)
-- =====================================================================

CREATE TABLE "media_asset" (
    "media_asset_id"   SERIAL        NOT NULL,
    "owner_type"       TEXT          NOT NULL,
    "owner_id"         INTEGER       NOT NULL,
    "supplier_id"      INTEGER,
    "storage_provider" TEXT          NOT NULL DEFAULT 'r2',
    "url"              TEXT          NOT NULL,
    "thumbnail_url"    TEXT,
    "mime_type"        TEXT          NOT NULL,
    "size_bytes"       INTEGER       NOT NULL,
    "width"            INTEGER,
    "height"           INTEGER,
    "alt_text"         TEXT,
    "caption"          TEXT,
    "display_order"    INTEGER       NOT NULL DEFAULT 0,
    "created_at"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at"       TIMESTAMP(3),

    CONSTRAINT "media_asset_pkey" PRIMARY KEY ("media_asset_id")
);

CREATE INDEX "media_asset_owner_type_owner_id_idx" ON "media_asset"("owner_type", "owner_id");
CREATE INDEX "media_asset_supplier_id_idx" ON "media_asset"("supplier_id");

ALTER TABLE "media_asset"
  ADD CONSTRAINT "media_asset_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================================
-- audit_log
-- =====================================================================

CREATE TABLE "audit_log" (
    "audit_log_id"   SERIAL        NOT NULL,
    "actor_user_id"  INTEGER,
    "actor_type"     TEXT          NOT NULL,
    "action"         TEXT          NOT NULL,
    "entity_type"    TEXT          NOT NULL,
    "entity_id"      INTEGER       NOT NULL,
    "before"         JSONB,
    "after"          JSONB,
    "metadata"       JSONB,
    "ip_address"     TEXT,
    "user_agent"     TEXT,
    "created_at"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("audit_log_id")
);

CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");
CREATE INDEX "audit_log_actor_user_id_created_at_idx" ON "audit_log"("actor_user_id", "created_at");
CREATE INDEX "audit_log_action_created_at_idx" ON "audit_log"("action", "created_at");

-- =====================================================================
-- scrape_source
-- =====================================================================

CREATE TABLE "scrape_source" (
    "scrape_source_id"        SERIAL              NOT NULL,
    "supplier_id"             INTEGER             NOT NULL,
    "source"                  "SupplierSource"    NOT NULL,
    "external_id"             TEXT                NOT NULL,
    "source_url"              TEXT,
    "raw_data"                JSONB               NOT NULL,
    "first_scraped_at"        TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_scraped_at"         TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refresh_due_at"          TIMESTAMP(3),
    "takedown_requested"      BOOLEAN             NOT NULL DEFAULT false,
    "takedown_requested_at"   TIMESTAMP(3),

    CONSTRAINT "scrape_source_pkey" PRIMARY KEY ("scrape_source_id")
);

CREATE UNIQUE INDEX "scrape_source_source_external_id_key"
  ON "scrape_source"("source", "external_id");
CREATE INDEX "scrape_source_supplier_id_idx" ON "scrape_source"("supplier_id");
CREATE INDEX "scrape_source_refresh_due_at_idx" ON "scrape_source"("refresh_due_at");

ALTER TABLE "scrape_source"
  ADD CONSTRAINT "scrape_source_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================================
-- embedding_job (queue; vector column itself deferred until pgvector is installed)
-- =====================================================================

CREATE TABLE "embedding_job" (
    "embedding_job_id"  SERIAL              NOT NULL,
    "entity_type"       TEXT                NOT NULL,
    "entity_id"         INTEGER             NOT NULL,
    "source_text"       TEXT                NOT NULL,
    "text_hash"         TEXT                NOT NULL,
    "status"            "EmbeddingStatus"   NOT NULL DEFAULT 'QUEUED',
    "attempts"          INTEGER             NOT NULL DEFAULT 0,
    "error"             TEXT,
    "model"             TEXT,
    "created_at"        TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at"      TIMESTAMP(3),

    CONSTRAINT "embedding_job_pkey" PRIMARY KEY ("embedding_job_id")
);

CREATE UNIQUE INDEX "embedding_job_entity_type_entity_id_text_hash_key"
  ON "embedding_job"("entity_type", "entity_id", "text_hash");
CREATE INDEX "embedding_job_status_created_at_idx" ON "embedding_job"("status", "created_at");
CREATE INDEX "embedding_job_entity_type_entity_id_idx" ON "embedding_job"("entity_type", "entity_id");

-- =====================================================================
-- search_log
-- =====================================================================

CREATE TABLE "search_log" (
    "search_log_id"           SERIAL        NOT NULL,
    "user_id"                 INTEGER,
    "request_id"              INTEGER,
    "raw_query"               TEXT          NOT NULL,
    "parsed_intent"           JSONB,
    "filters_applied"         JSONB         NOT NULL,
    "result_count"            INTEGER       NOT NULL,
    "result_supplier_ids"     INTEGER[]     NOT NULL DEFAULT ARRAY[]::INTEGER[],
    "clicked_supplier_ids"    INTEGER[]     NOT NULL DEFAULT ARRAY[]::INTEGER[],
    "contacted_supplier_ids"  INTEGER[]     NOT NULL DEFAULT ARRAY[]::INTEGER[],
    "booked_supplier_id"      INTEGER,
    "latency_ms"              INTEGER,
    "created_at"              TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_log_pkey" PRIMARY KEY ("search_log_id")
);

CREATE INDEX "search_log_user_id_created_at_idx" ON "search_log"("user_id", "created_at");
CREATE INDEX "search_log_created_at_idx" ON "search_log"("created_at");

ALTER TABLE "search_log"
  ADD CONSTRAINT "search_log_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("user_id")
  ON DELETE SET NULL ON UPDATE CASCADE;
