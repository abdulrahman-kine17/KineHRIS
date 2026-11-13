import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canViewReminders, visibleEmployeeIds } from "@/lib/permissions";
import { LEAVE_TYPES, label } from "@/lib/constants";
import { today, utcDate } from "@/lib/dates";
import { pendingForApprover } from "@/lib/leave-scope";
import { inputClass } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { LeaveHeader } from "@/components/leave/header";
import { LeaveTable } from "@/components/leave/bits";

/** Approved leave in a year for the people in scope. Linked from the dashboard. */
export default async function LeaveHistoryPage({ searchParams }: { searchParams: Promise<{ year?: string; type?: string }> }) {
  const user = await requireUser();
  if (!canViewReminders(user)) return <Forbidden what="leave history for other people" />;
  const sp = await searchParams;
  const year = /^\d{4}$/.test(sp.year ?? "") ? Number(sp.year) : today().getUTCFullYear();
  const type = (LEAVE_TYPES as readonly string[]).includes(sp.type ?? "") ? sp.type : "";
  const ids = visibleEmployeeIds(user);
  const [rows, pendingCount] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { status: "approved", ...(ids ? { employeeId: { in: ids } } : {}), ...(type ? { type } : {}), startDate: { gte: utcDate(year, 1, 1), lt: utcDate(year + 1, 1, 1) } },
      orderBy: { startDate: "desc" },
      include: { employee: { select: { id: true, firstName: true, lastName: true, title: true } }, approver: { select: { firstName: true, lastName: true } } },
    }),
    pendingForApprover(user),
  ]);
  const days = rows.reduce((s, r) => s + r.workingDays, 0);
  return (
    <>
      <LeaveHeader user={user} active="/leave/history" pendingCount={pendingCount} count={`${days} working days approved in ${year}${type ? ` · ${label(type)}` : ""}`} />
      <form method="get" action="/leave/history" className="mb-5 flex flex-wrap items-center gap-2">
        <label className="inline-block"><span className="sr-only">Year</span><input name="year" type="number" defaultValue={year} min={2020} max={2100} className={`${inputClass} w-28`} /></label>
        <label className="inline-block"><span className="sr-only">Type</span>
          <select name="type" defaultValue={type} className={`${inputClass} w-40`}><option value="">All types</option>{LEAVE_TYPES.map((x) => <option key={x} value={x}>{label(x)}</option>)}</select>
        </label>
        <button type="submit" className="h-10 rounded-full border border-line-strong bg-surface px-4 text-sm font-medium hover:bg-hover">Show</button>
      </form>
      <LeaveTable rows={rows} showPerson showReason={false} emptyTitle="No approved leave" emptyDescription="Nothing approved for this year and type." />
    </>
  );
}
