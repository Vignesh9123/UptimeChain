/*
  Warnings:

  - Added the required column `continent` to the `ValidatorSubmissions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ValidatorSubmissions" ADD COLUMN     "continent" TEXT NOT NULL;
