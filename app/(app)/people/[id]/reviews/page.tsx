import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canViewGoals, canViewReview } from "@/lib/permissions";
import { label } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { Card, EmptyState } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { CycleStatusBadge, ReviewStatusBadge } from "@/components/performance/bits";

export default async function ProfileReviews({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!canViewGoals(user, id)) return <Forbidden what="this person's reviews" />;
  const cycles = await prisma.reviewCycle.findMany({
    orderBy: [{ year: "desc" }, { half: "desc" }],
    include: { reviews: { where: { employeeId: id }, include: { reviewer: { select: { id: true, firstName: true, lastName: true } }, ratings: { select: { rating: true } } }, orderBy: { kind: "asc" } } },
  });
  const withReviews = cycles.filter((c) => c.reviews.length);
  if (withReviews.length === 0) return <EmptyState title="No reviews yet" description="Reviews appear here once a cycle includes this person." />;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {withReviews.map((c) => (
        <Card key={c.id} title={c.name} actions={<CycleStatusBadge status={c.status} />}>
          <ul className="divide-y divide-line text-sm">
            {c.reviews.map((r) => {
              const visible = canViewReview(user, r);
              const avg = r.ratings.length ? (r.ratings.reduce((s, x) => s + x.rating, 0) / r.ratings.length).toFixed(1) : null;
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block font-medium">{label(r.kind)}{r.kind === "peer" ? ` · ${r.reviewer.firstName} ${r.reviewer.lastName}` : ""}</span>
                    <span className="block text-xs text-muted">{r.submittedAt ? `submitted ${formatDate(r.submittedAt)}` : "not submitted"}{visible && avg ? ` · avg ${avg}` : ""}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <ReviewStatusBadge status={r.status} />
                    {visible ? <Link href={`/performance/reviews/${r.id}`} className="text-xs font-medium text-accent-ink hover:underline">{r.reviewerId === user.id && r.status === "draft" ? "Write" : "Read"}</Link> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
    </div>
  );
}
