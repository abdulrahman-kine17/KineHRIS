import Link from "next/link";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { canViewPayroll } from "@/lib/permissions";
import { label } from "@/lib/constants";
import { addMonths, formatDate, formatMonth, isoDate, startOfMonth, today, utcDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { buildPayrollSheet } from "@/lib/payroll";
import { Badge, Card, Dash, EmptyState, LinkButton, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { CompTabs } from "@/components/compensation/bits";

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireUser();
  if (!canViewPayroll(user)) return <Forbidden what="the payroll sheet" />;
  const { month: m } = await searchParams;
  const mm = /^(\d{4})-(\d{2})$/.exec(m ?? "");
  const month = mm ? utcDate(Number(mm[1]), Number(mm[2]), 1) : startOfMonth(today());
  const key = isoDate(month).slice(0, 7);
  const { rows, totals } = await buildPayrollSheet(month);
  const changes = rows.filter((r) => r.changeTo !== null).length;
  const unpaid = rows.filter((r) => r.unpaidLeaveDays > 0).length;
  const advances = rows.filter((r) => r.advances > 0).length;

  return (
    <>
      <PageHeader
        title="Compensation"
        count={`${rows.length} people on the ${formatMonth(month)} sheet`}
        actions={
          <>
            <CompTabs active="/compensation/payroll" />
            <LinkButton href={`/api/payroll?month=${key}`} variant="primary" prefetch={false}><Download className="h-4 w-4" aria-hidden />Download CSV</LinkButton>
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-surface p-0.5">
          <Link href={`/compensation/payroll?month=${isoDate(addMonths(month, -1)).slice(0, 7)}`} className="rounded-full p-2 hover:bg-hover" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Link>
          <span className="min-w-36 text-center text-sm font-medium">{formatMonth(month)}</span>
          <Link href={`/compensation/payroll?month=${isoDate(addMonths(month, 1)).slice(0, 7)}`} className="rounded-full p-2 hover:bg-hover" aria-label="Next month"><ChevronRight className="h-4 w-4" /></Link>
        </div>
        <span className="text-sm text-muted">{changes} salary change{changes === 1 ? "" : "s"} · {unpaid} with unpaid leave · {advances} with advances. No calculation: this is the input for whoever runs payroll.</span>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {Object.entries(totals).map(([cur, t]) => (
          <Card key={cur}>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">{cur} · {t.people} people</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{formatMoney(t.base, cur)}</p>
            <p className="mt-1 text-sm text-muted">base salaries · allowances {formatMoney(t.allowances, cur)} · advances {formatMoney(t.advances, cur)}</p>
          </Card>
        ))}
      </div>

      {rows.length === 0 ? <EmptyState title="Nobody employed this month" /> : (
        <Table>
          <thead><tr><Th>Person</Th><Th>Office</Th><Th>Base salary</Th><Th>Change this month</Th><Th>Unpaid days</Th><Th>Allowances</Th><Th>Advances</Th><Th>Notes</Th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.employeeId}>
                <Td className="max-w-[220px]"><Link href={`/people/${r.employeeId}/compensation`} className="block truncate font-medium hover:underline" title={r.name}>{r.name}</Link><span className="block truncate text-xs text-muted">{r.title}</span></Td>
                <Td>{r.office}</Td>
                <Td className="font-medium tabular-nums">{r.baseSalary !== null ? formatMoney(r.baseSalary, r.currency) : <Dash />}</Td>
                <Td className="tabular-nums">{r.changeTo !== null ? <span>{r.changeFrom !== null ? `${formatMoney(r.changeFrom, r.currency)} → ` : ""}{formatMoney(r.changeTo, r.currency)}<span className="block text-xs text-muted">{formatDate(r.changeEffective)} · {label(r.changeReason)}</span></span> : <Dash />}</Td>
                <Td className="tabular-nums">{r.unpaidLeaveDays ? <Badge tone="warning">{r.unpaidLeaveDays}</Badge> : <Dash />}</Td>
                <Td className="tabular-nums">{r.allowances ? formatMoney(r.allowances, r.currency) : <Dash />}</Td>
                <Td className="tabular-nums">{r.advances ? <span>{formatMoney(r.advances, r.currency)}{r.advanceNotes ? <span className="block text-xs text-muted">{r.advanceNotes}</span> : null}</span> : <Dash />}</Td>
                <Td><span className="flex flex-wrap gap-1">{r.joinedThisMonth ? <Badge tone="accent">joined {formatDate(r.startDate)}</Badge> : null}{r.leftThisMonth ? <Badge tone="danger">last day {formatDate(r.endDate)}</Badge> : null}{r.status === "notice" && !r.leftThisMonth ? <Badge tone="warning">on notice</Badge> : null}</span></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      <p className="mt-3 text-xs text-muted">Payroll provider integration would go here. Pro-rating for joiners and leavers is left to payroll.</p>
    </>
  );
}
