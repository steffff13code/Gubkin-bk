"use server";

import { redirect } from "next/navigation";
import type { AttachmentKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isMember, requireUser } from "@/lib/permissions";

async function runOrRedirect(eventId: string, tab: string, fn: () => Promise<void>): Promise<never> {
  let error: string | null = null;
  try {
    await fn();
  } catch (e) {
    error = e instanceof Error ? e.message : "Не удалось выполнить действие.";
  }
  const params = new URLSearchParams({ tab });
  if (error) params.set("error", error);
  redirect(`/events/${eventId}?${params.toString()}`);
}

export async function addAttachmentAction(eventId: string, formData: FormData): Promise<void> {
  await runOrRedirect(eventId, "files", async () => {
    const user = await requireUser();
    if (!isMember(user)) throw new Error("Только вошедшие участники могут прикреплять ссылки.");

    const title = String(formData.get("title") || "").trim();
    const url = String(formData.get("url") || "").trim();
    const kind = String(formData.get("kind") || "OTHER") as AttachmentKind;
    const taskId = String(formData.get("taskId") || "") || null;

    if (!title || !url) throw new Error("Укажите название и ссылку.");
    if (!/^https:\/\//.test(url)) throw new Error("Ссылка должна начинаться с https://.");

    await prisma.attachment.create({
      data: { eventId, taskId, kind, title, url, addedById: user.id }
    });
  });
}

export async function deleteAttachmentAction(eventId: string, attachmentId: string): Promise<void> {
  await runOrRedirect(eventId, "files", async () => {
    const user = await requireUser();
    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) return;
    if (attachment.addedById !== user.id && user.role !== "ADMIN") {
      throw new Error("Удалить файл может только тот, кто его добавил, или администратор.");
    }
    await prisma.attachment.delete({ where: { id: attachmentId } });
  });
}
