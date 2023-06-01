/*
  Warnings:

  - You are about to drop the column `timestamp` on the `PlayerCharacterRating` table. All the data in the column will be lost.
  - The primary key for the `PlayerRating` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `timestamp` on the `PlayerRating` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "PlayerCharacterRating_playerId_character_role_gamemode_key";

-- AlterTable
ALTER TABLE "PlayerCharacterRating" DROP COLUMN "timestamp",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "PlayerCharacterRating_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "PlayerRating" DROP CONSTRAINT "PlayerRating_pkey",
DROP COLUMN "timestamp",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "PlayerRating_pkey" PRIMARY KEY ("id");
