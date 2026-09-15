"use server";

import { redirect } from "next/navigation";
import type { DepartmentCode, IdeaCategory, IdeaStatus } from "@prisma/client";
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

export async function convertIdeaToEventAction(ideaId: string): Promise<void> {
  await runOrRedirect(async () => {
    const user = await requireRole("ADMIN");
    const idea = await prisma.idea.findUniqueOrThrow({ where: { id: ideaId } });

    const event = await prisma.event.create({
      data: {
        title: idea.text.slice(0, 80),
        type: "LECTURE",
        stage: "IDEA",
        description: `${idea.text}\n\n_Создано из идеи, отправленной в разделе «Идеи»._`,
        createdById: user.id,
        stageChangedAt: new Date()
      }
    });

    await prisma.idea.update({ where: { id: ideaId }, data: { convertedEventId: event.id, status: "ACCEPTED" } });
    return `/events/${event.id}`;
  });
}
