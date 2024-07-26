-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetPasswordTryCount" INTEGER NOT NULL DEFAULT 0;
