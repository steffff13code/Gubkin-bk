import { prisma } from "@/lib/db";

export async function getRegulationsList() {
  return prisma.regulation.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getRegulationBySlug(slug: string) {
  return prisma.regulation.findUnique({
    where: { slug },
    include: {
      updatedBy: true,
      versions: { include: { editedBy: true }, orderBy: { createdAt: "desc" } }
    }
  });
}
