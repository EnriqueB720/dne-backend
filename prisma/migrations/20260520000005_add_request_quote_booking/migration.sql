-- Add Request, Quote, QuoteItem, Booking, Favorite.
-- Also link AiConversation to Request (optional one-to-one).

-- =====================================================================
-- Enums
-- =====================================================================

CREATE TYPE "RequestStatus" AS ENUM (
  'GATHERING', 'MATCHING', 'AWAITING_QUOTES', 'QUOTES_RECEIVED', 'BOOKED', 'CLOSED'
);

CREATE TYPE "QuoteStatus" AS ENUM (
  'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN'
);

CREATE TYPE "BookingStatus" AS ENUM (
  'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED'
);

CREATE TYPE "PaymentStatus" AS ENUM (
  'PENDING', 'DEPOSIT_PAID', 'FULLY_PAID', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED'
);

-- =====================================================================
-- request
-- =====================================================================

CREATE TABLE "request" (
    "request_id"          SERIAL           NOT NULL,
    "customer_id"         INTEGER          NOT NULL,
    "category_id"         INTEGER,
    "raw_query"           TEXT             NOT NULL,
    "parsed_intent"       JSONB,
    "conversation_turns"  INTEGER          NOT NULL DEFAULT 1,
    "is_complete"         BOOLEAN          NOT NULL DEFAULT false,
    "city"                TEXT,
    "service_date"        TIMESTAMP(3),
    "guest_count"         INTEGER,
    "budget_min"          DECIMAL(12,2),
    "budget_max"          DECIMAL(12,2),
    "status"              "RequestStatus"  NOT NULL DEFAULT 'GATHERING',
    "expires_at"          TIMESTAMP(3),
    "closed_at"           TIMESTAMP(3),
    "closed_reason"       TEXT,
    "created_at"          TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"          TIMESTAMP(3)     NOT NULL,

    CONSTRAINT "request_pkey" PRIMARY KEY ("request_id")
);

CREATE INDEX "request_customer_id_idx" ON "request"("customer_id");
CREATE INDEX "request_status_idx" ON "request"("status");
CREATE INDEX "request_city_service_date_idx" ON "request"("city", "service_date");
CREATE INDEX "request_category_id_status_idx" ON "request"("category_id", "status");

ALTER TABLE "request"
  ADD CONSTRAINT "request_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customer"("customer_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "request"
  ADD CONSTRAINT "request_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "category"("category_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================================
-- Link AiConversation -> Request (additive, optional)
-- =====================================================================

ALTER TABLE "ai_conversation"
  ADD COLUMN "request_id" INTEGER;

CREATE UNIQUE INDEX "ai_conversation_request_id_key" ON "ai_conversation"("request_id");

ALTER TABLE "ai_conversation"
  ADD CONSTRAINT "ai_conversation_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "request"("request_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================================
-- quote
-- =====================================================================

CREATE TABLE "quote" (
    "quote_id"      SERIAL          NOT NULL,
    "request_id"    INTEGER         NOT NULL,
    "supplier_id"   INTEGER         NOT NULL,
    "total_price"   DECIMAL(12,2)   NOT NULL,
    "currency"      TEXT            NOT NULL DEFAULT 'CRC',
    "message"       TEXT,
    "valid_until"   TIMESTAMP(3)    NOT NULL,
    "status"        "QuoteStatus"   NOT NULL DEFAULT 'SENT',
    "viewed_at"     TIMESTAMP(3),
    "responded_at"  TIMESTAMP(3),
    "created_at"    TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3)    NOT NULL,

    CONSTRAINT "quote_pkey" PRIMARY KEY ("quote_id")
);

CREATE UNIQUE INDEX "quote_request_id_supplier_id_key" ON "quote"("request_id", "supplier_id");
CREATE INDEX "quote_supplier_id_status_idx" ON "quote"("supplier_id", "status");
CREATE INDEX "quote_status_idx" ON "quote"("status");

ALTER TABLE "quote"
  ADD CONSTRAINT "quote_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "request"("request_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "quote"
  ADD CONSTRAINT "quote_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================================
-- quote_item
-- =====================================================================

CREATE TABLE "quote_item" (
    "quote_item_id" SERIAL          NOT NULL,
    "quote_id"      INTEGER         NOT NULL,
    "service_id"    INTEGER,
    "description"   TEXT            NOT NULL,
    "quantity"      DECIMAL(10,2)   NOT NULL,
    "unit_price"    DECIMAL(12,2)   NOT NULL,
    "total"         DECIMAL(12,2)   NOT NULL,

    CONSTRAINT "quote_item_pkey" PRIMARY KEY ("quote_item_id")
);

CREATE INDEX "quote_item_quote_id_idx" ON "quote_item"("quote_id");

ALTER TABLE "quote_item"
  ADD CONSTRAINT "quote_item_quote_id_fkey"
  FOREIGN KEY ("quote_id") REFERENCES "quote"("quote_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quote_item"
  ADD CONSTRAINT "quote_item_service_id_fkey"
  FOREIGN KEY ("service_id") REFERENCES "service"("service_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================================
-- booking
-- =====================================================================

CREATE TABLE "booking" (
    "booking_id"            SERIAL            NOT NULL,
    "request_id"            INTEGER           NOT NULL,
    "quote_id"              INTEGER           NOT NULL,
    "customer_id"           INTEGER           NOT NULL,
    "supplier_id"           INTEGER           NOT NULL,
    "service_date"          TIMESTAMP(3)      NOT NULL,
    "service_end_date"      TIMESTAMP(3),
    "location"              TEXT              NOT NULL,
    "guest_count"           INTEGER,
    "total_price"           DECIMAL(12,2)     NOT NULL,
    "platform_fee"          DECIMAL(12,2)     NOT NULL,
    "supplier_payout"       DECIMAL(12,2)     NOT NULL,
    "currency"              TEXT              NOT NULL DEFAULT 'CRC',
    "status"                "BookingStatus"   NOT NULL DEFAULT 'CONFIRMED',
    "payment_status"        "PaymentStatus"   NOT NULL DEFAULT 'PENDING',
    "phone_revealed_at"     TIMESTAMP(3),
    "cancellation_reason"   TEXT,
    "cancelled_at"          TIMESTAMP(3),
    "cancelled_by"          TEXT,
    "completed_at"          TIMESTAMP(3),
    "created_at"            TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"            TIMESTAMP(3)      NOT NULL,

    CONSTRAINT "booking_pkey" PRIMARY KEY ("booking_id")
);

CREATE UNIQUE INDEX "booking_quote_id_key" ON "booking"("quote_id");
CREATE INDEX "booking_customer_id_status_idx" ON "booking"("customer_id", "status");
CREATE INDEX "booking_supplier_id_status_idx" ON "booking"("supplier_id", "status");
CREATE INDEX "booking_service_date_idx" ON "booking"("service_date");

ALTER TABLE "booking"
  ADD CONSTRAINT "booking_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "request"("request_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking"
  ADD CONSTRAINT "booking_quote_id_fkey"
  FOREIGN KEY ("quote_id") REFERENCES "quote"("quote_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking"
  ADD CONSTRAINT "booking_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customer"("customer_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking"
  ADD CONSTRAINT "booking_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================================
-- favorite
-- =====================================================================

CREATE TABLE "favorite" (
    "favorite_id" SERIAL       NOT NULL,
    "customer_id" INTEGER      NOT NULL,
    "supplier_id" INTEGER      NOT NULL,
    "notes"       TEXT,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_pkey" PRIMARY KEY ("favorite_id")
);

CREATE UNIQUE INDEX "favorite_customer_id_supplier_id_key"
  ON "favorite"("customer_id", "supplier_id");

ALTER TABLE "favorite"
  ADD CONSTRAINT "favorite_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customer"("customer_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "favorite"
  ADD CONSTRAINT "favorite_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id")
  ON DELETE CASCADE ON UPDATE CASCADE;
