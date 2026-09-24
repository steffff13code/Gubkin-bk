import { describe, expect, it } from "vitest";
import { composeDigest } from "../lib/notifications/digest";
import { calendarDay, daysBetween, isDueSoon, isOverdue } from "../lib/time";

describe("composeDigest", () => {
  it("молчит, когда сказать нечего", () => {
    expect(composeDigest({ overdue: [], dueSoon: [], ledWithOverdue: [] })).toBeNull();
  });

  it("собирает три блока в одно сообщение", () => {
    const text = composeDigest({
      overdue: [{ title: "Подать заявку в ЦБ", eventTitle: "Лекция", dueDate: new Date("2026-09-20T00:00:00Z") }],
      dueSoon: [{ title: "Пост №1", eventTitle: "Лекция", dueDate: new Date("2026-09-26T00:00:00Z") }],
      ledWithOverdue: [{ eventTitle: "Лекция", overdueCount: 3 }]
    });
    expect(text).toContain("Просрочено (1)");
    expect(text).toContain("Подать заявку в ЦБ");
    expect(text).toContain("Ближайшие 2 дня (1)");
    expect(text).toContain("просроченных задач: 3");
    expect(text?.split("\n")[0]).toBe("Доброе утро! Ваш дайджест на сегодня:");
  });
});

describe("календарные сутки по Москве", () => {
  it("23:00 UTC — это уже следующий день в Москве", () => {
    const lateUtc = new Date("2026-09-24T23:00:00Z");
    expect(calendarDay(lateUtc).toISOString()).toBe("2026-09-25T00:00:00.000Z");
  });

  it("задача со сроком «сегодня» не просрочена до конца московских суток", () => {
    const due = new Date("2026-09-24T00:00:00Z");
    expect(isOverdue(due, new Date("2026-09-24T20:00:00Z"))).toBe(false); // 23:00 МСК
    expect(isOverdue(due, new Date("2026-09-24T21:30:00Z"))).toBe(true); // 00:30 МСК следующего дня
  });

  it("daysBetween и isDueSoon считают по московским датам", () => {
    const now = new Date("2026-09-24T21:30:00Z"); // 25.09 00:30 МСК
    expect(daysBetween(now, new Date("2026-09-27T00:00:00Z"))).toBe(2);
    expect(isDueSoon(new Date("2026-09-27T00:00:00Z"), now)).toBe(true);
    expect(isDueSoon(new Date("2026-09-28T00:00:00Z"), now)).toBe(false);
  });
});
