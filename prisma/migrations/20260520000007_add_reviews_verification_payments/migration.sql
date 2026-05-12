-- Add Review, Verification, Payment, Payout.

-- =====================================================================
-- Enums
-- =====================================================================

CREATE TYPE "VerificationType" AS ENUM (
  'IDENTITY', 'BUSINESS_LICENSE', 'TAX_ID', 'INSURANCE', 'HEALTH_PERMIT', 'PROFESSIONAL_CERTIFICATION'
);

CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'TRIALING');

CREATE TYPE "PaymentType"     AS ENUM ('BOOKING', 'SUBSCRIPTION', 'REFUND', 'ADJUSTMENT');
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'MERCADO_PAGO', 'MANUAL');
CREATE TYPE "PaymentStatusEnum" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

CREATE TYPE "PayoutStatus"    AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'ON_HOLD');

-- =====================================================================
-- review
-- =====================================================================

CREATE TABLE "review" (
    "review_id"               SERIAL        NOT NULL,
    "booking_id"              INTEGER       NOT NULL,
    "customer_id"             INTEGER       NOT NULL,
    "supplier_id"             INTEGER       NOT NULL,
    "rating"                  INTEGER       NOT NULL,
    "text"                    TEXT,
    "rating_quality"          INTEGER,
    "rating_communication"    INTEGER,
    "rating_value"            INTEGER,
    "rating_punctuality"      INTEGER,
    "supplier_response"       TEXT,
    "supplier_responded_at"   TIMESTAMP(3),
    "hidden"                  BOOLEAN       NOT NULL DEFAULT false,
    "hidden_reason"           TEXT,
    "created_at"              TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"              TIMESTAMP(3)  NOT NULL,

    CONSTRAINT "review_pkey" PRIMARY KEY ("review_id")
);

CREATE UNIQUE INDEX "review_booking_id_key" ON "review"("booking_id");
CREATE INDEX "review_supplier_id_created_at_idx" ON "review"("supplier_id", "created_at");

ALTER TABLE "review"
  ADD CONSTRAINT "review_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "booking"("booking_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "review"
  ADD CONSTRAINT "review_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customer"("customer_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "review"
  ADD CONSTRAINT "review_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================================
-- verification
-- =====================================================================

CREATE TABLE "verification" (
    "verification_id"     SERIAL                NOT NULL,
    "supplier_id"         INTEGER               NOT NULL,
    "verification_type"   "VerificationType"    NOT NULL,
    "document_url"        TEXT,
    "notes"               TEXT,
    "status"              "VerificationStatus"  NOT NULL DEFAULT 'PENDING',
    "reviewed_by"         INTEGER,
    "reviewed_at"         TIMESTAMP(3),
    "rejection_reason"    TEXT,
    "expires_at"          TIMESTAMP(3),
    "created_at"          TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"          TIMESTAMP(3)          NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("verification_id")
);

CREATE INDEX "verification_supplier_id_status_idx" ON "verification"("supplier_id", "status");

ALTER TABLE "verification"
  ADD CONSTRAINT "verification_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================================
-- payment
-- =====================================================================

CREATE TABLE "payment" (
    "payment_id"      SERIAL                NOT NULL,
    "payment_type"    "PaymentType"         NOT NULL,
    "booking_id"      INTEGER,
    "subscription_id" INTEGER,
    "amount"          DECIMAL(12,2)         NOT NULL,
    "currency"        TEXT                  NOT NULL DEFAULT 'CRC',
    "provider"        "PaymentProvider"     NOT NULL,
    "external_ref"    TEXT                  NOT NULL,
    "external_data"   JSONB,
    "status"          "PaymentStatusEnum"   NOT NULL DEFAULT 'PENDING',
    "failed_reason"   TEXT,
    "created_at"      TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3)          NOT NULL,
    "refunded_at"     TIMESTAMP(3),

    CONSTRAINT "payment_pkey" PRIMARY KEY ("payment_id")
);

CREATE UNIQUE INDEX "payment_booking_id_key" ON "payment"("booking_id");
CREATE INDEX "payment_external_ref_idx" ON "payment"("external_ref");
CREATE INDEX "payment_status_idx" ON "payment"("status");

ALTER TABLE "payment"
  ADD CONSTRAINT "payment_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "booking"("booking_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payment"
  ADD CONSTRAINT "payment_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "subscription"("subscription_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================================
-- payout
-- =====================================================================

CREATE TABLE "payout" (
    "payout_id"      SERIAL          NOT NULL,
    "supplier_id"    INTEGER         NOT NULL,
    "booking_id"     INTEGER         NOT NULL,
    "amount"         DECIMAL(12,2)   NOT NULL,
    "currency"       TEXT            NOT NULL DEFAULT 'CRC',
    "status"         "PayoutStatus"  NOT NULL DEFAULT 'PENDING',
    "scheduled_for"  TIMESTAMP(3),
    "paid_at"        TIMESTAMP(3),
    "external_ref"   TEXT,
    "created_at"     TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3)    NOT NULL,

    CONSTRAINT "payout_pkey" PRIMARY KEY ("payout_id")
);

CREATE UNIQUE INDEX "payout_booking_id_key" ON "payout"("booking_id");
CREATE INDEX "payout_supplier_id_status_idx" ON "payout"("supplier_id", "status");

ALTER TABLE "payout"
  ADD CONSTRAINT "payout_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payout"
  ADD CONSTRAINT "payout_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "booking"("booking_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
