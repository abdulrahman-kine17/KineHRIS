import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditContract, canViewContract } from "@/lib/permissions";
import { LinkButton } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { ContractTable } from "@/components/contracts/bits";

export default async function ProfileContracts({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!canViewContract(user, id)) return <Forbidden what="this person's contracts" />;
  const contracts = await prisma.contract.findMany({ where: { employeeId: id }, orderBy: { startDate: "desc" } });
  const canEdit = canEditContract(user);
  return (
    <>
      {canEdit ? (
        <div className="mb-4 flex justify-end">
          <LinkButton href={`/contracts/new?employee=${id}`} variant="primary">
            <Plus className="h-4 w-4" aria-hidden />
            New contract
          </LinkButton>
        </div>
      ) : null}
      <ContractTable rows={contracts} showPerson={false} canEdit={canEdit} back={`/people/${id}/contracts`} emptyTitle="No contracts on file" emptyDescription="Add one from New contract." />
    </>
  );
}
