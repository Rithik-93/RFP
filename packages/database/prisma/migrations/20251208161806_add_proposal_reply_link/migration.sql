/*
  Warnings:

  - A unique constraint covering the columns `[rfpReplyId]` on the table `proposals` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "proposals" ADD COLUMN     "rfpReplyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "proposals_rfpReplyId_key" ON "proposals"("rfpReplyId");

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_rfpReplyId_fkey" FOREIGN KEY ("rfpReplyId") REFERENCES "rfp_replies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
