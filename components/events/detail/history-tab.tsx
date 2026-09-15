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
  LOGIN: "вход в систему"
};

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
          {log.user && <span className="text-muted"> — {displayName(log.user)}</span>}
        </li>
      ))}
    </ul>
  );
}
