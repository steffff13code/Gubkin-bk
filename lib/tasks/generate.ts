import type { DepartmentCode, TaskAutoComplete, TaskGroup, TaskTriggerEvent, TaskTriggerType } from "@prisma/client";
import { addDays, startOfUtcDay } from "@/lib/time";

// Чистая логика генерации плана задач по шаблону — без обращений к БД,
// чтобы можно было покрыть юнит-тестами без поднятой Postgres.

export type TemplateLike = {
  id: string;
  title: string;
  department: DepartmentCode | null;
  triggerType: TaskTriggerType;
  offsetDays: number | null;
  triggerEvent: TaskTriggerEvent | null;
  required: boolean;
  needsTwoAssignees: boolean;
  firesTrigger: TaskTriggerEvent | null;
  autoComplete: TaskAutoComplete | null;
  group: TaskGroup;
  sortOrder: number;
};

export type DepartmentAssignment = { headId: string | null; deputyId: string | null };
export type DepartmentAssignments = Partial<Record<DepartmentCode, DepartmentAssignment>>;

export type GeneratedTaskRow = {
  templateId: string;
  title: string;
  department: DepartmentCode | null;
  assigneeId: string | null;
  secondAssigneeId: string | null;
  dueDate: Date | null;
  triggerType: TaskTriggerType;
  offsetDays: number | null;
  triggerEvent: TaskTriggerEvent | null;
  firesTrigger: TaskTriggerEvent | null;
  autoComplete: TaskAutoComplete | null;
  status: "TODO";
  required: boolean;
  group: TaskGroup;
  sortOrder: number;
};

/** Исполнитель задачи: руководитель отдела, зам — только если needsTwoAssignees. Без отдела — лид мероприятия. */
export function resolveAssignees(
  department: DepartmentCode | null,
  needsTwoAssignees: boolean,
  assignments: DepartmentAssignments,
  leadId: string | null
): { assigneeId: string | null; secondAssigneeId: string | null } {
  if (!department) {
    return { assigneeId: leadId, secondAssigneeId: null };
  }
  const a = assignments[department];
  return {
    assigneeId: a?.headId ?? null,
    secondAssigneeId: needsTwoAssignees ? a?.deputyId ?? null : null
  };
}

/**
 * Срок задачи в момент разворачивания плана (dateFixed = true):
 * - DATE_OFFSET → targetDate + offsetDays
 * - EVENT с триггером DATE_FIXED → срабатывает прямо сейчас, срок = now + offsetDays
 * - остальные EVENT-триггеры → null, получат срок при срабатывании триггера
 */
export function initialDueDate(
  template: Pick<TemplateLike, "triggerType" | "offsetDays" | "triggerEvent">,
  targetDate: Date,
  now: Date
): Date | null {
  if (template.triggerType === "DATE_OFFSET") {
    return addDays(targetDate, template.offsetDays ?? 0);
  }
  if (template.triggerEvent === "DATE_FIXED") {
    return addDays(startOfUtcDay(now), template.offsetDays ?? 0);
  }
  return null;
}

export function buildTaskRows(
  templates: TemplateLike[],
  targetDate: Date,
  now: Date,
  assignments: DepartmentAssignments,
  leadId: string | null
): GeneratedTaskRow[] {
  return templates.map((t) => {
    const { assigneeId, secondAssigneeId } = resolveAssignees(
      t.department,
      t.needsTwoAssignees,
      assignments,
      leadId
    );
    return {
      templateId: t.id,
      title: t.title,
      department: t.department,
      assigneeId,
      secondAssigneeId,
      dueDate: initialDueDate(t, targetDate, now),
      triggerType: t.triggerType,
      offsetDays: t.offsetDays,
      triggerEvent: t.triggerEvent,
      firesTrigger: t.firesTrigger,
      autoComplete: t.autoComplete,
      status: "TODO",
      required: t.required,
      group: t.group,
      sortOrder: t.sortOrder
    };
  });
}

export type OpenTaskLike = {
  id: string;
  triggerType: TaskTriggerType;
  offsetDays: number | null;
  status: "TODO" | "DONE" | "SKIPPED";
};

/** Пересчёт сроков открытых DATE_OFFSET-задач при переносе даты. Закрытые задачи не трогаем. */
export function recalcDueDatesOnDateChange(
  tasks: OpenTaskLike[],
  newTargetDate: Date
): { id: string; dueDate: Date }[] {
  return tasks
    .filter((t) => t.status === "TODO" && t.triggerType === "DATE_OFFSET")
    .map((t) => ({ id: t.id, dueDate: addDays(newTargetDate, t.offsetDays ?? 0) }));
}

export type PendingTriggerTaskLike = {
  id: string;
  triggerEvent: TaskTriggerEvent | null;
  offsetDays: number | null;
  dueDate: Date | null;
};

/** Срок для задач, ожидающих срабатывания триггера (dueDate ещё не назначен). */
export function applyTriggerDueDates(
  tasks: PendingTriggerTaskLike[],
  triggerEvent: TaskTriggerEvent,
  firedAt: Date
): { id: string; dueDate: Date }[] {
  return tasks
    .filter((t) => t.triggerEvent === triggerEvent && t.dueDate === null)
    .map((t) => ({ id: t.id, dueDate: addDays(firedAt, t.offsetDays ?? 0) }));
}
