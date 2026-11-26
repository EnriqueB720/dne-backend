-- Contact tracking (roadmap 2.1): one row per customer→supplier contact.
-- Drives lead counts and the "How did it go?" review prompt.

-- CreateEnum
CREATE TYPE "ContactChannel" AS ENUM ('CHAT_CONTACT', 'PHONE', 'EMAIL', 'WHATSAPP', 'WEBSITE');

-- CreateTable
CREATE TABLE "contact_event" (
    "contact_event_id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "customer_id" INTEGER,
    "device_id" TEXT,
    "channel" "ContactChannel" NOT NULL,
    "source" TEXT,
    "review_prompt_dismissed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_event_pkey" PRIMARY KEY ("contact_event_id")
);

-- CreateIndex
CREATE INDEX "contact_event_supplier_id_created_at_idx" ON "contact_event"("supplier_id", "created_at");

-- CreateIndex
CREATE INDEX "contact_event_customer_id_supplier_id_idx" ON "contact_event"("customer_id", "supplier_id");

-- AddForeignKey
ALTER TABLE "contact_event" ADD CONSTRAINT "contact_event_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_event" ADD CONSTRAINT "contact_event_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("customer_id") ON DELETE SET NULL ON UPDATE CASCADE;

