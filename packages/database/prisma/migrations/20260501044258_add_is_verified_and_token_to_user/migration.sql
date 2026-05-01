-- AlterTable
ALTER TABLE "User" ADD COLUMN     "is_verified" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "token" TEXT NOT NULL DEFAULT '';
