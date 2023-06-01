/*
  Warnings:

  - Added the required column `masteryLevel` to the `PlayerRating` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Gamemode" AS ENUM ('None', 'NormalInitial', 'RankedInitial');

-- AlterTable
ALTER TABLE "Guide" ADD COLUMN     "character" TEXT,
ADD COLUMN     "role" TEXT;

-- AlterTable
ALTER TABLE "PlayerRating" ADD COLUMN     "masteryLevel" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "PlayerCharacterRating" (
    "playerId" TEXT NOT NULL,
    "character" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "games" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "knockounts" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "mvp" INTEGER NOT NULL,
    "saves" INTEGER NOT NULL,
    "scores" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "gamemode" "Gamemode" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerCharacterRating_pkey" PRIMARY KEY ("playerId")
);

-- AddForeignKey
ALTER TABLE "PlayerCharacterRating" ADD CONSTRAINT "PlayerCharacterRating_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
