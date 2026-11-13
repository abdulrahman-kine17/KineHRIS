import { Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditGoals, canViewGoals } from "@/lib/permissions";
import { GOALS_PER_QUARTER } from "@/lib/constants";
import { goalCoverage, parseQuarter, quarterKey } from "@/lib/performance";
import { Badge, Card, EmptyState } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { QuarterNav } from "@/components/performance/bits";
import { GoalForm, GoalStatusSelect } from "@/components/performance/forms";
import { deleteGoal } from "@/app/(app)/performance/actions";

export default async function ProfileGoals({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string; edit?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  if (!canViewGoals(user, id)) return <Forbidden what="this person's goals" />;
  const q = parseQuarter(sp.q);
  const goals = await prisma.goal.findMany({ where: { employeeId: id, year: q.year, quarter: q.quarter }, orderBy: { createdAt: "asc" } });
  const canEdit = canEditGoals(user, id);
  const live = goals.filter((g) => g.status !== "dropped");
  const cov = goalCoverage(live.length);
  const back = `/people/${id}/goals?q=${quarterKey(q)}`;
  const editing = goals.find((g) => g.id === sp.edit);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <QuarterNav q={q} hrefFor={(qq) => `/people/${id}/goals?q=${quarterKey(qq)}`} />
        <Badge tone={cov.tone}>{cov.label}</Badge>
        <span className="text-sm text-muted">{GOALS_PER_QUARTER.min} to {GOALS_PER_QUARTER.max} per quarter. Dropped goals do not count.</span>
      </div>

      {goals.length === 0 ? (
        <EmptyState title="No goals this quarter" description={canEdit ? "Add the first one below." : "Nothing set yet."} />
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-surface">
          {goals.map((g) => (
            <li key={g.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${g.status === "dropped" ? "text-muted line-through" : ""}`}>{g.title}</p>
                {g.description ? <p className="mt-0.5 text-sm text-muted">{g.description}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                {canEdit ? <GoalStatusSelect goalId={g.id} status={g.status} back={back} /> : <Badge>{g.status}</Badge>}
                {canEdit ? (
                  <>
                    <a href={`${back}&edit=${g.id}`} className="rounded-full px-3 py-1.5 text-[13px] font-medium text-muted hover:bg-hover hover:text-ink">Edit</a>
                    <form action={deleteGoal}>
                      <input type="hidden" name="id" value={g.id} />
                      <button type="submit" className="rounded-full p-2 text-muted hover:bg-danger-soft hover:text-danger-ink" aria-label={`Delete goal "${g.title}"`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canEdit ? (
        <Card title={editing ? "Edit goal" : "Add a goal"} className="mt-6">
          {!editing && live.length >= GOALS_PER_QUARTER.max ? (
            <p className="text-sm text-muted">This quarter already has {GOALS_PER_QUARTER.max} goals. Finish or drop one to add another.</p>
          ) : (
            <GoalForm key={editing?.id ?? "new"} employeeId={id} year={q.year} quarter={q.quarter} goal={editing ? { id: editing.id, title: editing.title, description: editing.description ?? "", status: editing.status } : undefined} cancelHref={back} />
          )}
        </Card>
      ) : null}
    </>
  );
}
