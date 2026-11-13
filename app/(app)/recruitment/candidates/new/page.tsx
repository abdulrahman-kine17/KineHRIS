import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditRecruiting } from "@/lib/permissions";
import { PageHeader } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { CandidateForm } from "@/components/recruitment/forms";

export default async function NewCandidatePage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const user = await requireUser();
  if (!canEditRecruiting(user)) return <Forbidden what="editing candidates" />;
  const { role } = await searchParams;
  const roles = await prisma.role.findMany({ where: { status: { in: ["open", "on_hold"] } }, orderBy: { title: "asc" }, select: { id: true, title: true, office: { select: { name: true } } } });
  return (
    <>
      <PageHeader title="Add candidate" description="They start in Applied." />
      <CandidateForm values={{ roleId: role ?? "", name: "", email: "", phone: "", source: "", notes: "" }} roles={roles.map((r) => ({ id: r.id, name: `${r.title} · ${r.office.name}` }))} cancelHref={role ? `/recruitment/pipeline?role=${role}` : "/recruitment/pipeline"} />
    </>
  );
}
