import { prisma } from "@/lib/db";

export async function getAllUsersWithDepartments() {
  return prisma.user.findMany({
    include: { departments: true },
    orderBy: [{ isActive: "desc" }, { firstName: "asc" }]
  });
}

export async function getAllTaskTemplates() {
  return prisma.taskTemplate.findMany({
    orderBy: [{ eventType: "asc" }, { group: "asc" }, { sortOrder: "asc" }]
  });
}
