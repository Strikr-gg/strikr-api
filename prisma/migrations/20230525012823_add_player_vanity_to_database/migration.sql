/*
  Warnings:

  - You are about to drop the column `knockounts` on the `PlayerCharacterRating` table. All the data in the column will be lost.
  - Added the required column `knockouts` to the `PlayerCharacterRating` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PlayerCharacterRating" DROP COLUMN "knockounts",
ADD COLUMN     "knockouts" INTEGER NOT NULL;
