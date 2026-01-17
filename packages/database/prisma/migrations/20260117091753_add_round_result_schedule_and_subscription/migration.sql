/*
  Warnings:

  - You are about to drop the `Ping` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserWebsite` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Ping" DROP CONSTRAINT "Ping_userWebsiteId_fkey";

-- DropForeignKey
ALTER TABLE "UserWebsite" DROP CONSTRAINT "UserWebsite_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserWebsite" DROP CONSTRAINT "UserWebsite_websiteId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "wallet_pubkey" TEXT;

-- DropTable
DROP TABLE "Ping";

-- DropTable
DROP TABLE "UserWebsite";

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "check_interval" INTEGER NOT NULL,
    "last_checked" TIMESTAMP(3),
    "current_status" "CheckStatus" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteSchedule" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "interval_seconds" INTEGER NOT NULL,
    "next_run" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundResult" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "uptime_percentage" DOUBLE PRECISION NOT NULL,
    "status" "CheckStatus" NOT NULL,
    "responseTime" DOUBLE PRECISION NOT NULL,
    "report_hash" TEXT NOT NULL,
    "solana_address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoundResult_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteSchedule" ADD CONSTRAINT "WebsiteSchedule_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundResult" ADD CONSTRAINT "RoundResult_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
