import Link from "next/link";
import clsx from "clsx";
import type { EventDetail } from "@/lib/queries/event-detail";
import { DEPARTMENT_LABELS, TASK_GROUP_LABELS } from "@/lib/labels";
import { displayName } from "@/lib/auth";
import { Avatar } from "@/components/avatar";
import { calendarDay, formatDate, isOverdue } from "@/lib/time";
import { assignToMeAction, skipTaskAction, toggleTaskAction, updateTaskAction } from "@/lib/actions/task-actions";

type TaskWithRelations = EventDetail["tasks"][number];

export function TasksTab({
  event,
  users,
  currentUserId,
  canManage,
  showAll
}: {
  event: EventDetail;
  users: { id: string; firstName: string; lastName: string | null }[];
  currentUserId: string | null;
  canManage: boolean;
  /** false — только открытые задачи, выполненные спрятаны. */
  showAll: boolean;
}) {
  const locked = event.stage === "CLOSED" || event.stage === "REJECTED";
  const closedCount = event.tasks.filter((t) => t.status !== "TODO").length;
  const openCount = event.tasks.length - closedCount;
  const pct = event.tasks.length ? Math.round((closedCount / event.tasks.length) * 100) : 0;
  const visible = showAll ? event.tasks : event.tasks.filter((t) => t.status === "TODO");
  const groups: EventDetail["tasks"][number]["group"][] = ["BEFORE", "EVENT_DAY", "AFTER"];
  // Раскрыта только текущая часть плана: до мероприятия, день Д или после.
  const today = calendarDay(new Date()).getTime();
  const eventDay = event.targetDate ? calendarDay(event.targetDate).getTime() : null;
  const currentGroup =
    event.stage === "DONE" || event.stage === "CLOSED"
      ? "AFTER"
      : eventDay !== null && event.dateFixed && eventDay <= today
        ? "EVENT_DAY"
        : "BEFORE";

  return (
    <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold text-ink">Задачи</h2>
        <span className="text-sm text-muted">
          выполнено {closedCount} из {event.tasks.length}
        </span>
        <Link
          href={`/events/${event.id}${showAll ? "" : "?all=1"}`}
          scroll={false}
          className="ml-auto rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink hover:border-gold"
        >
          {showAll ? "Скрыть выполненные" : `Показать выполненные (${closedCount})`}
        </Link>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
      </div>

      {openCount === 0 && !showAll && (
        <p className="mt-4 rounded-lg bg-success/10 px-3 py-2 text-sm font-bold text-success">Все задачи выполнены.</p>
      )}

      <div className="mt-4 space-y-5">
        {groups.map((group) => {
          const groupTasks = visible.filter((t) => t.group === group);
          if (groupTasks.length === 0) return null;
          const byDept = new Map<string, TaskWithRelations[]>();
          for (const t of groupTasks) {
            const key = t.department ?? "_";
            byDept.set(key, [...(byDept.get(key) ?? []), t]);
          }
          return (
            <details key={group} open={showAll || group === currentGroup} className="group/part">
              <summary className="mb-2 flex cursor-pointer list-none items-center gap-2">
                <span className="text-xs text-muted transition group-open/part:rotate-90">▶</span>
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted">
                  {TASK_GROUP_LABELS[group]} · {groupTasks.length}
                </h3>
                {group === "EVENT_DAY" && (
                  <Link href={`/events/${event.id}/day`} className="ml-auto text-xs font-bold text-gold hover:underline">
                    Тайминг дня по порядку →
                  </Link>
                )}
              </summary>
              <div className="space-y-3">
                {Array.from(byDept.entries()).map(([dept, tasks]) => (
                  <div key={dept} className="rounded-lg border border-line bg-bg">
                    <p className="border-b border-line px-3 py-1.5 text-xs font-bold text-gold">
                      {dept === "_" ? "Лид мероприятия" : DEPARTMENT_LABELS[dept as keyof typeof DEPARTMENT_LABELS]}
                    </p>
                    <ul className="divide-y divide-line">
                      {tasks.map((t) => (
                        <TaskRow key={t.id} task={t} users={users} currentUserId={currentUserId} canManage={canManage} locked={locked} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}

function TaskRow({
  task,
  users,
  currentUserId,
  canManage,
  locked
}: {
  task: TaskWithRelations;
  users: { id: string; firstName: string; lastName: string | null }[];
  currentUserId: string | null;
  canManage: boolean;
  locked: boolean;
}) {
  const overdue = task.status === "TODO" && task.required && isOverdue(task.dueDate);
  const isMine = !!currentUserId && (task.assigneeId === currentUserId || task.secondAssigneeId === currentUserId);
  // Права — те же, что проверяет сервер в lib/actions/task-actions.ts.
  const canToggle = !locked && task.status !== "SKIPPED" && (isMine || canManage);
  const canTake = !locked && !!currentUserId && task.status === "TODO" && !isMine && (!task.assigneeId || canManage);
  const canEdit = !locked && canManage;
  const canSkip = canEdit && !task.required && task.status === "TODO";
  const hasMenu = canTake || canEdit;

  const box = clsx(
    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
    task.status === "DONE" ? "border-success bg-success text-bg" : "border-line text-transparent"
  );

  return (
    <li className="px-3 py-2">
      <div className="flex items-start gap-3">
        {canToggle ? (
          <form action={toggleTaskAction.bind(null, task.id, task.status !== "DONE")} className="pt-0.5">
            <button
              type="submit"
              className={clsx(box, "hover:border-success hover:text-success")}
              title={task.status === "DONE" ? "Открыть заново" : "Отметить выполненной"}
              aria-label={task.status === "DONE" ? "Открыть заново" : "Отметить выполненной"}
            >
              ✓
            </button>
          </form>
        ) : (
          <span
            className={clsx(box, "mt-0.5 opacity-70")}
            title={
              task.status === "DONE"
                ? "Выполнено"
                : locked
                  ? "Мероприятие в архиве"
                  : "Отметить может исполнитель, лид мероприятия или руководитель клуба"
            }
          >
            {task.status === "DONE" ? "✓" : ""}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className={clsx("text-sm", task.status === "SKIPPED" ? "text-muted line-through" : "text-ink")}>
            {task.title}
            {!task.required && <span className="ml-1 text-xs text-muted">(необязательная)</span>}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className={clsx("flex items-center gap-1", !task.assigneeId && "font-bold text-danger")}>
              {task.assignee && <Avatar name={displayName(task.assignee)} size={16} />}
              {task.assigneeId ? displayName(task.assignee!) : "без исполнителя"}
              {task.secondAssignee && (
                <>
                  <span>+</span>
                  <Avatar name={displayName(task.secondAssignee)} size={16} />
                  {displayName(task.secondAssignee)}
                </>
              )}
            </span>
            {task.dayTimeLabel ? (
              <span className="rounded bg-gold/15 px-1.5 py-0.5 font-bold text-gold">{task.dayTimeLabel}</span>
            ) : (
              <span>{task.dueDate ? formatDate(task.dueDate) : "срок не назначен"}</span>
            )}
            {overdue && <span className="rounded bg-danger/10 px-1.5 py-0.5 font-bold text-danger">Просрочено</span>}
            {task.status === "SKIPPED" && <span>пропущена</span>}
            {isMine && task.status === "TODO" && <span className="text-gold">ваша задача</span>}
          </div>
          {task.description && <p className="mt-1 whitespace-pre-line text-xs text-muted">{task.description}</p>}
          {canTake && !canEdit && (
            <form action={assignToMeAction.bind(null, task.id)} className="mt-1">
              <button type="submit" className="text-xs font-bold text-gold hover:underline">
                Взять на себя
              </button>
            </form>
          )}
        </div>

        {canEdit && hasMenu && (
          <details className="relative">
            <summary className="cursor-pointer list-none rounded px-1.5 text-xs text-muted hover:bg-surface2 hover:text-ink" title="Исполнитель, срок, заметка">
              ⋯
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-64 space-y-2 rounded border border-line bg-bg p-2 shadow-lg">
              {canTake && (
                <form action={assignToMeAction.bind(null, task.id)}>
                  <button type="submit" className="text-xs font-bold text-ink underline">
                    Взять на себя
                  </button>
                </form>
              )}
              <form action={updateTaskAction.bind(null, task.id)} className="space-y-1.5">
                <select name="assigneeId" defaultValue={task.assigneeId ?? ""} className="w-full rounded border border-line bg-surface px-1.5 py-1 text-xs">
                  <option value="">Без исполнителя</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {displayName(u)}
                    </option>
                  ))}
                </select>
                <select
                  name="secondAssigneeId"
                  defaultValue={task.secondAssigneeId ?? ""}
                  className="w-full rounded border border-line bg-surface px-1.5 py-1 text-xs"
                >
                  <option value="">Второй исполнитель — нет</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {displayName(u)}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  name="dueDate"
                  defaultValue={task.dueDate ? task.dueDate.toISOString().slice(0, 10) : ""}
                  className="w-full rounded border border-line bg-surface px-1.5 py-1 text-xs"
                />
                <textarea
                  name="description"
                  defaultValue={task.description ?? ""}
                  rows={2}
                  placeholder="Заметка"
                  className="w-full rounded border border-line bg-surface px-1.5 py-1 text-xs"
                />
                <button type="submit" className="w-full rounded border border-line py-1 text-xs font-bold text-ink hover:border-gold">
                  Сохранить
                </button>
              </form>
              {canSkip && (
                <form action={skipTaskAction.bind(null, task.id)}>
                  <button type="submit" className="text-xs text-muted underline">
                    Пропустить
                  </button>
                </form>
              )}
            </div>
          </details>
        )}
      </div>
    </li>
  );
}
