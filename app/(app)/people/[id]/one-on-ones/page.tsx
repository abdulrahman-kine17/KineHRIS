import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isManagerOf } from "@/lib/permissions";
import { formatDate } from "@/lib/dates";
import { Badge, EmptyState, LinkButton, Table, Td, Th, Tr } from "@/components/ui";

export default async function ProfileOneOnOnes({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  // Only 1:1s the viewer is part of. Nobody else, including admins, sees these.
  const ones = await prisma.oneOnOne.findMany({
    where: { OR: [{ employeeId: id, managerId: user.id }, { employeeId: user.id, managerId: id }, ...(user.id === id ? [{ employeeId: id }, { managerId: id }] : [])] },
    orderBy: { date: "desc" },
    include: { employee: { select: { firstName: true, lastName: true } }, manager: { select: { firstName: true, lastName: true } }, actionItems: { select: { doneAt: true } } },
  });
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Private to the two people in each 1:1.</p>
        {isManagerOf(user, id) ? <LinkButton href={`/performance/one-on-ones/new?employee=${id}`} variant="primary"><Plus className="h-4 w-4" aria-hidden />Log a 1:1</LinkButton> : null}
      </div>
      {ones.length === 0 ? <EmptyState title="No 1:1s you can see" description="1:1s appear here for their two participants only." /> : (
        <Table>
          <thead><tr><Th>Date</Th><Th>Between</Th><Th>Action items</Th><Th className="text-right">&nbsp;</Th></tr></thead>
          <tbody>
            {ones.map((o) => {
              const open = o.actionItems.filter((a) => !a.doneAt).length;
              return (
                <Tr key={o.id}>
                  <Td className="whitespace-nowrap tabular-nums">{formatDate(o.date)}</Td>
                  <Td>{o.manager.firstName} {o.manager.lastName} · {o.employee.firstName} {o.employee.lastName}</Td>
                  <Td>{o.actionItems.length ? <Badge tone={open ? "warning" : "success"}>{open ? `${open} open` : "all done"}</Badge> : <span className="text-faint">—</span>}</Td>
                  <Td className="text-right"><Link href={`/performance/one-on-ones/${o.id}`} className="text-sm font-medium text-accent-ink hover:underline">Open</Link></Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
