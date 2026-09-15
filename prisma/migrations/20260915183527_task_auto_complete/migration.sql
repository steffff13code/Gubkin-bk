-- CreateEnum
CREATE TYPE "TaskAutoComplete" AS ENUM ('PHOTO_REPORT_ATTACHED', 'RETRO_SAVED');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "autoComplete" "TaskAutoComplete";

-- AlterTable
ALTER TABLE "TaskTemplate" ADD COLUMN     "autoComplete" "TaskAutoComplete";
