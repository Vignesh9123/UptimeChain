-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "regions" TEXT[] DEFAULT ARRAY['Asia', 'North America', 'Oceania']::TEXT[];
