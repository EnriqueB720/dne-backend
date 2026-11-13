-- Phase 4: suppliers describe themselves with free-text skills instead of
-- posts. The post table was never written to by the app (0 rows).

-- AlterTable
ALTER TABLE "supplier" ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DropForeignKey
ALTER TABLE "post" DROP CONSTRAINT "post_supplier_id_fkey";

-- DropForeignKey
ALTER TABLE "post" DROP CONSTRAINT "post_category_id_fkey";

-- DropTable
DROP TABLE "post";
