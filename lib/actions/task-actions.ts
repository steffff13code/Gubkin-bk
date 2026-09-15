"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { canManageEvent, PermissionError, requireUser } from "@/lib/permissions";
import { fireTaskTrigger } from "@/lib/tasks/service";

async function runOrRedirect(eventId: string, fn: () => Promise<void>): Promise<never> {
  let error: string | null = null;
  try {
    await fn();
  } catch (e) {
    error = e instanceof Error ? e.message : "Не удалось выполнить действие.";
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

export async function toggleTaskAction(taskId: string, done: boolean): Promise<void> {
  const task = await loadTaskWithEvent(taskId);
  await runOrRedirect(task.eventId, async () => {
    const user = await requireUser();
    const isAssignee = task.assigneeId === user.id || task.secondAssigneeId === user.id;
    if (!isAssignee && !canManageEvent(user, task.event)) {
      throw new PermissionError("Отметить эту задачу может только исполнитель, лид мероприятия или администратор.");
    }

    if (done) {
      await prisma.task.update({
        where: { id: taskId },
        data: { status: "DONE", completedAt: new Date(), completedById: user.id }
      });
      if (task.firesTrigger) {
        await fireTaskTrigger(task.eventId, task.firesTrigger, new Date());
      }
    } else {
      await prisma.task.update({
        where: { id: taskId },
        data: { status: "TODO", completedAt: null, completedById: null }
      });
    }
  });
}

export async function skipTaskAction(taskId: string): Promise<void> {
  const task = await loadTaskWithEvent(taskId);
  await runOrRedirect(task.eventId, async () => {
    const user = await requireUser();
    if (!canManageEvent(user, task.event)) {
      throw new PermissionError("Пропустить задачу может только лид мероприятия или администратор.");
    }
    if (task.required) throw new Error("Обязательную задачу нельзя пропустить.");
    await prisma.task.update({ where: { id: taskId }, data: { status: "SKIPPED" } });
  });
}

export async function assignToMeAction(taskId: string): Promise<void> {
  const task = await loadTaskWithEvent(taskId);
  await runOrRedirect(task.eventId, async () => {
    const user = await requireUser();
    await prisma.task.update({ where: { id: taskId }, data: { assigneeId: user.id } });
  });
}

export async function updateTaskAction(taskId: string, formData: FormData): Promise<void> {
  const task = await loadTaskWithEvent(taskId);
  await runOrRedirect(task.eventId, async () => {
    const user = await requireUser();
    if (!canManageEvent(user, task.event)) {
      throw new PermissionError("Редактировать задачу может только лид мероприятия или администратор.");
    }
    const assigneeId = String(formData.get("assigneeId") || "") || null;
    const secondAssigneeId = String(formData.get("secondAssigneeId") || "") || null;
    const dueDateStr = String(formData.get("dueDate") || "");
    const description = String(formData.get("description") || "") || null;

    await prisma.task.update({
      where: { id: taskId },
      data: {
        assigneeId,
        secondAssigneeId,
        dueDate: dueDateStr ? new Date(dueDateStr) : null,
        description
      }
    });
  });
}
