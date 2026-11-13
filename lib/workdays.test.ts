import { describe, expect, it } from "vitest";
import { utcDate } from "./dates";
import { addWorkingDays, countWorkingDays, isWorkingDay, makeCalendar, parseWeekendDays } from "./workdays";

const friSat = makeCalendar("5,6", [utcDate(2026, 10, 6)]); // 6 Oct 2026 (Tue) is a holiday

describe("workdays", () => {
  it("parses weekend days", () => {
    expect([...parseWeekendDays("5,6")]).toEqual([5, 6]);
    expect([...parseWeekendDays("0, 6")]).toEqual([0, 6]);
    expect([...parseWeekendDays("x,9")]).toEqual([]);
  });

  it("treats Friday, Saturday and holidays as non-working", () => {
    expect(isWorkingDay(utcDate(2026, 10, 2), friSat)).toBe(false); // Fri
    expect(isWorkingDay(utcDate(2026, 10, 3), friSat)).toBe(false); // Sat
    expect(isWorkingDay(utcDate(2026, 10, 4), friSat)).toBe(true); // Sun
    expect(isWorkingDay(utcDate(2026, 10, 6), friSat)).toBe(false); // holiday
  });

  it("counts inclusive working days", () => {
    // Sun 4 .. Sat 10 Oct 2026: Sun, Mon, (Tue holiday), Wed, Thu = 4
    expect(countWorkingDays(utcDate(2026, 10, 4), utcDate(2026, 10, 10), friSat)).toBe(4);
    expect(countWorkingDays(utcDate(2026, 10, 10), utcDate(2026, 10, 4), friSat)).toBe(0);
  });

  it("adds working days", () => {
    // From Thu 1 Oct: +1 -> Sun 4, +2 -> Mon 5, +3 -> Wed 7 (Tue holiday)
    expect(addWorkingDays(utcDate(2026, 10, 1), 3, friSat)).toEqual(utcDate(2026, 10, 7));
  });
});
