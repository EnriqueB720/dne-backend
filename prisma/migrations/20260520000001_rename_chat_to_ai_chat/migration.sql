-- Rename `conversation` -> `ai_conversation` and `message` -> `ai_message`.
-- This frees up the names `conversation` and `message` for the new
-- customer↔supplier chat tables that will be added in a later migration.
-- Data is preserved via ALTER TABLE RENAME (no DROP/CREATE).

-- Drop FK so we can rename safely, then recreate with new name
ALTER TABLE "message" DROP CONSTRAINT "message_conversation_id_fkey";

-- Rename tables
ALTER TABLE "conversation" RENAME TO "ai_conversation";
ALTER TABLE "message" RENAME TO "ai_message";

-- Rename primary key constraints
ALTER TABLE "ai_conversation" RENAME CONSTRAINT "conversation_pkey" TO "ai_conversation_pkey";
ALTER TABLE "ai_message" RENAME CONSTRAINT "message_pkey" TO "ai_message_pkey";

-- Rename indexes
ALTER INDEX "conversation_device_id_idx" RENAME TO "ai_conversation_device_id_idx";
ALTER INDEX "message_conversation_id_idx" RENAME TO "ai_message_conversation_id_idx";

-- Recreate FK with new name pointing at renamed table
ALTER TABLE "ai_message"
  ADD CONSTRAINT "ai_message_conversation_id_fkey"
  FOREIGN KEY ("conversation_id")
  REFERENCES "ai_conversation"("conversation_id")
  ON DELETE CASCADE ON UPDATE CASCADE;
