import { Check, X } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canViewReminders, visibleEmployeeIds } from "@/lib/permissions";
import { addDays, formatDate, today } from "@/lib/dates";
import { Button, Card, Dash, EmptyState, inputClass } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { LeaveHeader } from "@/components/leave/header";
import { LeaveTable, LeaveTypeBadge } from "@/components/leave/bits";
import { PersonCell } from "@/components/people/bits";
import { decideLeave } from "../actions";

export default async function ApprovalsPage() {
  const user = await requireUser();
  if (!canViewReminders(user)) return <Forbidden what="approving leave" />;
  const ids = visibleEmployeeIds(user);
  const scope = { employeeId: { not: user.id, ...(ids ? { in: ids } : {}) } };

  const [pending, recent] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { status: "pending", ...scope },
      orderBy: { startDate: "asc" },
      include: { employee: { select: { id: true, firstName: true, lastName: true, title: true, office: { select: { name: true } } } } },
    }),
    prisma.leaveRequest.findMany({
      where: { status: { in: ["approved", "rejected"] }, decidedAt: { gte: addDays(today(), -30) }, ...scope },
      orderBy: { decidedAt: "desc" },
      include: { employee: { select: { id: true, firstName: true, lastName: true, title: true } }, approver: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  return (
    <>
      <LeaveHeader user={user} active="/leave/approvals" pendingCount={pending.length} />

      {pending.length === 0 ? (
        <EmptyState title="Nothing waiting for you" description="New requests from your reports will appear here." />
      ) : (
        <div className="space-y-3">
          {pending.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <div className="min-w-0">
                    <PersonCell person={r.employee} subtitle={`${r.employee.title} · ${r.employee.office.name}`} />
                    <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <LeaveTypeBadge type={r.type} />
                      <span className="tabular-nums">
                        {formatDate(r.startDate)}
                        {r.endDate.getTime() !== r.startDate.getTime() ? ` – ${formatDate(r.endDate)}` : ""}
                      </span>
                      <span className="text-muted">
                        · {r.workingDays} working day{r.workingDays === 1 ? "" : "s"}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-muted">{r.reason || <Dash />}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={decideLeave} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <input name="note" placeholder="Note (optional)" className={`${inputClass} w-44`} aria-label="Note for rejection" />
                    <Button type="submit" variant="secondary">
                      <X className="h-4 w-4" aria-hidden />
                      Reject
                    </Button>
                  </form>
                  <form action={decideLeave}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <Button type="submit">
                      <Check className="h-4 w-4" aria-hidden />
                      Approve
                    </Button>
                  </form>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-8 text-sm font-semibold">Decided in the last 30 days</h2>
      <LeaveTable rows={recent} showPerson emptyTitle="No recent decisions" emptyDescription="Approved and rejected requests from the last 30 days show here." />
    </>
  );
}
