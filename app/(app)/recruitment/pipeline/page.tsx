import Link from "next/link";
import { AlertTriangle, Clock, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditRecruiting, canViewRecruiting } from "@/lib/permissions";
import { CANDIDATE_STAGES, label } from "@/lib/constants";
import { diffDays, today } from "@/lib/dates";
import { candidateFlags, officeCalendars } from "@/lib/recruiting";
import { Badge, EmptyState, LinkButton, PageHeader, Segmented, inputClass } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { CandidateLink, RecruitingHeaderTabs } from "@/components/recruitment/bits";
import { StageSelect } from "@/components/recruitment/forms";

export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const user = await requireUser();
  if (!canViewRecruiting(user)) return <Forbidden what="recruiting" />;
  const { role } = await searchParams;

  const [roles, candidates, cals] = await Promise.all([
    prisma.role.findMany({ orderBy: [{ status: "asc" }, { title: "asc" }], select: { id: true, title: true, status: true, office: { select: { name: true } } } }),
    prisma.candidate.findMany({
      where: role ? { roleId: role } : { role: { status: "open" } },
      orderBy: { stageChangedAt: "asc" },
      include: {
        role: { select: { id: true, title: true, officeId: true } },
        interviews: { select: { id: true, interviewer: { select: { firstName: true, lastName: true } }, scorecard: { select: { submittedAt: true, scores: { select: { weight: true, score: true } } } } } },
      },
    }),
    officeCalendars(),
  ]);
  const t = today();
  const canEdit = canEditRecruiting(user);
  const selected = roles.find((r) => r.id === role);

  return (
    <>
      <PageHeader
        title="Recruitment"
        count={`${candidates.length} candidate${candidates.length === 1 ? "" : "s"}${selected ? ` · ${selected.title}` : " across open roles"}`}
        actions={
          <>
            <Segmented items={RecruitingHeaderTabs()} active="/recruitment/pipeline" />
            {canEdit ? (
              <LinkButton href={`/recruitment/candidates/new${role ? `?role=${role}` : ""}`} variant="primary">
                <Plus className="h-4 w-4" aria-hidden />
                Add candidate
              </LinkButton>
            ) : null}
          </>
        }
      />
      <form method="get" action="/recruitment/pipeline" className="mb-5">
        <label className="inline-block">
          <span className="sr-only">Role</span>
          <select name="role" defaultValue={role ?? ""} className={`${inputClass} w-80`}>
            <option value="">All open roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title} · {r.office.name}{r.status !== "open" ? ` (${label(r.status)})` : ""}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="ml-2 h-10 rounded-full border border-line-strong bg-surface px-4 text-sm font-medium hover:bg-hover">Show</button>
      </form>

      {candidates.length === 0 ? (
        <EmptyState title="No candidates yet" description="Add a candidate to start the pipeline." />
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[1080px] grid-cols-6 gap-3">
            {CANDIDATE_STAGES.map((stage) => {
              const col = candidates.filter((c) => c.stage === stage);
              return (
                <section key={stage} className="rounded-card bg-page p-2">
                  <h2 className="flex items-center justify-between px-1 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
                    {label(stage)}
                    <span className="tabular-nums">{col.length}</span>
                  </h2>
                  <div className="space-y-2">
                    {col.length === 0 ? <p className="rounded-card border border-dashed border-line-strong px-2 py-4 text-center text-xs text-faint">Empty</p> : null}
                    {col.map((c) => {
                      const flags = candidateFlags(c, cals.get(c.role.officeId)!, t);
                      const waiting = c.interviews.filter((i) => !i.scorecard?.submittedAt).length;
                      return (
                        <article key={c.id} className="rounded-card border border-line bg-surface p-3">
                          <CandidateLink id={c.id} name={c.name} className="block truncate text-sm" />
                          {!role ? <p className="truncate text-xs text-muted" title={c.role.title}>{c.role.title}</p> : null}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden />{diffDays(c.stageChangedAt, t)}d</span>
                            {flags.score !== null ? <Badge tone="accent">{flags.score.toFixed(1)}</Badge> : null}
                            {waiting ? <Badge tone="warning">{waiting} scorecard{waiting === 1 ? "" : "s"} due</Badge> : null}
                            {flags.overdue ? <Badge tone="danger"><AlertTriangle className="mr-1 h-3 w-3" aria-hidden />outcome overdue</Badge> : null}
                            {c.decision && !flags.overdue && !c.outcomeSentAt ? <Badge tone="warning">outcome pending</Badge> : null}
                          </div>
                          {canEdit ? (
                            <div className="mt-2">
                              <StageSelect candidateId={c.id} stage={c.stage} back={`/recruitment/pipeline${role ? `?role=${role}` : ""}`} />
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">
        Moving to <strong>Rejected</strong> or <strong>Hired</strong> needs a recorded decision on the candidate page. <Link href="/recruitment/outcomes" className="text-accent-ink hover:underline">See outcomes</Link>.
      </p>
    </>
  );
}
