// Dashboard metrics. Every number carries the href of the list it comes from.
// Scope: admin sees the company; a manager sees their reports (recruiting is company-wide).

import { prisma } from "./db";
import type { CurrentUser } from "./auth";
import { visibleEmployeeIds } from "./permissions";
import { addDays, addMonths, quarterOf, startOfMonth, today, utcDate } from "./dates";
import { completeness } from "./people";
import { decisionGate, isOutcomeOverdue } from "./hiring";
import { makeCalendar } from "./workdays";
import { reviewSummary } from "./performance";

export type Stat = { label: string; value: string; hint?: string; href: string };
export type Bar = { label: string; value: number; href: string };

export async function buildDashboard(user: CurrentUser) {
  const t = today();
  const year = t.getUTCFullYear();
  const yearStart = utcDate(year, 1, 1);
  const q = quarterOf(t);
  const ids = visibleEmployeeIds(user);
  const scope = ids ? { id: { in: ids } } : {};
  const empScope = ids ? { employeeId: { in: ids } } : {};

  const [people, offices, teams, leaveYtd, pendingLeave, contracts, roles, candidates, cals, openCycle, goals, checklistItems] = await Promise.all([
    prisma.employee.findMany({
      where: scope,
      select: {
        id: true, firstName: true, lastName: true, workEmail: true, personalEmail: true, phone: true, address: true, emergencyContactName: true, emergencyContactPhone: true, title: true,
        teamId: true, managerId: true, officeId: true, startDate: true, endDate: true, probationEndDate: true, employmentType: true, status: true, _count: { select: { reports: true } },
      },
    }),
    prisma.office.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.leaveRequest.findMany({ where: { ...empScope, status: "approved", startDate: { gte: yearStart } }, select: { type: true, workingDays: true } }),
    prisma.leaveRequest.count({ where: { status: "pending", employeeId: { not: user.id, ...(ids ? { in: ids } : {}) } } }),
    prisma.contract.findMany({ where: { ...empScope, employee: { status: { not: "left" } } }, select: { status: true } }),
    prisma.role.findMany({ select: { status: true } }),
    prisma.candidate.findMany({
      select: {
        stage: true, appliedAt: true, decidedAt: true, decision: true, outcomeSentAt: true,
        role: { select: { officeId: true } },
        interviews: { select: { id: true, interviewer: { select: { firstName: true, lastName: true } }, scorecard: { select: { submittedAt: true } } } },
      },
    }),
    prisma.office.findMany({ include: { holidays: { select: { date: true } } } }).then((os) => new Map(os.map((o) => [o.id, makeCalendar(o.weekendDays, o.holidays.map((h) => h.date))]))),
    prisma.reviewCycle.findFirst({ where: { status: "open" }, orderBy: [{ year: "desc" }, { half: "desc" }], include: { reviews: { where: empScope, select: { kind: true, status: true, reviewerId: true, employeeId: true } } } }),
    prisma.goal.findMany({ where: { ...empScope, year: q.year, quarter: q.quarter, status: { not: "dropped" } }, select: { employeeId: true } }),
    prisma.checklistItem.findMany({ where: { doneAt: null, dueDate: { lt: t }, checklist: empScope }, select: { id: true } }),
  ]);

  const current = people.filter((p) => p.status !== "left");
  const joinersYtd = people.filter((p) => p.startDate >= yearStart && p.startDate <= t);
  const leaversYtd = people.filter((p) => p.status === "left" && p.endDate && p.endDate >= yearStart && p.endDate <= t);
  const headcountAtYearStart = people.filter((p) => p.startDate < yearStart && (!p.endDate || p.endDate >= yearStart)).length;
  const avgHeadcount = (headcountAtYearStart + current.length) / 2;
  const turnover = avgHeadcount ? Math.round((leaversYtd.length / avgHeadcount) * 100) : 0;

  const byTeam: Bar[] = teams.map((x) => ({ label: x.name, value: current.filter((p) => p.teamId === x.id).length, href: `/people?team=${x.id}` })).filter((b) => b.value);
  const byOffice: Bar[] = offices.map((x) => ({ label: x.name, value: current.filter((p) => p.officeId === x.id).length, href: `/people?office=${x.id}` }));

  // Last 12 months of joiners and leavers.
  const months = Array.from({ length: 12 }, (_, i) => startOfMonth(addMonths(t, i - 11)));
  const monthly = months.map((m) => {
    const next = addMonths(m, 1);
    const key = m.toISOString().slice(0, 7);
    return {
      key,
      label: m.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }),
      joiners: people.filter((p) => p.startDate >= m && p.startDate < next).length,
      leavers: people.filter((p) => p.status === "left" && p.endDate && p.endDate >= m && p.endDate < next).length,
      joinHref: `/people?status=all&joined=${key}`,
      leaveHref: `/people?status=left&left=${key}`,
    };
  });

  const leaveByType = ["annual", "remote", "unpaid"].map((type) => ({ type, days: leaveYtd.filter((l) => l.type === type).reduce((s, l) => s + l.workingDays, 0) }));
  const leaveTotal = leaveByType.reduce((s, x) => s + x.days, 0);

  const notFiled = contracts.filter((c) => c.status !== "filed").length;
  const openRoles = roles.filter((r) => r.status === "open").length;
  const activeCandidates = candidates.filter((c) => c.stage !== "hired" && c.stage !== "rejected").length;
  const hires12m = candidates.filter((c) => c.decision === "hire" && c.decidedAt && c.decidedAt >= addDays(t, -365));
  const tth = hires12m.length ? Math.round(hires12m.reduce((s, c) => s + (c.decidedAt!.getTime() - c.appliedAt.getTime()) / 86_400_000, 0) / hires12m.length) : null;
  const outcomesOverdue = candidates.filter((c) => isOutcomeOverdue(c, t, cals.get(c.role.officeId)!)).length;
  const waitingScorecards = candidates.filter((c) => !c.decision && c.interviews.length && !decisionGate(c.interviews.map((i) => ({ id: i.id, scorecardSubmitted: Boolean(i.scorecard?.submittedAt) }))).allowed).length;

  const goalsByPerson = new Map<string, number>();
  for (const g of goals) goalsByPerson.set(g.employeeId, (goalsByPerson.get(g.employeeId) ?? 0) + 1);
  const goalCovered = current.filter((p) => (goalsByPerson.get(p.id) ?? 0) >= 3).length;

  let reviewCovered = 0;
  let reviewTotal = 0;
  if (openCycle) {
    const byPerson = new Map<string, typeof openCycle.reviews>();
    for (const r of openCycle.reviews) byPerson.set(r.employeeId, [...(byPerson.get(r.employeeId) ?? []), r]);
    reviewTotal = byPerson.size;
    reviewCovered = [...byPerson.values()].filter((rs) => reviewSummary(rs).complete).length;
  }

  const incompleteProfiles = current.filter((p) => !completeness({ ...p, isOrgRoot: !p.managerId && p._count.reports > 0 }).complete).length;
  const probationSoon = current.filter((p) => p.status === "probation" && p.probationEndDate && p.probationEndDate >= t && p.probationEndDate <= addDays(t, 30)).length;

  const stats: Stat[] = [
    { label: "Headcount", value: String(current.length), hint: `${current.filter((p) => p.status === "probation").length} on probation`, href: "/people" },
    { label: "Joiners this year", value: String(joinersYtd.length), hint: `since 1 Jan ${year}`, href: `/people?status=all&joined=${year}` },
    { label: "Leavers this year", value: String(leaversYtd.length), hint: `since 1 Jan ${year}`, href: `/people?status=left&left=${year}` },
    { label: "Turnover", value: `${turnover}%`, hint: "leavers ÷ average headcount", href: `/people?status=left&left=${year}` },
    { label: "Leave taken", value: `${leaveTotal}`, hint: `working days in ${year}`, href: `/leave/history?year=${year}` },
    { label: "Open roles", value: String(openRoles), hint: `${activeCandidates} active candidates`, href: "/recruitment?status=open" },
    { label: "Time to hire", value: tth === null ? "—" : `${tth}d`, hint: `${hires12m.length} hire${hires12m.length === 1 ? "" : "s"} in 12 months`, href: "/recruitment/outcomes" },
    { label: "Contracts not filed", value: String(notFiled), hint: "waiting on a signature or filing", href: "/contracts?status=not_filed" },
  ];

  const attention: Stat[] = [
    { label: "Leave requests waiting for you", value: String(pendingLeave), href: "/leave/approvals" },
    { label: "Candidates past the 5-day outcome limit", value: String(outcomesOverdue), href: "/recruitment/outcomes" },
    { label: "Candidates waiting on scorecards", value: String(waitingScorecards), href: "/recruitment/pipeline" },
    { label: "Probation periods ending in 30 days", value: String(probationSoon), href: "/reminders?kind=probation" },
    { label: "Overdue checklist steps", value: String(checklistItems.length), href: "/checklists" },
    { label: "Profiles with missing details", value: String(incompleteProfiles), href: "/people" },
  ];

  return {
    stats,
    byTeam,
    byOffice,
    monthly,
    leaveByType: leaveByType.map((x) => ({ ...x, href: `/leave/history?year=${year}&type=${x.type}` })),
    goals: { covered: goalCovered, total: current.length, href: "/performance" },
    reviews: { covered: reviewCovered, total: reviewTotal, name: openCycle?.name ?? null, href: openCycle ? `/performance/reviews/cycle/${openCycle.id}` : "/performance/reviews" },
    attention,
    year,
    scoped: Boolean(ids),
  };
}
