import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditContactDetails, canEditEmployeeRecord, canViewEmployeeDetails, canViewOneOnOne, canViewSalary } from "@/lib/permissions";
import { label } from "@/lib/constants";
import { Avatar, Badge, LinkButton } from "@/components/ui";
import { StatusBadge } from "@/components/people/bits";
import { ProfileTabs, type Tab } from "@/components/people/profile-tabs";

export default async function ProfileLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const person = await prisma.employee.findUnique({
    where: { id },
    select: { id: true, firstName: true, lastName: true, title: true, status: true, employmentType: true, appRole: true, managerId: true, team: { select: { name: true } }, office: { select: { name: true } } },
  });
  if (!person) notFound();

  const details = canViewEmployeeDetails(user, id);
  const base = `/people/${id}`;
  const tabs: Tab[] = [{ href: base, label: "Overview" }];
  if (details) {
    tabs.push({ href: `${base}/leave`, label: "Leave" }, { href: `${base}/contracts`, label: "Contracts" }, { href: `${base}/goals`, label: "Goals" }, { href: `${base}/reviews`, label: "Reviews" });
    if (canViewOneOnOne(user, { employeeId: id, managerId: person.managerId ?? "" }) || user.id === id) tabs.push({ href: `${base}/one-on-ones`, label: "1:1s" });
    if (canViewSalary(user, id)) tabs.push({ href: `${base}/compensation`, label: "Compensation" });
    tabs.push({ href: `${base}/checklists`, label: "Checklists" });
  }
  const canEdit = canEditEmployeeRecord(user, id) || canEditContactDetails(user, id);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar firstName={person.firstName} lastName={person.lastName} size="xl" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {person.firstName} {person.lastName}
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              {person.title} · {person.team.name} · {person.office.name}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusBadge status={person.status} />
              <Badge>{label(person.employmentType)}</Badge>
              {details ? <Badge tone="accent">{label(person.appRole)} access</Badge> : null}
            </div>
          </div>
        </div>
        {canEdit ? (
          <LinkButton href={`${base}/edit`}>
            <Pencil className="h-4 w-4" aria-hidden />
            Edit
          </LinkButton>
        ) : null}
      </div>
      <ProfileTabs tabs={tabs} />
      <div className="pt-6">{children}</div>
    </>
  );
}
