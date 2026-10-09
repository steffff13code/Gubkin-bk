"use server";

import { redirect } from "next/navigation";
import type {
  DepartmentCode,
  EventType,
  TaskAutoComplete,
  TaskGroup,
  TaskTriggerEvent,
  TaskTriggerType
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { friendlyError } from "@/lib/errors";
import { requireRight } from "@/lib/permissions";
import { setAdminPassword, setDepartmentsPassword } from "@/lib/passwords";
import { setChatTags } from "@/lib/role-accounts";
import { isRoleKey } from "@/lib/roles";

type Tab = "roles" | "access" | "templates" | "service" | "rules";

async function runOrRedirect(tab: Tab, fn: () => Promise<string | void>): Promise<never> {
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

/** Кого тегать в рабочем чате для роли — ники через пробел. */
export async function setChatTagsAction(formData: FormData): Promise<void> {
  await runOrRedirect("roles", async () => {
    await requireRight("SETTINGS");
    const role = String(formData.get("role") || "");
    if (!isRoleKey(role)) throw new Error("Неизвестная роль.");
    await setChatTags(role, String(formData.get("tags") || ""));
    return "Теги сохранены.";
  });
}

export async function setAdminPasswordAction(formData: FormData): Promise<void> {
  await runOrRedirect("access", async () => {
    await requireRight("SETTINGS");
    const password = String(formData.get("password") || "");
    const repeat = String(formData.get("repeat") || "");
    if (password.trim().length < 8) throw new Error("Пароль — минимум 8 символов.");
    if (password !== repeat) throw new Error("Пароли не совпадают.");
    await setAdminPassword(password);
    return "Пароль администратора изменён.";
  });
}

export async function setDepartmentsPasswordAction(formData: FormData): Promise<void> {
  await runOrRedirect("access", async () => {
    await requireRight("SETTINGS");
    const enabled = formData.get("enabled") === "on";
    const password = String(formData.get("password") || "");
    if (password && password.trim().length < 6) throw new Error("Общий пароль отделов — минимум 6 символов.");
    await setDepartmentsPassword(enabled, password || undefined);
    return enabled ? "Общий пароль для отделов включён." : "Общий пароль для отделов выключен — в отделы входят без пароля.";
  });
}

/** Удаление всех мероприятий — только Администратор, с подтверждением словом «УДАЛИТЬ». */
export async function deleteAllEventsAction(formData: FormData): Promise<void> {
  await runOrRedirect("service", async () => {
    const user = await requireRight("SETTINGS");
    if (String(formData.get("confirm") || "").trim() !== "УДАЛИТЬ") {
      throw new Error("Чтобы удалить, введите слово УДАЛИТЬ большими буквами.");
    }
    const count = await prisma.event.count();
    await prisma.idea.updateMany({ data: { convertedEventId: null } });
    await prisma.event.deleteMany({});
    await prisma.activityLog.create({ data: { userId: user.id, action: "EVENTS_PURGED", payload: { count } } });
    return `Удалено мероприятий: ${count}.`;
  });
}

/** Общие правила регламента (markdown) — правит Администратор. */
export async function saveGeneralRulesAction(formData: FormData): Promise<void> {
  let error: string | null = null;
  try {
    const user = await requireRight("SETTINGS");
    const body = String(formData.get("body") || "").trim();
    if (!body) throw new Error("Текст правил не может быть пустым.");
    const existing = await prisma.regulation.findUnique({ where: { slug: "general-rules" } });
    if (existing) {
      if (existing.body !== body) {
        await prisma.$transaction([
          prisma.regulationVersion.create({
            data: { regulationId: existing.id, body: existing.body, editedById: existing.updatedById, createdAt: existing.updatedAt }
          }),
          prisma.regulation.update({ where: { id: existing.id }, data: { body, updatedById: user.id } })
        ]);
      }
    } else {
      await prisma.regulation.create({
        data: { slug: "general-rules", title: "Общие правила", body, sortOrder: 0, updatedById: user.id }
      });
    }
  } catch (e) {
    error = friendlyError(e);
  }
  redirect(`/regulation?tab=rules${error ? `&error=${encodeURIComponent(error)}` : "&notice=saved"}`);
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
  const description = String(formData.get("description") || "").trim() || null;

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
    dayTimeLabel,
    description
  };
}

export async function createTaskTemplateAction(formData: FormData): Promise<void> {
  await runOrRedirect("templates", async () => {
    await requireRight("SETTINGS");
    const data = templateDataFromForm(formData);
    if (!data.title || !data.eventType) throw new Error("Укажите тип мероприятия и название задачи.");
    await prisma.taskTemplate.create({ data });
  });
}

export async function updateTaskTemplateAction(templateId: string, formData: FormData): Promise<void> {
  await runOrRedirect("templates", async () => {
    await requireRight("SETTINGS");
    // Тип мероприятия у существующей задачи шаблона не меняется — в форме правки его нет.
    const { eventType: _eventType, ...data } = templateDataFromForm(formData);
    void _eventType;
    if (!data.title) throw new Error("Название не может быть пустым.");
    await prisma.taskTemplate.update({ where: { id: templateId }, data });
  });
}

export async function deleteTaskTemplateAction(templateId: string): Promise<void> {
  await runOrRedirect("templates", async () => {
    await requireRight("SETTINGS");
    await prisma.taskTemplate.delete({ where: { id: templateId } });
  });
}
