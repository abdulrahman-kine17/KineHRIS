import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageReviewCycles, canRequestReview, canViewReview, visibleEmployeeIds } from "@/lib/permissions";
import { formatDate } from "@/lib/dates";
import { reviewSummary } from "@/lib/performance";
import { Button, EmptyState, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { PersonCell } from "@/components/people/bits";
import { CycleStatusBadge, ReviewStatusBadge } from "@/components/performance/bits";
import { PeerRequestForm } from "@/components/performance/forms";
import { setCycleStatus } from "@/app/(app)/performance/actions";

export default async function CyclePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const cycle = await prisma.reviewCycle.findUnique({ where: { id } });
  if (!cycle) notFound();
  const ids = visibleEmployeeIds(user);
  const [people, everyone] = await Promise.all([
    prisma.employee.findMany({
      where: { status: { not: "left" }, ...(ids ? { id: { in: ids } } : {}) },
      orderBy: { lastName: "asc" },
      select: { id: true, firstName: true, lastName: true, title: true, reviewsAbout: { where: { cycleId: id }, select: { id: true, kind: true, status: true, reviewerId: true, employeeId: true, reviewer: { select: { firstName: true } } } } },
    }),
    prisma.employee.findMany({ where: { status: { not: "left" } }, orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true } }),
  ]);
  const rows = people.filter((p) => p.reviewsAbout.length > 0 || canRequestReview(user, p.id));
  const complete = rows.filter((p) => reviewSummary(p.reviewsAbout).complete).length;
  const admin = canManageReviewCycles(user);

  return (
    <>
      <PageHeader
        title={cycle.name}
        count={`${complete} of ${rows.length} complete · self due ${formatDate(cycle.selfDueDate)} · manager due ${formatDate(cycle.managerDueDate)}`}
        actions={
          <>
            <CycleStatusBadge status={cycle.status} />
            {admin ? (
              <form action={setCycleStatus}>
                <input type="hidden" name="id" value={cycle.id} />
                <input type="hidden" name="status" value={cycle.status === "open" ? "closed" : "open"} />
                <Button type="submit" variant="secondary">{cycle.status === "open" ? "Close cycle" : "Reopen cycle"}</Button>
              </form>
            ) : null}
          </>
        }
      />
      <p className="mb-4 text-sm text-muted"><Link href="/performance/reviews" className="hover:underline">All cycles</Link> · Managers see their reports; peers are asked per person.</p>
      {rows.length === 0 ? <EmptyState title="Nobody in this cycle for you" /> : (
        <Table>
          <thead><tr><Th>Person</Th><Th>Self</Th><Th>Manager</Th><Th>Peers</Th><Th>Read</Th></tr></thead>
          <tbody>
            {rows.map((p) => {
              const s = reviewSummary(p.reviewsAbout);
              const readable = p.reviewsAbout.filter((r) => canViewReview(user, r) && r.status === "submitted");
              const asked = new Set(p.reviewsAbout.filter((r) => r.kind === "peer").map((r) => r.reviewerId));
              return (
                <Tr key={p.id}>
                  <Td className="max-w-[240px]"><PersonCell person={p} subtitle={p.title} size="sm" /></Td>
                  <Td><ReviewStatusBadge status={s.self} /></Td>
                  <Td><ReviewStatusBadge status={s.manager} /></Td>
                  <Td>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm tabular-nums">{s.peersSubmitted}/{s.peersTotal}</span>
                      {cycle.status === "open" && canRequestReview(user, p.id) ? (
                        <PeerRequestForm cycleId={cycle.id} employeeId={p.id} peers={everyone.filter((e) => e.id !== p.id && !asked.has(e.id)).map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}` }))} />
                      ) : null}
                    </div>
                  </Td>
                  <Td>
                    <span className="flex flex-wrap gap-1">
                      {readable.map((r) => (
                        <Link key={r.id} href={`/performance/reviews/${r.id}`} className="rounded-full bg-page px-2 py-0.5 text-xs font-medium hover:bg-hover">{r.kind === "self" ? "Self" : r.kind === "manager" ? "Manager" : r.reviewer.firstName}</Link>
                      ))}
                      {readable.length === 0 ? <span className="text-faint">—</span> : null}
                    </span>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
