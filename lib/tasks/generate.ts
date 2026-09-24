import type { DepartmentCode, TaskAutoComplete, TaskGroup, TaskTriggerEvent, TaskTriggerType } from "@prisma/client";
import { addDays, calendarDay } from "@/lib/time";

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
  dayOffsetMinutes?: number | null;
  dayTimeLabel?: string | null;
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
  dayOffsetMinutes: number | null;
  dayTimeLabel: string | null;
};

/**
 * Кто второй «в контуре», если в отделе нет зама. По регламенту ЦБ работает в паре
 * с руководителем Гостей: «Степана познакомил с ЦБ — в контуре двое».
 */
export const CONTOUR_PARTNER: Partial<Record<DepartmentCode, DepartmentCode>> = { SECURITY: "GUESTS" };

/**
 * Исполнитель задачи: руководитель отдела; второй (если needsTwoAssignees) — зам отдела,
 * а если зама нет — руководитель отдела-напарника из CONTOUR_PARTNER. Без отдела — лид мероприятия.
 */
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
  const assigneeId = a?.headId ?? null;
  if (!needsTwoAssignees) return { assigneeId, secondAssigneeId: null };
  const partner = CONTOUR_PARTNER[department];
  let second = a?.deputyId ?? (partner ? assignments[partner]?.headId ?? null : null);
  if (second === assigneeId) second = null;
  return { assigneeId, secondAssigneeId: second };
}

/**
 * Срок задачи в момент разворачивания плана. План разворачивается по окну дат
 * (дата ещё предварительная) — по регламенту заявка в ЦБ подаётся до фиксации даты.
 * - DATE_OFFSET → targetDate + offsetDays (при фиксации даты пересчитываются)
 * - EVENT с триггером DATE_FIXED → если дата уже зафиксирована, срок = now + offsetDays,
 *   иначе ждёт фиксации
 * - остальные EVENT-триггеры → null, получат срок при срабатывании триггера
 */
export function initialDueDate(
  template: Pick<TemplateLike, "triggerType" | "offsetDays" | "triggerEvent">,
  targetDate: Date,
  now: Date,
  dateFixed = true
): Date | null {
  if (template.triggerType === "DATE_OFFSET") {
    return addDays(targetDate, template.offsetDays ?? 0);
  }
  if (template.triggerEvent === "DATE_FIXED" && dateFixed) {
    return addDays(calendarDay(now), template.offsetDays ?? 0);
  }
  return null;
}

export function buildTaskRows(
  templates: TemplateLike[],
  targetDate: Date,
  now: Date,
  assignments: DepartmentAssignments,
  leadId: string | null,
  dateFixed = true
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
      dueDate: initialDueDate(t, targetDate, now, dateFixed),
      triggerType: t.triggerType,
      offsetDays: t.offsetDays,
      triggerEvent: t.triggerEvent,
      firesTrigger: t.firesTrigger,
      autoComplete: t.autoComplete,
      status: "TODO",
      required: t.required,
      group: t.group,
      sortOrder: t.sortOrder,
      dayOffsetMinutes: t.dayOffsetMinutes ?? null,
      dayTimeLabel: t.dayTimeLabel ?? null
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
