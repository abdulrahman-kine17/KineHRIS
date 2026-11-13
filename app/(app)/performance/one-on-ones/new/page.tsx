import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isoDate, today } from "@/lib/dates";
import { PageHeader } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { OneOnOneForm } from "@/components/performance/forms";

export default async function NewOneOnOnePage({ searchParams }: { searchParams: Promise<{ employee?: string }> }) {
  const user = await requireUser();
  if (user.reportIds.length === 0) return <Forbidden what="logging 1:1s. Only managers log them, with their reports" />;
  const { employee } = await searchParams;
  const reports = await prisma.employee.findMany({ where: { id: { in: user.reportIds }, status: { not: "left" } }, orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true, title: true } });
  return (
    <>
      <PageHeader title="Log a 1:1" />
      <OneOnOneForm reports={reports.map((r) => ({ id: r.id, name: `${r.firstName} ${r.lastName} — ${r.title}` }))} defaultEmployeeId={employee ?? ""} defaultDate={isoDate(today())} cancelHref="/performance/one-on-ones" />
    </>
  );
}
