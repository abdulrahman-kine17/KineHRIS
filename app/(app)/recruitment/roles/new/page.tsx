import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditRecruiting } from "@/lib/permissions";
import { isoDate, today } from "@/lib/dates";
import { PageHeader } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { RoleForm } from "@/components/recruitment/forms";

export default async function NewRolePage() {
  const user = await requireUser();
  if (!canEditRecruiting(user)) return <Forbidden what="editing roles" />;
  const [teams, offices, managers] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.office.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.employee.findMany({ where: { status: { not: "left" }, appRole: { in: ["admin", "manager"] } }, orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true, title: true } }),
  ]);
  return (
    <>
      <PageHeader title="New role" />
      <RoleForm
        values={{ title: "", teamId: "", officeId: "", hiringManagerId: user.appRole !== "employee" ? user.id : "", status: "open", openedAt: isoDate(today()), description: "" }}
        teams={teams}
        offices={offices}
        managers={managers.map((m) => ({ id: m.id, name: `${m.firstName} ${m.lastName} — ${m.title}` }))}
        cancelHref="/recruitment"
      />
    </>
  );
}
