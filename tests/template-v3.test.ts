import { describe, expect, it } from "vitest";
import {
  LECTURE_TEMPLATE,
  LECTURE_TEMPLATE_VERSION,
  TEMPLATE_TYPES,
  type LectureTemplateRow
} from "../lib/tasks/lecture-template";
import { applyTriggerDueDates, buildTaskRows, type DepartmentAssignments } from "../lib/tasks/generate";

// План лекции по регламенту v3: спикер подтвердил дату → пропуск → подготовка.

const TARGET = new Date("2026-11-20T00:00:00.000Z");
const FIXED_AT = new Date("2026-10-20T09:00:00.000Z");

const assignments: DepartmentAssignments = {
  BOARD: { headId: "board", deputyId: null },
  GUESTS: { headId: "guests", deputyId: null },
  PR: { headId: "pr", deputyId: null },
  STAGE: { headId: "stage", deputyId: null },
  CONTENT: { headId: "content", deputyId: null }
};

const templates = LECTURE_TEMPLATE.map((row: LectureTemplateRow, i) => ({ ...row, id: `t${i}` }));
const rows = buildTaskRows(templates, TARGET, FIXED_AT, assignments, "guests", true);
const byTitle = (title: string) => {
  const row = rows.find((r) => r.title === title);
  if (!row) throw new Error(`Нет задачи «${title}»`);
  return row;
};

describe("шаблон v3", () => {
  it("версия 3 и четыре направления", () => {
    expect(LECTURE_TEMPLATE_VERSION).toBe("3");
    expect(TEMPLATE_TYPES).toEqual(["LECTURE", "CASE", "INTENSIVE", "ACCELERATOR"]);
  });

  it("в шаблоне только пять отделов-ролей", () => {
    const departments = new Set(LECTURE_TEMPLATE.map((r) => r.department).filter(Boolean));
    for (const d of departments) expect(["BOARD", "GUESTS", "PR", "STAGE", "CONTENT"]).toContain(d);
  });

  it("у задач до и после мероприятия есть описание «как сделать» (шаги дня Д понятны из названия)", () => {
    for (const r of LECTURE_TEMPLATE.filter((r) => r.group !== "EVENT_DAY" && r.department !== "STAGE")) {
      expect(r.description, r.title).toBeTruthy();
    }
  });

  it("пропуск оформляет Пиар через 2 дня после подтверждения даты, закрытие = «Пропуск готов»", () => {
    const pass = byTitle("Оформить пропуск на спикера");
    expect(pass.department).toBe("PR");
    expect(pass.assigneeId).toBe("pr");
    expect(pass.firesTrigger).toBe("SECURITY_ANSWERED");
    expect(pass.dueDate?.toISOString()).toBe("2026-10-22T00:00:00.000Z");
  });

  it("план проведения и съёмки ждут «Пропуск готов» — до него срока нет", () => {
    for (const r of rows.filter((r) => r.triggerEvent === "SECURITY_ANSWERED")) {
      expect(r.dueDate, r.title).toBeNull();
    }
    expect(rows.filter((r) => r.triggerEvent === "SECURITY_ANSWERED").map((r) => r.department)).toEqual(
      expect.arrayContaining(["STAGE", "CONTENT"])
    );
  });

  it("«Пропуск готов» назначает сроки Event-отделу и Контенту", () => {
    const passReady = new Date("2026-10-22T00:00:00.000Z");
    const pending = rows.map((r, i) => ({ id: `r${i}`, triggerEvent: r.triggerEvent, offsetDays: r.offsetDays, dueDate: r.dueDate }));
    const updates = applyTriggerDueDates(pending, "SECURITY_ANSWERED", passReady);
    const updated = updates.map((u) => rows[Number(u.id.slice(1))]);
    expect(updated.length).toBeGreaterThan(0);
    expect(new Set(updated.map((r) => r.department))).toEqual(new Set(["STAGE", "CONTENT"]));
    for (const u of updates) expect(u.dueDate.getTime()).toBeGreaterThanOrEqual(passReady.getTime());
  });

  it("пост-анонс за неделю и второй анонс за 3 дня считаются от даты", () => {
    const offsets = rows.filter((r) => r.department === "PR" && r.triggerType === "DATE_OFFSET").map((r) => r.offsetDays);
    expect(offsets).toEqual(expect.arrayContaining([-7, -3]));
  });

  it("после мероприятия задачи ждут «Проведено»", () => {
    for (const r of rows.filter((r) => r.group === "AFTER")) expect(r.triggerEvent, r.title).toBe("EVENT_DONE");
  });

  it("в тексте шаблона нет старых шагов «ЦБ»", () => {
    for (const r of LECTURE_TEMPLATE) {
      expect(r.title).not.toMatch(/ЦБ/);
      expect(r.description ?? "").not.toMatch(/ЦБ/);
    }
  });
});
