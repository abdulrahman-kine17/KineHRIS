import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditRecruiting } from "@/lib/permissions";
import { isoDate } from "@/lib/dates";
import { PageHeader } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { RoleForm } from "@/components/recruitment/forms";

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canEditRecruiting(user)) return <Forbidden what="editing roles" />;
  const { id } = await params;
  const [r, teams, offices, managers] = await Promise.all([
    prisma.role.findUnique({ where: { id } }),
    prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.office.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.employee.findMany({ where: { status: { not: "left" }, appRole: { in: ["admin", "manager"] } }, orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true, title: true } }),
  ]);
  if (!r) notFound();
  return (
    <>
      <PageHeader title="Edit role" description={r.title} />
      <RoleForm
        values={{ id: r.id, title: r.title, teamId: r.teamId, officeId: r.officeId, hiringManagerId: r.hiringManagerId, status: r.status, openedAt: isoDate(r.openedAt), description: r.description ?? "" }}
        teams={teams}
        offices={offices}
        managers={managers.map((m) => ({ id: m.id, name: `${m.firstName} ${m.lastName} — ${m.title}` }))}
        cancelHref="/recruitment"
      />
    </>
  );
}
