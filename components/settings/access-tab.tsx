import { ROLE_LABELS } from "@/lib/labels";
import { LOGIN_ROLES, type LoginRole } from "@/lib/role-passwords";
import { deleteDemoDataAction, setRolePasswordAction } from "@/lib/actions/settings-actions";

const ROLE_HINT: Record<LoginRole, string> = {
  MEMBER: "Закрывают свои задачи, берут свободные задачи отдела, прикрепляют ссылки.",
  LEAD: "Всё, что участники, плюс создают мероприятия, ставят даты, назначают задачи, ведут свои мероприятия.",
  ADMIN: "Всё, плюс согласование, любые мероприятия, люди и роли, шаблоны задач, удаление."
};

export function AccessTab({ defaultRoles, demoCount }: { defaultRoles: LoginRole[]; demoCount: number }) {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-1 text-sm font-bold text-ink">Пароли ролей</h2>
        <p className="mb-3 text-xs text-muted">
          У каждой роли один пароль: человек выбирает себя в списке и вводит пароль своей роли. Смена пароля не
          выкидывает тех, кто уже вошёл.
        </p>
        <div className="space-y-3">
          {LOGIN_ROLES.map((role) => (
            <form key={role} action={setRolePasswordAction} className="rounded-lg border border-line bg-bg p-3">
              <input type="hidden" name="role" value={role} />
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-ink">{ROLE_LABELS[role]}</span>
                {defaultRoles.includes(role) ? (
                  <span className="rounded bg-danger/15 px-1.5 py-0.5 text-[10px] font-bold text-danger">пароль по умолчанию</span>
                ) : (
                  <span className="rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-bold text-success">свой пароль</span>
                )}
              </div>
              <p className="mb-2 text-xs text-muted">{ROLE_HINT[role]}</p>
              <div className="flex flex-wrap gap-2">
                <input
                  name="password"
                  type="text"
                  minLength={6}
                  required
                  autoComplete="off"
                  placeholder="Новый пароль, от 6 символов"
                  className="flex-1 rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink"
                />
                <button type="submit" className="rounded bg-gold px-3 py-1.5 text-sm font-bold text-bg hover:bg-gold/90">
                  Сменить
                </button>
              </div>
            </form>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-1 text-sm font-bold text-ink">Демо-данные</h2>
        {demoCount > 0 ? (
          <>
            <p className="mb-3 text-xs text-muted">
              Сейчас в системе {demoCount} демо-записей: тестовые люди по отделам, пример мероприятия с планом, три идеи.
              Перед запуском удалите их. Сначала добавьте себя во вкладке «Люди» руководителем клуба и войдите под своим именем.
            </p>
            <details>
              <summary className="cursor-pointer text-sm font-bold text-danger">Удалить демо-данные</summary>
              <form action={deleteDemoDataAction} className="mt-2">
                <button type="submit" className="rounded border border-danger/40 px-3 py-1.5 text-sm font-bold text-danger">
                  Да, удалить тестовых людей, пример мероприятия и демо-идеи
                </button>
              </form>
            </details>
          </>
        ) : (
          <p className="text-xs text-muted">Демо-данных нет — платформа готова к работе.</p>
        )}
      </section>
    </div>
  );
}
