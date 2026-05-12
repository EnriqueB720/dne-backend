-- Extend `user` with additional identity columns and multi-role flags.
-- Add `customer` and `admin` profile tables.

-- =====================================================================
-- Enums
-- =====================================================================

CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'OPERATIONS', 'SUPPORT', 'CONTENT_MODERATOR');

-- =====================================================================
-- Extend `user`
-- =====================================================================

ALTER TABLE "user"
  ADD COLUMN "first_name"          TEXT,
  ADD COLUMN "last_name"           TEXT,
  ADD COLUMN "avatar_url"          TEXT,
  ADD COLUMN "timezone"            TEXT DEFAULT 'America/Costa_Rica',
  ADD COLUMN "email_verified_at"   TIMESTAMP(3),
  ADD COLUMN "phone_verified_at"   TIMESTAMP(3),
  ADD COLUMN "last_login_at"       TIMESTAMP(3),
  ADD COLUMN "is_customer"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "is_supplier"         BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "is_admin"            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "updated_at"          TIMESTAMP(3),
  ADD COLUMN "deleted_at"          TIMESTAMP(3);

-- Backfill is_supplier = true for existing rows where role = SUPPLIER (already default).
-- Backfill is_admin = true for existing rows where role = ADMIN.
UPDATE "user" SET "is_admin" = true WHERE "role" = 'ADMIN';
UPDATE "user" SET "is_supplier" = false WHERE "role" = 'ADMIN';

CREATE INDEX "user_email_idx" ON "user"("email");
CREATE INDEX "user_phone_idx" ON "user"("phone");

-- =====================================================================
-- Customer
-- =====================================================================

CREATE TABLE "customer" (
    "customer_id"        SERIAL          NOT NULL,
    "user_id"            INTEGER         NOT NULL,
    "default_city"       TEXT,
    "default_address"    TEXT,
    "default_lat"        DECIMAL(10,7),
    "default_lng"        DECIMAL(10,7),
    "preferred_language" "Language",
    "marketing_opt_in"   BOOLEAN         NOT NULL DEFAULT false,
    "total_requests"     INTEGER         NOT NULL DEFAULT 0,
    "total_bookings"     INTEGER         NOT NULL DEFAULT 0,
    "lifetime_value"     DECIMAL(12,2)   NOT NULL DEFAULT 0,
    "created_at"         TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"         TIMESTAMP(3)    NOT NULL,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("customer_id")
);

CREATE UNIQUE INDEX "customer_user_id_key" ON "customer"("user_id");

ALTER TABLE "customer"
  ADD CONSTRAINT "customer_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("user_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================================
-- Admin
-- =====================================================================

CREATE TABLE "admin" (
    "admin_id"    SERIAL       NOT NULL,
    "user_id"     INTEGER      NOT NULL,
    "admin_role"  "AdminRole"  NOT NULL DEFAULT 'SUPPORT',
    "permissions" JSONB        NOT NULL DEFAULT '[]',
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_pkey" PRIMARY KEY ("admin_id")
);

CREATE UNIQUE INDEX "admin_user_id_key" ON "admin"("user_id");

ALTER TABLE "admin"
  ADD CONSTRAINT "admin_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("user_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
