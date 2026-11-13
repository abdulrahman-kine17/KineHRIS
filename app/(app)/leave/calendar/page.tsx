import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { leaveCalendarWhere } from "@/lib/permissions";
import { pendingForApprover } from "@/lib/leave-scope";
import { addMonths, endOfMonth, formatMonth, isoDate, startOfMonth, today, utcDate } from "@/lib/dates";
import { parseWeekendDays } from "@/lib/workdays";
import { EmptyState, inputClass } from "@/components/ui";
import { LeaveHeader } from "@/components/leave/header";
import { PersonCell } from "@/components/people/bits";

function parseMonth(s: string | undefined): Date {
  const m = /^(\d{4})-(\d{2})$/.exec(s ?? "");
  return m ? utcDate(Number(m[1]), Number(m[2]), 1) : startOfMonth(today());
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string; office?: string; team?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const month = parseMonth(sp.month);
  const first = startOfMonth(month);
  const last = endOfMonth(month);
  const daysInMonth = last.getUTCDate();
  const t = today();

  const [people, offices, teams, pendingCount] = await Promise.all([
    prisma.employee.findMany({
      where: {
        status: { not: "left" },
        ...leaveCalendarWhere(user),
        ...(sp.office ? { officeId: sp.office } : {}),
        ...(sp.team ? { teamId: sp.team } : {}),
      },
      orderBy: [{ lastName: "asc" }],
      select: {
        id: true, firstName: true, lastName: true, title: true, officeId: true,
        leaveRequests: {
          where: { status: { in: ["approved", "pending"] }, startDate: { lte: last }, endDate: { gte: first } },
          select: { type: true, status: true, startDate: true, endDate: true },
        },
      },
    }),
    prisma.office.findMany({ orderBy: { name: "asc" }, include: { holidays: { where: { date: { gte: first, lte: last } }, select: { date: true, name: true } } } }),
    prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    pendingForApprover(user),
  ]);

  const officeInfo = new Map(
    offices.map((o) => [o.id, { weekend: parseWeekendDays(o.weekendDays), holidays: new Map(o.holidays.map((h) => [isoDate(h.date), h.name])) }]),
  );
  const days = Array.from({ length: daysInMonth }, (_, i) => utcDate(first.getUTCFullYear(), first.getUTCMonth() + 1, i + 1));
  const qs = (m: Date) => {
    const p = new URLSearchParams();
    p.set("month", isoDate(m).slice(0, 7));
    if (sp.office) p.set("office", sp.office);
    if (sp.team) p.set("team", sp.team);
    return `/leave/calendar?${p}`;
  };

  return (
    <>
      <LeaveHeader user={user} active="/leave/calendar" pendingCount={pendingCount} />

      <form method="get" action="/leave/calendar" className="mb-5 flex flex-wrap items-center gap-2">
        <input type="hidden" name="month" value={isoDate(first).slice(0, 7)} />
        <div className="flex items-center gap-1 rounded-full border border-line-strong bg-surface p-0.5">
          <Link href={qs(addMonths(first, -1))} className="rounded-full p-2 hover:bg-hover" aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="min-w-36 text-center text-sm font-medium">{formatMonth(first)}</span>
          <Link href={qs(addMonths(first, 1))} className="rounded-full p-2 hover:bg-hover" aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <label className="inline-block">
          <span className="sr-only">Office</span>
          <select name="office" defaultValue={sp.office ?? ""} className={`${inputClass} w-40`}>
          <option value="">All offices</option>
          {offices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
          </select>
        </label>
        <label className="inline-block">
          <span className="sr-only">Team</span>
          <select name="team" defaultValue={sp.team ?? ""} className={`${inputClass} w-40`}>
          <option value="">All teams</option>
          {teams.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
          </select>
        </label>
        <button type="submit" className="h-10 rounded-full border border-line-strong bg-surface px-4 text-sm font-medium hover:bg-hover">
          Show
        </button>
      </form>

      {people.length === 0 ? (
        <EmptyState title="Nobody to show" description="No people match these filters." />
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full border-collapse text-table">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-surface px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted">Person</th>
                {days.map((d) => {
                  const isToday = d.getTime() === t.getTime();
                  return (
                    <th key={d.getTime()} className={`w-6 px-0 py-2 text-center text-[11px] font-medium tabular-nums ${isToday ? "text-accent-ink" : "text-muted"}`} title={isoDate(d)}>
                      {d.getUTCDate()}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {people.map((p) => {
                const info = officeInfo.get(p.officeId);
                return (
                  <tr key={p.id} className="border-t border-line">
                    <td className="sticky left-0 z-10 max-w-[220px] bg-surface px-3 py-1.5">
                      <PersonCell person={p} subtitle={p.title} size="sm" />
                    </td>
                    {days.map((d) => {
                      const key = isoDate(d);
                      const holiday = info?.holidays.get(key);
                      const weekend = info?.weekend.has(d.getUTCDay());
                      const leave = p.leaveRequests.find((r) => r.startDate.getTime() <= d.getTime() && r.endDate.getTime() >= d.getTime());
                      let cls = "";
                      let title = key;
                      if (leave) {
                        const code = leave.type[0].toUpperCase();
                        cls = leave.status === "approved" ? "bg-accent text-white" : "bg-accent-soft text-accent-ink ring-1 ring-inset ring-accent/40";
                        title = `${leave.type} leave (${leave.status})`;
                        return (
                          <td key={key} className="p-0.5 text-center">
                            <span className={`block rounded py-1 text-[10px] font-semibold leading-none ${cls}`} title={title}>
                              {code}
                            </span>
                          </td>
                        );
                      }
                      if (holiday) cls = "bg-warning-soft";
                      else if (weekend) cls = "bg-neutral-soft";
                      return <td key={key} className="p-0.5"><span className={`block h-5 rounded ${cls}`} title={holiday ?? (weekend ? "Weekend" : key)} /></td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
        <span><span className="mr-1 inline-block h-3 w-3 rounded bg-accent align-middle" /> Approved (A annual, R remote, U unpaid)</span>
        <span><span className="mr-1 inline-block h-3 w-3 rounded bg-accent-soft align-middle ring-1 ring-inset ring-accent/40" /> Pending</span>
        <span><span className="mr-1 inline-block h-3 w-3 rounded bg-warning-soft align-middle" /> Public holiday (per office)</span>
        <span><span className="mr-1 inline-block h-3 w-3 rounded bg-neutral-soft align-middle" /> Weekend</span>
        <span>Calendar sync would go here.</span>
      </p>
    </>
  );
}
