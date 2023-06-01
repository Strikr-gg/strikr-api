-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
