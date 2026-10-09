"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { friendlyError } from "@/lib/errors";
import { PermissionError, requireRight, requireUser, userCanCloseTask } from "@/lib/permissions";
import { fireTaskTrigger } from "@/lib/tasks/service";

async function runOrRedirect(eventId: string, fn: () => Promise<void>, returnTo?: string): Promise<never> {
  let error: string | null = null;
  try {
    await fn();
  } catch (e) {
    error = friendlyError(e, "Не удалось выполнить действие.");
  }
  if (returnTo && !error && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    redirect(returnTo);
  }
  redirect(`/events/${eventId}${error ? `?error=${encodeURIComponent(error)}` : ""}`);
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
      if (!userCanCloseTask(user, task)) {
        throw new PermissionError("Эту задачу закрывает её отдел или Администратор клуба.");
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

/** Пропустить необязательную задачу — Администратор клуба. */
export async function skipTaskAction(taskId: string): Promise<void> {
  const task = await loadTaskWithEvent(taskId);
  await runOrRedirect(task.eventId, async () => {
    const user = await requireRight("SETTINGS");
    assertEditable(task.event);
    if (task.required) throw new Error("Обязательную задачу нельзя пропустить.");
    await prisma.task.update({ where: { id: taskId }, data: { status: "SKIPPED" } });
    await prisma.activityLog.create({
      data: { eventId: task.eventId, userId: user.id, action: "TASK_SKIPPED", payload: { title: task.title } }
    });
  });
}

/** Срок и заметка к задаче — Администратор клуба. */
export async function updateTaskAction(taskId: string, formData: FormData): Promise<void> {
  const task = await loadTaskWithEvent(taskId);
  await runOrRedirect(task.eventId, async () => {
    const user = await requireRight("SETTINGS");
    assertEditable(task.event);
    const dueDateStr = String(formData.get("dueDate") || "");
    const description = String(formData.get("description") || "").trim() || null;
    if (dueDateStr && Number.isNaN(new Date(dueDateStr).getTime())) throw new Error("Срок указан неверно.");

    await prisma.task.update({
      where: { id: taskId },
      data: { dueDate: dueDateStr ? new Date(dueDateStr) : null, description }
    });
    await prisma.activityLog.create({
      data: { eventId: task.eventId, userId: user.id, action: "TASK_UPDATED", payload: { title: task.title } }
    });
  });
}
