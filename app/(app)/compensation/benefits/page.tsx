import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canViewPayroll } from "@/lib/permissions";
import { BENEFIT_TYPES, label } from "@/lib/constants";
import { formatDate, isoDate, today } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { Button, Card, Dash, EmptyState, PageHeader, Table, Td, Th, Tr, inputClass } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { PersonCell } from "@/components/people/bits";
import { CompTabs } from "@/components/compensation/bits";
import { BenefitForm } from "@/components/compensation/forms";
import { endBenefit } from "../actions";

export default async function BenefitsPage({ searchParams }: { searchParams: Promise<{ type?: string; show?: string }> }) {
  const user = await requireUser();
  if (!canViewPayroll(user)) return <Forbidden what="the benefits register" />;
  const sp = await searchParams;
  const t = today();
  const type = (BENEFIT_TYPES as readonly string[]).includes(sp.type ?? "") ? sp.type : "";
  const showEnded = sp.show === "all";
  const [benefits, people] = await Promise.all([
    prisma.benefit.findMany({
      where: { ...(type ? { type } : {}), ...(showEnded ? {} : { OR: [{ endDate: null }, { endDate: { gte: t } }] }) },
      orderBy: [{ type: "asc" }, { employee: { lastName: "asc" } }],
      include: { employee: { select: { id: true, firstName: true, lastName: true, title: true, office: { select: { name: true } } } } },
    }),
    prisma.employee.findMany({ where: { status: { not: "left" } }, orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true, title: true } }),
  ]);
  const byType = BENEFIT_TYPES.map((k) => ({ k, n: benefits.filter((b) => b.type === k).length })).filter((x) => x.n);

  return (
    <>
      <PageHeader title="Compensation" count={`${benefits.length} benefit${benefits.length === 1 ? "" : "s"}${byType.length ? " · " + byType.map((x) => `${label(x.k)} ${x.n}`).join(" · ") : ""}`} actions={<CompTabs active="/compensation/benefits" />} />
      <form method="get" action="/compensation/benefits" className="mb-5 flex flex-wrap items-center gap-2">
        <label className="inline-block"><span className="sr-only">Type</span>
          <select name="type" defaultValue={type} className={`${inputClass} w-48`}><option value="">All types</option>{BENEFIT_TYPES.map((k) => <option key={k} value={k}>{label(k)}</option>)}</select>
        </label>
        <label className="inline-block"><span className="sr-only">Show</span>
          <select name="show" defaultValue={showEnded ? "all" : "active"} className={`${inputClass} w-40`}><option value="active">Active only</option><option value="all">Include ended</option></select>
        </label>
        <button type="submit" className="h-10 rounded-full border border-line-strong bg-surface px-4 text-sm font-medium hover:bg-hover">Show</button>
      </form>
      {benefits.length === 0 ? <EmptyState title="No benefits match" /> : (
        <Table>
          <thead><tr><Th>Person</Th><Th>Benefit</Th><Th>Monthly value</Th><Th>From</Th><Th>Until</Th><Th className="text-right">&nbsp;</Th></tr></thead>
          <tbody>
            {benefits.map((b) => (
              <Tr key={b.id} className={b.endDate && b.endDate < t ? "text-muted" : ""}>
                <Td className="max-w-[240px]"><PersonCell person={b.employee} subtitle={`${b.employee.title} · ${b.employee.office.name}`} size="sm" /></Td>
                <Td><span className="font-medium">{label(b.type)}</span>{b.description ? <span className="block text-xs text-muted">{b.description}</span> : null}</Td>
                <Td className="tabular-nums">{b.amount !== null ? formatMoney(b.amount, b.currency) : <Dash />}</Td>
                <Td className="whitespace-nowrap tabular-nums">{formatDate(b.startDate)}</Td>
                <Td className="whitespace-nowrap tabular-nums">{b.endDate ? formatDate(b.endDate) : <span className="text-muted">ongoing</span>}</Td>
                <Td className="text-right">
                  <form action={endBenefit}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="back" value="/compensation/benefits" /><Button type="submit" variant="ghost" size="sm">{b.endDate ? "Reopen" : "End today"}</Button></form>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      <Card title="Add a benefit" className="mt-6">
        <BenefitForm people={people.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName} — ${p.title}` }))} currency="EGP" defaultDate={isoDate(t)} back="/compensation/benefits" />
      </Card>
    </>
  );
}
