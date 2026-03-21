/*
  Warnings:

  - You are about to drop the column `diagnosis` on the `Patient` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email,tenantId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "Patient" DROP COLUMN "diagnosis",
ADD COLUMN     "email" TEXT,
ADD COLUMN     "medicalHistory" TEXT,
ADD COLUMN     "phone" TEXT,
ALTER COLUMN "age" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_tenantId_key" ON "User"("email", "tenantId");
