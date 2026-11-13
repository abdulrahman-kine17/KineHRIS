// Leave data helpers that touch the database.

import { prisma } from "./db";
import { LEAVE_TYPES } from "./constants";
import { utcDate } from "./dates";
import { makeCalendar, type WorkCalendar } from "./workdays";
import { summarizeBalance, type Balance } from "./leave-rules";

export async function officeCalendar(officeId: string): Promise<WorkCalendar & { weekendDays: Set<number>; holidayList: { date: Date; name: string }[]; weekendRaw: string }> {
  const office = await prisma.office.findUniqueOrThrow({
    where: { id: officeId },
    include: { holidays: { select: { date: true, name: true }, orderBy: { date: "asc" } } },
  });
  const cal = makeCalendar(office.weekendDays, office.holidays.map((h) => h.date));
  return { ...cal, holidayList: office.holidays, weekendRaw: office.weekendDays };
}

export async function getBalances(employeeId: string, year: number): Promise<Balance[]> {
  const [emp, balances, requests] = await Promise.all([
    prisma.employee.findUniqueOrThrow({ where: { id: employeeId }, select: { office: { select: { annualLeaveDays: true, remoteDays: true } } } }),
    prisma.leaveBalance.findMany({ where: { employeeId, year } }),
    prisma.leaveRequest.findMany({
      where: { employeeId, status: { in: ["approved", "pending"] }, startDate: { gte: utcDate(year, 1, 1), lt: utcDate(year + 1, 1, 1) } },
      select: { type: true, status: true, workingDays: true, startDate: true, endDate: true },
    }),
  ]);
  const defaults: Record<string, number | null> = { annual: emp.office.annualLeaveDays, remote: emp.office.remoteDays, unpaid: null };
  return LEAVE_TYPES.map((type) => {
    const allowance = type === "unpaid" ? null : (balances.find((b) => b.type === type)?.allowanceDays ?? defaults[type]);
    return summarizeBalance(type, allowance, requests);
  });
}
