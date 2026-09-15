import { describe, expect, it } from "vitest";
import {
  applyTriggerDueDates,
  buildTaskRows,
  initialDueDate,
  recalcDueDatesOnDateChange,
  resolveAssignees,
  type DepartmentAssignments,
  type TemplateLike
} from "../lib/tasks/generate";

const TARGET = new Date("2026-11-20T00:00:00.000Z");
const NOW = new Date("2026-09-15T12:00:00.000Z");

function template(overrides: Partial<TemplateLike> = {}): TemplateLike {
  return {
    id: "t1",
    title: "Тестовая задача",
    department: null,
    triggerType: "DATE_OFFSET",
    offsetDays: -10,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    group: "BEFORE",
    sortOrder: 10,
    ...overrides
  };
}

describe("resolveAssignees", () => {
  const assignments: DepartmentAssignments = {
    GUESTS: { headId: "head-guests", deputyId: "deputy-guests" },
    SECURITY: { headId: "head-security", deputyId: null }
  };

  it("без отдела назначает лида мероприятия", () => {
    expect(resolveAssignees(null, false, assignments, "lead-1")).toEqual({
      assigneeId: "lead-1",
      secondAssigneeId: null
    });
  });

  it("с отделом назначает руководителя, без второго исполнителя по умолчанию", () => {
    expect(resolveAssignees("GUESTS", false, assignments, "lead-1")).toEqual({
      assigneeId: "head-guests",
      secondAssigneeId: null
    });
  });

  it("needsTwoAssignees добавляет зама", () => {
    expect(resolveAssignees("GUESTS", true, assignments, "lead-1")).toEqual({
      assigneeId: "head-guests",
      secondAssigneeId: "deputy-guests"
    });
  });

  it("если в отделе никого нет — оба поля пустые", () => {
    expect(resolveAssignees("PR", true, assignments, "lead-1")).toEqual({
      assigneeId: null,
      secondAssigneeId: null
    });
  });

  it("needsTwoAssignees без зама в отделе — второй остаётся пустым", () => {
    expect(resolveAssignees("SECURITY", true, assignments, "lead-1")).toEqual({
      assigneeId: "head-security",
      secondAssigneeId: null
    });
  });
});

describe("initialDueDate", () => {
  it("DATE_OFFSET считает от даты мероприятия", () => {
    const t = template({ triggerType: "DATE_OFFSET", offsetDays: -45 });
    const due = initialDueDate(t, TARGET, NOW);
    expect(due?.toISOString()).toBe("2026-10-06T00:00:00.000Z");
  });

  it("EVENT с триггером DATE_FIXED считает от начала текущих суток (план разворачивается сейчас)", () => {
    const t = template({ triggerType: "EVENT", triggerEvent: "DATE_FIXED", offsetDays: 0 });
    const due = initialDueDate(t, TARGET, NOW);
    expect(due?.toISOString()).toBe("2026-09-15T00:00:00.000Z");
  });

  it("остальные EVENT-триггеры пока не получают срок", () => {
    const t = template({ triggerType: "EVENT", triggerEvent: "SECURITY_SUBMITTED", offsetDays: 7 });
    expect(initialDueDate(t, TARGET, NOW)).toBeNull();
  });
});

describe("buildTaskRows", () => {
  const assignments: DepartmentAssignments = {
    GUESTS: { headId: "head-guests", deputyId: "deputy-guests" }
  };

  it("строит по одной строке на шаблон с правильными полями", () => {
    const templates = [
      template({ id: "a", department: "GUESTS", offsetDays: -45 }),
      template({
        id: "b",
        department: "SECURITY",
        triggerType: "EVENT",
        offsetDays: 7,
        triggerEvent: "SECURITY_SUBMITTED",
        firesTrigger: "SECURITY_ANSWERED"
      })
    ];
    const rows = buildTaskRows(templates, TARGET, NOW, assignments, "lead-1");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ templateId: "a", assigneeId: "head-guests", status: "TODO" });
    expect(rows[0].dueDate?.toISOString()).toBe("2026-10-06T00:00:00.000Z");
    expect(rows[1]).toMatchObject({ templateId: "b", assigneeId: null, dueDate: null, firesTrigger: "SECURITY_ANSWERED" });
  });
});

describe("recalcDueDatesOnDateChange", () => {
  const NEW_TARGET = new Date("2026-12-04T00:00:00.000Z");

  it("пересчитывает только открытые DATE_OFFSET-задачи", () => {
    const tasks = [
      { id: "open-offset", triggerType: "DATE_OFFSET" as const, offsetDays: -10, status: "TODO" as const },
      { id: "done-offset", triggerType: "DATE_OFFSET" as const, offsetDays: -10, status: "DONE" as const },
      { id: "open-event", triggerType: "EVENT" as const, offsetDays: 7, status: "TODO" as const }
    ];
    const updates = recalcDueDatesOnDateChange(tasks, NEW_TARGET);
    expect(updates).toEqual([{ id: "open-offset", dueDate: new Date("2026-11-24T00:00:00.000Z") }]);
  });
});

describe("applyTriggerDueDates", () => {
  it("назначает срок только ожидающим задачам с этим триггером", () => {
    const firedAt = new Date("2026-10-01T00:00:00.000Z");
    const tasks = [
      { id: "pending", triggerEvent: "SECURITY_SUBMITTED" as const, offsetDays: 7, dueDate: null },
      { id: "already-due", triggerEvent: "SECURITY_SUBMITTED" as const, offsetDays: 7, dueDate: new Date() },
      { id: "other-trigger", triggerEvent: "REGISTRATION_CLOSED" as const, offsetDays: 1, dueDate: null }
    ];
    const updates = applyTriggerDueDates(tasks, "SECURITY_SUBMITTED", firedAt);
    expect(updates).toEqual([{ id: "pending", dueDate: new Date("2026-10-08T00:00:00.000Z") }]);
  });
});
