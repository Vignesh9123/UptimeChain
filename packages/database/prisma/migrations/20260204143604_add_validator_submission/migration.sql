/*
  Warnings:

  - A unique constraint covering the columns `[wallet_pubkey]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "ValidatorSubmissions" (
    "id" TEXT NOT NULL,
    "validatorId" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "roundTimestamp" TIMESTAMP(3) NOT NULL,
    "status" "CheckStatus" NOT NULL,
    "responseTime" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValidatorSubmissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ValidatorSubmissions_validatorId_websiteId_roundTimestamp_key" ON "ValidatorSubmissions"("validatorId", "websiteId", "roundTimestamp");

-- CreateIndex
CREATE UNIQUE INDEX "User_wallet_pubkey_key" ON "User"("wallet_pubkey");

-- AddForeignKey
ALTER TABLE "ValidatorSubmissions" ADD CONSTRAINT "ValidatorSubmissions_validatorId_fkey" FOREIGN KEY ("validatorId") REFERENCES "Validator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidatorSubmissions" ADD CONSTRAINT "ValidatorSubmissions_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
