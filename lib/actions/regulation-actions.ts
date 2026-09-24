"use server";

import { redirect } from "next/navigation";
import type { DepartmentCode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";

export async function updateRegulationAction(slug: string, formData: FormData): Promise<void> {
  let error: string | null = null;
  try {
    const user = await requireRole("LEAD");
    const regulation = await prisma.regulation.findUniqueOrThrow({ where: { slug } });
    const body = String(formData.get("body") || "").trim();
    if (!body) throw new Error("Текст регламента не может быть пустым.");
    if (body === regulation.body) throw new Error("Текст не изменился — новая версия не нужна.");

    await prisma.$transaction([
      prisma.regulationVersion.create({
        data: {
          regulationId: regulation.id,
          body: regulation.body,
          editedById: regulation.updatedById,
          createdAt: regulation.updatedAt
        }
      }),
      prisma.regulation.update({ where: { slug }, data: { body, updatedById: user.id } })
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Не удалось сохранить регламент.";
  }

  redirect(`/regulations/${slug}${error ? `?error=${encodeURIComponent(error)}` : ""}`);
}

function slugify(title: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
    н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya"
  };
  return title
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "regulation";
}

export async function createRegulationAction(formData: FormData): Promise<void> {
  let slug = "";
  let error: string | null = null;
  try {
    const user = await requireRole("ADMIN");
    const title = String(formData.get("title") || "").trim();
    const body = String(formData.get("body") || "").trim();
    const department = (String(formData.get("department") || "") || null) as DepartmentCode | null;
    if (!title || !body) throw new Error("Укажите название и текст регламента.");

    const base = slugify(title);
    slug = base;
    for (let i = 2; await prisma.regulation.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;

    const last = await prisma.regulation.findFirst({ orderBy: { sortOrder: "desc" } });
    await prisma.regulation.create({
      data: { slug, title, body, department, sortOrder: (last?.sortOrder ?? 0) + 10, updatedById: user.id }
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "Не удалось создать регламент.";
  }

  if (error) redirect(`/regulations/new?error=${encodeURIComponent(error)}`);
  redirect(`/regulations/${slug}`);
}
