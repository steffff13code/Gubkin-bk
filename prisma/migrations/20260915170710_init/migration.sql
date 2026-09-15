-- CreateEnum
CREATE TYPE "Role" AS ENUM ('READER', 'MEMBER', 'LEAD', 'ADMIN');

-- CreateEnum
CREATE TYPE "DepartmentCode" AS ENUM ('GUESTS', 'SECURITY', 'PR', 'VENUE_BOOKING', 'CONTENT', 'STAGE', 'INTENSIVES');

-- CreateEnum
CREATE TYPE "DepartmentPosition" AS ENUM ('HEAD', 'DEPUTY', 'MEMBER');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('LECTURE', 'GAME', 'CASE', 'CONFERENCE', 'SERIES', 'INTENSIVE');

-- CreateEnum
CREATE TYPE "EventStage" AS ENUM ('IDEA', 'APPROVAL', 'PLANNING', 'IN_PROGRESS', 'DONE', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "GuestStatus" AS ENUM ('NONE', 'CONTACTED', 'WINDOW_AGREED', 'SECURITY_SUBMITTED', 'SECURITY_APPROVED', 'SECURITY_REJECTED');

-- CreateEnum
CREATE TYPE "TaskTriggerType" AS ENUM ('DATE_OFFSET', 'EVENT');

-- CreateEnum
CREATE TYPE "TaskTriggerEvent" AS ENUM ('DATE_FIXED', 'SECURITY_SUBMITTED', 'SECURITY_ANSWERED', 'REGISTRATION_CLOSED', 'EVENT_DONE');

-- CreateEnum
CREATE TYPE "TaskGroup" AS ENUM ('BEFORE', 'EVENT_DAY', 'AFTER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'DONE', 'SKIPPED');

-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('PROGRAM', 'MEMO', 'GUEST_LIST', 'PASS_PHOTO', 'POSTER', 'PHOTO_REPORT', 'VIDEO', 'OTHER');

-- CreateEnum
CREATE TYPE "IdeaCategory" AS ENUM ('IDEA', 'CRITIQUE', 'OTHER');

-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('NEW', 'DISCUSSED', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "photoUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "botStarted" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "code" "DepartmentCode" NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "UserDepartment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentCode" "DepartmentCode" NOT NULL,
    "position" "DepartmentPosition" NOT NULL,

    CONSTRAINT "UserDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "stage" "EventStage" NOT NULL DEFAULT 'IDEA',
    "description" TEXT,
    "leadId" TEXT,
    "targetDate" TIMESTAMP(3),
    "dateFixed" BOOLEAN NOT NULL DEFAULT false,
    "timeSlot" TEXT,
    "venue" TEXT,
    "guestName" TEXT,
    "guestOrganization" TEXT,
    "guestTopic" TEXT,
    "guestStatus" "GuestStatus" NOT NULL DEFAULT 'NONE',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvalComment" TEXT,
    "driveFolderUrl" TEXT,
    "expectedAttendance" INTEGER,
    "actualAttendance" INTEGER,
    "stageChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventMember" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleInEvent" TEXT NOT NULL,

    CONSTRAINT "EventMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTemplate" (
    "id" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "title" TEXT NOT NULL,
    "department" "DepartmentCode",
    "triggerType" "TaskTriggerType" NOT NULL,
    "offsetDays" INTEGER,
    "triggerEvent" "TaskTriggerEvent",
    "required" BOOLEAN NOT NULL DEFAULT true,
    "needsTwoAssignees" BOOLEAN NOT NULL DEFAULT false,
    "firesTrigger" "TaskTriggerEvent",
    "group" "TaskGroup" NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "TaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "templateId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "department" "DepartmentCode",
    "assigneeId" TEXT,
    "secondAssigneeId" TEXT,
    "dueDate" TIMESTAMP(3),
    "triggerType" "TaskTriggerType" NOT NULL,
    "offsetDays" INTEGER,
    "triggerEvent" "TaskTriggerEvent",
    "firesTrigger" "TaskTriggerEvent",
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "group" "TaskGroup" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "overdueNotifiedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "taskId" TEXT,
    "kind" "AttachmentKind" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Retro" (
    "eventId" TEXT NOT NULL,
    "wentWell" TEXT NOT NULL,
    "wentWrong" TEXT NOT NULL,
    "doDifferently" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Retro_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "Idea" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" "IdeaCategory" NOT NULL,
    "authorId" TEXT,
    "targetDepartment" "DepartmentCode",
    "status" "IdeaStatus" NOT NULL DEFAULT 'NEW',
    "adminComment" TEXT,
    "convertedEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdeaVote" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "IdeaVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Regulation" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" "DepartmentCode",
    "body" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Regulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegulationVersion" (
    "id" TEXT NOT NULL,
    "regulationId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "editedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegulationVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT,
    "role" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "telegram" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetItem" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "isIncome" BOOLEAN NOT NULL DEFAULT false,
    "comment" TEXT,

    CONSTRAINT "BudgetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "UserDepartment_userId_departmentCode_key" ON "UserDepartment"("userId", "departmentCode");

-- CreateIndex
CREATE INDEX "Event_stage_idx" ON "Event"("stage");

-- CreateIndex
CREATE INDEX "Event_type_idx" ON "Event"("type");

-- CreateIndex
CREATE INDEX "Event_targetDate_idx" ON "Event"("targetDate");

-- CreateIndex
CREATE UNIQUE INDEX "EventMember_eventId_userId_key" ON "EventMember"("eventId", "userId");

-- CreateIndex
CREATE INDEX "TaskTemplate_eventType_idx" ON "TaskTemplate"("eventType");

-- CreateIndex
CREATE INDEX "Task_eventId_idx" ON "Task"("eventId");

-- CreateIndex
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "Attachment_eventId_idx" ON "Attachment"("eventId");

-- CreateIndex
CREATE INDEX "Idea_status_idx" ON "Idea"("status");

-- CreateIndex
CREATE UNIQUE INDEX "IdeaVote_ideaId_userId_key" ON "IdeaVote"("ideaId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Regulation_slug_key" ON "Regulation"("slug");

-- CreateIndex
CREATE INDEX "RegulationVersion_regulationId_idx" ON "RegulationVersion"("regulationId");

-- CreateIndex
CREATE INDEX "ActivityLog_eventId_idx" ON "ActivityLog"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_dedupeKey_key" ON "NotificationLog"("dedupeKey");

-- CreateIndex
CREATE INDEX "NotificationLog_userId_idx" ON "NotificationLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_eventId_key" ON "Budget"("eventId");

-- CreateIndex
CREATE INDEX "Registration_eventId_idx" ON "Registration"("eventId");

-- CreateIndex
CREATE INDEX "Attendance_eventId_idx" ON "Attendance"("eventId");

-- AddForeignKey
ALTER TABLE "UserDepartment" ADD CONSTRAINT "UserDepartment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDepartment" ADD CONSTRAINT "UserDepartment_departmentCode_fkey" FOREIGN KEY ("departmentCode") REFERENCES "Department"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMember" ADD CONSTRAINT "EventMember_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMember" ADD CONSTRAINT "EventMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TaskTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_secondAssigneeId_fkey" FOREIGN KEY ("secondAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retro" ADD CONSTRAINT "Retro_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retro" ADD CONSTRAINT "Retro_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaVote" ADD CONSTRAINT "IdeaVote_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaVote" ADD CONSTRAINT "IdeaVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Regulation" ADD CONSTRAINT "Regulation_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulationVersion" ADD CONSTRAINT "RegulationVersion_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "Regulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulationVersion" ADD CONSTRAINT "RegulationVersion_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
