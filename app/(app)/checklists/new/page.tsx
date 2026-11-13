import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { visibleEmployeeIds } from "@/lib/permissions";
import { PageHeader } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { NewChecklistForm } from "@/components/checklists/forms";

export default async function NewChecklistPage({ searchParams }: { searchParams: Promise<{ employee?: string; kind?: string }> }) {
  const user = await requireUser();
  if (user.appRole === "employee") return <Forbidden what="starting checklists" />;
  const { employee, kind } = await searchParams;
  const ids = visibleEmployeeIds(user);
  const people = await prisma.employee.findMany({
    where: { ...(ids ? { id: { in: ids.filter((i) => i !== user.id) } } : {}), status: { not: "left" } },
    orderBy: { lastName: "asc" },
    select: { id: true, firstName: true, lastName: true, title: true },
  });
  return (
    <>
      <PageHeader title="Start a checklist" description="Creates the steps from the template with owners and due dates. You can add more afterwards." />
      <NewChecklistForm people={people.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName} — ${p.title}` }))} defaults={{ employeeId: employee ?? "", kind: kind === "offboarding" ? "offboarding" : "onboarding" }} cancelHref={employee ? `/people/${employee}/checklists` : "/checklists"} />
    </>
  );
}
