/*
  Warnings:

  - A unique constraint covering the columns `[playerId,character,role,gamemode]` on the table `PlayerCharacterRating` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PlayerCharacterRating_playerId_character_role_gamemode_key" ON "PlayerCharacterRating"("playerId", "character", "role", "gamemode");
