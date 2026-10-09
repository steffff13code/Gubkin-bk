import type { RoleKey } from "@/lib/roles";
import { daysBetween } from "@/lib/time";

// Готовые тексты для рабочего чата команды на ключевых шагах регламента + теги ролей.

type EventForChat = {
  guestName: string | null;
  guestOccupation: string | null;
  guestOrganization: string | null;
  guestTopic: string | null;
  format: string | null;
  speakerWindowStart: Date | null;
  speakerWindowEnd: Date | null;
  targetDate: Date | null;
  timeSlot: string | null;
  venue: string | null;
};

const ddmm = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(d) : "—";

function withTags(text: string, roles: RoleKey[], tags: Record<RoleKey, string>): string {
  const t = roles.map((r) => tags[r]).filter(Boolean).join(" ");
  return t ? `${text}\n${t}` : text;
}

export type ChatMessage = { key: "created" | "dateFixed" | "passReady"; title: string; text: string };

export function createdMessage(e: EventForChat, tags: Record<RoleKey, string>): ChatMessage {
  const who = [e.guestOccupation, e.guestOrganization].filter(Boolean).join(", ");
  const text = [
    `Новый спикер: ${e.guestName ?? "—"}${who ? ` — ${who}` : ""}.`,
    `Тема: ${e.guestTopic ?? "—"}.`,
    `Формат: ${e.format ?? "—"}.`,
    `Окно: ${ddmm(e.speakerWindowStart)}–${ddmm(e.speakerWindowEnd)}.`
  ].join(" ");
  return { key: "created", title: "Карточка создана", text: withTags(text, ["BOARD", "PR"], tags) };
}

export function dateFixedMessage(e: EventForChat, tags: Record<RoleKey, string>): ChatMessage {
  const parts = [ddmm(e.targetDate), e.timeSlot, e.venue ? `ауд. ${e.venue}` : null].filter(Boolean).join(", ");
  return {
    key: "dateFixed",
    title: "Дата зафиксирована",
    text: withTags(`Дата: ${parts}. Нужен пропуск на спикера в течение 2 дней.`, ["PR"], tags)
  };
}

export function passReadyMessage(e: EventForChat, tags: Record<RoleKey, string>, now: Date = new Date()): ChatMessage {
  const days = e.targetDate ? Math.max(daysBetween(now, e.targetDate), 0) : null;
  return {
    key: "passReady",
    title: "Пропуск готов",
    text: withTags(
      `Пропуск на спикера готов. Начинаем план проведения и съёмки.${days !== null ? ` До мероприятия ${days} дн.` : ""}`,
      ["STAGE", "CONTENT"],
      tags
    )
  };
}

/** Сообщения, которые уместны на текущем этапе (последнее — самое свежее). */
export function messagesFor(
  e: EventForChat & { stage: string; dateFixed: boolean; passReadyAt: Date | null },
  tags: Record<RoleKey, string>,
  now: Date = new Date()
): ChatMessage[] {
  if (e.stage === "REJECTED" || e.stage === "CLOSED") return [];
  const out = [createdMessage(e, tags)];
  if (e.dateFixed) out.push(dateFixedMessage(e, tags));
  if (e.passReadyAt) out.push(passReadyMessage(e, tags, now));
  return out;
}
