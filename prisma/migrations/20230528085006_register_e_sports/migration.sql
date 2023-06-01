-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "socialUrl" TEXT;

-- CreateTable
CREATE TABLE "Esport" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "url" TEXT,
    "stream" TEXT,
    "region" TEXT[],

    CONSTRAINT "Esport_pkey" PRIMARY KEY ("id")
);
