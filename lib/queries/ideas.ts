import { prisma } from "@/lib/db";

export async function getIdeasList(currentUserId: string | null) {
  const ideas = await prisma.idea.findMany({
    include: { author: true, votes: true },
    orderBy: { createdAt: "desc" }
  });

  return ideas.map((i) => ({
    id: i.id,
    text: i.text,
    category: i.category,
    authorName: i.author ? i.author.firstName : null,
    targetDepartment: i.targetDepartment,
    status: i.status,
    adminComment: i.adminComment,
    convertedEventId: i.convertedEventId,
    isDemo: i.isDemo,
    createdAt: i.createdAt,
    voteCount: i.votes.length,
    hasVoted: currentUserId ? i.votes.some((v) => v.userId === currentUserId) : false
  }));
}
