import { describe, expect, it } from "vitest";
import { ROLES, can, canCloseTask, roleKeyOf, type RightAction, type RoleKey } from "../lib/roles";

// Матрица прав из регламента v3.
const EXPECTED: Record<RightAction, RoleKey[]> = {
  VIEW: ["BOARD", "GUESTS", "PR", "STAGE", "CONTENT"],
  CREATE_EVENT: ["BOARD", "GUESTS"],
  ADD_DATE_OPTIONS: ["BOARD", "PR"],
  FIX_DATE: ["BOARD", "GUESTS"],
  PASS_DECISION: ["BOARD", "PR"],
  FINISH: ["BOARD", "GUESTS"],
  CANCEL_DELETE: ["BOARD"],
  SETTINGS: ["BOARD"]
};
const ALL: RoleKey[] = ["BOARD", "GUESTS", "PR", "STAGE", "CONTENT"];

describe("матрица прав", () => {
  for (const [action, allowed] of Object.entries(EXPECTED) as [RightAction, RoleKey[]][]) {
    it(action, () => {
      for (const role of ALL) expect(can(role, action), `${role} → ${action}`).toBe(allowed.includes(role));
    });
  }

  it("без роли нельзя ничего", () => {
    for (const action of Object.keys(EXPECTED) as RightAction[]) expect(can(null, action)).toBe(false);
  });
});

describe("закрытие задач", () => {
  it("свою задачу закрывает своя роль, чужую — нет", () => {
    expect(canCloseTask("PR", "PR")).toBe(true);
    expect(canCloseTask("PR", "STAGE")).toBe(false);
    expect(canCloseTask("CONTENT", "GUESTS")).toBe(false);
  });

  it("администратор закрывает любую", () => {
    for (const d of ALL) expect(canCloseTask("BOARD", d)).toBe(true);
  });

  it("задачу без отдела закрывает любая роль", () => {
    expect(canCloseTask("STAGE", null)).toBe(true);
    expect(canCloseTask(null, null)).toBe(false);
  });
});

describe("роли", () => {
  it("пять ролей, пароль только у администратора", () => {
    expect(ROLES.map((r) => r.key).sort()).toEqual([...ALL].sort());
    expect(ROLES.filter((r) => r.needsPassword).map((r) => r.key)).toEqual(["BOARD"]);
  });

  it("роль пользователя по отделу, ADMIN — всегда администратор", () => {
    expect(roleKeyOf({ role: "LEAD", departments: [{ code: "PR" }] })).toBe("PR");
    expect(roleKeyOf({ role: "ADMIN", departments: [{ code: "GUESTS" }] })).toBe("BOARD");
    expect(roleKeyOf({ role: "LEAD", departments: [] })).toBeNull();
    expect(roleKeyOf(null)).toBeNull();
  });
});
