import { describe, expect, it } from "vitest";
import { checkStageEntry, type EventForStageCheck } from "../lib/stages";

function baseEvent(overrides: Partial<EventForStageCheck> = {}): EventForStageCheck {
  return {
    title: "Лекция с гостем",
    type: "LECTURE",
    description: "Программа",
    targetDate: null,
    dateFixed: false,
    leadId: "lead-1",
    actualAttendance: null,
    hasRetro: false,
    hasPhotoReport: false,
    ...overrides
  };
}

describe("checkStageEntry — APPROVAL", () => {
  it("пропускает, если название, тип и описание заполнены", () => {
    expect(checkStageEntry("APPROVAL", baseEvent())).toBeNull();
  });

  it("требует название, тип и описание", () => {
    const error = checkStageEntry("APPROVAL", baseEvent({ title: "", description: "" }));
    expect(error).toContain("название");
    expect(error).toContain("описание");
  });
});

describe("checkStageEntry — IN_PROGRESS", () => {
  it("требует окно дат", () => {
    const error = checkStageEntry("IN_PROGRESS", baseEvent({ dateFixed: false, targetDate: null }));
    expect(error).toMatch(/окно дат/i);
  });

  it("запускается по окну дат, до фиксации (заявка в ЦБ идёт раньше даты)", () => {
    expect(checkStageEntry("IN_PROGRESS", baseEvent({ dateFixed: false, targetDate: new Date() }))).toBeNull();
  });

  it("требует лида", () => {
    const error = checkStageEntry(
      "IN_PROGRESS",
      baseEvent({ dateFixed: true, targetDate: new Date(), leadId: null })
    );
    expect(error).toMatch(/лида/i);
  });

  it("пропускает при дате и лиде", () => {
    const error = checkStageEntry("IN_PROGRESS", baseEvent({ dateFixed: true, targetDate: new Date() }));
    expect(error).toBeNull();
  });
});

describe("checkStageEntry — DONE", () => {
  it("не даёт отметить проведённым до наступления даты", () => {
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 5);
    const error = checkStageEntry("DONE", baseEvent({ targetDate: future, dateFixed: true }), new Date());
    expect(error).toMatch(/дождитесь даты/i);
  });

  it("не даёт провести с незафиксированной датой", () => {
    const today = new Date();
    expect(checkStageEntry("DONE", baseEvent({ targetDate: today, dateFixed: false }), today)).toMatch(/зафиксируйте дату/i);
  });

  it("разрешает в день мероприятия и позже", () => {
    const today = new Date();
    const error = checkStageEntry("DONE", baseEvent({ targetDate: today, dateFixed: true }), today);
    expect(error).toBeNull();
  });
});

describe("checkStageEntry — CLOSED", () => {
  it("требует ретро, фотоотчёт и посещаемость одним сообщением", () => {
    const error = checkStageEntry("CLOSED", baseEvent());
    expect(error).toBe(
      "Чтобы закрыть мероприятие, заполните ретро, прикрепите ссылку на фотоотчёт и укажите фактическую посещаемость."
    );
  });

  it("пропускает, если всё заполнено", () => {
    const error = checkStageEntry(
      "CLOSED",
      baseEvent({ hasRetro: true, hasPhotoReport: true, actualAttendance: 80 })
    );
    expect(error).toBeNull();
  });
});
