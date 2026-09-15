import type { TaskTemplate } from "@prisma/client";
import {
  DEPARTMENT_LABELS,
  EVENT_TYPE_LABELS,
  TASK_AUTO_COMPLETE_LABELS,
  TASK_GROUP_LABELS,
  TASK_TRIGGER_EVENT_LABELS,
  TASK_TRIGGER_TYPE_LABELS
} from "@/lib/labels";
import {
  createTaskTemplateAction,
  deleteTaskTemplateAction,
  updateTaskTemplateAction
} from "@/lib/actions/settings-actions";
import type { EventType } from "@prisma/client";

export function TemplatesTab({ templates }: { templates: TaskTemplate[] }) {
  const byType = new Map<EventType, TaskTemplate[]>();
  for (const t of templates) {
    byType.set(t.eventType, [...(byType.get(t.eventType) ?? []), t]);
  }

  return (
    <div className="space-y-6">
      {Object.entries(EVENT_TYPE_LABELS).map(([type, label]) => (
        <section key={type} className="rounded border border-line bg-surface p-3">
          <h2 className="mb-2 text-sm font-bold text-ink">{label}</h2>
          <div className="space-y-2">
            {(byType.get(type as EventType) ?? []).map((t) => (
              <TemplateRow key={t.id} template={t} />
            ))}
            {(byType.get(type as EventType) ?? []).length === 0 && (
              <p className="text-xs text-muted">Шаблон пуст — задачи для этого типа не создаются автоматически.</p>
            )}
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-bold text-ink">Добавить задачу в шаблон</summary>
            <TemplateForm action={createTaskTemplateAction} eventType={type as EventType} />
          </details>
        </section>
      ))}
    </div>
  );
}

function TemplateRow({ template }: { template: TaskTemplate }) {
  return (
    <details className="rounded border border-line bg-bg p-2">
      <summary className="cursor-pointer text-sm text-ink">
        [{TASK_GROUP_LABELS[template.group]}] {template.title}
        <span className="ml-2 text-xs text-muted">
          {template.department ? DEPARTMENT_LABELS[template.department] : "без отдела"} ·{" "}
          {template.triggerType === "DATE_OFFSET"
            ? `${template.offsetDays} дн. от даты`
            : `${TASK_TRIGGER_EVENT_LABELS[template.triggerEvent!]} +${template.offsetDays ?? 0} дн.`}
        </span>
      </summary>
      <TemplateForm action={updateTaskTemplateAction.bind(null, template.id)} template={template} />
      <form action={deleteTaskTemplateAction.bind(null, template.id)} className="mt-2">
        <button type="submit" className="text-xs text-danger underline">
          Удалить
        </button>
      </form>
    </details>
  );
}

function TemplateForm({
  action,
  template,
  eventType
}: {
  action: (formData: FormData) => void;
  template?: TaskTemplate;
  eventType?: EventType;
}) {
  return (
    <form action={action} className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
      {eventType && <input type="hidden" name="eventType" value={eventType} />}
      <input
        name="title"
        defaultValue={template?.title}
        required
        placeholder="Название задачи"
        className="col-span-2 rounded border border-line bg-surface px-2 py-1 sm:col-span-3"
      />
      <select name="department" defaultValue={template?.department ?? ""} className="rounded border border-line bg-surface px-2 py-1">
        <option value="">Без отдела</option>
        {Object.entries(DEPARTMENT_LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <select name="group" defaultValue={template?.group ?? "BEFORE"} className="rounded border border-line bg-surface px-2 py-1">
        {Object.entries(TASK_GROUP_LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <input
        type="number"
        name="sortOrder"
        defaultValue={template?.sortOrder ?? 0}
        placeholder="Порядок"
        className="rounded border border-line bg-surface px-2 py-1"
      />
      <select name="triggerType" defaultValue={template?.triggerType ?? "DATE_OFFSET"} className="rounded border border-line bg-surface px-2 py-1">
        {Object.entries(TASK_TRIGGER_TYPE_LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <select name="triggerEvent" defaultValue={template?.triggerEvent ?? ""} className="rounded border border-line bg-surface px-2 py-1">
        <option value="">— (для «от даты»)</option>
        {Object.entries(TASK_TRIGGER_EVENT_LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <input
        type="number"
        name="offsetDays"
        defaultValue={template?.offsetDays ?? 0}
        placeholder="Смещение, дней"
        className="rounded border border-line bg-surface px-2 py-1"
      />
      <select name="firesTrigger" defaultValue={template?.firesTrigger ?? ""} className="rounded border border-line bg-surface px-2 py-1">
        <option value="">Не зажигает триггер</option>
        {Object.entries(TASK_TRIGGER_EVENT_LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            При закрытии → {v}
          </option>
        ))}
      </select>
      <select name="autoComplete" defaultValue={template?.autoComplete ?? ""} className="rounded border border-line bg-surface px-2 py-1">
        <option value="">Закрывается вручную</option>
        {Object.entries(TASK_AUTO_COMPLETE_LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            Само: {v}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1">
        <input type="checkbox" name="required" defaultChecked={template?.required ?? true} />
        Обязательная
      </label>
      <label className="flex items-center gap-1">
        <input type="checkbox" name="needsTwoAssignees" defaultChecked={template?.needsTwoAssignees ?? false} />
        Нужны двое
      </label>
      <button type="submit" className="col-span-2 rounded border border-line bg-surface py-1 font-bold text-ink sm:col-span-3">
        Сохранить
      </button>
    </form>
  );
}
