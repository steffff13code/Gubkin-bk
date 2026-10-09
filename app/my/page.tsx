import Link from "next/link";
import { redirect } from "next/navigation";
import clsx from "clsx";
import { getCurrentUser } from "@/lib/auth";
import { getDecisions, getMyTasks, getTodayEvents, type MyTask } from "@/lib/queries/my-day";
import { TASK_TRIGGER_EVENT_LABELS } from "@/lib/labels";
import { ROLE_BY_KEY } from "@/lib/roles";
import { formatDate } from "@/lib/time";
import { toggleTaskAction } from "@/lib/actions/task-actions";

export const dynamic = "force-dynamic";

export default async function MyTasksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/my");

  const [tasks, decisions, today] = await Promise.all([
    getMyTasks(user.id, user.roleKey),
    getDecisions(user.roleKey),
    getTodayEvents()
  ]);
  const openCount = tasks.overdue.length + tasks.today.length + tasks.week.length + tasks.later.length + tasks.waiting.length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Мои задачи</h1>
        <p className="mt-1 text-sm text-muted">
          {user.roleTitle}
          {user.roleKey && ` — ${ROLE_BY_KEY[user.roleKey].does.toLowerCase()}`}
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
          <h2 className="mb-3 text-sm font-bold text-ink">Ваш шаг по мероприятиям</h2>
          <ul className="space-y-2">
            {decisions.map((d, i) => (
              <li key={i}>
                <Link
                  href={`/events/${d.eventId}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-bg px-3 py-2.5 text-sm hover:ring-1 hover:ring-gold/40"
                >
                  <span className="min-w-0 flex-1 text-ink">{d.title}</span>
                  <span className={clsx("text-xs font-bold", d.danger ? "text-danger" : "text-gold")}>{d.action} →</span>
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
            <p className="mt-1 text-sm text-muted">Задачи приходят сами, когда у мероприятия фиксируется дата.</p>
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

      <p className="text-center text-xs text-muted">
        Уведомления в Telegram —{" "}
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
