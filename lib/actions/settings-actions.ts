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
import { friendlyError } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";
import { LOGIN_ROLES, setRolePassword, type LoginRole } from "@/lib/role-passwords";
import { ROLE_LABELS } from "@/lib/labels";
import { deleteDemoData } from "@/lib/demo";

async function runOrRedirect(tab: "people" | "templates" | "access", fn: () => Promise<string | void>): Promise<never> {
  let error: string | null = null;
  let notice: string | null = null;
  try {
    notice = (await fn()) || null;
  } catch (e) {
    error = friendlyError(e);
  }
  const params = new URLSearchParams({ tab });
  if (error) params.set("error", error);
  if (notice) params.set("notice", notice);
  redirect(`/settings?${params.toString()}`);
}

export async function createUserAction(formData: FormData): Promise<void> {
  await runOrRedirect("people", async () => {
    await requireRole("ADMIN");
    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim() || null;
    const role = String(formData.get("role") || "MEMBER") as Role;
    const departmentCode = (String(formData.get("departmentCode") || "") || null) as DepartmentCode | null;
    const position = String(formData.get("position") || "MEMBER") as DepartmentPosition;
    if (!firstName) throw new Error("Укажите имя.");

    const user = await prisma.user.create({ data: { firstName, lastName, role } });
    if (departmentCode) {
      await prisma.userDepartment.create({ data: { userId: user.id, departmentCode, position } });
    }
    return `Добавлен: ${firstName}${lastName ? " " + lastName : ""}. Теперь он может войти, выбрав себя в списке.`;
  });
}

export async function renameUserAction(userId: string, formData: FormData): Promise<void> {
  await runOrRedirect("people", async () => {
    await requireRole("ADMIN");
    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim() || null;
    if (!firstName) throw new Error("Имя не может быть пустым.");
    await prisma.user.update({ where: { id: userId }, data: { firstName, lastName } });
  });
}

export async function setRolePasswordAction(formData: FormData): Promise<void> {
  await runOrRedirect("access", async () => {
    await requireRole("ADMIN");
    const role = String(formData.get("role") || "") as LoginRole;
    const password = String(formData.get("password") || "");
    if (!LOGIN_ROLES.includes(role)) throw new Error("Неизвестная роль.");
    if (password.length < 6) throw new Error("Пароль — минимум 6 символов.");
    await setRolePassword(role, password);
    return `Пароль роли «${ROLE_LABELS[role]}» изменён. Сообщите его людям с этой ролью.`;
  });
}

/** Удаляет демо-данные сида: демо-мероприятия, идеи и тестовых людей. Их следы переходят к текущему админу. */
export async function deleteDemoDataAction(): Promise<void> {
  await runOrRedirect("access", async () => {
    const admin = await requireRole("ADMIN");
    const me = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
    if (me.isDemo) {
      throw new Error("Вы вошли как демо-пользователь. Добавьте себя в «Люди», войдите под своим именем и повторите.");
    }
    const count = await deleteDemoData(me.id);
    return `Демо-данные удалены (людей: ${count}). Можно добавлять настоящих участников.`;
  });
}

export async function updateUserAction(userId: string, formData: FormData): Promise<void> {
  await runOrRedirect("people", async () => {
    const admin = await requireRole("ADMIN");
    const role = String(formData.get("role") || "MEMBER") as Role;
    const isActive = formData.get("isActive") === "on";
    if (userId === admin.id && (role !== "ADMIN" || !isActive)) {
      throw new Error("Нельзя снять с себя роль руководителя клуба или отключить себя — попросите другого руководителя клуба.");
    }
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
  const dayOffsetStr = String(formData.get("dayOffsetMinutes") ?? "").trim();
  const dayTimeLabel = String(formData.get("dayTimeLabel") || "").trim() || null;

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
    sortOrder: Number(formData.get("sortOrder") || 0),
    dayOffsetMinutes: dayOffsetStr ? Number(dayOffsetStr) : null,
    dayTimeLabel
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
    // Тип мероприятия у существующей задачи шаблона не меняется — в форме правки его нет.
    const { eventType: _eventType, ...data } = templateDataFromForm(formData);
    void _eventType;
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
