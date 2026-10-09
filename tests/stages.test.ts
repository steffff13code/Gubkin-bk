import { describe, expect, it } from "vitest";
import {
  checkStageEntry,
  isOutsideWindow,
  missingSpeakerFields,
  optionsWarning,
  tooLateWarning,
  windowWarning,
  type EventForStageCheck
} from "../lib/stages";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

function card(overrides: Partial<EventForStageCheck> = {}): EventForStageCheck {
  return {
    title: "Лекция о стартапах",
    type: "LECTURE",
    guestName: "Спикер Тестовый",
    guestOccupation: "Предприниматель",
    guestOrganization: "Компания",
    guestTopic: "Как запустить стартап",
    format: "Лекция и вопросы",
    speakerWindowStart: d("2026-11-10"),
    speakerWindowEnd: d("2026-11-23"),
    dateOptionsCount: 0,
    targetDate: null,
    dateFixed: false,
    speakerWarned: false,
    actualAttendance: null,
    hasRetro: false,
    hasPhotoReport: false,
    ...overrides
  };
}

describe("Черновик → Подбор дат", () => {
  it("полная карточка спикера проходит сразу", () => {
    expect(checkStageEntry("APPROVAL", card())).toBeNull();
  });

  it("перечисляет, чего не хватает", () => {
    const error = checkStageEntry("APPROVAL", card({ guestOccupation: "", format: null, speakerWindowEnd: null }));
    expect(error).toContain("род деятельности");
    expect(error).toContain("формат");
    expect(error).toContain("окно спикера");
    expect(missingSpeakerFields(card({ guestName: " " }))).toEqual(["ФИО спикера"]);
  });

  it("окно «с» позже «по» — ошибка", () => {
    expect(checkStageEntry("APPROVAL", card({ speakerWindowStart: d("2026-11-23"), speakerWindowEnd: d("2026-11-10") }))).toMatch(
      /позже/
    );
  });
});

describe("Подбор дат → Дата у спикера", () => {
  it("нужен хотя бы один вариант", () => {
    expect(checkStageEntry("PLANNING", card())).toMatch(/хотя бы один вариант/);
    expect(checkStageEntry("PLANNING", card({ dateOptionsCount: 1 }))).toBeNull();
  });

  it("не больше четырёх вариантов", () => {
    expect(checkStageEntry("PLANNING", card({ dateOptionsCount: 5 }))).toMatch(/не больше 4/);
  });

  it("меньше трёх вариантов — мягкое предупреждение", () => {
    expect(optionsWarning(2)).toMatch(/3–4/);
    expect(optionsWarning(3)).toBeNull();
    expect(optionsWarning(0)).toBeNull();
  });
});

describe("Дата у спикера → Подготовка («Спикер подтвердил»)", () => {
  it("нужна выбранная дата", () => {
    expect(checkStageEntry("IN_PROGRESS", card({ speakerWarned: true }))).toMatch(/подтвердил спикер/);
  });

  it("нужна отметка «Предупредил спикера»", () => {
    expect(checkStageEntry("IN_PROGRESS", card({ targetDate: d("2026-11-17"), dateFixed: true }))).toMatch(/предупредили/i);
  });

  it("с датой и отметкой — проходит", () => {
    expect(checkStageEntry("IN_PROGRESS", card({ targetDate: d("2026-11-17"), dateFixed: true, speakerWarned: true }))).toBeNull();
  });
});

describe("предупреждения по срокам", () => {
  const now = d("2026-11-01");

  it("до мероприятия меньше 12 дней — «Не успеем по регламенту»", () => {
    expect(tooLateWarning(d("2026-11-12"), now)).toMatch(/Не успеем по регламенту/);
    expect(tooLateWarning(d("2026-11-12"), now)).toContain("11 дн.");
  });

  it("12 дней и больше — без предупреждения", () => {
    expect(tooLateWarning(d("2026-11-13"), now)).toBeNull();
  });

  it("окно спикера короче недели — предупреждение, неделя и больше — нет", () => {
    expect(windowWarning(d("2026-11-10"), d("2026-11-14"))).toMatch(/5 дн/);
    expect(windowWarning(d("2026-11-10"), d("2026-11-16"))).toBeNull();
  });

  it("вариант вне окна спикера подсвечивается", () => {
    expect(isOutsideWindow(d("2026-11-09"), d("2026-11-10"), d("2026-11-23"))).toBe(true);
    expect(isOutsideWindow(d("2026-11-23"), d("2026-11-10"), d("2026-11-23"))).toBe(false);
    expect(isOutsideWindow(d("2026-11-09"), null, null)).toBe(false);
  });
});

describe("Подготовка → Проведено", () => {
  it("не раньше дня мероприятия", () => {
    const e = card({ targetDate: d("2026-11-17"), dateFixed: true });
    expect(checkStageEntry("DONE", e, d("2026-11-16"))).toMatch(/в день мероприятия или позже/);
    expect(checkStageEntry("DONE", e, new Date("2026-11-17T12:00:00Z"))).toBeNull();
  });

  it("без зафиксированной даты нельзя", () => {
    expect(checkStageEntry("DONE", card({ targetDate: d("2026-11-17") }), d("2026-11-20"))).toMatch(/зафиксирована/);
  });
});

describe("Проведено → Закрыто", () => {
  it("нужны фотоотчёт, посещаемость и ретро", () => {
    expect(checkStageEntry("CLOSED", card())).toBe(
      "Чтобы закрыть мероприятие, прикрепите ссылку на фотоотчёт, укажите посещаемость и заполните ретро."
    );
  });

  it("всё заполнено — закрывается", () => {
    expect(checkStageEntry("CLOSED", card({ hasRetro: true, hasPhotoReport: true, actualAttendance: 0 }))).toBeNull();
  });
});
