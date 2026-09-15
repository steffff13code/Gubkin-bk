import { PrismaClient } from "@prisma/client";

// Один инстанс PrismaClient на процесс, переживает hot-reload в dev.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
