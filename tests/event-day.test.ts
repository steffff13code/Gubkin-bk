import { describe, expect, it } from "vitest";
import { formatClock, isLate, moscowMinutes, nextStepId, parseTimeSlot, scheduleDay } from "../lib/event-day";

describe("parseTimeSlot", () => {
  it("понимает типовое время регламента", () => {
    expect(parseTimeSlot("15:45")).toBe(945);
    expect(parseTimeSlot("17:15")).toBe(1035);
    expect(parseTimeSlot("17.20")).toBe(1040);
  });
  it("мусор и пустое — null", () => {
    expect(parseTimeSlot("вечером")).toBeNull();
    expect(parseTimeSlot(null)).toBeNull();
    expect(parseTimeSlot("25:00")).toBeNull();
  });
});

describe("scheduleDay", () => {
  const steps = [
    { id: "a", title: "Техника", status: "DONE" as const, dayOffsetMinutes: -120, dayTimeLabel: "−2 часа" },
    { id: "b", title: "Волонтёры", status: "TODO" as const, dayOffsetMinutes: -40, dayTimeLabel: "−40 минут" },
    { id: "c", title: "Встреча гостя", status: "TODO" as const, dayOffsetMinutes: -20, dayTimeLabel: "−20 минут" },
    { id: "d", title: "Вопросы", status: "TODO" as const, dayOffsetMinutes: null, dayTimeLabel: "после выступления" }
  ];

  it("считает время шагов от начала в 17:15", () => {
    const s = scheduleDay(steps, "17:15");
    expect(s.map((x) => x.clock)).toEqual(["15:15", "16:35", "16:55", null]);
  });

  it("без времени начала — только подписи", () => {
    expect(scheduleDay(steps, null).every((x) => x.clock === null)).toBe(true);
  });

  it("следующий шаг — первый невыполненный", () => {
    expect(nextStepId(steps)).toBe("b");
  });

  it("опоздание — только у невыполненного шага с прошедшим временем", () => {
    const [done, volunteers, meet, questions] = scheduleDay(steps, "17:15");
    const now = 16 * 60 + 45; // 16:45
    expect(isLate(done, now)).toBe(false);
    expect(isLate(volunteers, now)).toBe(true);
    expect(isLate(meet, now)).toBe(false);
    expect(isLate(questions, now)).toBe(false);
  });
});

describe("время по Москве", () => {
  it("formatClock и moscowMinutes", () => {
    expect(formatClock(-30)).toBe("23:30");
    expect(moscowMinutes(new Date("2026-09-24T12:00:00Z"))).toBe(15 * 60);
  });
});
