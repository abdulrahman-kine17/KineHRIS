import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canCreateEmployee } from "@/lib/permissions";
import { PageHeader } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";
import { EmployeeForm } from "@/components/people/employee-form";
import { isoDate, today } from "@/lib/dates";

export default async function NewPersonPage() {
  const user = await requireUser();
  if (!canCreateEmployee(user)) return <Forbidden what="adding people" />;

  const [teams, offices, managers] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.office.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.employee.findMany({ where: { status: { not: "left" } }, orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true, title: true } }),
  ]);

  return (
    <>
      <PageHeader title="Add a person" description="Creates the employee record. Contracts, salary and leave balances are added from their profile." />
      <EmployeeForm
        values={{
          firstName: "", lastName: "", workEmail: "", title: "", teamId: "", officeId: "", managerId: "",
          startDate: isoDate(today()), endDate: "", probationEndDate: "", employmentType: "full_time", status: "probation", appRole: "employee",
          personalEmail: "", phone: "", address: "", emergencyContactName: "", emergencyContactPhone: "",
        }}
        teams={teams}
        offices={offices}
        managers={managers.map((m) => ({ id: m.id, name: `${m.firstName} ${m.lastName} — ${m.title}` }))}
        canEditRecord
        canEditContact
        canEditRole
        cancelHref="/people"
      />
    </>
  );
}
