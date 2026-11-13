// The monthly payroll input sheet: one row per person who was employed at any
// point in the month. No calculation beyond listing what payroll needs.

import { prisma } from "./db";
import { endOfMonth, isoDate, startOfMonth } from "./dates";
import { countWorkingDays, makeCalendar } from "./workdays";

export type PayrollRow = {
  employeeId: string;
  name: string;
  title: string;
  office: string;
  team: string;
  currency: string;
  status: string;
  startDate: Date;
  endDate: Date | null;
  joinedThisMonth: boolean;
  leftThisMonth: boolean;
  baseSalary: number | null;
  salaryEffective: Date | null;
  changeFrom: number | null;
  changeTo: number | null;
  changeEffective: Date | null;
  changeReason: string | null;
  unpaidLeaveDays: number;
  advances: number;
  advanceNotes: string;
  allowances: number;
  allowanceNotes: string;
};

export async function buildPayrollSheet(month: Date): Promise<{ rows: PayrollRow[]; totals: Record<string, { base: number; allowances: number; advances: number; people: number }> }> {
  const first = startOfMonth(month);
  const last = endOfMonth(month);

  const [people, offices] = await Promise.all([
    prisma.employee.findMany({
      where: { startDate: { lte: last }, OR: [{ endDate: null }, { endDate: { gte: first } }] },
      orderBy: [{ office: { name: "asc" } }, { lastName: "asc" }],
      include: {
        office: { select: { id: true, name: true, currency: true } },
        team: { select: { name: true } },
        salaryRecords: { where: { effectiveDate: { lte: last } }, orderBy: { effectiveDate: "desc" } },
        leaveRequests: { where: { type: "unpaid", status: "approved", startDate: { lte: last }, endDate: { gte: first } }, select: { startDate: true, endDate: true } },
        advances: { where: { date: { gte: first, lte: last } }, select: { amount: true, currency: true, note: true } },
        benefits: { where: { amount: { not: null }, startDate: { lte: last }, OR: [{ endDate: null }, { endDate: { gte: first } }] }, select: { type: true, amount: true, currency: true } },
      },
    }),
    prisma.office.findMany({ include: { holidays: { select: { date: true } } } }),
  ]);
  const cals = new Map(offices.map((o) => [o.id, makeCalendar(o.weekendDays, o.holidays.map((h) => h.date))]));

  const rows: PayrollRow[] = people.map((p) => {
    const current = p.salaryRecords[0] ?? null;
    const change = p.salaryRecords.find((r) => r.effectiveDate >= first && r.effectiveDate <= last) ?? null;
    const before = change ? p.salaryRecords.find((r) => r.effectiveDate < change.effectiveDate) ?? null : null;
    const cal = cals.get(p.officeId)!;
    const unpaid = p.leaveRequests.reduce((sum, l) => {
      const s = l.startDate > first ? l.startDate : first;
      const e = l.endDate < last ? l.endDate : last;
      return sum + countWorkingDays(s, e, cal);
    }, 0);
    const currency = current?.currency ?? p.office.currency;
    const advances = p.advances.filter((a) => a.currency === currency);
    const allowances = p.benefits.filter((b) => b.currency === currency && b.type !== "medical_insurance");
    return {
      employeeId: p.id,
      name: `${p.firstName} ${p.lastName}`,
      title: p.title,
      office: p.office.name,
      team: p.team.name,
      currency,
      status: p.status,
      startDate: p.startDate,
      endDate: p.endDate,
      joinedThisMonth: p.startDate >= first,
      leftThisMonth: Boolean(p.endDate && p.endDate <= last),
      baseSalary: current?.amount ?? null,
      salaryEffective: current?.effectiveDate ?? null,
      changeFrom: change ? (before?.amount ?? null) : null,
      changeTo: change?.amount ?? null,
      changeEffective: change?.effectiveDate ?? null,
      changeReason: change?.reason ?? null,
      unpaidLeaveDays: unpaid,
      advances: advances.reduce((s, a) => s + a.amount, 0),
      advanceNotes: advances.map((a) => a.note).filter(Boolean).join("; "),
      allowances: allowances.reduce((s, b) => s + (b.amount ?? 0), 0),
      allowanceNotes: allowances.map((b) => `${b.type.replace(/_/g, " ")} ${b.amount}`).join("; "),
    };
  });

  const totals: Record<string, { base: number; allowances: number; advances: number; people: number }> = {};
  for (const r of rows) {
    const t = (totals[r.currency] ??= { base: 0, allowances: 0, advances: 0, people: 0 });
    t.base += r.baseSalary ?? 0;
    t.allowances += r.allowances;
    t.advances += r.advances;
    t.people += 1;
  }
  return { rows, totals };
}

export const PAYROLL_COLUMNS = [
  "employeeId", "name", "title", "office", "team", "currency", "status", "startDate", "endDate", "joinedThisMonth", "leftThisMonth",
  "baseSalary", "salaryEffective", "changeFrom", "changeTo", "changeEffective", "changeReason",
  "unpaidLeaveDays", "allowances", "allowanceNotes", "advances", "advanceNotes",
] as const;

export function payrollFileName(month: Date): string {
  return `payroll-input-${isoDate(startOfMonth(month)).slice(0, 7)}.csv`;
}
