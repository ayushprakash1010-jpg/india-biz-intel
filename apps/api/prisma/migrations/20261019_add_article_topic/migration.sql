-- CreateEnum
CREATE TYPE "ArticleTopic" AS ENUM ('FUNDING', 'LEADERSHIP_CHANGE', 'ENTRY_IN_INDIA', 'EXPANSION', 'MERGERS_AND_ACQUISITION', 'GCC_SETUP', 'INDUSTRY_OUTLOOK');

-- AlterTable articles: add topic column
ALTER TABLE "articles" ADD COLUMN "topic" "ArticleTopic";

-- CreateIndex
CREATE INDEX "articles_topic_idx" ON "articles"("topic");

-- AlterTable article_analyses: rename gcc_category -> event_category
ALTER TABLE "article_analyses" RENAME COLUMN "gcc_category" TO "event_category";
