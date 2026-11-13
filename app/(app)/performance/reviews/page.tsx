import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageReviewCycles } from "@/lib/permissions";
import { formatDate, today } from "@/lib/dates";
import { label } from "@/lib/constants";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { PersonCell } from "@/components/people/bits";
import { CycleStatusBadge, PerformanceTabs } from "@/components/performance/bits";
import { CycleForm } from "@/components/performance/forms";

export default async function ReviewsPage() {
  const user = await requireUser();
  const [cycles, mine] = await Promise.all([
    prisma.reviewCycle.findMany({ orderBy: [{ year: "desc" }, { half: "desc" }], include: { reviews: { select: { kind: true, status: true } } } }),
    prisma.review.findMany({
      where: { reviewerId: user.id, status: "draft", cycle: { status: "open" } },
      orderBy: [{ kind: "asc" }],
      include: { employee: { select: { id: true, firstName: true, lastName: true, title: true } }, cycle: { select: { name: true, selfDueDate: true, managerDueDate: true } } },
    }),
  ]);
  const t = today();

  return (
    <>
      <PageHeader title="Performance" count={`${cycles.length} cycle${cycles.length === 1 ? "" : "s"}`} actions={<PerformanceTabs active="/performance/reviews" />} />

      <h2 className="mb-3 text-sm font-semibold">Reviews for you to write · {mine.length}</h2>
      {mine.length === 0 ? (
        <EmptyState title="Nothing to write right now" description="Self, manager and peer reviews assigned to you appear here while a cycle is open." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {mine.map((r) => {
            const due = r.kind === "self" ? r.cycle.selfDueDate : r.cycle.managerDueDate;
            return (
              <Card key={r.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted">{label(r.kind)} review · {r.cycle.name}</p>
                    <div className="mt-2">{r.kind === "self" ? <p className="font-medium">Your self review</p> : <PersonCell person={r.employee} subtitle={r.employee.title} size="sm" />}</div>
                    <p className={`mt-2 text-xs ${due < t ? "text-danger-ink" : "text-muted"}`}>due {formatDate(due)}{due < t ? " · overdue" : ""}</p>
                  </div>
                  <LinkButton href={`/performance/reviews/${r.id}`} variant="primary" size="sm">Write</LinkButton>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <h2 className="mb-3 mt-8 text-sm font-semibold">Cycles</h2>
      {cycles.length === 0 ? <EmptyState title="No cycles yet" /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {cycles.map((c) => {
            const n = (kind: string, status?: string) => c.reviews.filter((r) => r.kind === kind && (!status || r.status === status)).length;
            return (
              <Card key={c.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/performance/reviews/cycle/${c.id}`} className="text-base font-semibold hover:underline">{c.name}</Link>
                    <p className="mt-0.5 text-sm text-muted">self due {formatDate(c.selfDueDate)} · manager due {formatDate(c.managerDueDate)}</p>
                  </div>
                  <CycleStatusBadge status={c.status} />
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[["Self", n("self", "submitted"), n("self")], ["Manager", n("manager", "submitted"), n("manager")], ["Peer", n("peer", "submitted"), n("peer")]].map(([k, a, b]) => (
                    <div key={k} className="rounded-lg bg-page px-2 py-2">
                      <dd className="text-lg font-semibold tabular-nums">{a}<span className="text-sm font-normal text-muted">/{b}</span></dd>
                      <dt className="text-[10px] uppercase tracking-wider text-muted">{k} submitted</dt>
                    </div>
                  ))}
                </dl>
              </Card>
            );
          })}
        </div>
      )}

      {canManageReviewCycles(user) ? (
        <Card title="Launch a cycle" className="mt-8">
          <CycleForm defaultYear={t.getUTCFullYear()} cancelHref="/performance/reviews" />
        </Card>
      ) : null}
    </>
  );
}
