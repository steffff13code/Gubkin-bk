import { displayName } from "@/lib/auth";
import { DEPARTMENT_LABELS, DEPARTMENT_POSITION_LABELS, ROLE_LABELS } from "@/lib/labels";
import { addUserDepartmentAction, removeUserDepartmentAction, updateUserAction } from "@/lib/actions/settings-actions";
import type { getAllUsersWithDepartments } from "@/lib/queries/settings";

type UserRow = Awaited<ReturnType<typeof getAllUsersWithDepartments>>[number];

export function PeopleTab({ users }: { users: UserRow[] }) {
  return (
    <div className="space-y-3">
      {users.map((u) => (
        <div key={u.id} className="rounded border border-line bg-surface p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-ink">{displayName(u)}</p>
              <p className="text-xs text-muted">
                {u.username ? `@${u.username}` : u.telegramId}
              </p>
            </div>
            <form action={updateUserAction.bind(null, u.id)} className="flex items-center gap-2">
              <select name="role" defaultValue={u.role} className="rounded border border-line bg-bg px-2 py-1 text-xs">
                {Object.entries(ROLE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-xs text-ink">
                <input type="checkbox" name="isActive" defaultChecked={u.isActive} />
                Активен
              </label>
              <button type="submit" className="rounded border border-line px-2 py-1 text-xs font-bold text-ink">
                Сохранить
              </button>
            </form>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {u.departments.map((d) => (
              <span key={d.id} className="flex items-center gap-1 rounded bg-bg px-2 py-1 text-xs text-ink">
                {DEPARTMENT_LABELS[d.departmentCode]} · {DEPARTMENT_POSITION_LABELS[d.position]}
                <form action={removeUserDepartmentAction.bind(null, d.id)}>
                  <button type="submit" className="text-muted hover:text-danger">
                    ×
                  </button>
                </form>
              </span>
            ))}
            <form action={addUserDepartmentAction.bind(null, u.id)} className="flex items-center gap-1">
              <select name="departmentCode" className="rounded border border-line bg-bg px-1.5 py-1 text-xs">
                {Object.entries(DEPARTMENT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <select name="position" className="rounded border border-line bg-bg px-1.5 py-1 text-xs">
                {Object.entries(DEPARTMENT_POSITION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded border border-line px-2 py-1 text-xs font-bold text-ink">
                Добавить в отдел
              </button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}
