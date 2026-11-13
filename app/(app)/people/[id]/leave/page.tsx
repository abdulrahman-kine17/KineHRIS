import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canRequestLeaveFor, canViewLeave } from "@/lib/permissions";
import { getBalances } from "@/lib/leave";
import { today } from "@/lib/dates";
import { LinkButton } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { BalanceCards, LeaveTable } from "@/components/leave/bits";

export default async function ProfileLeave({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!canViewLeave(user, id)) return <Forbidden what="this person's leave" />;
  const person = await prisma.employee.findUnique({ where: { id }, select: { id: true } });
  if (!person) notFound();
  const year = today().getUTCFullYear();
  const [balances, requests] = await Promise.all([
    getBalances(id, year),
    prisma.leaveRequest.findMany({ where: { employeeId: id }, orderBy: { startDate: "desc" }, include: { approver: { select: { firstName: true, lastName: true } } } }),
  ]);
  return (
    <>
      <div className="mb-4 flex justify-end">
        {canRequestLeaveFor(user, id) ? (
          <LinkButton href={user.id === id ? "/leave/new" : `/leave/new?employee=${id}`} variant="primary">
            <Plus className="h-4 w-4" aria-hidden />
            Request leave
          </LinkButton>
        ) : null}
      </div>
      <BalanceCards balances={balances} year={year} />
      <h2 className="mb-3 mt-8 text-sm font-semibold">Requests</h2>
      <LeaveTable rows={requests} canCancel={canRequestLeaveFor(user, id)} back={`/people/${id}/leave`} />
    </>
  );
}
