import { Check } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditRecruiting, canViewRecruiting } from "@/lib/permissions";
import { OUTCOME_SLA_WORKING_DAYS } from "@/lib/constants";
import { formatDate, today } from "@/lib/dates";
import { candidateFlags, officeCalendars } from "@/lib/recruiting";
import { Badge, Button, EmptyState, PageHeader, Segmented, Table, Td, Th, Tr } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { CandidateLink, DecisionBadge, RecruitingHeaderTabs, StageBadge } from "@/components/recruitment/bits";
import { markOutcomeSent } from "../actions";

export default async function OutcomesPage() {
  const user = await requireUser();
  if (!canViewRecruiting(user)) return <Forbidden what="recruiting" />;
  const [decided, cals] = await Promise.all([
    prisma.candidate.findMany({
      where: { decision: { not: null } },
      orderBy: { decidedAt: "desc" },
      include: {
        role: { select: { title: true, officeId: true, hiringManagerId: true } },
        interviews: { select: { id: true, interviewer: { select: { firstName: true, lastName: true } }, scorecard: { select: { submittedAt: true, scores: { select: { weight: true, score: true } } } } } },
      },
    }),
    officeCalendars(),
  ]);
  const t = today();
  const rows = decided.map((c) => ({ c, flags: candidateFlags(c, cals.get(c.role.officeId)!, t) }));
  const pending = rows.filter((r) => !r.c.outcomeSentAt);
  const overdue = pending.filter((r) => r.flags.overdue).length;
  const sent = rows.filter((r) => r.c.outcomeSentAt);
  const canEdit = canEditRecruiting(user);

  return (
    <>
      <PageHeader
        title="Recruitment"
        count={`${pending.length} outcome${pending.length === 1 ? "" : "s"} to send${overdue ? ` · ${overdue} overdue` : ""}`}
        actions={<Segmented items={RecruitingHeaderTabs()} active="/recruitment/outcomes" />}
      />
      <p className="mb-4 text-sm text-muted">
        Every candidate with a decision should hear back within {OUTCOME_SLA_WORKING_DAYS} working days (the role office&apos;s calendar). Email templates would go here.
      </p>

      <h2 className="mb-3 text-sm font-semibold">Waiting to be told</h2>
      {pending.length === 0 ? (
        <EmptyState title="Everyone has heard back" description="Nice. New decisions will appear here until the outcome is sent." />
      ) : (
        <Table>
          <thead>
            <tr><Th>Candidate</Th><Th>Role</Th><Th>Decision</Th><Th>Decided</Th><Th>Waiting</Th><Th>Stage</Th>{canEdit ? <Th className="text-right">&nbsp;</Th> : null}</tr>
          </thead>
          <tbody>
            {pending.map(({ c, flags }) => (
              <Tr key={c.id}>
                <Td><CandidateLink id={c.id} name={c.name} /></Td>
                <Td className="text-muted">{c.role.title}</Td>
                <Td><DecisionBadge decision={c.decision} /></Td>
                <Td className="whitespace-nowrap tabular-nums">{formatDate(c.decidedAt)}</Td>
                <Td>
                  {flags.overdue ? <Badge tone="danger">{flags.waitingDays} working days · overdue</Badge> : <Badge tone="warning">{flags.waitingDays} working day{flags.waitingDays === 1 ? "" : "s"}</Badge>}
                </Td>
                <Td><StageBadge stage={c.stage} /></Td>
                {canEdit ? (
                  <Td className="text-right">
                    <form action={markOutcomeSent}>
                      <input type="hidden" name="candidateId" value={c.id} />
                      <input type="hidden" name="back" value="/recruitment/outcomes" />
                      <Button type="submit" variant="secondary" size="sm"><Check className="h-3.5 w-3.5" aria-hidden />Outcome sent</Button>
                    </form>
                  </Td>
                ) : null}
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <h2 className="mb-3 mt-8 text-sm font-semibold">Told</h2>
      {sent.length === 0 ? (
        <EmptyState title="No outcomes sent yet" />
      ) : (
        <Table>
          <thead>
            <tr><Th>Candidate</Th><Th>Role</Th><Th>Decision</Th><Th>Decided</Th><Th>Sent</Th><Th>Stage</Th></tr>
          </thead>
          <tbody>
            {sent.map(({ c }) => (
              <Tr key={c.id}>
                <Td><CandidateLink id={c.id} name={c.name} /></Td>
                <Td className="text-muted">{c.role.title}</Td>
                <Td><DecisionBadge decision={c.decision} /></Td>
                <Td className="whitespace-nowrap tabular-nums">{formatDate(c.decidedAt)}</Td>
                <Td className="whitespace-nowrap tabular-nums">{formatDate(c.outcomeSentAt)}</Td>
                <Td><StageBadge stage={c.stage} /></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
