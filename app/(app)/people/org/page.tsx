import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, EmptyState, PageHeader, Segmented } from "@/components/ui";
import { PersonCell, PersonLink, StatusBadge } from "@/components/people/bits";

type Person = { id: string; firstName: string; lastName: string; title: string; status: string; managerId: string | null; teamId: string; officeId: string };

const VIEWS = [
  { key: "team", label: "By team" },
  { key: "office", label: "By office" },
  { key: "chart", label: "Org chart" },
] as const;

export default async function OrgPage({ searchParams }: { searchParams: Promise<{ by?: string }> }) {
  await requireUser();
  const { by } = await searchParams;
  const view = VIEWS.find((v) => v.key === by)?.key ?? "team";

  const [people, teams, offices] = await Promise.all([
    prisma.employee.findMany({
      where: { status: { not: "left" } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, title: true, status: true, managerId: true, teamId: true, officeId: true },
    }),
    prisma.team.findMany({ orderBy: { name: "asc" }, include: { lead: { select: { id: true, firstName: true, lastName: true } } } }),
    prisma.office.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="People"
        count={`${people.length} current · ${teams.length} teams · ${offices.length} offices`}
        actions={<Segmented items={[{ href: "/people", label: "List" }, { href: "/people/org", label: "Org" }]} active="/people/org" />}
      />
      <div className="mb-5">
        <Segmented items={VIEWS.map((v) => ({ href: `/people/org?by=${v.key}`, label: v.label }))} active={`/people/org?by=${view}`} />
      </div>

      {people.length === 0 ? (
        <EmptyState title="No people yet" description="Add people to see the organisation." />
      ) : view === "team" ? (
        <div className="grid gap-6 md:grid-cols-2">
          {teams.map((t) => {
            const members = people.filter((p) => p.teamId === t.id);
            const byOffice = offices.map((o) => ({ name: o.name, n: members.filter((m) => m.officeId === o.id).length })).filter((x) => x.n);
            return (
              <Card
                key={t.id}
                title={`${t.name} · ${members.length}`}
                actions={<Link href={`/people?team=${t.id}`} className="text-xs font-medium text-accent-ink hover:underline">Open list</Link>}
              >
                <p className="mb-3 text-xs text-muted">
                  Lead: {t.lead ? <PersonLink {...t.lead} className="text-ink" /> : "—"} · {byOffice.map((x) => `${x.name} ${x.n}`).join(" · ") || "no members"}
                </p>
                <PeopleList people={members} />
              </Card>
            );
          })}
        </div>
      ) : view === "office" ? (
        <div className="grid gap-6 md:grid-cols-2">
          {offices.map((o) => {
            const members = people.filter((p) => p.officeId === o.id);
            const byTeam = teams.map((t) => ({ name: t.name, n: members.filter((m) => m.teamId === t.id).length })).filter((x) => x.n);
            return (
              <Card
                key={o.id}
                title={`${o.name}, ${o.country} · ${members.length}`}
                actions={<Link href={`/people?office=${o.id}`} className="text-xs font-medium text-accent-ink hover:underline">Open list</Link>}
              >
                <p className="mb-3 text-xs text-muted">
                  {o.currency} · weekend {o.weekendDays === "5,6" ? "Fri–Sat" : o.weekendDays === "6,0" ? "Sat–Sun" : o.weekendDays} · {byTeam.map((x) => `${x.name} ${x.n}`).join(" · ")}
                </p>
                <PeopleList people={members} />
              </Card>
            );
          })}
        </div>
      ) : (
        <OrgChart people={people} teams={teams} offices={offices} />
      )}
    </>
  );
}

function PeopleList({ people }: { people: Person[] }) {
  if (!people.length) return <p className="text-sm text-muted">Nobody here yet.</p>;
  return (
    <ul className="divide-y divide-line text-sm">
      {people.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-3 py-2">
          <PersonCell person={p} subtitle={p.title} size="sm" />
          {p.status !== "active" ? <StatusBadge status={p.status} /> : null}
        </li>
      ))}
    </ul>
  );
}

function OrgChart({ people, teams, offices }: { people: Person[]; teams: { id: string; name: string }[]; offices: { id: string; name: string }[] }) {
  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const officeName = new Map(offices.map((o) => [o.id, o.name]));
  const ids = new Set(people.map((p) => p.id));
  const children = new Map<string | null, Person[]>();
  for (const p of people) {
    const parent = p.managerId && ids.has(p.managerId) ? p.managerId : null;
    children.set(parent, [...(children.get(parent) ?? []), p]);
  }
  const Node = ({ p }: { p: Person }) => {
    const kids = children.get(p.id) ?? [];
    return (
      <li>
        <div className="flex items-center gap-3 py-1.5 text-sm">
          <PersonCell person={p} subtitle={`${p.title} · ${teamName.get(p.teamId)} · ${officeName.get(p.officeId)}`} size="sm" />
          {kids.length ? <span className="text-xs text-muted">{kids.length} report{kids.length === 1 ? "" : "s"}</span> : null}
        </div>
        {kids.length ? (
          <ul className="ml-4 border-l border-line pl-5">
            {kids.map((k) => (
              <Node key={k.id} p={k} />
            ))}
          </ul>
        ) : null}
      </li>
    );
  };
  const roots = children.get(null) ?? [];
  return (
    <Card>
      <ul>
        {roots.map((r) => (
          <Node key={r.id} p={r} />
        ))}
      </ul>
    </Card>
  );
}
