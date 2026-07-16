/*
  Warnings:

  - Made the column `role` on table `watch` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "watch" ALTER COLUMN "role" SET NOT NULL,
ALTER COLUMN "note" DROP NOT NULL;
