import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Pencil } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditRecruiting, canRecordHiringDecision, canViewCandidate, canViewScorecards } from "@/lib/permissions";
import { label } from "@/lib/constants";
import { formatDate, isoDate, today } from "@/lib/dates";
import { weightedScore } from "@/lib/hiring";
import { candidateFlags, officeCalendars } from "@/lib/recruiting";
import { Badge, Button, Card, Dash, Dl, EmptyState, LinkButton, Table, Td, Th, Tr } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { PersonCell, PersonLink } from "@/components/people/bits";
import { DecisionBadge, Dots, RecommendationBadge, StageBadge } from "@/components/recruitment/bits";
import { DecisionForm, InterviewForm, StageSelect } from "@/components/recruitment/forms";
import { markOutcomeSent } from "../../actions";

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const c = await prisma.candidate.findUnique({
    where: { id },
    include: {
      role: { include: { office: { select: { name: true } }, team: { select: { name: true } }, hiringManager: { select: { id: true, firstName: true, lastName: true } } } },
      interviews: {
        orderBy: { scheduledAt: "asc" },
        include: {
          interviewer: { select: { id: true, firstName: true, lastName: true, title: true } },
          scorecard: { include: { scores: { include: { criterion: { select: { name: true, sortOrder: true } } } } } },
        },
      },
    },
  });
  if (!c) notFound();
  if (!canViewCandidate(user, { interviewerIds: c.interviews.map((i) => i.interviewerId) })) return <Forbidden what="this candidate" />;

  const [cals, criteria, interviewers] = await Promise.all([
    officeCalendars(),
    prisma.scorecardCriterion.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.employee.findMany({ where: { status: { not: "left" } }, orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true, title: true } }),
  ]);
  const t = today();
  const flags = candidateFlags(c, cals.get(c.role.officeId)!, t);
  const canEdit = canEditRecruiting(user);
  const seeAll = canViewScorecards(user);
  const canDecide = canRecordHiringDecision(user, c.role);
  const visibleCards = c.interviews.filter((i) => i.scorecard?.submittedAt && (seeAll || i.interviewerId === user.id));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            <Link href="/recruitment" className="hover:underline">Recruitment</Link> · <Link href={`/recruitment/pipeline?role=${c.roleId}`} className="hover:underline">{c.role.title}</Link>
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{c.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StageBadge stage={c.stage} />
            <DecisionBadge decision={c.decision} />
            {flags.overdue ? <Badge tone="danger">Outcome overdue · {flags.waitingDays} working days</Badge> : null}
            {seeAll && flags.score !== null ? <Badge tone="accent">Avg score {flags.score.toFixed(2)} / 5</Badge> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit ? <StageSelect candidateId={c.id} stage={c.stage} /> : null}
          {canEdit ? (
            <LinkButton href={`/recruitment/candidates/${c.id}/edit`}>
              <Pencil className="h-4 w-4" aria-hidden />
              Edit
            </LinkButton>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card title={`Interviews · ${c.interviews.length}`}>
            {c.interviews.length === 0 ? (
              <p className="text-sm text-muted">No interviews yet.</p>
            ) : (
              <Table>
                <thead>
                  <tr><Th>Interviewer</Th><Th>Type</Th><Th>Date</Th><Th>Scorecard</Th><Th className="text-right">&nbsp;</Th></tr>
                </thead>
                <tbody>
                  {c.interviews.map((i) => {
                    const done = Boolean(i.scorecard?.submittedAt);
                    const mine = i.interviewerId === user.id;
                    const score = done ? weightedScore(i.scorecard!.scores) : null;
                    return (
                      <Tr key={i.id}>
                        <Td className="max-w-[220px]"><PersonCell person={i.interviewer} subtitle={i.interviewer.title} size="sm" /></Td>
                        <Td>{label(i.kind)}</Td>
                        <Td className="whitespace-nowrap tabular-nums">{formatDate(i.scheduledAt)}</Td>
                        <Td>
                          {done ? (
                            <span className="inline-flex items-center gap-2">
                              <Badge tone="success">Submitted</Badge>
                              {(seeAll || mine) && score !== null ? <span className="tabular-nums text-muted">{score.toFixed(2)}</span> : null}
                            </span>
                          ) : (
                            <Badge tone="warning">Waiting</Badge>
                          )}
                        </Td>
                        <Td className="text-right">
                          {mine && !c.decision ? (
                            <LinkButton href={`/recruitment/interviews/${i.id}/scorecard`} size="sm" variant={done ? "secondary" : "primary"}>
                              {done ? "Edit my scorecard" : "Fill in scorecard"}
                            </LinkButton>
                          ) : null}
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
            {canEdit && !c.decision ? (
              <div className="mt-4 border-t border-line pt-4">
                <InterviewForm candidateId={c.id} interviewers={interviewers.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName} — ${p.title}` }))} defaultDate={isoDate(t)} />
              </div>
            ) : null}
          </Card>

          <Card title="Scorecards">
            {visibleCards.length === 0 ? (
              <p className="text-sm text-muted">{seeAll ? "No scorecards submitted yet." : "You will see your own scorecard here once submitted."}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-table">
                  <thead>
                    <tr>
                      <th className="py-2 pr-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted">Criterion</th>
                      {visibleCards.map((i) => (
                        <th key={i.id} className="px-2 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                          {i.interviewer.firstName}
                          <span className="block text-[10px] normal-case tracking-normal">{label(i.kind)}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {criteria.map((cr) => (
                      <tr key={cr.id} className="border-t border-line">
                        <td className="py-2 pr-3">
                          {cr.name} <span className="text-xs text-muted">· {cr.weight}%</span>
                        </td>
                        {visibleCards.map((i) => {
                          const s = i.scorecard!.scores.find((x) => x.criterionId === cr.id);
                          return (
                            <td key={i.id} className="px-2 py-2" title={s?.note ?? ""}>
                              {s ? <span className="inline-flex items-center gap-2"><Dots value={s.score} /><span className="tabular-nums text-muted">{s.score}</span></span> : <Dash />}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr className="border-t border-line font-medium">
                      <td className="py-2 pr-3">Weighted score</td>
                      {visibleCards.map((i) => (
                        <td key={i.id} className="px-2 py-2 tabular-nums">{weightedScore(i.scorecard!.scores)?.toFixed(2)}</td>
                      ))}
                    </tr>
                    <tr className="border-t border-line">
                      <td className="py-2 pr-3">Recommendation</td>
                      {visibleCards.map((i) => (
                        <td key={i.id} className="px-2 py-2"><RecommendationBadge value={i.scorecard!.recommendation} /></td>
                      ))}
                    </tr>
                  </tbody>
                </table>
                <ul className="mt-4 space-y-2 text-sm">
                  {visibleCards.filter((i) => i.scorecard!.summary).map((i) => (
                    <li key={i.id}><span className="font-medium">{i.interviewer.firstName}:</span> <span className="text-muted">{i.scorecard!.summary}</span></li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {seeAll ? (
            <Card title="Decision">
              {c.decision ? (
                <div className="space-y-3 text-sm">
                  <p className="flex flex-wrap items-center gap-2">
                    <DecisionBadge decision={c.decision} />
                    <span className="text-muted">recorded {formatDate(c.decidedAt)}</span>
                  </p>
                  {c.outcomeSentAt ? (
                    <p className="flex items-center gap-2 text-success-ink"><Check className="h-4 w-4" aria-hidden /> Outcome sent {formatDate(c.outcomeSentAt)}</p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={flags.overdue ? "text-danger-ink" : "text-muted"}>
                        Outcome not sent · {flags.waitingDays} working day{flags.waitingDays === 1 ? "" : "s"} since the decision{flags.overdue ? " · overdue" : ""}
                      </span>
                      {canEdit || canDecide ? (
                        <form action={markOutcomeSent}>
                          <input type="hidden" name="candidateId" value={c.id} />
                          <Button type="submit" size="sm"><Check className="h-3.5 w-3.5" aria-hidden />Outcome sent</Button>
                        </form>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : canDecide ? (
                <DecisionForm candidateId={c.id} allowed={flags.gate.allowed} reason={flags.gate.allowed ? undefined : flags.gate.reason} />
              ) : (
                <p className="text-sm text-muted">
                  {flags.gate.allowed ? "Ready for a decision by " : `${flags.gate.reason} Decision by `}
                  <PersonLink {...c.role.hiringManager} className="text-ink" />.
                </p>
              )}
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card title="Details">
            <Dl
              items={[
                { label: "Email", value: <a className="text-accent-ink hover:underline" href={`mailto:${c.email}`}>{c.email}</a> },
                { label: "Phone", value: c.phone },
                { label: "Source", value: c.source },
                { label: "Applied", value: formatDate(c.appliedAt) },
                { label: "In stage since", value: formatDate(c.stageChangedAt) },
                { label: "Role", value: <Link href={`/recruitment/pipeline?role=${c.roleId}`} className="hover:underline">{c.role.title}</Link> },
                { label: "Office", value: c.role.office.name },
                { label: "Hiring manager", value: <PersonLink {...c.role.hiringManager} /> },
              ]}
            />
          </Card>
          {seeAll ? (
            <Card title="Notes">
              {c.notes ? <p className="whitespace-pre-wrap text-sm">{c.notes}</p> : <EmptyState title="No notes" />}
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
