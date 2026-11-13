import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditContract } from "@/lib/permissions";
import { isoDate, today } from "@/lib/dates";
import { PageHeader } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { ContractForm } from "@/components/contracts/contract-form";

export default async function NewContractPage({ searchParams }: { searchParams: Promise<{ employee?: string }> }) {
  const user = await requireUser();
  if (!canEditContract(user)) return <Forbidden what="managing contracts" />;
  const { employee } = await searchParams;
  const people = await prisma.employee.findMany({ orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true, title: true, status: true } });
  return (
    <>
      <PageHeader title="New contract" description="Starts as a draft. Advance it from the list as signatures come in." />
      <ContractForm
        values={{ employeeId: employee ?? "", title: "", type: "permanent", startDate: isoDate(today()), endDate: "", status: "draft", fileRef: "" }}
        people={people.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName} — ${p.title}${p.status === "left" ? " (left)" : ""}` }))}
        lockPerson={Boolean(employee)}
        cancelHref={employee ? `/people/${employee}/contracts` : "/contracts"}
      />
    </>
  );
}
