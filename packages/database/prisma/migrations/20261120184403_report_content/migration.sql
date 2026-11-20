-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "content" TEXT,
ALTER COLUMN "format" SET DEFAULT 'MARKDOWN';
