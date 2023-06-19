-- CreateTable
CREATE TABLE "Leaderboard" (
    "playerId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "emoticonId" TEXT,
    "titleId" TEXT,
    "tags" TEXT[],
    "masteryLevel" INTEGER NOT NULL DEFAULT 0,
    "socialUrl" TEXT,
    "rank" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "topRole" TEXT NOT NULL,

    CONSTRAINT "Leaderboard_pkey" PRIMARY KEY ("playerId","region")
);
