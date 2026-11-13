import { Badge, Button, Card, Dash, EmptyState, Table, Td, Th, Tr } from "@/components/ui";
import { label } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { LEAVE_TONE, LEAVE_TYPE_TONE, type Balance } from "@/lib/leave-rules";
import { PersonCell } from "@/components/people/bits";
import { cancelLeave } from "@/app/(app)/leave/actions";

export function LeaveStatusBadge({ status }: { status: string }) {
  return <Badge tone={LEAVE_TONE[status] ?? "neutral"}>{label(status)}</Badge>;
}

export function LeaveTypeBadge({ type }: { type: string }) {
  return <Badge tone={LEAVE_TYPE_TONE[type] ?? "neutral"}>{label(type)}</Badge>;
}

export function BalanceCards({ balances, year }: { balances: Balance[]; year: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {balances.map((b) => (
        <Card key={b.type}>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            {label(b.type)} · {year}
          </p>
          {b.allowance === null ? (
            <>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{b.used}</p>
              <p className="mt-1 text-sm text-muted">days taken{b.pending ? ` · ${b.pending} pending` : ""}</p>
            </>
          ) : (
            <>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {b.remaining}
                <span className="text-base font-normal text-muted"> / {b.allowance}</span>
              </p>
              <p className="mt-1 text-sm text-muted">
                days left · {b.used} used{b.pending ? ` · ${b.pending} pending` : ""}
              </p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-soft">
                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (b.used / b.allowance) * 100)}%` }} />
              </div>
            </>
          )}
        </Card>
      ))}
    </div>
  );
}

export type LeaveRow = {
  id: string;
  type: string;
  startDate: Date;
  endDate: Date;
  workingDays: number;
  reason: string | null;
  status: string;
  decisionNote: string | null;
  employee?: { id: string; firstName: string; lastName: string; title?: string };
  approver?: { firstName: string; lastName: string } | null;
};

export function LeaveTable({
  rows,
  showPerson = false,
  showReason = true,
  canCancel = false,
  back = "/leave",
  emptyTitle = "No leave requests",
  emptyDescription = "Requests will show up here.",
}: {
  rows: LeaveRow[];
  showPerson?: boolean;
  showReason?: boolean;
  canCancel?: boolean;
  back?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return (
    <Table>
      <thead>
        <tr>
          {showPerson ? <Th>Person</Th> : null}
          <Th>Type</Th>
          <Th>Dates</Th>
          <Th>Days</Th>
          {showReason ? <Th>Reason</Th> : null}
          <Th>Status</Th>
          <Th>Decided by</Th>
          {canCancel ? <Th className="text-right">&nbsp;</Th> : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <Tr key={r.id}>
            {showPerson && r.employee ? (
              <Td className="max-w-[240px]">
                <PersonCell person={r.employee} subtitle={r.employee.title} size="sm" />
              </Td>
            ) : null}
            <Td>
              <LeaveTypeBadge type={r.type} />
            </Td>
            <Td className="whitespace-nowrap tabular-nums">
              {formatDate(r.startDate)}
              {r.endDate.getTime() !== r.startDate.getTime() ? ` – ${formatDate(r.endDate)}` : ""}
            </Td>
            <Td className="tabular-nums">{r.workingDays}</Td>
            {showReason ? (
              <Td className="max-w-[240px]">
                <span className="block truncate text-muted" title={r.reason ?? ""}>
                  {r.reason || <Dash />}
                </span>
              </Td>
            ) : null}
            <Td>
              <LeaveStatusBadge status={r.status} />
              {r.decisionNote ? (
                <span className="ml-2 text-xs text-muted" title={r.decisionNote}>
                  note
                </span>
              ) : null}
            </Td>
            <Td className="text-muted">{r.approver ? `${r.approver.firstName} ${r.approver.lastName}` : <Dash />}</Td>
            {canCancel ? (
              <Td className="text-right">
                {r.status === "pending" ? (
                  <form action={cancelLeave}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="back" value={back} />
                    <Button type="submit" variant="ghost" size="sm">
                      Cancel
                    </Button>
                  </form>
                ) : null}
              </Td>
            ) : null}
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
