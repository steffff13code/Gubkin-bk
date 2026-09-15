"use server";

import { redirect } from "next/navigation";
import type {
  DepartmentCode,
  DepartmentPosition,
  EventType,
  Role,
  TaskAutoComplete,
  TaskGroup,
  TaskTriggerEvent,
  TaskTriggerType
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";

async function runOrRedirect(tab: "people" | "templates", fn: () => Promise<void>): Promise<never> {
  let error: string | null = null;
  try {
    await fn();
  } catch (e) {
    error = e instanceof Error ? e.message : "Не удалось выполнить действие.";
  }
  const params = new URLSearchParams({ tab });
  if (error) params.set("error", error);
  redirect(`/settings?${params.toString()}`);
}

export async function updateUserAction(userId: string, formData: FormData): Promise<void> {
  await runOrRedirect("people", async () => {
    await requireRole("ADMIN");
    const role = String(formData.get("role") || "MEMBER") as Role;
    const isActive = formData.get("isActive") === "on";
    await prisma.user.update({ where: { id: userId }, data: { role, isActive } });
  });
}

export async function addUserDepartmentAction(userId: string, formData: FormData): Promise<void> {
  await runOrRedirect("people", async () => {
    await requireRole("ADMIN");
    const departmentCode = String(formData.get("departmentCode") || "") as DepartmentCode;
    const position = String(formData.get("position") || "MEMBER") as DepartmentPosition;
    if (!departmentCode) throw new Error("Выберите отдел.");
    await prisma.userDepartment.upsert({
      where: { userId_departmentCode: { userId, departmentCode } },
      create: { userId, departmentCode, position },
      update: { position }
    });
  });
}

export async function removeUserDepartmentAction(userDepartmentId: string): Promise<void> {
  await runOrRedirect("people", async () => {
    await requireRole("ADMIN");
    await prisma.userDepartment.delete({ where: { id: userDepartmentId } });
  });
}

function templateDataFromForm(formData: FormData) {
  const triggerType = String(formData.get("triggerType") || "DATE_OFFSET") as TaskTriggerType;
  const offsetDaysStr = String(formData.get("offsetDays") || "");
  const triggerEvent = String(formData.get("triggerEvent") || "") || null;
  const firesTrigger = String(formData.get("firesTrigger") || "") || null;
  const autoComplete = String(formData.get("autoComplete") || "") || null;
  const department = String(formData.get("department") || "") || null;

  if (triggerType === "EVENT" && !triggerEvent) {
    throw new Error("Для задачи «по событию» выберите, какое событие её запускает.");
  }

  return {
    autoComplete: autoComplete as TaskAutoComplete | null,
    eventType: String(formData.get("eventType") || "") as EventType,
    title: String(formData.get("title") || "").trim(),
    department: department as DepartmentCode | null,
    triggerType,
    offsetDays: offsetDaysStr ? Number(offsetDaysStr) : null,
    triggerEvent: triggerEvent as TaskTriggerEvent | null,
    firesTrigger: firesTrigger as TaskTriggerEvent | null,
    required: formData.get("required") === "on",
    needsTwoAssignees: formData.get("needsTwoAssignees") === "on",
    group: String(formData.get("group") || "BEFORE") as TaskGroup,
    sortOrder: Number(formData.get("sortOrder") || 0)
  };
}

export async function createTaskTemplateAction(formData: FormData): Promise<void> {
  await runOrRedirect("templates", async () => {
    await requireRole("ADMIN");
    const data = templateDataFromForm(formData);
    if (!data.title || !data.eventType) throw new Error("Укажите тип мероприятия и название задачи.");
    await prisma.taskTemplate.create({ data });
  });
}

export async function updateTaskTemplateAction(templateId: string, formData: FormData): Promise<void> {
  await runOrRedirect("templates", async () => {
    await requireRole("ADMIN");
    const data = templateDataFromForm(formData);
    if (!data.title) throw new Error("Название не может быть пустым.");
    await prisma.taskTemplate.update({ where: { id: templateId }, data });
  });
}

export async function deleteTaskTemplateAction(templateId: string): Promise<void> {
  await runOrRedirect("templates", async () => {
    await requireRole("ADMIN");
    await prisma.taskTemplate.delete({ where: { id: templateId } });
  });
}
