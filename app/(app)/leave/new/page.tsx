import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canRequestLeaveFor } from "@/lib/permissions";
import { getBalances, officeCalendar } from "@/lib/leave";
import { isoDate, today } from "@/lib/dates";
import { PageHeader } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { LeaveRequestForm } from "@/components/leave/request-form";

export default async function NewLeavePage({ searchParams }: { searchParams: Promise<{ employee?: string }> }) {
  const user = await requireUser();
  const { employee } = await searchParams;
  const employeeId = employee || user.id;
  if (!canRequestLeaveFor(user, employeeId)) return <Forbidden what="requesting leave for other people" />;

  const person = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true, firstName: true, lastName: true, officeId: true, status: true } });
  if (!person) notFound();
  const t = today();
  const [cal, balances] = await Promise.all([officeCalendar(person.officeId), getBalances(person.id, t.getUTCFullYear())]);
  const forSelf = person.id === user.id;

  return (
    <>
      <PageHeader title="Request leave" description={forSelf ? "Your manager will be asked to approve it." : `For ${person.firstName} ${person.lastName}. It still goes through approval.`} />
      <LeaveRequestForm
        employeeId={person.id}
        forName={forSelf ? undefined : `${person.firstName} ${person.lastName}`}
        weekendDays={cal.weekendRaw}
        holidays={cal.holidayList.map((h) => isoDate(h.date))}
        balances={balances}
        defaultStart={isoDate(t)}
        cancelHref={forSelf ? "/leave" : `/people/${person.id}/leave`}
      />
    </>
  );
}
