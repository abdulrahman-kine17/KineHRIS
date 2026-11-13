import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditRecruiting } from "@/lib/permissions";
import { PageHeader } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { CandidateForm } from "@/components/recruitment/forms";

export default async function EditCandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canEditRecruiting(user)) return <Forbidden what="editing candidates" />;
  const { id } = await params;
  const [c, roles] = await Promise.all([
    prisma.candidate.findUnique({ where: { id } }),
    prisma.role.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true, office: { select: { name: true } } } }),
  ]);
  if (!c) notFound();
  return (
    <>
      <PageHeader title="Edit candidate" description={c.name} />
      <CandidateForm values={{ id: c.id, roleId: c.roleId, name: c.name, email: c.email, phone: c.phone ?? "", source: c.source ?? "", notes: c.notes ?? "" }} roles={roles.map((r) => ({ id: r.id, name: `${r.title} · ${r.office.name}` }))} cancelHref={`/recruitment/candidates/${c.id}`} />
    </>
  );
}
