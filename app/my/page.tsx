import Link from "next/link";
import { redirect } from "next/navigation";
import clsx from "clsx";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import {
  countUnassignedTasks,
  getFreeDepartmentTasks,
  getMyEvents,
  getMyTasks,
  getPendingApprovals,
  getStuckEvents,
  getTodayEvents,
  type MyTask
} from "@/lib/queries/my-day";
import { DEPARTMENT_LABELS, DEPARTMENT_POSITION_LABELS, ROLE_LABELS, TASK_TRIGGER_EVENT_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/time";
import { assignToMeAction, toggleTaskAction } from "@/lib/actions/task-actions";

export const dynamic = "force-dynamic";

export default async function MyTasksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/my");

  const admin = isAdmin(user);
  const [tasks, events, free, today, approvals, stuck, unassigned] = await Promise.all([
    getMyTasks(user.id),
    getMyEvents(user.id),
    getFreeDepartmentTasks(user.departments.map((d) => d.code)),
    getTodayEvents(),
    admin ? getPendingApprovals() : Promise.resolve([]),
    admin ? getStuckEvents() : Promise.resolve([]),
    admin ? countUnassignedTasks() : Promise.resolve(0)
  ]);

  // Что ждёт решения именно этого человека.
  const decisions: { href: string; text: string; action: string; danger?: boolean }[] = [
    ...approvals.map((e) => ({ href: `/events/${e.id}`, text: e.title, action: "Согласовать" })),
    ...events.led.filter((e) => e.stage === "IDEA").map((e) => ({ href: `/events/${e.id}`, text: e.title, action: "Отправить на согласование" })),
    ...events.led.filter((e) => e.stage === "PLANNING").map((e) => ({ href: `/events/${e.id}`, text: e.title, action: "Указать окно дат" })),
    ...events.led
      .filter((e) => e.stage === "IN_PROGRESS" && !e.dateFixed)
      .map((e) => ({ href: `/events/${e.id}`, text: e.title, action: "Зафиксировать дату после ЦБ" })),
    ...events.led.filter((e) => e.needsRetro).map((e) => ({ href: `/events/${e.id}`, text: e.title, action: "Заполнить итоги" })),
    ...stuck.map((e) => ({ href: `/events/${e.id}`, text: e.title, action: `Стоит ${e.ageDays} дн.`, danger: true })),
    ...(unassigned > 0 ? [{ href: "/?view=list", text: `Задач без исполнителя: ${unassigned}`, action: "Раздать", danger: true }] : [])
  ];

  const openCount = tasks.overdue.length + tasks.today.length + tasks.week.length + tasks.later.length + tasks.waiting.length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Мои задачи</h1>
        <p className="mt-1 text-sm text-muted">
          {user.firstName} · {ROLE_LABELS[user.role]}
          {user.departments.map((d) => ` · ${DEPARTMENT_LABELS[d.code]} (${DEPARTMENT_POSITION_LABELS[d.position].toLowerCase()})`)}
        </p>
      </div>

      {today.map((e) => (
        <Link
          key={e.id}
          href={`/events/${e.id}/day`}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-gold bg-gold/10 p-4 hover:bg-gold/15"
        >
          <span className="rounded bg-gold px-2 py-1 text-xs font-bold uppercase text-bg">Сегодня</span>
          <span className="min-w-0 flex-1 font-bold text-ink">
            {e.title}
            <span className="font-normal text-muted">{e.timeSlot ? ` · начало в ${e.timeSlot}` : ""}</span>
          </span>
          <span className="text-sm font-bold text-gold">Тайминг дня →</span>
        </Link>
      ))}

      {decisions.length > 0 && (
        <section className="rounded-xl border border-gold/40 bg-surface p-4">
          <h2 className="mb-3 text-sm font-bold text-ink">Нужно ваше решение</h2>
          <ul className="space-y-2">
            {decisions.map((d, i) => (
              <li key={i}>
                <Link href={d.href} className="flex items-center gap-3 rounded-lg bg-bg px-3 py-2.5 text-sm hover:ring-1 hover:ring-gold/40">
                  <span className="min-w-0 flex-1 text-ink">{d.text}</span>
                  <span className={clsx("shrink-0 text-xs font-bold", d.danger ? "text-danger" : "text-gold")}>{d.action} →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section data-my-tasks className="rounded-xl border border-line bg-surface p-4">
        {openCount === 0 ? (
          <div className="py-6 text-center">
            <p className="text-3xl">✓</p>
            <p className="mt-2 font-bold text-ink">Открытых задач нет</p>
            <p className="mt-1 text-sm text-muted">Задачи приходят сами, когда лид запускает подготовку мероприятия.</p>
          </div>
        ) : (
          <div className="space-y-5">
            <Bucket title="Просрочено" tone="danger" tasks={tasks.overdue} />
            <Bucket title="Сегодня" tone="gold" tasks={tasks.today} />
            <Bucket title="На этой неделе" tasks={tasks.week} />
            <Bucket title="Позже" tasks={tasks.later} />
            <Bucket title="Ждут другого шага" tasks={tasks.waiting} waiting />
          </div>
        )}
      </section>

      {free.length > 0 && (
        <section className="rounded-xl border border-line bg-surface p-4">
          <h2 className="text-sm font-bold text-ink">Свободные задачи отдела</h2>
          <p className="mb-3 text-xs text-muted">У этих задач нет исполнителя — возьмите, если можете.</p>
          <ul className="divide-y divide-line">
            {free.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">{t.title}</p>
                  <Link href={`/events/${t.event.id}`} className="text-xs text-muted hover:text-gold">
                    {t.event.title}
                    {t.dueDate && ` · до ${formatDate(t.dueDate)}`}
                  </Link>
                </div>
                <form action={assignToMeAction.bind(null, t.id)}>
                  <input type="hidden" name="returnTo" value="/my" />
                  <button type="submit" className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink hover:border-gold">
                    Взять себе
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-center text-xs text-muted">
        Напоминания в Telegram —{" "}
        <Link href="/profile" className="text-gold hover:underline">
          подключить в профиле
        </Link>
      </p>
    </div>
  );
}

function Bucket({ title, tasks, tone, waiting }: { title: string; tasks: MyTask[]; tone?: "danger" | "gold"; waiting?: boolean }) {
  if (tasks.length === 0) return null;
  return (
    <div data-bucket>
      <h2
        className={clsx(
          "mb-1 text-xs font-bold uppercase tracking-wide",
          tone === "danger" ? "text-danger" : tone === "gold" ? "text-gold" : "text-muted"
        )}
      >
        {title} · {tasks.length}
      </h2>
      <ul className="divide-y divide-line">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-3 py-2.5">
            {waiting ? (
              <span
                className="h-7 w-7 shrink-0 rounded-full border-2 border-dashed border-line"
                title="Задача откроется, когда закончится предыдущий шаг"
              />
            ) : (
              <form action={toggleTaskAction.bind(null, t.id, true)}>
                <input type="hidden" name="returnTo" value="/my" />
                <button
                  type="submit"
                  aria-label="Отметить выполненной"
                  title="Отметить выполненной"
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-line text-sm font-bold text-transparent hover:border-success hover:text-success"
                >
                  ✓
                </button>
              </form>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink">{t.title}</p>
              <p className="text-xs text-muted">
                <span className={clsx(tone === "danger" && "font-bold text-danger")}>
                  {waiting
                    ? `откроется, когда: ${t.triggerEvent ? TASK_TRIGGER_EVENT_LABELS[t.triggerEvent].toLowerCase() : "будет предыдущий шаг"}`
                    : t.dueDate
                      ? `до ${formatDate(t.dueDate)}`
                      : ""}
                </span>
                {" · "}
                <Link href={`/events/${t.event.id}`} className="hover:text-gold">
                  {t.event.title}
                </Link>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
