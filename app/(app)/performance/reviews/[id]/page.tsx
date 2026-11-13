import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canViewReview, canWriteReview } from "@/lib/permissions";
import { REVIEW_CRITERIA, label } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { Badge, Card, Dash, PageHeader } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { Dots } from "@/components/recruitment/bits";
import { ReviewStatusBadge } from "@/components/performance/bits";
import { ReviewForm } from "@/components/performance/forms";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const r = await prisma.review.findUnique({
    where: { id },
    include: { cycle: true, employee: { select: { id: true, firstName: true, lastName: true, title: true } }, reviewer: { select: { id: true, firstName: true, lastName: true } }, ratings: true },
  });
  if (!r) notFound();
  if (!canViewReview(user, r)) return <Forbidden what="this review" />;
  const writing = canWriteReview(user, r) && r.cycle.status === "open";
  const subject = r.employeeId === user.id ? "you" : `${r.employee.firstName} ${r.employee.lastName}`;
  const title = r.kind === "self" ? (r.employeeId === user.id ? "Your self review" : `${r.employee.firstName}'s self review`) : `${label(r.kind)} review of ${subject}`;

  return (
    <>
      <PageHeader
        title={title}
        description={`${r.cycle.name} · written by ${r.reviewerId === user.id ? "you" : `${r.reviewer.firstName} ${r.reviewer.lastName}`}${r.submittedAt ? ` · submitted ${formatDate(r.submittedAt)}` : ""}`}
        actions={<ReviewStatusBadge status={r.status} />}
      />
      <p className="mb-6 text-sm text-muted">
        <Link href={`/performance/reviews/cycle/${r.cycleId}`} className="hover:underline">{r.cycle.name}</Link> · <Link href={`/people/${r.employee.id}/reviews`} className="hover:underline">All reviews of {r.employee.firstName}</Link>
      </p>
      {writing ? (
        <ReviewForm id={r.id} existing={{ summary: r.summary ?? "", ratings: Object.fromEntries(r.ratings.map((x) => [x.criterion, { rating: x.rating, comment: x.comment ?? "" }])) }} cancelHref="/performance/reviews" />
      ) : (
        <div className="grid max-w-3xl gap-6">
          <Card title="Ratings">
            <ul className="divide-y divide-line">
              {REVIEW_CRITERIA.map((c) => {
                const x = r.ratings.find((y) => y.criterion === c);
                return (
                  <li key={c} className="grid gap-2 py-3 sm:grid-cols-[200px_1fr]">
                    <span className="text-sm font-medium">{c}</span>
                    <span className="text-sm">
                      {x ? <span className="inline-flex items-center gap-2"><Dots value={x.rating} /><span className="tabular-nums text-muted">{x.rating}</span>{x.comment ? <span className="text-muted">· {x.comment}</span> : null}</span> : <Dash />}
                    </span>
                  </li>
                );
              })}
            </ul>
            {r.ratings.length ? <p className="mt-3 text-sm text-muted">Average {(r.ratings.reduce((s, x) => s + x.rating, 0) / r.ratings.length).toFixed(2)} / 5</p> : null}
          </Card>
          <Card title="Summary">{r.summary ? <p className="whitespace-pre-wrap text-sm">{r.summary}</p> : <p className="text-sm text-muted">No summary{r.status === "draft" ? " yet" : ""}.</p>}</Card>
          {r.status === "draft" && r.reviewerId !== user.id ? <Badge tone="warning">Still a draft</Badge> : null}
        </div>
      )}
    </>
  );
}
