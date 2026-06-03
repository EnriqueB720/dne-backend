-- Link AI conversations to authenticated users.
-- userId is nullable so existing deviceId-only (guest) conversations are preserved
-- and unauthenticated callers can still create conversations.

ALTER TABLE "ai_conversation"
  ADD COLUMN "user_id" INTEGER;

ALTER TABLE "ai_conversation"
  ADD CONSTRAINT "ai_conversation_user_id_fkey"
  FOREIGN KEY ("user_id")
  REFERENCES "user"("user_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ai_conversation_user_id_updated_at_idx"
  ON "ai_conversation" ("user_id", "updated_at");
