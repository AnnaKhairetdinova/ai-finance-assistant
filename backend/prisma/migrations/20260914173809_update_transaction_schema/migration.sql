/*
  Warnings:

  - Made the column `description` on table `Transaction` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "description" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Transaction_userUuid_idx" ON "Transaction"("userUuid");

-- CreateIndex
CREATE INDEX "Transaction_userUuid_transactionDate_idx" ON "Transaction"("userUuid", "transactionDate");
