import { displayName } from "@/lib/auth";
import { DEPARTMENT_LABELS, DEPARTMENT_POSITION_LABELS, ROLE_LABELS } from "@/lib/labels";
import {
  addUserDepartmentAction,
  createUserAction,
  removeUserDepartmentAction,
  renameUserAction,
  updateUserAction
} from "@/lib/actions/settings-actions";
import type { getAllUsersWithDepartments } from "@/lib/queries/settings";
import { Avatar } from "@/components/avatar";

type UserRow = Awaited<ReturnType<typeof getAllUsersWithDepartments>>[number];

const select = "rounded border border-line bg-bg px-2 py-1 text-xs text-ink";
const input = "rounded border border-line bg-bg px-2 py-1.5 text-sm text-ink";

export function PeopleTab({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gold/40 bg-surface p-4">
        <h2 className="mb-1 text-sm font-bold text-ink">Добавить человека</h2>
        <p className="mb-3 text-xs text-muted">
          После добавления человек выбирает себя на странице входа и вводит пароль своей роли. Руководитель отдела
          автоматически получает задачи отдела при разворачивании плана, заместитель — вторым исполнителем там, где «в контуре двое».
        </p>
        <form action={createUserAction} className="grid gap-2 sm:grid-cols-6">
          <input name="firstName" required placeholder="Имя" className={`${input} sm:col-span-2`} />
          <input name="lastName" placeholder="Фамилия" className={`${input} sm:col-span-2`} />
          <select name="role" defaultValue="MEMBER" className={`${input} sm:col-span-2`}>
            <option value="MEMBER">Участник</option>
            <option value="LEAD">Руководитель отдела</option>
            <option value="ADMIN">Руководитель клуба</option>
          </select>
          <select name="departmentCode" defaultValue="" className={`${input} sm:col-span-3`}>
            <option value="">Без отдела</option>
            {Object.entries(DEPARTMENT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select name="position" defaultValue="MEMBER" className={`${input} sm:col-span-2`}>
            {Object.entries(DEPARTMENT_POSITION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded bg-gold px-3 py-1.5 text-sm font-bold text-bg hover:bg-gold/90">
            Добавить
          </button>
        </form>
      </section>

      {users.map((u) => (
        <div key={u.id} className={`rounded-xl border border-line bg-surface p-3 ${u.isActive ? "" : "opacity-60"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar name={displayName(u)} size={32} />
              <div>
                <details>
                  <summary className="cursor-pointer list-none text-sm font-bold text-ink">
                    {displayName(u)}
                    {u.id === currentUserId && <span className="ml-1 text-xs font-normal text-muted">(вы)</span>}
                    {u.isDemo && <span className="ml-2 rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-gold">демо</span>}
                    <span className="ml-2 text-xs font-normal text-muted underline">переименовать</span>
                  </summary>
                  <form action={renameUserAction.bind(null, u.id)} className="mt-2 flex flex-wrap gap-2">
                    <input name="firstName" defaultValue={u.firstName} required className={input} />
                    <input name="lastName" defaultValue={u.lastName ?? ""} placeholder="Фамилия" className={input} />
                    <button type="submit" className="rounded border border-line px-2 py-1 text-xs font-bold text-ink">
                      Сохранить
                    </button>
                  </form>
                </details>
                <p className="text-xs text-muted">
                  {u.botStarted && u.telegramId ? `Telegram подключён${u.username ? ` · @${u.username}` : ""}` : "Telegram не подключён"}
                  {!u.isActive && " · отключён"}
                </p>
              </div>
            </div>
            <form action={updateUserAction.bind(null, u.id)} className="flex items-center gap-2">
              <select name="role" defaultValue={u.role} className={select}>
                {Object.entries(ROLE_LABELS)
                  .filter(([k]) => k !== "READER")
                  .map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
              </select>
              <label className="flex items-center gap-1 text-xs text-ink">
                <input type="checkbox" name="isActive" defaultChecked={u.isActive} />
                Активен
              </label>
              <button type="submit" className="rounded border border-line px-2 py-1 text-xs font-bold text-ink hover:border-gold">
                Сохранить
              </button>
            </form>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {u.departments.map((d) => (
              <span key={d.id} className="flex items-center gap-1 rounded bg-bg px-2 py-1 text-xs text-ink">
                {DEPARTMENT_LABELS[d.departmentCode]} · {DEPARTMENT_POSITION_LABELS[d.position]}
                <form action={removeUserDepartmentAction.bind(null, d.id)}>
                  <button type="submit" title="Убрать из отдела" className="text-muted hover:text-danger">
                    ×
                  </button>
                </form>
              </span>
            ))}
            <form action={addUserDepartmentAction.bind(null, u.id)} className="flex items-center gap-1">
              <select name="departmentCode" className={select}>
                {Object.entries(DEPARTMENT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <select name="position" className={select}>
                {Object.entries(DEPARTMENT_POSITION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded border border-line px-2 py-1 text-xs font-bold text-ink hover:border-gold">
                Добавить в отдел
              </button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}
