import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditChecklist, canViewChecklist } from "@/lib/permissions";
import { today } from "@/lib/dates";
import { Card, EmptyState, LinkButton } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { ChecklistProgress, KindBadge } from "@/components/checklists/bits";

export default async function ProfileChecklists({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!canViewChecklist(user, id)) return <Forbidden what="this person's checklists" />;
  const lists = await prisma.checklist.findMany({ where: { employeeId: id }, orderBy: { createdAt: "desc" }, include: { items: { select: { doneAt: true, dueDate: true } } } });
  const canEdit = canEditChecklist(user, id);
  const t = today();
  const has = (k: string) => lists.some((l) => l.kind === k);
  return (
    <>
      {canEdit ? (
        <div className="mb-4 flex justify-end gap-2">
          {!has("onboarding") ? <LinkButton href={`/checklists/new?employee=${id}&kind=onboarding`}><Plus className="h-4 w-4" aria-hidden />Start onboarding</LinkButton> : null}
          {!has("offboarding") ? <LinkButton href={`/checklists/new?employee=${id}&kind=offboarding`}><Plus className="h-4 w-4" aria-hidden />Start offboarding</LinkButton> : null}
        </div>
      ) : null}
      {lists.length === 0 ? (
        <EmptyState title="No checklists" description={canEdit ? "Start onboarding or offboarding from the buttons above." : "Nothing here yet."} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {lists.map((l) => (
            <Card key={l.id}>
              <div className="flex items-center justify-between">
                <KindBadge kind={l.kind} />
                <Link href={`/checklists/${l.id}`} className="text-sm font-medium text-accent-ink hover:underline">Open</Link>
              </div>
              <div className="mt-3"><ChecklistProgress items={l.items} today={t} /></div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
