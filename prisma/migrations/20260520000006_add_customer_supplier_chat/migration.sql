-- Add customer↔supplier Conversation, Message, MessageAttachment tables.
-- (Old chat tables were renamed to ai_conversation/ai_message in migration 1.)

-- =====================================================================
-- Enums
-- =====================================================================

CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'BLOCKED');
CREATE TYPE "SenderType"         AS ENUM ('CUSTOMER', 'SUPPLIER', 'AI', 'SYSTEM');
CREATE TYPE "MessageType"        AS ENUM ('TEXT', 'IMAGE', 'QUOTE_REFERENCE', 'BOOKING_REFERENCE', 'SYSTEM_NOTICE');

-- =====================================================================
-- conversation (customer ↔ supplier)
-- =====================================================================

CREATE TABLE "conversation" (
    "conversation_id"          SERIAL                NOT NULL,
    "request_id"               INTEGER               NOT NULL,
    "customer_id"              INTEGER               NOT NULL,
    "supplier_id"              INTEGER               NOT NULL,
    "status"                   "ConversationStatus"  NOT NULL DEFAULT 'ACTIVE',
    "last_message_at"          TIMESTAMP(3),
    "contact_share_warnings"   INTEGER               NOT NULL DEFAULT 0,
    "created_at"               TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"               TIMESTAMP(3)          NOT NULL,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("conversation_id")
);

CREATE UNIQUE INDEX "conversation_request_id_supplier_id_key"
  ON "conversation"("request_id", "supplier_id");
CREATE INDEX "conversation_customer_id_last_message_at_idx"
  ON "conversation"("customer_id", "last_message_at");
CREATE INDEX "conversation_supplier_id_last_message_at_idx"
  ON "conversation"("supplier_id", "last_message_at");

ALTER TABLE "conversation"
  ADD CONSTRAINT "conversation_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "request"("request_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "conversation"
  ADD CONSTRAINT "conversation_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customer"("customer_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "conversation"
  ADD CONSTRAINT "conversation_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================================
-- message
-- =====================================================================

CREATE TABLE "message" (
    "message_id"        SERIAL          NOT NULL,
    "conversation_id"   INTEGER         NOT NULL,
    "sender_type"       "SenderType"    NOT NULL,
    "sender_user_id"    INTEGER,
    "content"           TEXT            NOT NULL,
    "message_type"      "MessageType"   NOT NULL DEFAULT 'TEXT',
    "filtered"          BOOLEAN         NOT NULL DEFAULT false,
    "filtered_reason"   TEXT,
    "read_at"           TIMESTAMP(3),
    "created_at"        TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_pkey" PRIMARY KEY ("message_id")
);

CREATE INDEX "message_conversation_id_created_at_idx"
  ON "message"("conversation_id", "created_at");

ALTER TABLE "message"
  ADD CONSTRAINT "message_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "conversation"("conversation_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================================
-- message_attachment
-- =====================================================================

CREATE TABLE "message_attachment" (
    "attachment_id" SERIAL       NOT NULL,
    "message_id"    INTEGER      NOT NULL,
    "url"           TEXT         NOT NULL,
    "mime_type"     TEXT         NOT NULL,
    "size_bytes"    INTEGER      NOT NULL,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachment_pkey" PRIMARY KEY ("attachment_id")
);

ALTER TABLE "message_attachment"
  ADD CONSTRAINT "message_attachment_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "message"("message_id")
  ON DELETE CASCADE ON UPDATE CASCADE;
