/*
  Warnings:

  - The primary key for the `PlayerMatch` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[userId]` on the table `Player` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[matchId,playerId]` on the table `PlayerMatch` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
CREATE SEQUENCE playermatch_matchid_seq;
ALTER TABLE "PlayerMatch" DROP CONSTRAINT "PlayerMatch_pkey",
ADD COLUMN     "character" TEXT NOT NULL DEFAULT 'Unknown',
ALTER COLUMN "matchId" SET DEFAULT nextval('playermatch_matchid_seq'),
ADD CONSTRAINT "PlayerMatch_pkey" PRIMARY KEY ("matchId");
ALTER SEQUENCE playermatch_matchid_seq OWNED BY "PlayerMatch"."matchId";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isStaff" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Player_userId_key" ON "Player"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerMatch_matchId_playerId_key" ON "PlayerMatch"("matchId", "playerId");
