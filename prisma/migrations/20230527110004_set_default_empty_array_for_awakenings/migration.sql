-- AlterTable
ALTER TABLE "Guide" ALTER COLUMN "pref_awakenings" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "situ_awakenings" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "nogo_awakenings" SET DEFAULT ARRAY[]::TEXT[];
