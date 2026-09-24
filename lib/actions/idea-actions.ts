"use server";

import { redirect } from "next/navigation";
import type { DepartmentCode, EventType, IdeaCategory, IdeaStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requireRole, requireUser } from "@/lib/permissions";

async function runOrRedirect(fn: () => Promise<string | void>): Promise<never> {
  let error: string | null = null;
  let successPath = "/ideas";
  try {
    const result = await fn();
    if (result) successPath = result;
  } catch (e) {
    error = e instanceof Error ? e.message : "Не удалось выполнить действие.";
  }
  redirect(error ? `/ideas?error=${encodeURIComponent(error)}` : successPath);
}

export async function createIdeaAction(formData: FormData): Promise<void> {
  await runOrRedirect(async () => {
    const user = await getCurrentUser();
    const text = String(formData.get("text") || "").trim();
    const category = String(formData.get("category") || "IDEA") as IdeaCategory;
    const targetDepartment = String(formData.get("targetDepartment") || "") || null;
    // Не вошедшие всегда отправляют анонимно; вошедшие — по своему выбору.
    const anonymous = !user || formData.get("anonymous") === "on";

    if (!text) throw new Error("Напишите текст идеи или замечания.");

    // Важно: при анонимной отправке authorId не должен попасть в data вообще.
    await prisma.idea.create({
      data: {
        text,
        category,
        targetDepartment: targetDepartment as DepartmentCode | null,
        ...(anonymous ? {} : { authorId: user!.id })
      }
    });
  });
}

export async function voteIdeaAction(ideaId: string): Promise<void> {
  await runOrRedirect(async () => {
    const user = await requireUser();
    const existing = await prisma.ideaVote.findUnique({
      where: { ideaId_userId: { ideaId, userId: user.id } }
    });
    if (existing) {
      await prisma.ideaVote.delete({ where: { id: existing.id } });
    } else {
      await prisma.ideaVote.create({ data: { ideaId, userId: user.id } });
    }
  });
}

export async function setIdeaStatusAction(ideaId: string, formData: FormData): Promise<void> {
  await runOrRedirect(async () => {
    await requireRole("ADMIN");
    const status = String(formData.get("status") || "NEW") as IdeaStatus;
    const adminComment = String(formData.get("adminComment") || "").trim() || null;
    await prisma.idea.update({ where: { id: ideaId }, data: { status, adminComment } });
  });
}

export async function deleteIdeaAction(ideaId: string): Promise<void> {
  await runOrRedirect(async () => {
    await requireRole("ADMIN");
    await prisma.idea.delete({ where: { id: ideaId } });
  });
}

export async function convertIdeaToEventAction(ideaId: string, formData: FormData): Promise<void> {
  await runOrRedirect(async () => {
    const user = await requireRole("LEAD");
    const idea = await prisma.idea.findUniqueOrThrow({ where: { id: ideaId } });
    if (idea.convertedEventId) throw new Error("Из этой идеи уже создано мероприятие.");
    const type = (String(formData.get("type") || "LECTURE") as EventType) || "LECTURE";
    const title = String(formData.get("title") || "").trim() || idea.text.slice(0, 80);

    const event = await prisma.event.create({
      data: {
        title,
        type,
        stage: "IDEA",
        description: `${idea.text}\n\n_Создано из идеи, отправленной в разделе «Идеи»._`,
        leadId: user.id,
        createdById: user.id,
        stageChangedAt: new Date()
      }
    });
    await prisma.activityLog.create({ data: { eventId: event.id, userId: user.id, action: "CREATED" } });

    await prisma.idea.update({ where: { id: ideaId }, data: { convertedEventId: event.id, status: "ACCEPTED" } });
    return `/events/${event.id}`;
  });
}
