/*
  Warnings:

  - The primary key for the `PlayerCharacterRating` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "PlayerCharacterRating" DROP CONSTRAINT "PlayerCharacterRating_pkey";
