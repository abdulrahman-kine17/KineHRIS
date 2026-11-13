import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canCompleteChecklistItem, canEditChecklist, canViewChecklist } from "@/lib/permissions";
import { label } from "@/lib/constants";
import { formatDate, isoDate, today } from "@/lib/dates";
import { Avatar, Card } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { ChecklistItemRow, ChecklistProgress, KindBadge } from "@/components/checklists/bits";
import { AddItemForm } from "@/components/checklists/forms";

export default async function ChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const list = await prisma.checklist.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, title: true, startDate: true, endDate: true, team: { select: { name: true } }, office: { select: { name: true } } } },
      items: { orderBy: [{ dueDate: "asc" }, { sortOrder: "asc" }], include: { owner: { select: { id: true, firstName: true, lastName: true, title: true } } } },
    },
  });
  if (!list) notFound();
  const owner = list.items.some((i) => i.ownerId === user.id);
  if (!canViewChecklist(user, list.employeeId) && !owner) return <Forbidden what="this checklist" />;
  const canEdit = canEditChecklist(user, list.employeeId);
  const people = canEdit ? await prisma.employee.findMany({ where: { status: { not: "left" } }, orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true, title: true } }) : [];
  const t = today();
  const anchor = list.kind === "onboarding" ? list.employee.startDate : list.employee.endDate;
  const back = `/checklists/${list.id}`;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar firstName={list.employee.firstName} lastName={list.employee.lastName} size="xl" />
          <div>
            <p className="text-sm text-muted"><Link href="/checklists" className="hover:underline">Checklists</Link></p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {label(list.kind)} · <Link href={`/people/${list.employee.id}`} className="hover:underline">{list.employee.firstName} {list.employee.lastName}</Link>
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              {list.employee.title} · {list.employee.team.name} · {list.employee.office.name} · {list.kind === "onboarding" ? "starts" : "last day"} {formatDate(anchor) || "not set"}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <KindBadge kind={list.kind} />
              <ChecklistProgress items={list.items} today={t} />
            </div>
          </div>
        </div>
      </div>

      <Card title={`Steps · ${list.items.length}`}>
        {list.items.length === 0 ? (
          <p className="text-sm text-muted">No steps yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {list.items.map((it) => (
              <ChecklistItemRow key={it.id} item={it} today={t} canTick={canCompleteChecklistItem(user, { ownerId: it.ownerId, checklist: { employeeId: list.employeeId } })} back={back} />
            ))}
          </ul>
        )}
        {canEdit ? (
          <div className="mt-4 border-t border-line pt-4">
            <AddItemForm checklistId={list.id} people={people.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName} — ${p.title}` }))} defaultDue={isoDate(anchor ?? t)} />
          </div>
        ) : null}
      </Card>
    </>
  );
}
