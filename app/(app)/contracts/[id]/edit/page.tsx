import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditContract } from "@/lib/permissions";
import { isoDate } from "@/lib/dates";
import { PageHeader } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { ContractForm } from "@/components/contracts/contract-form";

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canEditContract(user)) return <Forbidden what="managing contracts" />;
  const { id } = await params;
  const c = await prisma.contract.findUnique({ where: { id }, include: { employee: { select: { id: true, firstName: true, lastName: true, title: true } } } });
  if (!c) notFound();
  return (
    <>
      <PageHeader title="Edit contract" description={`${c.employee.firstName} ${c.employee.lastName}`} />
      <ContractForm
        values={{ id: c.id, employeeId: c.employeeId, title: c.title, type: c.type, startDate: isoDate(c.startDate), endDate: isoDate(c.endDate), status: c.status, fileRef: c.fileRef ?? "" }}
        people={[{ id: c.employee.id, name: `${c.employee.firstName} ${c.employee.lastName} — ${c.employee.title}` }]}
        lockPerson
        cancelHref="/contracts"
      />
    </>
  );
}
