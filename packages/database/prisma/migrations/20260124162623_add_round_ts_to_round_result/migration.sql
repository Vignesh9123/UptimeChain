/*
  Warnings:

  - Added the required column `roundTimestamp` to the `RoundResult` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RoundResult" ADD COLUMN     "roundTimestamp" INTEGER NOT NULL;
