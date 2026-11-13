// Upcoming dates worth a nudge: probation ends, work anniversaries, contract
// renewals and last working days, within a window.

import { prisma } from "./db";
import { addDays, diffDays, utcDate } from "./dates";

export type ReminderKind = "probation" | "anniversary" | "contract" | "last_day";

export type Reminder = {
  kind: ReminderKind;
  date: Date;
  inDays: number;
  employee: { id: string; firstName: string; lastName: string; title: string; officeId: string; teamId: string };
  detail: string;
};

export const REMINDER_KINDS: { key: ReminderKind; label: string }[] = [
  { key: "probation", label: "Probation ends" },
  { key: "anniversary", label: "Anniversaries" },
  { key: "contract", label: "Contract renewals" },
  { key: "last_day", label: "Last days" },
];

export async function getReminders(opts: { from: Date; days: number; employeeIds: string[] | null; officeId?: string; teamId?: string }): Promise<Reminder[]> {
  const to = addDays(opts.from, opts.days);
  const employees = await prisma.employee.findMany({
    where: {
      status: { not: "left" },
      ...(opts.employeeIds ? { id: { in: opts.employeeIds } } : {}),
      ...(opts.officeId ? { officeId: opts.officeId } : {}),
      ...(opts.teamId ? { teamId: opts.teamId } : {}),
    },
    select: {
      id: true, firstName: true, lastName: true, title: true, officeId: true, teamId: true,
      startDate: true, endDate: true, probationEndDate: true, status: true,
      contracts: { where: { endDate: { gte: opts.from, lte: to } }, select: { title: true, endDate: true } },
    },
  });

  const out: Reminder[] = [];
  const inWindow = (d: Date | null) => d && d >= opts.from && d <= to;
  for (const e of employees) {
    const person = { id: e.id, firstName: e.firstName, lastName: e.lastName, title: e.title, officeId: e.officeId, teamId: e.teamId };
    if (e.status === "probation" && inWindow(e.probationEndDate)) {
      out.push({ kind: "probation", date: e.probationEndDate!, inDays: diffDays(opts.from, e.probationEndDate!), employee: person, detail: "Confirm or extend probation" });
    }
    // Next anniversary of the start date, if it falls in the window and is at least the first.
    const y = opts.from.getUTCFullYear();
    for (const yy of [y, y + 1]) {
      const ann = utcDate(yy, e.startDate.getUTCMonth() + 1, e.startDate.getUTCDate());
      const years = yy - e.startDate.getUTCFullYear();
      if (years >= 1 && inWindow(ann)) {
        out.push({ kind: "anniversary", date: ann, inDays: diffDays(opts.from, ann), employee: person, detail: `${years} year${years === 1 ? "" : "s"}` });
        break;
      }
    }
    for (const c of e.contracts) {
      out.push({ kind: "contract", date: c.endDate!, inDays: diffDays(opts.from, c.endDate!), employee: person, detail: `${c.title} ends` });
    }
    if (inWindow(e.endDate)) {
      out.push({ kind: "last_day", date: e.endDate!, inDays: diffDays(opts.from, e.endDate!), employee: person, detail: e.status === "notice" ? "On notice" : "End date set" });
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}
