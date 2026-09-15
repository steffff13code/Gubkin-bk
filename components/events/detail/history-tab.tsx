import type { EventDetail } from "@/lib/queries/event-detail";
import { displayName } from "@/lib/auth";
import { formatDateTime } from "@/lib/time";

const ACTION_LABELS: Record<string, string> = {
  CREATED: "мероприятие создано",
  SENT_TO_APPROVAL: "отправлено на согласование",
  APPROVED: "согласовано",
  RETURNED_TO_IDEA: "возвращено на доработку",
  REJECTED: "отклонено",
  DATE_FIXED: "дата зафиксирована",
  DATE_CHANGED: "дата перенесена",
  TASKS_GENERATED: "план задач развёрнут",
  TRIGGER_FIRED: "сработал триггер задач",
  MARKED_DONE: "отмечено проведённым",
  CLOSED: "закрыто",
  TENTATIVE_DATE_SET: "указана предварительная дата",
  OVERVIEW_UPDATED: "карточка отредактирована",
  TASK_DONE: "задача закрыта",
  TASK_REOPENED: "задача открыта заново",
  TASK_SKIPPED: "задача пропущена",
  TASK_TAKEN: "задача взята на себя",
  TASK_UPDATED: "задача отредактирована",
  TASKS_AUTO_COMPLETED: "задачи закрыты автоматически",
  ATTACHMENT_ADDED: "добавлена ссылка",
  ATTACHMENT_REMOVED: "ссылка удалена",
  RETRO_SAVED: "ретро сохранено",
  LOGIN: "вход в систему"
};

function payloadDetail(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.title === "string") return p.title;
  if (Array.isArray(p.titles)) return p.titles.join(", ");
  if (typeof p.comment === "string") return p.comment;
  if (typeof p.reason === "string") return p.reason;
  if (typeof p.tasksRescheduled === "number") return `пересчитано задач: ${p.tasksRescheduled}`;
  if (typeof p.count === "number") return `задач: ${p.count}`;
  return null;
}

export function HistoryTab({ event }: { event: EventDetail }) {
  if (event.activityLogs.length === 0) {
    return <p className="text-sm text-muted">История пуста.</p>;
  }
  return (
    <ul className="space-y-2">
      {event.activityLogs.map((log) => (
        <li key={log.id} className="rounded border border-line bg-surface px-3 py-2 text-sm">
          <span className="text-muted">{formatDateTime(log.createdAt)}</span>{" "}
          <span className="text-ink">{ACTION_LABELS[log.action] ?? log.action}</span>
          {payloadDetail(log.payload) && <span className="text-muted">: {payloadDetail(log.payload)}</span>}
          {log.user && <span className="text-muted"> — {displayName(log.user)}</span>}
        </li>
      ))}
    </ul>
  );
}
