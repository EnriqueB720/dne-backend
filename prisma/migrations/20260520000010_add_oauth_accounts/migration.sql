-- OAuth / social login support.
--
-- NOTE: applied to the dev database via `prisma db push` (npm run prisma:up)
-- because the existing migration history currently fails to replay on a shadow
-- database (the older `20260513223018_add_conversation_participant_state`
-- references `calendar_event` before it is created). Once that history is
-- repaired, mark this as applied with:
--   npx prisma migrate resolve --applied 20260520000010_add_oauth_accounts

-- Password is null for users who only ever sign in via an OAuth provider.
ALTER TABLE "user" ALTER COLUMN "password" DROP NOT NULL;

-- Phone is collected during onboarding, not from the OAuth provider.
ALTER TABLE "user" ALTER COLUMN "phone" DROP NOT NULL;

-- CreateTable
CREATE TABLE "oauth_account" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "provider_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "oauth_account_user_id_idx" ON "oauth_account"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_account_provider_provider_id_key" ON "oauth_account"("provider", "provider_id");

-- AddForeignKey
ALTER TABLE "oauth_account" ADD CONSTRAINT "oauth_account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
