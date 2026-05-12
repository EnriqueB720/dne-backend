-- Add Service, SupplierServiceArea, SupplierCategory.

CREATE TYPE "PricingModel" AS ENUM ('FLAT', 'PER_PERSON', 'PER_HOUR', 'PER_DAY', 'CUSTOM');

-- =====================================================================
-- service
-- =====================================================================

CREATE TABLE "service" (
    "service_id"        SERIAL          NOT NULL,
    "supplier_id"       INTEGER         NOT NULL,
    "category_id"       INTEGER         NOT NULL,
    "name"              TEXT            NOT NULL,
    "description"       TEXT            NOT NULL,
    "pricing_model"     "PricingModel"  NOT NULL,
    "base_price"        DECIMAL(12,2)   NOT NULL,
    "currency"          TEXT            NOT NULL DEFAULT 'CRC',
    "min_total_price"   DECIMAL(12,2),
    "max_total_price"   DECIMAL(12,2),
    "min_units"         INTEGER,
    "max_units"         INTEGER,
    "unit_label"        TEXT,
    "lead_time_hours"   INTEGER,
    "duration_minutes"  INTEGER,
    "tags"              TEXT[]          NOT NULL DEFAULT ARRAY[]::TEXT[],
    "inclusions"        TEXT[]          NOT NULL DEFAULT ARRAY[]::TEXT[],
    "active"            BOOLEAN         NOT NULL DEFAULT true,
    "created_at"        TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3)    NOT NULL,
    "deleted_at"        TIMESTAMP(3),

    CONSTRAINT "service_pkey" PRIMARY KEY ("service_id")
);

CREATE INDEX "service_supplier_id_idx" ON "service"("supplier_id");
CREATE INDEX "service_category_id_idx" ON "service"("category_id");

ALTER TABLE "service"
  ADD CONSTRAINT "service_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "service"
  ADD CONSTRAINT "service_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "category"("category_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================================
-- supplier_service_area
-- =====================================================================

CREATE TABLE "supplier_service_area" (
    "service_area_id" SERIAL        NOT NULL,
    "supplier_id"     INTEGER       NOT NULL,
    "city"            TEXT          NOT NULL,
    "radius_km"       INTEGER       NOT NULL DEFAULT 20,
    "travel_fee"      DECIMAL(10,2),
    "created_at"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_service_area_pkey" PRIMARY KEY ("service_area_id")
);

CREATE UNIQUE INDEX "supplier_service_area_supplier_id_city_key"
  ON "supplier_service_area"("supplier_id", "city");
CREATE INDEX "supplier_service_area_city_idx" ON "supplier_service_area"("city");

ALTER TABLE "supplier_service_area"
  ADD CONSTRAINT "supplier_service_area_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================================
-- supplier_category (junction)
-- =====================================================================

CREATE TABLE "supplier_category" (
    "supplier_id" INTEGER       NOT NULL,
    "category_id" INTEGER       NOT NULL,
    "is_primary"  BOOLEAN       NOT NULL DEFAULT false,
    "created_at"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_category_pkey" PRIMARY KEY ("supplier_id", "category_id")
);

CREATE INDEX "supplier_category_category_id_idx" ON "supplier_category"("category_id");

ALTER TABLE "supplier_category"
  ADD CONSTRAINT "supplier_category_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "supplier_category"
  ADD CONSTRAINT "supplier_category_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "category"("category_id")
  ON DELETE CASCADE ON UPDATE CASCADE;
