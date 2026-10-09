"use client";

import { useState } from "react";
import type { EventType } from "@prisma/client";
import { FORM_EVENT_TYPES, INTENSIVE_CYCLES } from "@/lib/labels";

export type SpeakerDefaults = {
  title?: string | null;
  type?: EventType;
  guestName?: string | null;
  guestOccupation?: string | null;
  guestOrganization?: string | null;
  guestTopic?: string | null;
  format?: string | null;
  speakerWindowStart?: string | null;
  speakerWindowEnd?: string | null;
  externalOwner?: string | null;
  description?: string | null;
  driveFolderUrl?: string | null;
  intensiveCycle?: string | null;
  intensiveMeeting?: number | null;
  intensiveTotal?: number | null;
};

const input = "w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-base text-ink placeholder:text-muted sm:text-sm";
const label = "mb-1 block text-sm font-bold text-ink";

function windowDays(a: string, b: string): number | null {
  if (!a || !b) return null;
  const d = (new Date(b).getTime() - new Date(a).getTime()) / 864e5 + 1;
  return Number.isFinite(d) ? Math.round(d) : null;
}

/** Карточка спикера: создание и правка. Если всё заполнено — мероприятие уходит на подбор дат. */
export function SpeakerForm({
  action,
  defaults = {},
  submitLabel,
  typeLocked = false,
  showDrive = false
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaults?: SpeakerDefaults;
  submitLabel: string;
  typeLocked?: boolean;
  showDrive?: boolean;
}) {
  const [type, setType] = useState<EventType>(defaults.type ?? "LECTURE");
  const [start, setStart] = useState(defaults.speakerWindowStart ?? "");
  const [end, setEnd] = useState(defaults.speakerWindowEnd ?? "");
  const presetCycle = defaults.intensiveCycle && !INTENSIVE_CYCLES.includes(defaults.intensiveCycle) ? "OTHER" : defaults.intensiveCycle ?? "";
  const [cycle, setCycle] = useState(presetCycle);
  const days = windowDays(start, end);

  return (
    <form action={action} className="space-y-4">
      <fieldset>
        <legend className={label}>Направление</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {FORM_EVENT_TYPES.map((t) => (
            <label
              key={t.type}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${
                type === t.type ? "border-gold bg-gold/10 text-ink" : "border-line bg-bg text-muted"
              } ${typeLocked && type !== t.type ? "opacity-40" : ""}`}
            >
              <input
                type="radio"
                name="type"
                value={t.type}
                checked={type === t.type}
                disabled={typeLocked && type !== t.type}
                onChange={() => setType(t.type)}
                className="accent-[#E8B86D]"
              />
              {t.label}
            </label>
          ))}
        </div>
        {typeLocked && <p className="mt-1 text-xs text-muted">Направление не меняется после того, как развёрнут план задач.</p>}
      </fieldset>

      {type === "INTENSIVE" && (
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-bg p-3">
          <div className="col-span-2">
            <label className={label} htmlFor="intensiveCycle">
              Цикл
            </label>
            <select id="intensiveCycle" name="intensiveCycle" value={cycle} onChange={(e) => setCycle(e.target.value)} className={input}>
              <option value="">Не выбран</option>
              {INTENSIVE_CYCLES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="OTHER">Свой вариант</option>
            </select>
            {cycle === "OTHER" && (
              <input
                name="intensiveCycleOther"
                defaultValue={presetCycle === "OTHER" ? defaults.intensiveCycle ?? "" : ""}
                placeholder="Название цикла"
                className={`${input} mt-2`}
              />
            )}
          </div>
          <div>
            <label className={label} htmlFor="intensiveMeeting">
              Встреча №
            </label>
            <input id="intensiveMeeting" name="intensiveMeeting" type="number" min={1} defaultValue={defaults.intensiveMeeting ?? ""} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="intensiveTotal">
              из N
            </label>
            <input id="intensiveTotal" name="intensiveTotal" type="number" min={1} defaultValue={defaults.intensiveTotal ?? ""} className={input} />
          </div>
        </div>
      )}

      <div>
        <label className={label} htmlFor="guestName">
          ФИО спикера
        </label>
        <input id="guestName" name="guestName" defaultValue={defaults.guestName ?? ""} className={input} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="guestOccupation">
            Род деятельности
          </label>
          <input id="guestOccupation" name="guestOccupation" defaultValue={defaults.guestOccupation ?? ""} placeholder="Чем занимается" className={input} />
        </div>
        <div>
          <label className={label} htmlFor="guestOrganization">
            Компания
          </label>
          <input id="guestOrganization" name="guestOrganization" defaultValue={defaults.guestOrganization ?? ""} className={input} />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="guestTopic">
          О чём мероприятие
        </label>
        <textarea id="guestTopic" name="guestTopic" rows={2} defaultValue={defaults.guestTopic ?? ""} className={input} />
      </div>
      <div>
        <label className={label} htmlFor="format">
          Формат
        </label>
        <input
          id="format"
          name="format"
          defaultValue={defaults.format ?? ""}
          placeholder="Например: лекция + вопросы, питч-сессия 7 минут"
          className={input}
        />
      </div>

      <fieldset>
        <legend className={label}>Окно спикера</legend>
        <p className="mb-2 text-xs text-muted">Две недели, в которые спикер может приехать.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="speakerWindowStart">
              с
            </label>
            <input id="speakerWindowStart" name="speakerWindowStart" type="date" value={start} onChange={(e) => setStart(e.target.value)} className={input} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="speakerWindowEnd">
              по
            </label>
            <input id="speakerWindowEnd" name="speakerWindowEnd" type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={input} />
          </div>
        </div>
        {days !== null && days < 1 && <p className="mt-1 text-xs text-danger">Дата «по» раньше даты «с».</p>}
        {days !== null && days >= 1 && days < 7 && (
          <p className="mt-1 text-xs text-gold">Окно всего {days} дн. — по регламенту спикер даёт две недели. Сохранить можно.</p>
        )}
      </fieldset>

      <div>
        <label className={label} htmlFor="externalOwner">
          Кто ведёт со стороны внешнего отдела <span className="font-normal text-muted">(необязательно)</span>
        </label>
        <input id="externalOwner" name="externalOwner" defaultValue={defaults.externalOwner ?? ""} className={input} />
      </div>

      <details className="rounded-lg border border-line bg-bg p-3" open={!!defaults.title || !!defaults.description}>
        <summary className="cursor-pointer text-sm font-bold text-muted">Дополнительно: название, подробности</summary>
        <div className="mt-3 space-y-3">
          <div>
            <label className={label} htmlFor="title">
              Название мероприятия
            </label>
            <input id="title" name="title" defaultValue={defaults.title ?? ""} placeholder="Если пусто — возьмём тему" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="description">
              Подробности
            </label>
            <textarea id="description" name="description" rows={3} defaultValue={defaults.description ?? ""} className={input} />
          </div>
          {showDrive && (
            <div>
              <label className={label} htmlFor="driveFolderUrl">
                Папка с материалами (ссылка)
              </label>
              <input id="driveFolderUrl" name="driveFolderUrl" defaultValue={defaults.driveFolderUrl ?? ""} className={input} />
            </div>
          )}
        </div>
      </details>

      <button type="submit" className="w-full rounded-lg bg-gold py-3 text-base font-bold text-bg hover:bg-gold/90 sm:w-auto sm:px-6 sm:text-sm">
        {submitLabel}
      </button>
    </form>
  );
}
