import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loginAction } from "@/lib/actions/auth-actions";
import { SIGNER_COOKIE } from "@/lib/session";
import { departmentsPasswordEnabled, isAdminPasswordSet } from "@/lib/passwords";
import { ROLES } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: { error?: string; next?: string; role?: string } }) {
  if (await getCurrentUser()) redirect(searchParams.next ?? "/my");

  const [adminSet, deptPassword] = await Promise.all([isAdminPasswordSet(), departmentsPasswordEnabled()]);
  const savedSigner = (() => {
    try {
      return decodeURIComponent(cookies().get(SIGNER_COOKIE)?.value ?? "");
    } catch {
      return "";
    }
  })();
  const departments = ROLES.filter((r) => !r.needsPassword);
  const admin = ROLES.find((r) => r.needsPassword)!;
  const input = "w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-base text-ink placeholder:text-muted";

  return (
    <div className="mx-auto max-w-md py-4">
      <div className="mb-5 flex items-center gap-3">
        <Image src="/logo.jpg" alt="" width={44} height={44} className="rounded-full" />
        <div>
          <h1 className="text-xl font-bold text-ink">Вход в CRM клуба</h1>
          <p className="text-sm text-muted">Выберите свою роль</p>
        </div>
      </div>

      {searchParams.error && (
        <p role="alert" className="mb-4 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {searchParams.error}
        </p>
      )}

      <form action={loginAction} className="space-y-3">
        <input type="hidden" name="next" value={searchParams.next ?? "/my"} />

        <div>
          <label htmlFor="signer" className="mb-1 block text-xs text-muted">
            Как подписать вас в истории (необязательно)
          </label>
          <input id="signer" name="signer" defaultValue={savedSigner} maxLength={40} placeholder="Например, имя" className={input} />
        </div>

        {deptPassword && (
          <div>
            <label htmlFor="departmentsPassword" className="mb-1 block text-xs text-muted">
              Общий пароль отделов
            </label>
            <input id="departmentsPassword" name="departmentsPassword" type="password" autoComplete="current-password" className={input} />
          </div>
        )}

        <div className="space-y-2 pt-1">
          {departments.map((r) => (
            <button
              key={r.key}
              type="submit"
              name="role"
              value={r.key}
              className="flex w-full flex-col items-start rounded-xl border border-line bg-surface px-4 py-3.5 text-left transition hover:border-gold active:scale-[0.99]"
            >
              <span className="text-base font-bold text-ink">{r.title}</span>
              <span className="mt-0.5 text-sm text-muted">{r.does}</span>
            </button>
          ))}

          <details open={searchParams.role === "BOARD"} className="group rounded-xl border border-gold/50 bg-surface">
            <summary className="flex cursor-pointer list-none flex-col items-start px-4 py-3.5">
              <span className="text-base font-bold text-gold">{admin.title}</span>
              <span className="mt-0.5 text-sm text-muted">{admin.does}</span>
            </summary>
            <div className="space-y-2 px-4 pb-4">
              {adminSet ? (
                <>
                  <label htmlFor="adminPassword" className="block text-xs text-muted">
                    Пароль администратора
                  </label>
                  <input id="adminPassword" name="adminPassword" type="password" autoComplete="current-password" className={input} />
                  <button
                    type="submit"
                    name="role"
                    value="BOARD"
                    className="w-full rounded-lg bg-gold py-3 text-sm font-bold text-bg hover:bg-gold/90"
                  >
                    Войти
                  </button>
                </>
              ) : (
                <p className="text-sm text-danger">
                  Пароль администратора не задан. Укажите ADMIN_PASSWORD в настройках сервера.
                </p>
              )}
            </div>
          </details>
        </div>
      </form>
    </div>
  );
}
