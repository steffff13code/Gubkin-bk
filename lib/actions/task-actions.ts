"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { canManageEvent, PermissionError, requireUser } from "@/lib/permissions";
import { fireTaskTrigger } from "@/lib/tasks/service";

async function runOrRedirect(eventId: string, fn: () => Promise<void>, returnTo?: string): Promise<never> {
  let error: string | null = null;
  try {
    await fn();
  } catch (e) {
    error = e instanceof Error ? e.message : "Не удалось выполнить действие.";
  }
  if (returnTo && !error && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    redirect(returnTo);
  }
  const params = new URLSearchParams({ tab: "tasks" });
  if (error) params.set("error", error);
  redirect(`/events/${eventId}?${params.toString()}`);
}

async function loadTaskWithEvent(taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { event: true } });
  if (!task) throw new Error("Задача не найдена.");
  return task;
}

function assertEditable(event: { stage: string }) {
  if (event.stage === "CLOSED" || event.stage === "REJECTED") {
    throw new Error("Мероприятие в архиве — задачи больше не меняются.");
  }
}

export async function toggleTaskAction(taskId: string, done: boolean, formData?: FormData): Promise<void> {
  const task = await loadTaskWithEvent(taskId);
  const returnTo = formData ? String(formData.get("returnTo") || "") || undefined : undefined;
  await runOrRedirect(
    task.eventId,
    async () => {
      const user = await requireUser();
    assertEditable(task.event);
      const isAssignee = task.assigneeId === user.id || task.secondAssigneeId === user.id;
      if (!isAssignee && !canManageEvent(user, task.event)) {
        throw new PermissionError("Отметить эту задачу может только исполнитель, лид мероприятия или руководитель клуба.");
      }

      if (done) {
        await prisma.task.update({
          where: { id: taskId },
          data: { status: "DONE", completedAt: new Date(), completedById: user.id }
        });
        await prisma.activityLog.create({
          data: { eventId: task.eventId, userId: user.id, action: "TASK_DONE", payload: { title: task.title } }
        });
        if (task.firesTrigger) {
          await fireTaskTrigger(task.eventId, task.firesTrigger, new Date());
        }
      } else {
        await prisma.task.update({
          where: { id: taskId },
          data: { status: "TODO", completedAt: null, completedById: null }
        });
        await prisma.activityLog.create({
          data: { eventId: task.eventId, userId: user.id, action: "TASK_REOPENED", payload: { title: task.title } }
        });
      }
    },
    returnTo
  );
}

export async function skipTaskAction(taskId: string): Promise<void> {
  const task = await loadTaskWithEvent(taskId);
  await runOrRedirect(task.eventId, async () => {
    const user = await requireUser();
    assertEditable(task.event);
    if (!canManageEvent(user, task.event)) {
      throw new PermissionError("Пропустить задачу может только лид мероприятия или руководитель клуба.");
    }
    if (task.required) throw new Error("Обязательную задачу нельзя пропустить.");
    await prisma.task.update({ where: { id: taskId }, data: { status: "SKIPPED" } });
    await prisma.activityLog.create({
      data: { eventId: task.eventId, userId: user.id, action: "TASK_SKIPPED", payload: { title: task.title } }
    });
  });
}

export async function assignToMeAction(taskId: string, formData?: FormData): Promise<void> {
  const task = await loadTaskWithEvent(taskId);
  const returnTo = formData ? String(formData.get("returnTo") || "") || undefined : undefined;
  await runOrRedirect(task.eventId, async () => {
    const user = await requireUser();
    assertEditable(task.event);
    if (task.status !== "TODO") throw new Error("Закрытую задачу нельзя взять на себя.");
    if (task.assigneeId && task.assigneeId !== user.id && !canManageEvent(user, task.event)) {
      throw new PermissionError("У задачи уже есть исполнитель. Переназначить её может лид мероприятия или руководитель клуба.");
    }
    await prisma.task.update({ where: { id: taskId }, data: { assigneeId: user.id } });
    await prisma.activityLog.create({
      data: { eventId: task.eventId, userId: user.id, action: "TASK_TAKEN", payload: { title: task.title } }
    });
  }, returnTo);
}

export async function updateTaskAction(taskId: string, formData: FormData): Promise<void> {
  const task = await loadTaskWithEvent(taskId);
  await runOrRedirect(task.eventId, async () => {
    const user = await requireUser();
    assertEditable(task.event);
    if (!canManageEvent(user, task.event)) {
      throw new PermissionError("Редактировать задачу может только лид мероприятия или руководитель клуба.");
    }
    const assigneeId = String(formData.get("assigneeId") || "") || null;
    const secondAssigneeId = String(formData.get("secondAssigneeId") || "") || null;
    const dueDateStr = String(formData.get("dueDate") || "");
    const description = String(formData.get("description") || "") || null;

    if (dueDateStr && Number.isNaN(new Date(dueDateStr).getTime())) throw new Error("Срок указан неверно.");

    await prisma.task.update({
      where: { id: taskId },
      data: {
        assigneeId,
        secondAssigneeId,
        dueDate: dueDateStr ? new Date(dueDateStr) : null,
        description
      }
    });
    await prisma.activityLog.create({
      data: { eventId: task.eventId, userId: user.id, action: "TASK_UPDATED", payload: { title: task.title } }
    });
  });
}
