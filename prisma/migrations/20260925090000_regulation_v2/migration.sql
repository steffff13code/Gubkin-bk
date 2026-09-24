-- Регламент клуба: аудиторию ведёт Пиар, отдельного отдела «Аудитория» нет.
-- Переносим всё, что было в VENUE_BOOKING, в PR и убираем значение из enum.
DELETE FROM "UserDepartment" ud
WHERE ud."departmentCode" = 'VENUE_BOOKING'
  AND EXISTS (SELECT 1 FROM "UserDepartment" o WHERE o."userId" = ud."userId" AND o."departmentCode" = 'PR');
INSERT INTO "Department" ("code", "title")
SELECT 'PR', 'Пиар' WHERE EXISTS (SELECT 1 FROM "UserDepartment" WHERE "departmentCode" = 'VENUE_BOOKING')
ON CONFLICT ("code") DO NOTHING;
UPDATE "UserDepartment" SET "departmentCode" = 'PR' WHERE "departmentCode" = 'VENUE_BOOKING';
UPDATE "TaskTemplate" SET "department" = 'PR' WHERE "department" = 'VENUE_BOOKING';
UPDATE "Task" SET "department" = 'PR' WHERE "department" = 'VENUE_BOOKING';
UPDATE "Idea" SET "targetDepartment" = 'PR' WHERE "targetDepartment" = 'VENUE_BOOKING';
UPDATE "Regulation" SET "department" = 'PR' WHERE "department" = 'VENUE_BOOKING';
DELETE FROM "Department" WHERE "code" = 'VENUE_BOOKING';

-- AlterEnum
ALTER TABLE "UserDepartment" DROP CONSTRAINT "UserDepartment_departmentCode_fkey";
CREATE TYPE "DepartmentCode_new" AS ENUM ('GUESTS', 'SECURITY', 'PR', 'CONTENT', 'STAGE', 'INTENSIVES');
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

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "dayOffsetMinutes" INTEGER,
ADD COLUMN     "dayTimeLabel" TEXT;

-- AlterTable
ALTER TABLE "TaskTemplate" ADD COLUMN     "dayOffsetMinutes" INTEGER,
ADD COLUMN     "dayTimeLabel" TEXT;

