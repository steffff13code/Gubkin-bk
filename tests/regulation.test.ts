import { describe, expect, it } from "vitest";
import { createdMessage, dateFixedMessage, messagesFor, passReadyMessage } from "../lib/chat-messages";
import { timingLabel } from "../lib/regulation";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const tags = { BOARD: "@board", GUESTS: "", PR: "@pr1 @pr2", STAGE: "@stage", CONTENT: "@content" };
const event = {
  guestName: "Спикер Тестовый",
  guestOccupation: "Предприниматель",
  guestOrganization: "Компания",
  guestTopic: "Стартапы",
  format: "Лекция",
  speakerWindowStart: d("2026-11-10"),
  speakerWindowEnd: d("2026-11-23"),
  targetDate: d("2026-11-17"),
  timeSlot: "17:15",
  venue: "1234"
};

describe("сообщения в рабочий чат", () => {
  it("карточка создана — тегает Администратора и Пиар", () => {
    const m = createdMessage(event, tags);
    expect(m.text).toContain("Новый спикер: Спикер Тестовый — Предприниматель, Компания.");
    expect(m.text).toContain("Окно: 10.11–23.11.");
    expect(m.text.endsWith("@board @pr1 @pr2")).toBe(true);
  });

  it("дата зафиксирована — тегает Пиар", () => {
    const m = dateFixedMessage(event, tags);
    expect(m.text).toBe("Дата: 17.11, 17:15, ауд. 1234. Нужен пропуск на спикера в течение 2 дней.\n@pr1 @pr2");
  });

  it("пропуск готов — тегает Event и Контент, считает дни", () => {
    const m = passReadyMessage(event, tags, d("2026-11-03"));
    expect(m.text).toContain("До мероприятия 14 дн.");
    expect(m.text.endsWith("@stage @content")).toBe(true);
  });

  it("без тегов — только текст", () => {
    const m = dateFixedMessage(event, { BOARD: "", GUESTS: "", PR: "", STAGE: "", CONTENT: "" });
    expect(m.text).not.toContain("\n");
  });

  it("набор сообщений по этапу", () => {
    const base = { ...event, stage: "IN_PROGRESS", dateFixed: true, passReadyAt: null };
    expect(messagesFor(base, tags).map((m) => m.key)).toEqual(["created", "dateFixed"]);
    expect(messagesFor({ ...base, passReadyAt: new Date() }, tags).map((m) => m.key)).toEqual(["created", "dateFixed", "passReady"]);
    expect(messagesFor({ ...base, stage: "REJECTED" }, tags)).toEqual([]);
  });
});

describe("сроки в регламенте", () => {
  const base = { group: "BEFORE" as const, triggerType: "DATE_OFFSET" as const, offsetDays: 0, triggerEvent: null, dayOffsetMinutes: null, dayTimeLabel: null };

  it("относительно D", () => {
    expect(timingLabel({ ...base, offsetDays: -7 })).toBe("D−7 (за 7 дней)");
    expect(timingLabel({ ...base, offsetDays: -3 })).toBe("D−3 (за 3 дня)");
    expect(timingLabel({ ...base, offsetDays: 1 })).toBe("D+1 (через 1 день)");
  });

  it("по событию", () => {
    expect(timingLabel({ ...base, triggerType: "EVENT", triggerEvent: "DATE_FIXED", offsetDays: 2 })).toBe(
      "через 2 дня после того, как спикер подтвердил дату"
    );
    expect(timingLabel({ ...base, triggerType: "EVENT", triggerEvent: "SECURITY_ANSWERED", offsetDays: 0 })).toBe("сразу, как пропуск готов");
  });

  it("день Д с таймингом", () => {
    expect(timingLabel({ ...base, group: "EVENT_DAY", dayOffsetMinutes: -120 })).toBe("день Д, за 2 ч до начала");
    expect(timingLabel({ ...base, group: "EVENT_DAY", dayOffsetMinutes: 0 })).toBe("день Д, в начале");
    expect(timingLabel({ ...base, group: "EVENT_DAY", dayTimeLabel: "финал" })).toBe("день Д, финал");
  });
});
