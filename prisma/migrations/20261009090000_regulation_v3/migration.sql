-- Регламент v3: пропуска делает Пиар (ЦБ → PR), интенсивы — направление внешнего отдела (INTENSIVES → GUESTS).
-- Появляется отдел BOARD — руководство клуба. Переносим всё, что было в старых отделах, и убираем их из enum.
DELETE FROM "UserDepartment" ud
WHERE ud."departmentCode" = 'SECURITY'
  AND EXISTS (SELECT 1 FROM "UserDepartment" o WHERE o."userId" = ud."userId" AND o."departmentCode" = 'PR');
INSERT INTO "Department" ("code", "title")
SELECT 'PR', 'Пиар' WHERE EXISTS (SELECT 1 FROM "UserDepartment" WHERE "departmentCode" = 'SECURITY')
ON CONFLICT ("code") DO NOTHING;
UPDATE "UserDepartment" SET "departmentCode" = 'PR' WHERE "departmentCode" = 'SECURITY';
UPDATE "TaskTemplate" SET "department" = 'PR' WHERE "department" = 'SECURITY';
UPDATE "Task" SET "department" = 'PR' WHERE "department" = 'SECURITY';
UPDATE "Idea" SET "targetDepartment" = 'PR' WHERE "targetDepartment" = 'SECURITY';
UPDATE "Regulation" SET "department" = 'PR' WHERE "department" = 'SECURITY';
DELETE FROM "Department" WHERE "code" = 'SECURITY';

DELETE FROM "UserDepartment" ud
WHERE ud."departmentCode" = 'INTENSIVES'
  AND EXISTS (SELECT 1 FROM "UserDepartment" o WHERE o."userId" = ud."userId" AND o."departmentCode" = 'GUESTS');
INSERT INTO "Department" ("code", "title")
SELECT 'GUESTS', 'Внешний отдел' WHERE EXISTS (SELECT 1 FROM "UserDepartment" WHERE "departmentCode" = 'INTENSIVES')
ON CONFLICT ("code") DO NOTHING;
UPDATE "UserDepartment" SET "departmentCode" = 'GUESTS' WHERE "departmentCode" = 'INTENSIVES';
UPDATE "TaskTemplate" SET "department" = 'GUESTS' WHERE "department" = 'INTENSIVES';
UPDATE "Task" SET "department" = 'GUESTS' WHERE "department" = 'INTENSIVES';
UPDATE "Idea" SET "targetDepartment" = 'GUESTS' WHERE "targetDepartment" = 'INTENSIVES';
UPDATE "Regulation" SET "department" = 'GUESTS' WHERE "department" = 'INTENSIVES';
DELETE FROM "Department" WHERE "code" = 'INTENSIVES';

-- AlterEnum
ALTER TABLE "UserDepartment" DROP CONSTRAINT "UserDepartment_departmentCode_fkey";
CREATE TYPE "DepartmentCode_new" AS ENUM ('BOARD', 'GUESTS', 'PR', 'CONTENT', 'STAGE');
ALTER TABLE "Department" ALTER COLUMN "code" TYPE "DepartmentCode_new" USING ("code"::text::"DepartmentCode_new");
ALTER TABLE "UserDepartment" ALTER COLUMN "departmentCode" TYPE "DepartmentCode_new" USING ("departmentCode"::text::"DepartmentCode_new");
ALTER TABLE "TaskTemplate" ALTER COLUMN "department" TYPE "DepartmentCode_new" USING ("department"::text::"DepartmentCode_new");
ALTER TABLE "Task" ALTER COLUMN "department" TYPE "DepartmentCode_new" USING ("department"::text::"DepartmentCode_new");
ALTER TABLE "Idea" ALTER COLUMN "targetDepartment" TYPE "DepartmentCode_new" USING ("targetDepartment"::text::"DepartmentCode_new");
ALTER TABLE "Regulation" ALTER COLUMN "department" TYPE "DepartmentCode_new" USING ("department"::text::"DepartmentCode_new");
ALTER TYPE "DepartmentCode" RENAME TO "DepartmentCode_old";
ALTER TYPE "DepartmentCode_new" RENAME TO "DepartmentCode";
DROP TYPE "DepartmentCode_old";
ALTER TABLE "UserDepartment" ADD CONSTRAINT "UserDepartment_departmentCode_fkey" FOREIGN KEY ("departmentCode") REFERENCES "Department"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'ACCELERATOR';

-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN     "actorLabel" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "externalOwner" TEXT,
ADD COLUMN     "format" TEXT,
ADD COLUMN     "guestOccupation" TEXT,
ADD COLUMN     "intensiveCycle" TEXT,
ADD COLUMN     "intensiveMeeting" INTEGER,
ADD COLUMN     "intensiveTotal" INTEGER,
ADD COLUMN     "passReadyAt" TIMESTAMP(3),
ADD COLUMN     "speakerWarned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "speakerWindowEnd" TIMESTAMP(3),
ADD COLUMN     "speakerWindowStart" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "NotificationLog" ADD COLUMN     "subscriptionId" TEXT;

-- AlterTable
ALTER TABLE "TaskTemplate" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isRoleAccount" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EventDateOption" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "timeSlot" TEXT,
    "venue" TEXT,
    "comment" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventDateOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventDateOption_eventId_idx" ON "EventDateOption"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramSubscription_telegramId_key" ON "TelegramSubscription"("telegramId");

-- CreateIndex
CREATE INDEX "TelegramSubscription_userId_idx" ON "TelegramSubscription"("userId");

-- AddForeignKey
ALTER TABLE "EventDateOption" ADD CONSTRAINT "EventDateOption_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventDateOption" ADD CONSTRAINT "EventDateOption_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramSubscription" ADD CONSTRAINT "TelegramSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Привязки Telegram из профилей людей становятся подписками (уведомления роли — всем её подписчикам).
INSERT INTO "TelegramSubscription" ("id", "userId", "telegramId", "label", "createdAt")
SELECT 'tgsub_' || "id", "id", "telegramId", "username", CURRENT_TIMESTAMP
FROM "User" WHERE "telegramId" IS NOT NULL AND "botStarted" = true
ON CONFLICT ("telegramId") DO NOTHING;
