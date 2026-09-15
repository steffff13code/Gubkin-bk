import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { getMyLedEvents, getMyTasks, getPendingApprovals, getStuckEvents } from "@/lib/queries/my-day";
import { EVENT_STAGE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/time";
import { toggleTaskAction } from "@/lib/actions/task-actions";

export default async function MyDayPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="rounded border border-line bg-surface p-6 text-sm text-muted">
        Чтобы видеть свои задачи,{" "}
        <Link href="/login" className="font-bold text-ink underline">
          войдите через Telegram
        </Link>
        .
      </div>
    );
  }

  const [{ overdue, upcoming }, ledEvents] = await Promise.all([getMyTasks(user.id), getMyLedEvents(user.id)]);
  const admin = isAdmin(user);
  const [pendingApprovals, stuckEvents] = admin
    ? await Promise.all([getPendingApprovals(), getStuckEvents()])
    : [[], []];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-ink">Мой день</h1>

      {admin && (
        <>
          <Section title={`Ждут согласования (${pendingApprovals.length})`}>
            {pendingApprovals.length === 0 && <Empty text="Ничего не ждёт согласования." />}
            <ul className="divide-y divide-line">
              {pendingApprovals.map((e) => (
                <li key={e.id} className="py-2 text-sm">
                  <Link href={`/events/${e.id}`} className="font-bold text-ink hover:text-gold">
                    {e.title}
                  </Link>
                  <span className="ml-2 text-muted">лид: {e.lead ? e.lead.firstName : "не назначен"}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title={`Застряло (${stuckEvents.length})`}>
            {stuckEvents.length === 0 && <Empty text="Застрявших мероприятий нет." />}
            <ul className="divide-y divide-line">
              {stuckEvents.map((e) => (
                <li key={e.id} className="py-2 text-sm">
                  <Link href={`/events/${e.id}`} className="font-bold text-danger hover:underline">
                    {e.title}
                  </Link>
                  <span className="ml-2 text-muted">
                    {EVENT_STAGE_LABELS[e.stage]} · без движения {e.ageDays} дн. · лид: {e.leadName ?? "не назначен"}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}

      <Section title={`Просроченные задачи (${overdue.length})`}>
        {overdue.length === 0 && <Empty text="Просроченных задач нет." />}
        <TaskList tasks={overdue} />
      </Section>

      <Section title={`Ближайшие задачи (${upcoming.length})`}>
        {upcoming.length === 0 && <Empty text="Задач на ближайшее время нет." />}
        <TaskList tasks={upcoming} />
      </Section>

      <Section title={`Мои мероприятия (${ledEvents.length})`}>
        {ledEvents.length === 0 && <Empty text="Вы не ведёте активных мероприятий." />}
        <ul className="divide-y divide-line">
          {ledEvents.map((e) => (
            <li key={e.id} className="flex items-center justify-between py-2 text-sm">
              <Link href={`/events/${e.id}`} className="font-bold text-ink hover:text-gold">
                {e.title}
              </Link>
              <span className="flex items-center gap-2 text-muted">
                {EVENT_STAGE_LABELS[e.stage]} · {e.tasksDone}/{e.tasksTotal} задач
                {e.hasOverdue && <span className="rounded bg-danger/10 px-1.5 py-0.5 text-xs font-bold text-danger">Просрочка</span>}
              </span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-line bg-surface p-4">
      <h2 className="mb-2 text-sm font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted">{text}</p>;
}

type TaskItem = {
  id: string;
  title: string;
  dueDate: Date | null;
  event: { id: string; title: string };
};

function TaskList({ tasks }: { tasks: TaskItem[] }) {
  if (tasks.length === 0) return null;
  return (
    <ul className="divide-y divide-line">
      {tasks.map((t) => (
        <li key={t.id} className="flex items-center gap-3 py-2 text-sm">
          <form action={toggleTaskAction.bind(null, t.id, true)}>
            <input type="hidden" name="returnTo" value="/my" />
            <button type="submit" className="h-4 w-4 rounded border border-line" title="Отметить выполненной" />
          </form>
          <div className="flex-1">
            <p className="text-ink">{t.title}</p>
            <Link href={`/events/${t.event.id}?tab=tasks`} className="text-xs text-muted hover:text-ink">
              {t.event.title}
            </Link>
          </div>
          <span className="text-xs text-muted">{t.dueDate ? formatDate(t.dueDate) : "без срока"}</span>
        </li>
      ))}
    </ul>
  );
}
