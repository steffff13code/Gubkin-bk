import { setAdminPasswordAction, setDepartmentsPasswordAction } from "@/lib/actions/settings-actions";

const input = "w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-base text-ink placeholder:text-muted sm:text-sm";
const button = "rounded-lg bg-gold px-4 py-2.5 text-sm font-bold text-bg hover:bg-gold/90";

export function AccessTab({ adminPasswordSet, departmentsPassword }: { adminPasswordSet: boolean; departmentsPassword: boolean }) {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="font-bold text-ink">Пароль администратора</h2>
        <p className="mt-1 text-sm text-muted">
          {adminPasswordSet
            ? "Пароль задан. Хранится только в виде хэша — посмотреть его нельзя, можно заменить."
            : "Пароль не задан. Укажите ADMIN_PASSWORD в настройках сервера или задайте здесь."}{" "}
          Можно писать по-русски и с пробелами, минимум 8 символов.
        </p>
        <form action={setAdminPasswordAction} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label>
            <span className="mb-1 block text-xs font-bold text-ink">Новый пароль</span>
            <input type="password" name="password" required minLength={8} autoComplete="new-password" className={input} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold text-ink">Ещё раз</span>
            <input type="password" name="repeat" required minLength={8} autoComplete="new-password" className={input} />
          </label>
          <button type="submit" className={button}>
            Сменить пароль
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="font-bold text-ink">Общий пароль для отделов</h2>
        <p className="mt-1 text-sm text-muted">
          {departmentsPassword
            ? "Включён: чтобы войти в любой отдел, нужно ввести общий пароль."
            : "Выключен: в отделы входят одним нажатием, без пароля. Администратор входит только по своему паролю."}
        </p>
        <form action={setDepartmentsPasswordAction} className="mt-3 space-y-2">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="enabled" defaultChecked={departmentsPassword} className="h-4 w-4 accent-[#E8B86D]" />
            Спрашивать общий пароль при входе в отдел
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-ink">
              Общий пароль {departmentsPassword && <span className="font-normal text-muted">(оставьте пустым, чтобы не менять)</span>}
            </span>
            <input type="password" name="password" minLength={6} autoComplete="new-password" className={input} />
          </label>
          <button type="submit" className={button}>
            Сохранить
          </button>
        </form>
      </section>
    </div>
  );
}
