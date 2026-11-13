import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditContactDetails, canEditEmployeeRecord, isAdmin } from "@/lib/permissions";
import { isoDate } from "@/lib/dates";
import { Forbidden } from "@/components/forbidden";
import { EmployeeForm } from "@/components/people/employee-form";

export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const p = await prisma.employee.findUnique({ where: { id } });
  if (!p) notFound();

  const canEditRecord = canEditEmployeeRecord(user, id);
  const canEditContact = canEditContactDetails(user, id);
  if (!canEditRecord && !canEditContact) return <Forbidden what="editing this person" />;

  const [teams, offices, managers] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.office.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.employee.findMany({ where: { status: { not: "left" } }, orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true, title: true } }),
  ]);

  return (
    <>
      <p className="mb-6 text-sm text-muted">
        {canEditRecord ? "Editing the full record." : "You can update your own contact details. Ask HR or your manager to change the rest."}
      </p>
      <EmployeeForm
        values={{
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          workEmail: p.workEmail,
          title: p.title,
          teamId: p.teamId,
          officeId: p.officeId,
          managerId: p.managerId ?? "",
          startDate: isoDate(p.startDate),
          endDate: isoDate(p.endDate),
          probationEndDate: isoDate(p.probationEndDate),
          employmentType: p.employmentType,
          status: p.status,
          appRole: p.appRole,
          personalEmail: p.personalEmail ?? "",
          phone: p.phone ?? "",
          address: p.address ?? "",
          emergencyContactName: p.emergencyContactName ?? "",
          emergencyContactPhone: p.emergencyContactPhone ?? "",
        }}
        teams={teams}
        offices={offices}
        managers={managers.map((m) => ({ id: m.id, name: `${m.firstName} ${m.lastName} — ${m.title}` }))}
        canEditRecord={canEditRecord}
        canEditContact={canEditContact}
        canEditRole={isAdmin(user)}
        cancelHref={`/people/${id}`}
      />
    </>
  );
}
