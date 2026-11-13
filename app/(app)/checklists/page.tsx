import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { visibleEmployeeIds } from "@/lib/permissions";
import { today } from "@/lib/dates";
import { Card, EmptyState, LinkButton, PageHeader, Segmented, Table, Td, Th, Tr } from "@/components/ui";
import { PersonCell } from "@/components/people/bits";
import { ChecklistItemRow, ChecklistProgress, KindBadge, progressOf } from "@/components/checklists/bits";

export default async function ChecklistsPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const user = await requireUser();
  const { kind } = await searchParams;
  const ids = visibleEmployeeIds(user);
  const t = today();

  const [lists, myItems] = await Promise.all([
    prisma.checklist.findMany({
      where: { ...(ids ? { employeeId: { in: ids } } : {}), ...(kind === "onboarding" || kind === "offboarding" ? { kind } : {}) },
      orderBy: { createdAt: "desc" },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, title: true, startDate: true, endDate: true } },
        items: { select: { doneAt: true, dueDate: true } },
      },
    }),
    prisma.checklistItem.findMany({
      where: { ownerId: user.id, doneAt: null },
      orderBy: { dueDate: "asc" },
      include: { owner: { select: { id: true, firstName: true, lastName: true } }, checklist: { select: { id: true, kind: true, employee: { select: { firstName: true, lastName: true } } } } },
    }),
  ]);
  const canStart = user.appRole !== "employee";

  return (
    <>
      <PageHeader
        title="Checklists"
        count={`${lists.length} checklist${lists.length === 1 ? "" : "s"}`}
        actions={
          <>
            <Segmented items={[{ href: "/checklists", label: "All" }, { href: "/checklists?kind=onboarding", label: "Onboarding" }, { href: "/checklists?kind=offboarding", label: "Offboarding" }]} active={kind === "onboarding" || kind === "offboarding" ? `/checklists?kind=${kind}` : "/checklists"} />
            {canStart ? (
              <LinkButton href="/checklists/new" variant="primary">
                <Plus className="h-4 w-4" aria-hidden />
                Start checklist
              </LinkButton>
            ) : null}
          </>
        }
      />

      {myItems.length ? (
        <Card title={`Your open steps · ${myItems.length}`} className="mb-6">
          <ul className="divide-y divide-line">
            {myItems.map((it) => (
              <ChecklistItemRow key={it.id} item={it} today={t} canTick back="/checklists" showChecklist />
            ))}
          </ul>
        </Card>
      ) : null}

      {lists.length === 0 ? (
        <EmptyState title="No checklists" description={canStart ? "Start one for a new joiner or a leaver." : "Your onboarding or offboarding checklist will appear here."} />
      ) : (
        <Table>
          <thead>
            <tr><Th>Person</Th><Th>Type</Th><Th>Progress</Th><Th>Next due</Th><Th className="text-right">&nbsp;</Th></tr>
          </thead>
          <tbody>
            {lists.map((l) => {
              const p = progressOf(l.items, t);
              const next = l.items.filter((i) => !i.doneAt).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
              return (
                <Tr key={l.id}>
                  <Td className="max-w-[260px]"><PersonCell person={l.employee} subtitle={l.employee.title} size="sm" /></Td>
                  <Td><KindBadge kind={l.kind} /></Td>
                  <Td><ChecklistProgress items={l.items} today={t} /></Td>
                  <Td className="text-muted">{p.done === p.total ? "Complete" : next ? `${Math.round((next.dueDate.getTime() - t.getTime()) / 86_400_000)} days` : "—"}</Td>
                  <Td className="text-right"><Link href={`/checklists/${l.id}`} className="text-sm font-medium text-accent-ink hover:underline">Open</Link></Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
