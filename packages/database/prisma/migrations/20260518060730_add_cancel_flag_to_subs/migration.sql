-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "is_cancelled" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "regions" SET DEFAULT ARRAY[]::TEXT[];
