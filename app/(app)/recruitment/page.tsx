import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditRecruiting, canViewRecruiting } from "@/lib/permissions";
import { CANDIDATE_STAGES, ROLE_STATUSES, label } from "@/lib/constants";
import { diffDays, formatDate, today } from "@/lib/dates";
import { daysToHire } from "@/lib/recruiting";
import { Card, EmptyState, LinkButton, PageHeader, Segmented, inputClass } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { FilterBar } from "@/components/filter-bar";
import { PersonLink } from "@/components/people/bits";
import { RecruitingHeaderTabs, RoleStatusBadge } from "@/components/recruitment/bits";
import { parsePeopleFilters } from "@/lib/people";

export default async function RolesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  if (!canViewRecruiting(user)) return <Forbidden what="recruiting" />;
  const sp = await searchParams;
  const f = parsePeopleFilters(sp);
  const status = typeof sp.status === "string" && (ROLE_STATUSES as readonly string[]).includes(sp.status) ? sp.status : "open";

  const [roles, offices, teams] = await Promise.all([
    prisma.role.findMany({
      where: {
        ...(status === "all" ? {} : { status }),
        ...(f.office ? { officeId: f.office } : {}),
        ...(f.team ? { teamId: f.team } : {}),
        ...(f.q ? { title: { contains: f.q } } : {}),
      },
      orderBy: [{ status: "asc" }, { openedAt: "desc" }],
      include: {
        team: { select: { name: true } },
        office: { select: { name: true } },
        hiringManager: { select: { id: true, firstName: true, lastName: true } },
        candidates: { select: { stage: true, appliedAt: true, decidedAt: true, decision: true } },
      },
    }),
    prisma.office.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const t = today();

  return (
    <>
      <PageHeader
        title="Recruitment"
        count={`${roles.length} role${roles.length === 1 ? "" : "s"}`}
        actions={
          <>
            <Segmented items={RecruitingHeaderTabs()} active="/recruitment" />
            {canEditRecruiting(user) ? (
              <LinkButton href="/recruitment/roles/new" variant="primary">
                <Plus className="h-4 w-4" aria-hidden />
                New role
              </LinkButton>
            ) : null}
          </>
        }
      />
      <FilterBar
        basePath="/recruitment"
        q={f.q}
        office={f.office}
        team={f.team}
        offices={offices}
        teams={teams}
        extra={
          <label>
            <span className="sr-only">Status</span>
            <select name="status" defaultValue={status} className={`${inputClass} w-36`}>
              {ROLE_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
              <option value="all">All statuses</option>
            </select>
          </label>
        }
      />

      {roles.length === 0 ? (
        <EmptyState title="No roles match" description="Try another status or clear the filters." action={canEditRecruiting(user) ? <LinkButton href="/recruitment/roles/new">New role</LinkButton> : undefined} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {roles.map((r) => {
            const active = r.candidates.filter((c) => c.stage !== "hired" && c.stage !== "rejected").length;
            const hired = r.candidates.filter((c) => c.decision === "hire");
            const tth = hired.map(daysToHire).filter((x): x is number => x !== null);
            const byStage = CANDIDATE_STAGES.map((s) => ({ s, n: r.candidates.filter((c) => c.stage === s).length }));
            return (
              <Card key={r.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/recruitment/pipeline?role=${r.id}`} className="block truncate text-base font-semibold underline-offset-2 hover:underline" title={r.title}>
                      {r.title}
                    </Link>
                    <p className="mt-0.5 text-sm text-muted">
                      {r.team.name} · {r.office.name} · hiring manager <PersonLink {...r.hiringManager} className="text-ink" />
                    </p>
                  </div>
                  <RoleStatusBadge status={r.status} />
                </div>
                <div className="mt-4 grid grid-cols-6 gap-1 text-center">
                  {byStage.map(({ s, n }) => (
                    <Link key={s} href={`/recruitment/pipeline?role=${r.id}`} className={`rounded-lg px-1 py-2 ${n ? "bg-page" : ""}`}>
                      <span className={`block text-lg font-semibold tabular-nums ${n ? "" : "text-faint"}`}>{n}</span>
                      <span className="block truncate text-[10px] uppercase tracking-wider text-muted">{label(s)}</span>
                    </Link>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted">
                  {r.status === "open" ? `Open ${diffDays(r.openedAt, t)} days · ${active} active candidate${active === 1 ? "" : "s"}` : `Opened ${formatDate(r.openedAt)}${r.closedAt ? ` · closed ${formatDate(r.closedAt)}` : ""}`}
                  {tth.length ? ` · time to hire ${Math.round(tth.reduce((a, b) => a + b, 0) / tth.length)} days` : ""}
                  {canEditRecruiting(user) ? (
                    <>
                      {" · "}
                      <Link href={`/recruitment/roles/${r.id}/edit`} className="text-accent-ink hover:underline">Edit</Link>
                    </>
                  ) : null}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
