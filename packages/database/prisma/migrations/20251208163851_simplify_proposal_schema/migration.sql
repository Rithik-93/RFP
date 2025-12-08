/*
  Warnings:

  - You are about to drop the column `aiAnalysis` on the `proposals` table. All the data in the column will be lost.
  - You are about to drop the column `aiScore` on the `proposals` table. All the data in the column will be lost.
  - You are about to drop the column `pricing` on the `proposals` table. All the data in the column will be lost.
  - You are about to drop the column `processedAt` on the `proposals` table. All the data in the column will be lost.
  - You are about to drop the column `terms` on the `proposals` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "proposals" DROP COLUMN "aiAnalysis",
DROP COLUMN "aiScore",
DROP COLUMN "pricing",
DROP COLUMN "processedAt",
DROP COLUMN "terms";
