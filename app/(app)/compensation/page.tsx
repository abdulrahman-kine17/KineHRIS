import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canViewPayroll } from "@/lib/permissions";
import { parsePeopleFilters, peopleWhere } from "@/lib/people";
import { label } from "@/lib/constants";
import { formatDate, today } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { Dash, EmptyState, PageHeader, Table, Td, Th, Tr, inputClass } from "@/components/ui";
import { FilterBar } from "@/components/filter-bar";
import { PersonCell, StatusBadge } from "@/components/people/bits";
import { CompTabs } from "@/components/compensation/bits";
import { CompensationView } from "@/components/compensation/view";

export default async function CompensationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const t = today();

  if (!canViewPayroll(user)) {
    return (
      <>
        <PageHeader title="Your compensation" description="Only HR, the founder and you can see this." />
        <CompensationView user={user} employeeId={user.id} />
      </>
    );
  }

  const f = parsePeopleFilters(await searchParams);
  const [people, offices, teams] = await Promise.all([
    prisma.employee.findMany({
      where: peopleWhere(f),
      orderBy: [{ office: { name: "asc" } }, { lastName: "asc" }],
      include: {
        office: { select: { name: true, currency: true } },
        team: { select: { name: true } },
        salaryRecords: { where: { effectiveDate: { lte: t } }, orderBy: { effectiveDate: "desc" }, take: 2 },
        benefits: { where: { OR: [{ endDate: null }, { endDate: { gte: t } }] }, select: { amount: true, currency: true, type: true } },
      },
    }),
    prisma.office.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const totals = new Map<string, number>();
  for (const p of people) {
    const cur = p.salaryRecords[0];
    if (cur) totals.set(cur.currency, (totals.get(cur.currency) ?? 0) + cur.amount);
  }

  return (
    <>
      <PageHeader
        title="Compensation"
        count={[...totals].map(([c, v]) => `${formatMoney(v, c)}/month`).join(" · ") || `${people.length} people`}
        actions={<CompTabs active="/compensation" />}
      />
      <FilterBar basePath="/compensation" q={f.q} office={f.office} team={f.team} offices={offices} teams={teams} extra={
        <label><span className="sr-only">Show</span>
          <select name="status" defaultValue={f.status} className={`${inputClass} w-36`}><option value="current">Current</option><option value="left">Left</option><option value="all">Everyone</option></select>
        </label>
      } />
      {people.length === 0 ? <EmptyState title="No people match" /> : (
        <Table>
          <thead><tr><Th>Person</Th><Th>Office</Th><Th>Status</Th><Th>Current salary</Th><Th>Since</Th><Th>Last change</Th><Th>Allowances</Th><Th className="text-right">&nbsp;</Th></tr></thead>
          <tbody>
            {people.map((p) => {
              const cur = p.salaryRecords[0];
              const prev = p.salaryRecords[1];
              const allow = p.benefits.filter((b) => b.amount && b.type !== "medical_insurance").reduce((s, b) => s + (b.amount ?? 0), 0);
              return (
                <Tr key={p.id} className={p.status === "left" ? "text-muted" : ""}>
                  <Td className="max-w-[240px]"><PersonCell person={p} subtitle={p.title} size="sm" /></Td>
                  <Td>{p.office.name}</Td>
                  <Td><StatusBadge status={p.status} /></Td>
                  <Td className="font-medium tabular-nums">{cur ? formatMoney(cur.amount, cur.currency) : <Dash />}</Td>
                  <Td className="whitespace-nowrap tabular-nums">{cur ? formatDate(cur.effectiveDate) : <Dash />}</Td>
                  <Td className="text-muted">{cur && prev ? `${label(cur.reason)} · ${cur.amount >= prev.amount ? "+" : ""}${Math.round(((cur.amount - prev.amount) / prev.amount) * 100)}%` : cur ? label(cur.reason) : <Dash />}</Td>
                  <Td className="tabular-nums">{allow ? formatMoney(allow, cur?.currency ?? p.office.currency) : <Dash />}</Td>
                  <Td className="text-right"><Link href={`/people/${p.id}/compensation`} className="text-sm font-medium text-accent-ink hover:underline">Open</Link></Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
