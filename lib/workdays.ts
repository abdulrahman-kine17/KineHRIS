// Working-day arithmetic that respects each office's weekend and holidays.

import { addDays, isoDate, toUtcDay } from "./dates";

export type WorkCalendar = {
  /** JS weekday numbers that are the weekend, 0=Sun ... 6=Sat. */
  weekendDays: Set<number>;
  /** Public holidays as YYYY-MM-DD strings. */
  holidays: Set<string>;
};

export function parseWeekendDays(s: string): Set<number> {
  return new Set(
    s
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6),
  );
}

export function makeCalendar(weekendDays: string, holidayDates: Date[]): WorkCalendar {
  return {
    weekendDays: parseWeekendDays(weekendDays),
    holidays: new Set(holidayDates.map((d) => isoDate(d))),
  };
}

export function isWorkingDay(date: Date, cal: WorkCalendar): boolean {
  const d = toUtcDay(date);
  if (cal.weekendDays.has(d.getUTCDay())) return false;
  if (cal.holidays.has(isoDate(d))) return false;
  return true;
}

/** Working days from start to end, both inclusive. 0 if end is before start. */
export function countWorkingDays(start: Date, end: Date, cal: WorkCalendar): number {
  let d = toUtcDay(start);
  const last = toUtcDay(end);
  let n = 0;
  while (d.getTime() <= last.getTime()) {
    if (isWorkingDay(d, cal)) n++;
    d = addDays(d, 1);
  }
  return n;
}

/** Working days strictly after `from`, up to and including `to`. */
export function workingDaysElapsed(from: Date, to: Date, cal: WorkCalendar): number {
  return countWorkingDays(addDays(toUtcDay(from), 1), to, cal);
}

/** The date `n` working days after `start` (n >= 1). */
export function addWorkingDays(start: Date, n: number, cal: WorkCalendar): Date {
  let d = toUtcDay(start);
  let left = n;
  while (left > 0) {
    d = addDays(d, 1);
    if (isWorkingDay(d, cal)) left--;
  }
  return d;
}
