import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canViewReminders, visibleEmployeeIds } from "@/lib/permissions";
import { parsePeopleFilters } from "@/lib/people";
import { formatDate, today } from "@/lib/dates";
import { getReminders, REMINDER_KINDS, type ReminderKind } from "@/lib/reminders";
import { Badge, EmptyState, PageHeader, Segmented, Table, Td, Th, Tr, type Tone } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { FilterBar } from "@/components/filter-bar";
import { PersonCell } from "@/components/people/bits";

const TONE: Record<ReminderKind, Tone> = { probation: "warning", anniversary: "accent", contract: "danger", last_day: "neutral" };
const WINDOW_DAYS = 90;

export default async function RemindersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  if (!canViewReminders(user)) return <Forbidden what="reminders" />;
  const sp = await searchParams;
  const f = parsePeopleFilters(sp);
  const kind = typeof sp.kind === "string" && REMINDER_KINDS.some((k) => k.key === sp.kind) ? (sp.kind as ReminderKind) : null;

  const [all, offices, teams] = await Promise.all([
    getReminders({ from: today(), days: WINDOW_DAYS, employeeIds: visibleEmployeeIds(user), officeId: f.office || undefined, teamId: f.team || undefined }),
    prisma.office.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const q = f.q.toLowerCase();
  const rows = all.filter((r) => (!kind || r.kind === kind) && (!q || `${r.employee.firstName} ${r.employee.lastName} ${r.employee.title}`.toLowerCase().includes(q)));
  const keep = (k: string, v: string) => {
    const p = new URLSearchParams();
    if (f.q) p.set("q", f.q);
    if (f.office) p.set("office", f.office);
    if (f.team) p.set("team", f.team);
    if (v) p.set(k, v);
    const s = p.toString();
    return `/reminders${s ? `?${s}` : ""}`;
  };
  const countOf = (k: ReminderKind) => all.filter((r) => r.kind === k).length;

  return (
    <>
      <PageHeader title="Reminders" count={`next ${WINDOW_DAYS} days · ${all.length} item${all.length === 1 ? "" : "s"}`} />
      <div className="mb-5">
        <Segmented
          items={[{ href: keep("kind", ""), label: "All" }, ...REMINDER_KINDS.map((k) => ({ href: keep("kind", k.key), label: countOf(k.key) ? `${k.label} · ${countOf(k.key)}` : k.label }))]}
          active={keep("kind", kind ?? "")}
        />
      </div>
      <FilterBar basePath="/reminders" q={f.q} office={f.office} team={f.team} offices={offices} teams={teams} />

      {rows.length === 0 ? (
        <EmptyState title="Nothing coming up" description={`No ${kind ? REMINDER_KINDS.find((k) => k.key === kind)!.label.toLowerCase() : "reminders"} in the next ${WINDOW_DAYS} days for these filters.`} />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>When</Th>
              <Th>Person</Th>
              <Th>What</Th>
              <Th>Detail</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <Tr key={`${r.kind}-${r.employee.id}-${i}`}>
                <Td className="whitespace-nowrap">
                  <span className="block tabular-nums">{formatDate(r.date)}</span>
                  <span className="block text-xs text-muted">{r.inDays === 0 ? "today" : r.inDays === 1 ? "tomorrow" : `in ${r.inDays} days`}</span>
                </Td>
                <Td className="max-w-[260px]">
                  <PersonCell person={r.employee} subtitle={r.employee.title} size="sm" />
                </Td>
                <Td>
                  <Badge tone={TONE[r.kind]}>{REMINDER_KINDS.find((k) => k.key === r.kind)!.label}</Badge>
                </Td>
                <Td className="text-muted">{r.detail}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      <p className="mt-3 text-xs text-muted">Email and Slack nudges would go here.</p>
    </>
  );
}
