import Image from "next/image";
import { redirect } from "next/navigation";
import type { DepartmentCode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser, displayName } from "@/lib/auth";
import { DEPARTMENT_LABELS, ROLE_LABELS } from "@/lib/labels";
import { loginAction } from "@/lib/actions/auth-actions";

const DEPT_ORDER: DepartmentCode[] = ["GUESTS", "SECURITY", "PR", "CONTENT", "STAGE", "INTENSIVES"];

export default async function LoginPage({
  searchParams
}: {
  searchParams: { error?: string; user?: string; next?: string };
}) {
  const current = await getCurrentUser();
  if (current) redirect(searchParams.next || "/my");

  const users = await prisma.user.findMany({
    where: { isActive: true, role: { not: "READER" } },
    include: { departments: true },
    orderBy: [{ firstName: "asc" }]
  });

  // Группы: руководство (админы), затем отделы по порядку, затем без отдела.
  const groups: { label: string; users: typeof users }[] = [];
  const admins = users.filter((u) => u.role === "ADMIN");
  if (admins.length) groups.push({ label: "Руководство клуба", users: admins });
  for (const code of DEPT_ORDER) {
    const inDept = users.filter((u) => u.role !== "ADMIN" && u.departments[0]?.departmentCode === code);
    if (inDept.length) groups.push({ label: DEPARTMENT_LABELS[code], users: inDept });
  }
  const noDept = users.filter((u) => u.role !== "ADMIN" && u.departments.length === 0);
  if (noDept.length) groups.push({ label: "Без отдела", users: noDept });

  const input = "w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-ink";

  return (
    <div className="mx-auto mt-6 max-w-md">
      <div className="rounded-xl border border-line bg-surface p-6 shadow-glow">
        <div className="mb-5 flex items-center gap-3">
          <Image src="/logo.jpg" alt="" width={44} height={44} className="rounded-full" />
          <div>
            <h1 className="text-lg font-bold text-ink">Вход в платформу</h1>
            <p className="text-sm text-muted">Бизнес-клуб Губкина</p>
          </div>
        </div>

        {searchParams.error && (
          <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{searchParams.error}</p>
        )}

        {users.length === 0 ? (
          <p className="text-sm text-muted">Пока нет ни одного участника. Руководителю клуба нужно добавить людей в настройках.</p>
        ) : (
          <form action={loginAction} className="space-y-4">
            <input type="hidden" name="next" value={searchParams.next ?? "/my"} />
            <div>
              <label htmlFor="userId" className="mb-1 block text-sm font-bold text-ink">
                Кто вы
              </label>
              <select id="userId" name="userId" required defaultValue={searchParams.user ?? ""} className={input}>
                <option value="" disabled>
                  Выберите себя в списке
                </option>
                {groups.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {displayName(u)} — {ROLE_LABELS[u.role].toLowerCase()}
                        {u.isDemo ? " (демо)" : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-bold text-ink">
                Пароль вашей роли
              </label>
              <input id="password" name="password" type="password" required autoComplete="current-password" className={input} />
              <p className="mt-1 text-xs text-muted">
                У каждой роли — участник, руководитель отдела, руководитель клуба — свой пароль. Его выдаёт руководитель клуба.
              </p>
            </div>
            <button type="submit" className="w-full rounded-lg bg-gold py-2.5 text-sm font-bold text-bg hover:bg-gold/90">
              Войти
            </button>
          </form>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-muted">
        Без входа можно только смотреть список мероприятий.
      </p>
    </div>
  );
}
