/*
  Warnings:

  - Changed the type of `report_hash` on the `RoundResult` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "RoundResult" DROP COLUMN "report_hash",
ADD COLUMN     "report_hash" BYTEA NOT NULL;
