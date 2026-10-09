import { PrismaClient } from "@prisma/client";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/session";

/** Подпись из сессии («как подписать вас в истории»). Вне запроса (cron, сид) — нет подписи. */
async function currentSigner(): Promise<string | null> {
  try {
    const { cookies } = await import("next/headers");
    return verifySessionCookie(cookies().get(SESSION_COOKIE_NAME)?.value)?.signer ?? null;
  } catch {
    return null;
  }
}

function createClient() {
  // Каждая запись истории получает подпись того, кто сидит под ролью, — без правки всех вызовов.
  return new PrismaClient().$extends({
    query: {
      activityLog: {
        async create({ args, query }) {
          const data = args.data as { actorLabel?: string | null };
          if (data.actorLabel === undefined) {
            const signer = await currentSigner();
            if (signer) data.actorLabel = signer;
          }
          return query(args);
        }
      }
    }
  });
}

// Один инстанс клиента на процесс, переживает hot-reload в dev.
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
