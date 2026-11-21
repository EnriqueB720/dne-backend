-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('CHAT', 'STOREFRONT');

-- CreateTable
CREATE TABLE "lead_event" (
    "lead_event_id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "customer_id" INTEGER,
    "source" "LeadSource" NOT NULL DEFAULT 'CHAT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_event_pkey" PRIMARY KEY ("lead_event_id")
);

-- CreateIndex
CREATE INDEX "lead_event_supplier_id_created_at_idx" ON "lead_event"("supplier_id", "created_at");

-- CreateIndex
CREATE INDEX "lead_event_created_at_idx" ON "lead_event"("created_at");

-- AddForeignKey
ALTER TABLE "lead_event" ADD CONSTRAINT "lead_event_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_event" ADD CONSTRAINT "lead_event_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("customer_id") ON DELETE SET NULL ON UPDATE CASCADE;
