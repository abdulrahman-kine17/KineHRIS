import { Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";
import { canEditBenefits, canEditSalary } from "@/lib/permissions";
import { label } from "@/lib/constants";
import { formatDate, isoDate, today } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { Badge, Button, Card, Dash, EmptyState, Table, Td, Th, Tr } from "@/components/ui";
import { AdvanceForm, BenefitForm, SalaryForm } from "./forms";
import { deleteSalaryRecord, endBenefit } from "@/app/(app)/compensation/actions";

/** Salary history, benefits and advances for one person. Caller checks canViewSalary. */
export async function CompensationView({ user, employeeId }: { user: CurrentUser; employeeId: string }) {
  const t = today();
  const p = await prisma.employee.findUniqueOrThrow({
    where: { id: employeeId },
    select: {
      office: { select: { currency: true } },
      salaryRecords: { orderBy: { effectiveDate: "desc" }, include: { createdBy: { select: { firstName: true, lastName: true } } } },
      benefits: { orderBy: [{ endDate: "asc" }, { startDate: "desc" }] },
      advances: { orderBy: { date: "desc" } },
    },
  });
  const current = p.salaryRecords.find((r) => r.effectiveDate <= t) ?? null;
  const upcoming = p.salaryRecords.filter((r) => r.effectiveDate > t);
  const editSalary = canEditSalary(user);
  const editBenefits = canEditBenefits(user);
  const back = `/people/${employeeId}/compensation`;
  const currency = current?.currency ?? p.office.currency;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Current salary</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{current ? formatMoney(current.amount, current.currency) : <Dash />}</p>
          <p className="mt-1 text-sm text-muted">{current ? `monthly gross · since ${formatDate(current.effectiveDate)}` : "no salary record"}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Next change</p>
          {upcoming.length ? (
            <>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{formatMoney(upcoming[upcoming.length - 1].amount, upcoming[upcoming.length - 1].currency)}</p>
              <p className="mt-1 text-sm text-muted">from {formatDate(upcoming[upcoming.length - 1].effectiveDate)} · {label(upcoming[upcoming.length - 1].reason)}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">None scheduled.</p>
          )}
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Benefits</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{p.benefits.filter((b) => !b.endDate || b.endDate >= t).length}</p>
          <p className="mt-1 text-sm text-muted">active · {p.benefits.filter((b) => b.endDate && b.endDate < t).length} ended</p>
        </Card>
      </div>

      <Card title="Salary history">
        {p.salaryRecords.length === 0 ? <p className="text-sm text-muted">No records yet.</p> : (
          <Table>
            <thead><tr><Th>Effective</Th><Th>Amount</Th><Th>Change</Th><Th>Reason</Th><Th>Recorded by</Th>{editSalary ? <Th className="text-right">&nbsp;</Th> : null}</tr></thead>
            <tbody>
              {p.salaryRecords.map((r, i) => {
                const prev = p.salaryRecords[i + 1];
                const diff = prev && prev.currency === r.currency ? r.amount - prev.amount : null;
                return (
                  <Tr key={r.id}>
                    <Td className="whitespace-nowrap tabular-nums">{formatDate(r.effectiveDate)}{r.id === current?.id ? <Badge tone="success" className="ml-2">current</Badge> : r.effectiveDate > t ? <Badge tone="accent" className="ml-2">upcoming</Badge> : null}</Td>
                    <Td className="font-medium tabular-nums">{formatMoney(r.amount, r.currency)}</Td>
                    <Td className="tabular-nums">{diff === null ? <Dash /> : <span className={diff >= 0 ? "text-success-ink" : "text-danger-ink"}>{diff >= 0 ? "+" : ""}{formatMoney(diff, r.currency)} ({prev && prev.amount ? `${diff >= 0 ? "+" : ""}${Math.round((diff / prev.amount) * 100)}%` : ""})</span>}</Td>
                    <Td>{r.reason ? label(r.reason) : <Dash />}</Td>
                    <Td className="text-muted">{r.createdBy ? `${r.createdBy.firstName} ${r.createdBy.lastName}` : <Dash />}</Td>
                    {editSalary ? (
                      <Td className="text-right">
                        <form action={deleteSalaryRecord}>
                          <input type="hidden" name="id" value={r.id} />
                          <button type="submit" className="rounded-full p-2 text-muted hover:bg-danger-soft hover:text-danger-ink" aria-label={`Delete record effective ${formatDate(r.effectiveDate)}`}><Trash2 className="h-4 w-4" /></button>
                        </form>
                      </Td>
                    ) : null}
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {editSalary ? <div className="mt-4 border-t border-line pt-4"><SalaryForm employeeId={employeeId} currency={currency} defaultDate={isoDate(t)} /></div> : null}
      </Card>

      <Card title="Benefits">
        {p.benefits.length === 0 ? <p className="text-sm text-muted">No benefits recorded.</p> : (
          <Table>
            <thead><tr><Th>Benefit</Th><Th>Monthly value</Th><Th>From</Th><Th>Until</Th>{editBenefits ? <Th className="text-right">&nbsp;</Th> : null}</tr></thead>
            <tbody>
              {p.benefits.map((b) => {
                const ended = Boolean(b.endDate && b.endDate < t);
                return (
                  <Tr key={b.id} className={ended ? "text-muted" : ""}>
                    <Td><span className="font-medium">{label(b.type)}</span>{b.description ? <span className="block text-xs text-muted">{b.description}</span> : null}</Td>
                    <Td className="tabular-nums">{b.amount !== null ? formatMoney(b.amount, b.currency) : <Dash />}</Td>
                    <Td className="whitespace-nowrap tabular-nums">{formatDate(b.startDate)}</Td>
                    <Td className="whitespace-nowrap tabular-nums">{b.endDate ? formatDate(b.endDate) : <span className="text-muted">ongoing</span>}</Td>
                    {editBenefits ? (
                      <Td className="text-right">
                        <form action={endBenefit}>
                          <input type="hidden" name="id" value={b.id} />
                          <input type="hidden" name="back" value={back} />
                          <Button type="submit" variant="ghost" size="sm">{b.endDate ? "Reopen" : "End today"}</Button>
                        </form>
                      </Td>
                    ) : null}
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {editBenefits ? <div className="mt-4 border-t border-line pt-4"><BenefitForm employeeId={employeeId} currency={currency} defaultDate={isoDate(t)} /></div> : null}
      </Card>

      <Card title="Advances">
        {p.advances.length === 0 ? <p className="text-sm text-muted">No advances.</p> : (
          <Table>
            <thead><tr><Th>Paid on</Th><Th>Amount</Th><Th>Note</Th></tr></thead>
            <tbody>
              {p.advances.map((a) => (
                <Tr key={a.id}><Td className="whitespace-nowrap tabular-nums">{formatDate(a.date)}</Td><Td className="font-medium tabular-nums">{formatMoney(a.amount, a.currency)}</Td><Td className="text-muted">{a.note || <Dash />}</Td></Tr>
              ))}
            </tbody>
          </Table>
        )}
        {editSalary ? <div className="mt-4 border-t border-line pt-4"><AdvanceForm employeeId={employeeId} currency={currency} defaultDate={isoDate(t)} /></div> : null}
        {!editSalary && p.advances.length === 0 ? null : <p className="mt-3 text-xs text-muted">Advances appear on the payroll sheet for the month they were paid. Repayment is handled by payroll, not here.</p>}
      </Card>
      {p.salaryRecords.length === 0 && p.benefits.length === 0 && !editSalary ? <EmptyState title="Nothing recorded yet" /> : null}
    </div>
  );
}
