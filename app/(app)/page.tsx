import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Dl, Badge } from "@/components/ui";
import { PersonLink } from "@/components/people/bits";
import Link from "next/link";
import { formatDate, today } from "@/lib/dates";
import { label } from "@/lib/constants";

const MODULES: { n: number; name: string; status: "done" | "next" | "planned" }[] = [
  { n: 0, name: "Foundation", status: "done" },
  { n: 1, name: "People", status: "done" },
  { n: 2, name: "HR operations (leave, contracts, reminders)", status: "done" },
  { n: 3, name: "Recruitment and onboarding", status: "done" },
  { n: 4, name: "Performance", status: "done" },
  { n: 5, name: "Compensation", status: "done" },
  { n: 6, name: "Dashboard", status: "done" },
];

export default async function HomePage() {
  const user = await requireUser();
  const [office, team, manager, reportCount] = await Promise.all([
    prisma.office.findUnique({ where: { id: user.officeId }, select: { name: true } }),
    prisma.team.findUnique({ where: { id: user.teamId }, select: { name: true } }),
    prisma.employee.findFirst({ where: { reports: { some: { id: user.id } } }, select: { id: true, firstName: true, lastName: true } }),
    prisma.employee.count({ where: { id: { in: user.reportIds }, status: { not: "left" } } }),
  ]);
  const [interviews, steps] = await Promise.all([
    prisma.interview.findMany({
      where: { interviewerId: user.id, candidate: { decision: null }, OR: [{ scorecard: null }, { scorecard: { submittedAt: null } }] },
      orderBy: { scheduledAt: "asc" },
      select: { id: true, kind: true, scheduledAt: true, candidate: { select: { id: true, name: true, role: { select: { title: true } } } } },
    }),
    prisma.checklistItem.findMany({
      where: { ownerId: user.id, doneAt: null },
      orderBy: { dueDate: "asc" },
      take: 5,
      select: { id: true, title: true, dueDate: true, checklist: { select: { id: true, kind: true, employee: { select: { firstName: true, lastName: true } } } } },
    }),
  ]);
  const t = today();

  return (
    <>
      <PageHeader title={`Hello, ${user.firstName}`} description="All six modules are built." />
      {interviews.length || steps.length ? (
        <div className="mb-6 grid gap-6 md:grid-cols-2">
          {interviews.length ? (
            <Card title={`Scorecards to fill in · ${interviews.length}`}>
              <ul className="divide-y divide-line text-sm">
                {interviews.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <Link href={`/recruitment/candidates/${i.candidate.id}`} className="block truncate font-medium hover:underline">{i.candidate.name}</Link>
                      <span className="block truncate text-xs text-muted">{i.candidate.role.title} · {label(i.kind)} · {formatDate(i.scheduledAt)}</span>
                    </span>
                    <Link href={`/recruitment/interviews/${i.id}/scorecard`} className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-strong">Fill in</Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {steps.length ? (
            <Card title="Your open checklist steps">
              <ul className="divide-y divide-line text-sm">
                {steps.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <Link href={`/checklists/${s.checklist.id}`} className="block truncate font-medium hover:underline">{s.title}</Link>
                      <span className="block truncate text-xs text-muted">{label(s.checklist.kind)} · {s.checklist.employee.firstName} {s.checklist.employee.lastName}</span>
                    </span>
                    <span className={`shrink-0 text-xs tabular-nums ${s.dueDate < t ? "text-danger-ink" : "text-muted"}`}>{formatDate(s.dueDate)}</span>
                  </li>
                ))}
              </ul>
              <Link href="/checklists" className="mt-3 inline-block text-sm font-medium text-accent-ink hover:underline">All checklists</Link>
            </Card>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="You">
          <Dl
            items={[
              { label: "Name", value: user.name },
              { label: "Title", value: user.title },
              { label: "Team", value: team?.name },
              { label: "Office", value: office?.name },
              { label: "Manager", value: manager ? <PersonLink {...manager} /> : null },
              { label: "Access", value: label(user.appRole) },
              { label: "People you manage", value: String(reportCount) },
            ]}
          />
        </Card>
        <Card title="Build status">
          <ol className="divide-y divide-line text-sm">
            {MODULES.map((m) => (
              <li key={m.n} className="flex items-center justify-between py-2">
                <span>
                  <span className="mr-2 text-muted">{m.n}</span>
                  {m.name}
                </span>
                <Badge tone={m.status === "done" ? "success" : m.status === "next" ? "accent" : "neutral"}>{m.status}</Badge>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
