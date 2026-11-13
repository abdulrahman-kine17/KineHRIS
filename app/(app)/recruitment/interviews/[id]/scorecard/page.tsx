import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canSubmitScorecard } from "@/lib/permissions";
import { label } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { PageHeader } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { ScorecardForm } from "@/components/recruitment/forms";

export default async function ScorecardPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [interview, criteria] = await Promise.all([
    prisma.interview.findUnique({ where: { id }, include: { candidate: { select: { id: true, name: true, decision: true, role: { select: { title: true } } } }, scorecard: { include: { scores: true } } } }),
    prisma.scorecardCriterion.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!interview) notFound();
  if (!canSubmitScorecard(user, interview)) return <Forbidden what="this scorecard. Only the interviewer fills it in" />;

  const existing = interview.scorecard
    ? {
        recommendation: interview.scorecard.recommendation,
        summary: interview.scorecard.summary ?? "",
        scores: Object.fromEntries(interview.scorecard.scores.map((s) => [s.criterionId, { score: s.score, note: s.note ?? "" }])),
      }
    : null;

  return (
    <>
      <PageHeader title={`Scorecard · ${interview.candidate.name}`} description={`${interview.candidate.role.title} · ${label(interview.kind)} interview on ${formatDate(interview.scheduledAt)}`} />
      {interview.candidate.decision ? (
        <p className="rounded-card bg-neutral-soft px-4 py-3 text-sm text-neutral-ink">A decision has been recorded, so this scorecard is locked.</p>
      ) : (
        <ScorecardForm interviewId={interview.id} criteria={criteria} existing={existing} cancelHref={`/recruitment/candidates/${interview.candidate.id}`} />
      )}
    </>
  );
}
