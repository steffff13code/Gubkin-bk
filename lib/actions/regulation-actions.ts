"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";

export async function updateRegulationAction(slug: string, formData: FormData): Promise<void> {
  let error: string | null = null;
  try {
    const user = await requireRole("LEAD");
    const regulation = await prisma.regulation.findUniqueOrThrow({ where: { slug } });
    const body = String(formData.get("body") || "").trim();
    if (!body) throw new Error("Текст регламента не может быть пустым.");

    await prisma.$transaction([
      prisma.regulationVersion.create({
        data: {
          regulationId: regulation.id,
          body: regulation.body,
          editedById: regulation.updatedById,
          createdAt: regulation.updatedAt
        }
      }),
      prisma.regulation.update({
        where: { slug },
        data: { body, updatedById: user.id }
      })
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Не удалось сохранить регламент.";
  }

  const params = new URLSearchParams();
  if (error) params.set("error", error);
  redirect(`/regulations/${slug}${error ? `?${params.toString()}` : ""}`);
}
