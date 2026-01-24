/*
  Warnings:

  - Changed the type of `roundTimestamp` on the `RoundResult` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "RoundResult" DROP COLUMN "roundTimestamp",
ADD COLUMN     "roundTimestamp" TIMESTAMP(3) NOT NULL;
