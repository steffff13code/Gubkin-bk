import Link from "next/link";
import { redirect } from "next/navigation";
import clsx from "clsx";
import { displayName, getCurrentUser } from "@/lib/auth";
import { isAdmin, isLeadOrAdmin } from "@/lib/permissions";
import {
  countUnassignedTasks,
  getDepartmentOverview,
  getMyEvents,
  getMyRegulations,
  getMyTasks,
  getPendingApprovals,
  getStuckEvents,
  type MyTask
} from "@/lib/queries/my-day";
import {
  DEPARTMENT_LABELS,
  DEPARTMENT_POSITION_LABELS,
  EVENT_STAGE_LABELS,
  ROLE_LABELS,
  TASK_TRIGGER_EVENT_LABELS
} from "@/lib/labels";
import { formatDate } from "@/lib/time";
import { assignToMeAction, toggleTaskAction } from "@/lib/actions/task-actions";
import { Avatar } from "@/components/avatar";

export const dynamic = "force-dynamic";

export default async function MyDayPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/my");

  const admin = isAdmin(user);
  const manager = isLeadOrAdmin(user);
  const headOf = user.departments.filter((d) => d.position === "HEAD" || d.position === "DEPUTY").map((d) => d.code);

  const [tasks, events, regulations, departments, approvals, stuck, unassigned] = await Promise.all([
    getMyTasks(user.id),
    getMyEvents(user.id),
    getMyRegulations(user.departments.map((d) => d.code)),
    getDepartmentOverview(headOf),
    admin ? getPendingApprovals() : Promise.resolve([]),
    admin ? getStuckEvents() : Promise.resolve([]),
    admin ? countUnassignedTasks() : Promise.resolve(0)
  ]);

  const openCount = tasks.overdue.length + tasks.today.length + tasks.week.length + tasks.later.length;
  const needRetro = events.led.filter((e) => e.needsRetro);
  const needDate = events.led.filter((e) => e.stage === "PLANNING" && !e.dateFixed);
  const needSend = events.led.filter((e) => e.stage === "IDEA");
  const name = displayName(user);

  return (
    <div className="space-y-5">
      {/* Шапка кабинета */}
      <section className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface p-4">
        <Avatar name={name} size={48} />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-ink">Мой день · {user.firstName}</h1>
          <p className="text-xs text-muted">
            {ROLE_LABELS[user.role]}
            {user.departments.map((d) => ` · ${DEPARTMENT_LABELS[d.code]} (${DEPARTMENT_POSITION_LABELS[d.position].toLowerCase()})`)}
          </p>
        </div>
        <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
          <Stat value={tasks.overdue.length} label="просрочено" tone={tasks.overdue.length ? "danger" : "muted"} />
          <Stat value={tasks.today.length} label="на сегодня" tone={tasks.today.length ? "gold" : "muted"} />
          <Stat value={openCount} label="всего открыто" tone="muted" />
        </div>
      </section>

      {user.departments.length === 0 && !admin && (
        <p className="rounded-lg border border-gold/30 bg-gold/10 p-3 text-sm text-gold">
          Вы пока не состоите ни в одном отделе, поэтому задачи отделов к вам не приходят. Попросите администратора
          добавить вас в отдел в «Настройках → Люди».
        </p>
      )}

      {/* Что требует моего решения — лиду и админу */}
      {(needSend.length > 0 || needRetro.length > 0 || needDate.length > 0 || approvals.length > 0 || stuck.length > 0 || unassigned > 0) && (
        <Section title="Требует вашего решения" accent>
          <ul className="space-y-2 text-sm">
            {approvals.map((e) => (
              <Attention key={`a-${e.id}`} href={`/events/${e.id}`} tag="Согласовать" tone="gold">
                {e.title}
                <span className="text-muted"> · лид: {e.lead ? e.lead.firstName : "не назначен"}</span>
              </Attention>
            ))}
            {needSend.map((e) => (
              <Attention key={`i-${e.id}`} href={`/events/${e.id}`} tag="Отправить на согласование" tone="gold">
                {e.title}
                <span className="text-muted"> · заполните обзор и отправьте администратору</span>
              </Attention>
            ))}
            {needDate.map((e) => (
              <Attention key={`d-${e.id}`} href={`/events/${e.id}`} tag="Зафиксировать дату" tone="gold">
                {e.title}
                <span className="text-muted">
                  {" "}
                  · {e.targetDate ? `предварительно ${formatDate(e.targetDate)}` : "дата не выбрана"} — задачи с
                  дедлайнами появятся после фиксации
                </span>
              </Attention>
            ))}
            {needRetro.map((e) => (
              <Attention key={`r-${e.id}`} href={`/events/${e.id}?tab=results`} tag="Заполнить итоги" tone="gold">
                {e.title}
              </Attention>
            ))}
            {stuck.map((e) => (
              <Attention key={`s-${e.id}`} href={`/events/${e.id}`} tag={`Застряло ${e.ageDays} дн.`} tone="danger">
                {e.title}
                <span className="text-muted">
                  {" "}
                  · {EVENT_STAGE_LABELS[e.stage]} · лид: {e.leadName ?? "не назначен"}
                </span>
              </Attention>
            ))}
            {unassigned > 0 && (
              <Attention href="/?view=list" tag="Без исполнителя" tone="danger">
                {unassigned} {plural(unassigned, "задача", "задачи", "задач")} в работе без исполнителя
              </Attention>
            )}
          </ul>
        </Section>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          {/* Мои задачи */}
          <Section title="Мои задачи">
            {openCount + tasks.waiting.length === 0 ? (
              <Empty>
                Открытых задач нет. Задачи появляются, когда лид фиксирует дату мероприятия, — тогда план
                разворачивается по отделам. Свободные задачи можно взять на себя в карточке мероприятия.
              </Empty>
            ) : (
              <div className="space-y-4">
                <TaskGroup title="Просрочено" tone="danger" tasks={tasks.overdue} />
                <TaskGroup title="Сегодня" tone="gold" tasks={tasks.today} />
                <TaskGroup title="На неделе" tasks={tasks.week} />
                <TaskGroup title="Позже" tasks={tasks.later} />
                <TaskGroup title="Ждут события" tasks={tasks.waiting} waiting />
              </div>
            )}
          </Section>

          {/* Отделы, которыми я руковожу */}
          {departments.map((d) => (
            <Section
              key={d.code}
              title={`Отдел «${DEPARTMENT_LABELS[d.code]}»`}
              right={
                <span className="text-xs text-muted">
                  открыто {d.openCount}
                  {d.overdueCount > 0 && <span className="text-danger"> · просрочено {d.overdueCount}</span>}
                </span>
              }
            >
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Без исполнителя</h3>
              {d.unassigned.length === 0 ? (
                <Empty>Все задачи отдела распределены.</Empty>
              ) : (
                <ul className="mb-4 divide-y divide-line">
                  {d.unassigned.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 py-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-ink">{t.title}</p>
                        <Link href={`/events/${t.event.id}?tab=tasks`} className="text-xs text-muted hover:text-gold">
                          {t.event.title}
                        </Link>
                      </div>
                      <DueBadge task={t} />
                      <form action={assignToMeAction.bind(null, t.id)}>
                        <input type="hidden" name="returnTo" value="/my" />
                        <button
                          type="submit"
                          className="rounded border border-line px-2 py-1 text-xs font-bold text-ink hover:border-gold"
                        >
                          Взять на себя
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}

              <h3 className="mb-2 mt-2 text-xs font-bold uppercase tracking-wide text-muted">Команда</h3>
              {d.team.length === 0 ? (
                <Empty>В отделе пока никого нет.</Empty>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {d.team.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 rounded-lg bg-bg px-3 py-2 text-sm">
                      <Avatar name={displayName(p)} size={24} />
                      <span className="min-w-0 flex-1 truncate text-ink">
                        {displayName(p)}
                        <span className="text-xs text-muted"> · {DEPARTMENT_POSITION_LABELS[p.position].toLowerCase()}</span>
                      </span>
                      <span className="text-xs text-muted">{p.open} откр.</span>
                      {p.overdue > 0 && <span className="text-xs font-bold text-danger">{p.overdue} проср.</span>}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          ))}

          {/* Мои мероприятия */}
          <Section
            title="Мои мероприятия"
            right={
              manager ? (
                <Link href="/events/new" className="rounded bg-gold px-2.5 py-1 text-xs font-bold text-bg hover:bg-gold/90">
                  + Новое
                </Link>
              ) : undefined
            }
          >
            {events.led.length + events.member.length === 0 ? (
              <Empty>
                Вы не ведёте мероприятий и не состоите в их команде.{" "}
                {manager ? "Создайте мероприятие или возьмите идею из раздела «Идеи»." : "Лид может добавить вас в команду мероприятия."}
              </Empty>
            ) : (
              <ul className="divide-y divide-line">
                {events.led.map((e) => (
                  <EventRow key={e.id} e={e} role="Лид" />
                ))}
                {events.member.map((e) => (
                  <EventRow key={e.id} e={e} role={e.roleInEvent} />
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* Мой регламент */}
        <aside className="space-y-5">
          <Section title="Мой регламент">
            {regulations.length === 0 ? (
              <Empty>Регламентов пока нет.</Empty>
            ) : (
              <ul className="space-y-2">
                {regulations.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/regulations/${r.slug}`}
                      className="block rounded-lg border border-line bg-bg p-3 hover:border-gold"
                    >
                      <p className="text-sm font-bold text-ink">{r.title}</p>
                      <p className="text-[11px] uppercase tracking-wide text-gold">
                        {r.department ? DEPARTMENT_LABELS[r.department] : "Для всех"}
                      </p>
                      <p className="mt-1 line-clamp-3 text-xs text-muted">{excerpt(r.body)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Подсказки">
            <ul className="space-y-2 text-xs text-muted">
              <li>• Отметьте задачу кружком слева — она закроется, а зависимые задачи получат сроки.</li>
              <li>• Утром в 09:00 бот присылает сводку, если Telegram подключён в профиле.</li>
              <li>• Идею можно предложить в разделе «Идеи» — в том числе анонимно.</li>
            </ul>
            <Link href="/profile" className="mt-3 inline-block text-xs font-bold text-gold hover:underline">
              Профиль и уведомления →
            </Link>
          </Section>
        </aside>
      </div>
    </div>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone: "danger" | "gold" | "muted" }) {
  return (
    <div className="rounded-lg bg-bg px-3 py-2 text-center">
      <p className={clsx("text-xl font-bold", tone === "danger" ? "text-danger" : tone === "gold" ? "text-gold" : "text-ink")}>
        {value}
      </p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}

function Section({
  title,
  right,
  accent,
  children
}: {
  title: string;
  right?: React.ReactNode;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={clsx("rounded-xl border bg-surface p-4", accent ? "border-gold/40" : "border-line")}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

function Attention({
  href,
  tag,
  tone,
  children
}: {
  href: string;
  tag: string;
  tone: "gold" | "danger";
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link href={href} className="flex flex-wrap items-center gap-2 rounded-lg bg-bg px-3 py-2 hover:ring-1 hover:ring-gold/40">
        <span
          className={clsx(
            "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
            tone === "danger" ? "bg-danger/15 text-danger" : "bg-gold/15 text-gold"
          )}
        >
          {tag}
        </span>
        <span className="min-w-0 flex-1 text-ink">{children}</span>
      </Link>
    </li>
  );
}

function TaskGroup({
  title,
  tasks,
  tone,
  waiting
}: {
  title: string;
  tasks: MyTask[];
  tone?: "danger" | "gold";
  waiting?: boolean;
}) {
  if (tasks.length === 0) return null;
  return (
    <div>
      <h3
        className={clsx(
          "mb-1 text-xs font-bold uppercase tracking-wide",
          tone === "danger" ? "text-danger" : tone === "gold" ? "text-gold" : "text-muted"
        )}
      >
        {title} · {tasks.length}
      </h3>
      <ul className="divide-y divide-line">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-3 py-2 text-sm">
            <form action={toggleTaskAction.bind(null, t.id, true)}>
              <input type="hidden" name="returnTo" value="/my" />
              <button
                type="submit"
                aria-label="Отметить выполненной"
                title="Отметить выполненной"
                className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-line text-transparent hover:border-success hover:text-success"
              >
                ✓
              </button>
            </form>
            <div className="min-w-0 flex-1">
              <p className="text-ink">{t.title}</p>
              <Link href={`/events/${t.event.id}?tab=tasks`} className="text-xs text-muted hover:text-gold">
                {t.event.title}
                {t.department && ` · ${DEPARTMENT_LABELS[t.department]}`}
              </Link>
            </div>
            {waiting ? (
              <span className="max-w-[40%] shrink-0 text-right text-xs text-muted">
                после: {t.triggerEvent ? TASK_TRIGGER_EVENT_LABELS[t.triggerEvent].toLowerCase() : "события"}
              </span>
            ) : (
              <DueBadge task={t} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DueBadge({ task }: { task: { dueDate: Date | null } }) {
  return <span className="shrink-0 text-xs text-muted">{task.dueDate ? `до ${formatDate(task.dueDate)}` : "без срока"}</span>;
}

type EventRowData = Awaited<ReturnType<typeof getMyEvents>>["led"][number];

function EventRow({ e, role }: { e: EventRowData; role: string }) {
  const pct = e.tasksTotal ? Math.round((e.tasksDone / e.tasksTotal) * 100) : 0;
  return (
    <li className="py-2">
      <Link href={`/events/${e.id}`} className="group flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="min-w-0 basis-full font-bold text-ink group-hover:text-gold sm:flex-1 sm:basis-auto">{e.title}</span>
        <span className="text-xs text-muted">
          {role} · {EVENT_STAGE_LABELS[e.stage]}
          {e.targetDate && ` · ${formatDate(e.targetDate)}`}
        </span>
        {e.overdueCount > 0 && (
          <span className="rounded bg-danger/15 px-1.5 py-0.5 text-[10px] font-bold text-danger">просрочено {e.overdueCount}</span>
        )}
        {e.needsRetro && <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-gold">нужны итоги</span>}
      </Link>
      {e.tasksTotal > 0 && (
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded bg-bg">
            <div className="h-full rounded bg-success" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[11px] text-muted">
            {e.tasksDone}/{e.tasksTotal}
          </span>
        </div>
      )}
    </li>
  );
}

function excerpt(md: string): string {
  return md
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`]/g, "")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim()
    .slice(0, 180);
}

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
