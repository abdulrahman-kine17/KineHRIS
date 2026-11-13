import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { visibleEmployeeIds } from "@/lib/permissions";
import { parsePeopleFilters } from "@/lib/people";
import { goalCoverage, parseQuarter, quarterKey } from "@/lib/performance";
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { FilterBar } from "@/components/filter-bar";
import { PersonCell } from "@/components/people/bits";
import { GoalStatusBadge, PerformanceTabs, QuarterNav } from "@/components/performance/bits";

export default async function GoalsOverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = parseQuarter(typeof sp.q === "string" ? sp.q : undefined);
  const f = parsePeopleFilters(sp);
  const ids = visibleEmployeeIds(user);

  const [people, offices, teams] = await Promise.all([
    prisma.employee.findMany({
      where: {
        status: { not: "left" },
        ...(ids ? { id: { in: ids } } : {}),
        ...(f.office ? { officeId: f.office } : {}),
        ...(f.team ? { teamId: f.team } : {}),
        ...(f.q ? { OR: [{ firstName: { contains: f.q } }, { lastName: { contains: f.q } }] } : {}),
      },
      orderBy: { lastName: "asc" },
      select: { id: true, firstName: true, lastName: true, title: true, goals: { where: { year: q.year, quarter: q.quarter }, orderBy: { createdAt: "asc" }, select: { id: true, title: true, status: true } } },
    }),
    prisma.office.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const hrefFor = (qq: { year: number; quarter: number }) => {
    const p = new URLSearchParams();
    p.set("q", quarterKey(qq));
    if (f.q) p.set("q_text", f.q);
    if (f.office) p.set("office", f.office);
    if (f.team) p.set("team", f.team);
    return `/performance?${p}`;
  };
  const withGoals = people.filter((p) => p.goals.filter((g) => g.status !== "dropped").length >= 3).length;
  const none = people.filter((p) => p.goals.length === 0).length;
  const onlyMe = people.length === 1 && people[0].id === user.id;

  return (
    <>
      <PageHeader title="Performance" count={`${withGoals} of ${people.length} with 3+ goals${none ? ` · ${none} with none` : ""}`} actions={<PerformanceTabs active="/performance" />} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <QuarterNav q={q} hrefFor={hrefFor} />
        <span className="text-sm text-muted">3 to 5 goals per person per quarter.</span>
      </div>
      {!onlyMe ? <FilterBar basePath="/performance" q={f.q} office={f.office} team={f.team} offices={offices} teams={teams} extra={<input type="hidden" name="q" value={quarterKey(q)} />} /> : null}

      {people.length === 0 ? (
        <EmptyState title="Nobody to show" description="Try clearing the filters." />
      ) : onlyMe ? (
        <Card title={`Your goals · ${people[0].goals.length}`} actions={<Link href={`/people/${user.id}/goals?q=${quarterKey(q)}`} className="text-xs font-medium text-accent-ink hover:underline">Edit goals</Link>}>
          {people[0].goals.length === 0 ? (
            <p className="text-sm text-muted">No goals yet this quarter. <Link href={`/people/${user.id}/goals?q=${quarterKey(q)}`} className="text-accent-ink hover:underline">Add your first</Link>.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {people[0].goals.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-3 py-2"><span>{g.title}</span><GoalStatusBadge status={g.status} /></li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <Table>
          <thead>
            <tr><Th>Person</Th><Th>Coverage</Th><Th>Goals</Th><Th className="text-right">&nbsp;</Th></tr>
          </thead>
          <tbody>
            {people.map((p) => {
              const live = p.goals.filter((g) => g.status !== "dropped");
              const cov = goalCoverage(live.length);
              return (
                <Tr key={p.id}>
                  <Td className="max-w-[260px]"><PersonCell person={p} subtitle={p.title} size="sm" /></Td>
                  <Td><Badge tone={cov.tone}>{cov.label}</Badge></Td>
                  <Td className="max-w-[460px]">
                    {live.length ? (
                      <span className="flex flex-wrap gap-1">
                        {live.map((g) => (
                          <span key={g.id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-page px-2 py-0.5 text-xs" title={g.title}>
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${g.status === "on_track" || g.status === "done" ? "bg-success-ink" : g.status === "at_risk" ? "bg-warning-ink" : "bg-faint"}`} />
                            <span className="truncate">{g.title}</span>
                          </span>
                        ))}
                      </span>
                    ) : <span className="text-faint">—</span>}
                  </Td>
                  <Td className="text-right"><Link href={`/people/${p.id}/goals?q=${quarterKey(q)}`} className="text-sm font-medium text-accent-ink hover:underline">Open</Link></Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
