import { startOfUtcDay } from "@/lib/time";

// Условия входа в стадии — раздел 6 ТЗ. Чистые функции без обращения к БД,
// чтобы их можно было проверить юнит-тестами.

export type EventForStageCheck = {
  title: string;
  type: string | null;
  description: string | null;
  targetDate: Date | null;
  dateFixed: boolean;
  leadId: string | null;
  actualAttendance: number | null;
  hasRetro: boolean;
  hasPhotoReport: boolean;
};

function joinRu(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} и ${items[items.length - 1]}`;
}

/** Возвращает текст ошибки, если условия входа в стадию не выполнены, иначе null. */
export function checkStageEntry(
  targetStage: "APPROVAL" | "PLANNING" | "IN_PROGRESS" | "DONE" | "CLOSED" | "IDEA" | "REJECTED",
  event: EventForStageCheck,
  now: Date = new Date()
): string | null {
  switch (targetStage) {
    case "APPROVAL": {
      const missing: string[] = [];
      if (!event.title?.trim()) missing.push("название");
      if (!event.type) missing.push("тип");
      if (!event.description?.trim()) missing.push("описание");
      if (missing.length > 0) {
        return `Чтобы отправить на согласование, заполните: ${joinRu(missing)}.`;
      }
      return null;
    }

    case "IN_PROGRESS": {
      if (!event.dateFixed || !event.targetDate) {
        return "Чтобы зафиксировать дату, укажите дату мероприятия.";
      }
      if (!event.leadId) {
        return "Чтобы зафиксировать дату, назначьте лида мероприятия.";
      }
      return null;
    }

    case "DONE": {
      if (!event.targetDate) {
        return "Чтобы отметить мероприятие проведённым, сначала зафиксируйте дату.";
      }
      if (startOfUtcDay(now).getTime() < startOfUtcDay(event.targetDate).getTime()) {
        return "Чтобы отметить мероприятие проведённым, дождитесь даты мероприятия.";
      }
      return null;
    }

    case "CLOSED": {
      const missing: string[] = [];
      if (!event.hasRetro) missing.push("заполните ретро");
      if (!event.hasPhotoReport) missing.push("прикрепите ссылку на фотоотчёт");
      if (event.actualAttendance === null || event.actualAttendance === undefined) {
        missing.push("укажите фактическую посещаемость");
      }
      if (missing.length > 0) {
        return `Чтобы закрыть мероприятие, ${joinRu(missing)}.`;
      }
      return null;
    }

    // PLANNING (согласование), IDEA (возврат на доработку) и REJECTED (отклонение) —
    // без требований к данным, только право доступа (проверяется в server action).
    case "PLANNING":
    case "IDEA":
    case "REJECTED":
      return null;
  }
}
