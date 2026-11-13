import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canViewOneOnOne } from "@/lib/permissions";
import { formatDate, today } from "@/lib/dates";
import { Avatar, Badge, Card } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { ActionItemForm, NotesForm } from "@/components/performance/forms";
import { toggleActionItem } from "@/app/(app)/performance/actions";

export default async function OneOnOnePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const o = await prisma.oneOnOne.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, title: true } },
      manager: { select: { id: true, firstName: true, lastName: true, title: true } },
      actionItems: { orderBy: [{ doneAt: "asc" }, { dueDate: "asc" }], include: { owner: { select: { id: true, firstName: true, lastName: true } } } },
    },
  });
  if (!o) notFound();
  if (!canViewOneOnOne(user, o)) return <Forbidden what="this 1:1. Notes are private to the two people in it" />;
  const t = today();
  const other = o.employeeId === user.id ? o.manager : o.employee;
  const people = [o.manager, o.employee].map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}` }));
  const back = `/performance/one-on-ones/${o.id}`;

  return (
    <>
      <div className="mb-6 flex items-center gap-4">
        <Avatar firstName={other.firstName} lastName={other.lastName} size="xl" />
        <div>
          <p className="text-sm text-muted"><Link href="/performance/one-on-ones" className="hover:underline">1:1s</Link></p>
          <h1 className="text-2xl font-semibold tracking-tight">1:1 with {other.firstName} {other.lastName}</h1>
          <p className="mt-0.5 text-sm text-muted">{formatDate(o.date)} · {o.manager.firstName} {o.manager.lastName} and {o.employee.firstName} {o.employee.lastName} · <Badge tone="neutral">Private</Badge></p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <Card title="Notes"><NotesForm id={o.id} notes={o.notes ?? ""} /></Card>
        <Card title={`Action items · ${o.actionItems.filter((a) => !a.doneAt).length} open`}>
          {o.actionItems.length === 0 ? <p className="text-sm text-muted">Nothing yet.</p> : (
            <ul className="divide-y divide-line">
              {o.actionItems.map((a) => {
                const overdue = !a.doneAt && a.dueDate && a.dueDate < t;
                return (
                  <li key={a.id} className="flex items-center gap-3 py-2.5">
                    <form action={toggleActionItem}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="back" value={back} />
                      <button type="submit" aria-label={a.doneAt ? `Reopen "${a.title}"` : `Mark "${a.title}" done`} className={`flex h-5 w-5 items-center justify-center rounded-md border ${a.doneAt ? "border-accent bg-accent text-white" : "border-line-strong bg-surface hover:border-accent"}`}>
                        {a.doneAt ? <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="M3.5 8.5l3 3 6-6" /></svg> : null}
                      </button>
                    </form>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${a.doneAt ? "text-muted line-through" : ""}`}>{a.title}</p>
                      <p className="text-xs text-muted">{a.owner.firstName}{a.dueDate ? ` · due ${formatDate(a.dueDate)}` : ""}</p>
                    </div>
                    {overdue ? <Badge tone="danger">overdue</Badge> : null}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-4 border-t border-line pt-4">
            <ActionItemForm oneOnOneId={o.id} people={people} defaultOwnerId={o.employeeId} />
          </div>
        </Card>
      </div>
    </>
  );
}
