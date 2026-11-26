-- Phase 5: reviews no longer require a completed booking. Existing reviews
-- keep their booking link; new storefront reviews have none.

-- DropForeignKey
ALTER TABLE "review" DROP CONSTRAINT "review_booking_id_fkey";

-- AlterTable
ALTER TABLE "review" ALTER COLUMN "booking_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("booking_id") ON DELETE SET NULL ON UPDATE CASCADE;
