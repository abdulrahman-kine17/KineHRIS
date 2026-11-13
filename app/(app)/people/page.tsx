import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canCreateEmployee, canViewEmployeeDetails } from "@/lib/permissions";
import { completeness, parsePeopleFilters, peopleWhere } from "@/lib/people";
import { formatDate } from "@/lib/dates";
import { Dash, EmptyState, LinkButton, PageHeader, Segmented, Table, Td, Th, Tr, inputClass } from "@/components/ui";
import { FilterBar } from "@/components/filter-bar";
import { CompletenessBar, PersonCell, StatusBadge } from "@/components/people/bits";

export default async function PeoplePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const filters = parsePeopleFilters(await searchParams);

  const [people, offices, teams] = await Promise.all([
    prisma.employee.findMany({
      where: peopleWhere(filters),
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        team: { select: { name: true } },
        office: { select: { name: true } },
        manager: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { reports: true } },
      },
    }),
    prisma.office.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const rows = people.map((p) => ({
    ...p,
    canSee: canViewEmployeeDetails(user, p.id),
    c: completeness({ ...p, isOrgRoot: !p.managerId && p._count.reports > 0 }),
  }));
  const incomplete = rows.filter((r) => r.canSee && !r.c.complete).length;

  return (
    <>
      <PageHeader
        title="People"
        count={`${people.length} ${people.length === 1 ? "person" : "people"}${filters.joined ? ` · joined in ${filters.joined}` : ""}${filters.left ? ` · left in ${filters.left}` : ""}${incomplete ? ` · ${incomplete} with missing details` : ""}`}
        actions={
          <>
            <Segmented items={[{ href: "/people", label: "List" }, { href: "/people/org", label: "Org" }]} active="/people" />
            {canCreateEmployee(user) ? (
              <LinkButton href="/people/new" variant="primary">
                <Plus className="h-4 w-4" aria-hidden />
                Add person
              </LinkButton>
            ) : null}
          </>
        }
      />

      <FilterBar
        basePath="/people"
        q={filters.q}
        office={filters.office}
        team={filters.team}
        offices={offices}
        teams={teams}
        extra={
          <>
            {filters.joined ? <input type="hidden" name="joined" value={filters.joined} /> : null}
            {filters.left ? <input type="hidden" name="left" value={filters.left} /> : null}
          <label>
            <span className="sr-only">Show</span>
            <select name="status" defaultValue={filters.status} className={`${inputClass} w-36`}>
              <option value="current">Current</option>
              <option value="left">Left</option>
              <option value="all">Everyone</option>
            </select>
          </label>
          </>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No people match"
          description="Try a different search, or clear the filters."
          action={<LinkButton href="/people">Clear filters</LinkButton>}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th className="w-[30%]">Name</Th>
              <Th>Team</Th>
              <Th>Office</Th>
              <Th>Manager</Th>
              <Th>Status</Th>
              <Th>Start</Th>
              <Th>Complete</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <Tr key={p.id} className={p.status === "left" ? "text-muted" : ""}>
                <Td className="max-w-[280px]">
                  <PersonCell person={p} subtitle={p.title} />
                </Td>
                <Td>{p.team.name}</Td>
                <Td>{p.office.name}</Td>
                <Td className="max-w-[220px]">{p.manager ? <PersonCell person={p.manager} size="sm" /> : <Dash />}</Td>
                <Td>
                  <StatusBadge status={p.status} />
                </Td>
                <Td className="whitespace-nowrap tabular-nums">{formatDate(p.startDate) || <Dash />}</Td>
                <Td>
                  {p.canSee ? (
                    <Link href={`/people/${p.id}`} title={p.c.missingLabels.join(", ") || "Complete"} className="inline-block">
                      <CompletenessBar {...p.c} />
                    </Link>
                  ) : (
                    <Dash />
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
