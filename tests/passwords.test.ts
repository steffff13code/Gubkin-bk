import { beforeEach, describe, expect, it, vi } from "vitest";

// Таблица AppSetting в памяти вместо базы.
const store = new Map<string, string>();
vi.mock("@/lib/db", () => ({
  prisma: {
    appSetting: {
      findUnique: async ({ where }: { where: { key: string } }) =>
        store.has(where.key) ? { key: where.key, value: store.get(where.key)! } : null,
      upsert: async ({ where, create, update }: { where: { key: string }; create: { value: string }; update: { value: string } }) => {
        store.set(where.key, store.has(where.key) ? update.value : create.value);
      },
      delete: async ({ where }: { where: { key: string } }) => {
        store.delete(where.key);
      },
      deleteMany: async ({ where }: { where: { key: string } }) => {
        store.delete(where.key);
      }
    }
  }
}));

const {
  checkAdminPassword,
  checkDepartmentsPassword,
  departmentsPasswordEnabled,
  ensureAdminPassword,
  hashPassword,
  isAdminPasswordSet,
  setAdminPassword,
  setDepartmentsPassword,
  verifyPassword
} = await import("../lib/passwords");

// Пример, не настоящий пароль.
const CYRILLIC = "жёлтый трамвай 42";

beforeEach(() => store.clear());

describe("хэш пароля", () => {
  it("кириллица с пробелами проверяется", () => {
    const hash = hashPassword(CYRILLIC);
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(hash).not.toContain(CYRILLIC);
    expect(verifyPassword(CYRILLIC, hash)).toBe(true);
    expect(verifyPassword("жёлтый трамвай42", hash)).toBe(false);
    expect(verifyPassword("желтый трамвай 42", hash)).toBe(false);
  });

  it("ё в разной юникод-записи считается одной буквой", () => {
    const hash = hashPassword(CYRILLIC);
    expect(verifyPassword(CYRILLIC.normalize("NFD"), hash)).toBe(true);
  });

  it("испорченный хэш не пускает", () => {
    expect(verifyPassword(CYRILLIC, "plain-text")).toBe(false);
  });
});

describe("пароль администратора", () => {
  it("без ADMIN_PASSWORD пароля нет — вход закрыт", async () => {
    await ensureAdminPassword(undefined);
    expect(await isAdminPasswordSet()).toBe(false);
  });

  it("берётся из ADMIN_PASSWORD", async () => {
    await ensureAdminPassword(CYRILLIC);
    expect(await isAdminPasswordSet()).toBe(true);
    expect(verifyPassword(CYRILLIC, store.get("password:ADMIN")!)).toBe(true);
  });

  it("старый пароль по умолчанию заменяется на ADMIN_PASSWORD", async () => {
    store.set("password:ADMIN", hashPassword("old-default"));
    store.set("password:ADMIN:is-default", "1");
    await ensureAdminPassword(CYRILLIC);
    expect(verifyPassword(CYRILLIC, store.get("password:ADMIN")!)).toBe(true);
    expect(store.has("password:ADMIN:is-default")).toBe(false);
  });

  it("старый пароль по умолчанию без ADMIN_PASSWORD удаляется", async () => {
    store.set("password:ADMIN", hashPassword("old-default"));
    store.set("password:ADMIN:is-default", "1");
    await ensureAdminPassword(undefined);
    expect(await isAdminPasswordSet()).toBe(false);
  });

  it("пароль, заданный в настройках, переменная окружения не перезаписывает", async () => {
    await setAdminPassword(CYRILLIC);
    await ensureAdminPassword("другой пароль из окружения");
    expect(verifyPassword(CYRILLIC, store.get("password:ADMIN")!)).toBe(true);
  });

  it("checkAdminPassword", async () => {
    await setAdminPassword(CYRILLIC);
    expect(await checkAdminPassword(CYRILLIC)).toBe(true);
    expect(await checkAdminPassword("неверно")).toBe(false);
  });
});

describe("общий пароль отделов", () => {
  it("по умолчанию выключен", async () => {
    expect(await departmentsPasswordEnabled()).toBe(false);
  });

  it("включается только с паролем", async () => {
    await expect(setDepartmentsPassword(true)).rejects.toThrow(/Задайте/);
    await setDepartmentsPassword(true, CYRILLIC);
    expect(await departmentsPasswordEnabled()).toBe(true);
    expect(await checkDepartmentsPassword(CYRILLIC)).toBe(true);
    await setDepartmentsPassword(false);
    expect(await departmentsPasswordEnabled()).toBe(false);
  });
});
