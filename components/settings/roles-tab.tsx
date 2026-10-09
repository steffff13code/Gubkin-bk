import { ROLES, type RoleKey } from "@/lib/roles";
import { setChatTagsAction } from "@/lib/actions/settings-actions";

const input = "w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-base text-ink placeholder:text-muted sm:text-sm";

/** Роли: что делает каждая, кого тегать в рабочем чате, сколько подключено телеграмов. */
export function RolesTab({ tags, subscriptions }: { tags: Record<RoleKey, string>; subscriptions: Record<RoleKey, number> }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        В CRM входят по ролям, без личных аккаунтов. «Кого тегать в чате» подставляется в готовые сообщения для рабочего
        чата на карточке мероприятия. Ники вписывайте через пробел, например <span className="text-ink">@nick1 @nick2</span>.
      </p>
      {ROLES.map((r) => (
        <section key={r.key} className="rounded-xl border border-line bg-surface p-4" data-role={r.key}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-bold text-ink">{r.title}</h2>
            <span className="text-xs text-muted">
              Телеграм подключён: {subscriptions[r.key]} {subscriptions[r.key] === 0 ? "— уведомления не придут" : ""}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted">{r.does}</p>
          <form action={setChatTagsAction} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <input type="hidden" name="role" value={r.key} />
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-xs font-bold text-ink">Кого тегать в чате</span>
              <input name="tags" defaultValue={tags[r.key]} placeholder="@ник @ник" className={input} />
            </label>
            <button type="submit" className="rounded-lg border border-line bg-bg px-4 py-2.5 text-sm font-bold text-ink hover:border-gold">
              Сохранить
            </button>
          </form>
        </section>
      ))}
    </div>
  );
}
