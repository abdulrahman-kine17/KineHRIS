import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { Badge, EmptyState, LinkButton, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { PersonCell } from "@/components/people/bits";
import { PerformanceTabs } from "@/components/performance/bits";

export default async function OneOnOnesPage() {
  const user = await requireUser();
  const ones = await prisma.oneOnOne.findMany({
    where: { OR: [{ employeeId: user.id }, { managerId: user.id }] },
    orderBy: { date: "desc" },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, title: true } },
      manager: { select: { id: true, firstName: true, lastName: true, title: true } },
      actionItems: { select: { doneAt: true, ownerId: true } },
    },
  });
  const hasReports = user.reportIds.length > 0;
  const openMine = ones.flatMap((o) => o.actionItems).filter((a) => !a.doneAt && a.ownerId === user.id).length;

  return (
    <>
      <PageHeader
        title="Performance"
        count={`${ones.length} 1:1${ones.length === 1 ? "" : "s"}${openMine ? ` · ${openMine} open action item${openMine === 1 ? "" : "s"} on you` : ""}`}
        actions={
          <>
            <PerformanceTabs active="/performance/one-on-ones" />
            {hasReports ? (
              <LinkButton href="/performance/one-on-ones/new" variant="primary"><Plus className="h-4 w-4" aria-hidden />Log a 1:1</LinkButton>
            ) : null}
          </>
        }
      />
      <p className="mb-4 text-sm text-muted">Notes and action items are visible only to the two people in the 1:1.</p>
      {ones.length === 0 ? (
        <EmptyState title="No 1:1s yet" description={hasReports ? "Log your first one with a report." : "Your manager logs these after you meet."} />
      ) : (
        <Table>
          <thead>
            <tr><Th>Date</Th><Th>With</Th><Th>Action items</Th><Th className="text-right">&nbsp;</Th></tr>
          </thead>
          <tbody>
            {ones.map((o) => {
              const other = o.employeeId === user.id ? o.manager : o.employee;
              const open = o.actionItems.filter((a) => !a.doneAt).length;
              return (
                <Tr key={o.id}>
                  <Td className="whitespace-nowrap tabular-nums">{formatDate(o.date)}</Td>
                  <Td className="max-w-[260px]"><PersonCell person={other} subtitle={o.employeeId === user.id ? "your manager" : other.title} size="sm" /></Td>
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
