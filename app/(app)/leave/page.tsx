import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBalances } from "@/lib/leave";
import { pendingForApprover } from "@/lib/leave-scope";
import { today } from "@/lib/dates";
import { LeaveHeader } from "@/components/leave/header";
import { BalanceCards, LeaveTable } from "@/components/leave/bits";

export default async function MyLeavePage() {
  const user = await requireUser();
  const year = today().getUTCFullYear();
  const [balances, requests, pendingCount] = await Promise.all([
    getBalances(user.id, year),
    prisma.leaveRequest.findMany({
      where: { employeeId: user.id },
      orderBy: { startDate: "desc" },
      include: { approver: { select: { firstName: true, lastName: true } } },
    }),
    pendingForApprover(user),
  ]);

  return (
    <>
      <LeaveHeader user={user} active="/leave" pendingCount={pendingCount} />
      <BalanceCards balances={balances} year={year} />
      <h2 className="mb-3 mt-8 text-sm font-semibold">Your requests</h2>
      <LeaveTable rows={requests} canCancel emptyTitle="No requests yet" emptyDescription="Use Request leave to ask for annual, remote or unpaid days." />
    </>
  );
}
