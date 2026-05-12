-- Extend Supplier, Subscription, PricingPlan, Category with marketplace fields.

-- =====================================================================
-- Enums
-- =====================================================================

CREATE TYPE "SupplierSource" AS ENUM (
  'SELF_SIGNUP',
  'GOOGLE_PLACES',
  'REGISTRO_NACIONAL',
  'MANUAL_IMPORT',
  'REFERRAL'
);

-- =====================================================================
-- Extend `supplier`
-- =====================================================================

ALTER TABLE "supplier"
  ADD COLUMN "slug"                   TEXT,
  ADD COLUMN "tagline"                TEXT,
  ADD COLUMN "description"            TEXT,
  ADD COLUMN "business_phone"         TEXT,
  ADD COLUMN "business_email"         TEXT,
  ADD COLUMN "whatsapp_number"        TEXT,
  ADD COLUMN "website_url"            TEXT,
  ADD COLUMN "city"                   TEXT,
  ADD COLUMN "address"                TEXT,
  ADD COLUMN "lat"                    DECIMAL(10,7),
  ADD COLUMN "lng"                    DECIMAL(10,7),
  ADD COLUMN "min_capacity"           INTEGER,
  ADD COLUMN "max_capacity"           INTEGER,
  ADD COLUMN "rating"                 DECIMAL(3,2),
  ADD COLUMN "review_count"           INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "response_time_minutes"  INTEGER,
  ADD COLUMN "conversion_rate"        DECIMAL(5,4),
  ADD COLUMN "completion_rate"        DECIMAL(5,4),
  ADD COLUMN "verified"               BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "verified_at"            TIMESTAMP(3),
  ADD COLUMN "premium"                BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "source"                 "SupplierSource" NOT NULL DEFAULT 'SELF_SIGNUP',
  ADD COLUMN "source_external_id"     TEXT,
  ADD COLUMN "claimed"                BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "claimed_at"             TIMESTAMP(3),
  ADD COLUMN "subscription_id"        INTEGER,
  ADD COLUMN "created_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updated_at"             TIMESTAMP(3),
  ADD COLUMN "deleted_at"             TIMESTAMP(3);

CREATE UNIQUE INDEX "supplier_slug_key" ON "supplier"("slug");
CREATE INDEX "supplier_city_idx" ON "supplier"("city");
CREATE INDEX "supplier_rating_idx" ON "supplier"("rating");
CREATE INDEX "supplier_source_claimed_idx" ON "supplier"("source", "claimed");
CREATE INDEX "supplier_slug_idx" ON "supplier"("slug");

ALTER TABLE "supplier"
  ADD CONSTRAINT "supplier_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "subscription"("subscription_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================================
-- Extend `subscription`
-- =====================================================================

ALTER TABLE "subscription"
  ADD COLUMN "cancel_at_period_end" BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN "external_ref"         TEXT,
  ADD COLUMN "created_at"           TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updated_at"           TIMESTAMP(3),
  ADD COLUMN "cancelled_at"         TIMESTAMP(3);

-- =====================================================================
-- Extend `pricing_plan`
-- =====================================================================

ALTER TABLE "pricing_plan"
  ADD COLUMN "slug"                 TEXT,
  ADD COLUMN "description"          TEXT,
  ADD COLUMN "price_monthly"        DECIMAL(10,2),
  ADD COLUMN "price_yearly"         DECIMAL(10,2),
  ADD COLUMN "currency"             TEXT DEFAULT 'CRC',
  ADD COLUMN "max_active_services"  INTEGER,
  ADD COLUMN "max_leads_per_month"  INTEGER,
  ADD COLUMN "active"               BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "display_order"        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updated_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "pricing_plan_slug_key" ON "pricing_plan"("slug");

-- =====================================================================
-- Extend `category`
-- =====================================================================

ALTER TABLE "category"
  ADD COLUMN "parent_id"     INTEGER,
  ADD COLUMN "slug"          TEXT,
  ADD COLUMN "name_es"       TEXT,
  ADD COLUMN "name_en"       TEXT,
  ADD COLUMN "description"   TEXT,
  ADD COLUMN "icon"          TEXT,
  ADD COLUMN "intent_schema" JSONB,
  ADD COLUMN "display_order" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "active"        BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updated_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "category_slug_key" ON "category"("slug");
CREATE INDEX "category_parent_id_idx" ON "category"("parent_id");
CREATE INDEX "category_slug_idx" ON "category"("slug");

ALTER TABLE "category"
  ADD CONSTRAINT "category_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "category"("category_id")
  ON DELETE SET NULL ON UPDATE CASCADE;
