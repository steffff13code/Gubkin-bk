import clsx from "clsx";
import type { EventDetail } from "@/lib/queries/event-detail";
import { DEPARTMENT_LABELS, TASK_GROUP_LABELS } from "@/lib/labels";
import { displayName } from "@/lib/auth";
import { Avatar } from "@/components/avatar";
import { formatDate, isOverdue } from "@/lib/time";
import { assignToMeAction, skipTaskAction, toggleTaskAction, updateTaskAction } from "@/lib/actions/task-actions";

type TaskWithRelations = EventDetail["tasks"][number];

export function TasksTab({
  event,
  users,
  currentUserId
}: {
  event: EventDetail;
  users: { id: string; firstName: string; lastName: string | null }[];
  currentUserId: string | null;
}) {
  if (event.tasks.length === 0) {
    return (
      <div className="rounded border border-line bg-surface p-6 text-center text-sm text-muted">
        {event.dateFixed
          ? "Для этого типа мероприятия ещё не заполнен шаблон задач — заполните его в настройках."
          : "Задач пока нет. Зафиксируйте дату — план развернётся по регламенту."}
      </div>
    );
  }

  const groups: EventDetail["tasks"][number]["group"][] = ["BEFORE", "EVENT_DAY", "AFTER"];

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const groupTasks = event.tasks.filter((t) => t.group === group);
        if (groupTasks.length === 0) return null;
        const byDept = new Map<string, TaskWithRelations[]>();
        for (const t of groupTasks) {
          const key = t.department ?? "_";
          byDept.set(key, [...(byDept.get(key) ?? []), t]);
        }
        return (
          <section key={group}>
            <h2 className="mb-2 text-sm font-bold text-ink">{TASK_GROUP_LABELS[group]}</h2>
            <div className="space-y-4">
              {Array.from(byDept.entries()).map(([dept, tasks]) => (
                <div key={dept} className="rounded border border-line bg-surface">
                  <div className="border-b border-line px-3 py-1.5 text-xs font-bold text-muted">
                    {dept === "_" ? "Без отдела" : DEPARTMENT_LABELS[dept as keyof typeof DEPARTMENT_LABELS]}
                  </div>
                  <ul className="divide-y divide-line">
                    {tasks.map((t) => (
                      <TaskRow key={t.id} task={t} users={users} currentUserId={currentUserId} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TaskRow({
  task,
  users,
  currentUserId
}: {
  task: TaskWithRelations;
  users: { id: string; firstName: string; lastName: string | null }[];
  currentUserId: string | null;
}) {
  const overdue = task.status === "TODO" && task.required && isOverdue(task.dueDate);
  const isMine = currentUserId && (task.assigneeId === currentUserId || task.secondAssigneeId === currentUserId);

  return (
    <li className="px-3 py-2">
      <div className="flex items-start gap-3">
        <form action={toggleTaskAction.bind(null, task.id, task.status !== "DONE")} className="pt-0.5">
          <button
            type="submit"
            disabled={task.status === "SKIPPED"}
            className={clsx(
              "flex h-4 w-4 items-center justify-center rounded border",
              task.status === "DONE" ? "border-gold bg-gold text-bg" : "border-line"
            )}
            title={task.status === "DONE" ? "Открыть заново" : "Отметить выполненной"}
          >
            {task.status === "DONE" ? "✓" : ""}
          </button>
        </form>

        <div className="flex-1">
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
            <span>{task.dueDate ? formatDate(task.dueDate) : "срок не назначен"}</span>
            {overdue && <span className="rounded bg-danger/10 px-1.5 py-0.5 font-bold text-danger">Просрочено</span>}
            {isMine && task.status === "TODO" && <span className="text-gold">ваша задача</span>}
          </div>
        </div>

        <details>
          <summary className="cursor-pointer list-none text-xs text-muted hover:text-ink">⋯</summary>
          <div className="mt-2 w-64 space-y-2 rounded border border-line bg-bg p-2">
            {!isMine && (
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
              <button type="submit" className="w-full rounded border border-line py-1 text-xs font-bold text-ink">
                Сохранить
              </button>
            </form>
            {task.description && <p className="whitespace-pre-line text-xs text-muted">{task.description}</p>}
            {!task.required && task.status === "TODO" && (
              <form action={skipTaskAction.bind(null, task.id)}>
                <button type="submit" className="text-xs text-muted underline">
                  Пропустить
                </button>
              </form>
            )}
          </div>
        </details>
      </div>
    </li>
  );
}
