import { prisma } from "@/lib/db";

/**
 * Удаляет демо-данные: демо-мероприятия, идеи и демо-людей. Всё, что демо-люди успели
 * сделать в настоящих мероприятиях, переходит к указанному администратору, задачи — без исполнителя.
 */
export async function deleteDemoData(adminId: string): Promise<number> {
  const demoUsers = await prisma.user.findMany({ where: { isDemo: true }, select: { id: true } });
  const ids = demoUsers.map((u) => u.id).filter((id) => id !== adminId);

  await prisma.$transaction([
    prisma.event.deleteMany({ where: { isDemo: true } }),
    prisma.idea.deleteMany({ where: { isDemo: true } }),
    prisma.event.updateMany({ where: { createdById: { in: ids } }, data: { createdById: adminId } }),
    prisma.event.updateMany({ where: { leadId: { in: ids } }, data: { leadId: null } }),
    prisma.event.updateMany({ where: { approvedById: { in: ids } }, data: { approvedById: adminId } }),
    prisma.task.updateMany({ where: { assigneeId: { in: ids } }, data: { assigneeId: null } }),
    prisma.task.updateMany({ where: { secondAssigneeId: { in: ids } }, data: { secondAssigneeId: null } }),
    prisma.task.updateMany({ where: { completedById: { in: ids } }, data: { completedById: adminId } }),
    prisma.attachment.updateMany({ where: { addedById: { in: ids } }, data: { addedById: adminId } }),
    prisma.retro.updateMany({ where: { authorId: { in: ids } }, data: { authorId: adminId } }),
    prisma.regulation.updateMany({ where: { updatedById: { in: ids } }, data: { updatedById: adminId } }),
    prisma.regulationVersion.updateMany({ where: { editedById: { in: ids } }, data: { editedById: adminId } }),
    prisma.idea.updateMany({ where: { authorId: { in: ids } }, data: { authorId: null } }),
    prisma.user.deleteMany({ where: { id: { in: ids } } })
  ]);
  return ids.length;
}
