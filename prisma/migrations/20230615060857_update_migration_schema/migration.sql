-- AlterTable
ALTER TABLE "Guide" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "currentXp" INTEGER NOT NULL DEFAULT 0;
