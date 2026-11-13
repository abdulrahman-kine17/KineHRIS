import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canViewEmployeeDetails } from "@/lib/permissions";
import { completeness } from "@/lib/people";
import { formatDate } from "@/lib/dates";
import { label } from "@/lib/constants";
import { Card, Dl } from "@/components/ui";
import { CompletenessBar, PersonCell, PersonLink, StatusBadge } from "@/components/people/bits";

export default async function ProfileOverview({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const p = await prisma.employee.findUnique({
    where: { id },
    include: {
      team: { select: { name: true } },
      office: { select: { name: true, city: true, country: true } },
      manager: { select: { id: true, firstName: true, lastName: true, title: true } },
      reports: { where: { status: { not: "left" } }, orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true, title: true, status: true } },
      _count: { select: { reports: true } },
    },
  });
  if (!p) notFound();

  const details = canViewEmployeeDetails(user, id);

  if (!details) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Directory">
          <Dl
            items={[
              { label: "Title", value: p.title },
              { label: "Team", value: p.team.name },
              { label: "Office", value: p.office.name },
              { label: "Manager", value: p.manager ? <PersonLink {...p.manager} /> : "—" },
              { label: "Work email", value: <a className="text-accent-ink underline-offset-2 hover:underline" href={`mailto:${p.workEmail}`}>{p.workEmail}</a> },
            ]}
          />
        </Card>
        <Card title="Reports">
          {p.reports.length ? <ReportList reports={p.reports} /> : <p className="text-sm text-muted">No direct reports.</p>}
        </Card>
        <p className="text-sm text-muted md:col-span-2">Contact details and dates are visible to the person, their manager chain and HR.</p>
      </div>
    );
  }

  const c = completeness({ ...p, isOrgRoot: !p.managerId && p._count.reports > 0 });

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Role">
          <Dl
            items={[
              { label: "Title", value: p.title },
              { label: "Team", value: p.team.name },
              { label: "Manager", value: p.manager ? <PersonLink {...p.manager} /> : <span className="text-muted">None (top of org chart)</span> },
              { label: "Office", value: `${p.office.name}, ${p.office.country}` },
              { label: "Employment type", value: label(p.employmentType) },
              { label: "Status", value: <StatusBadge status={p.status} /> },
              { label: "Start date", value: formatDate(p.startDate) },
              { label: "Probation ends", value: formatDate(p.probationEndDate) },
              { label: "End date", value: formatDate(p.endDate) },
              { label: "Access level", value: label(p.appRole) },
            ]}
          />
        </Card>
        <Card title="Contact">
          <Dl
            items={[
              { label: "Work email", value: <a className="text-accent-ink underline-offset-2 hover:underline" href={`mailto:${p.workEmail}`}>{p.workEmail}</a> },
              { label: "Personal email", value: p.personalEmail },
              { label: "Phone", value: p.phone },
              { label: "Address", value: p.address },
              { label: "Emergency contact", value: p.emergencyContactName ? `${p.emergencyContactName}${p.emergencyContactPhone ? ` · ${p.emergencyContactPhone}` : ""}` : null },
            ]}
          />
        </Card>
        <Card title="Record completeness">
          <div className="mb-3 flex items-center gap-3">
            <CompletenessBar {...c} />
            <span className="text-sm text-muted">
              {c.filled} of {c.total} mandatory fields
            </span>
          </div>
          {c.complete ? (
            <p className="text-sm">All mandatory fields are filled.</p>
          ) : (
            <>
              <p className="text-sm">Missing:</p>
              <ul className="mt-1 list-inside list-disc text-sm">
                {c.missingLabels.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              <Link href={`/people/${id}/edit`} className="mt-3 inline-block text-sm font-medium text-accent-ink underline-offset-2 hover:underline">
                Fill in
              </Link>
            </>
          )}
        </Card>
        <Card title={`Direct reports (${p.reports.length})`}>
          {p.reports.length ? <ReportList reports={p.reports} /> : <p className="text-sm text-muted">No direct reports.</p>}
        </Card>
      </div>
    </>
  );
}

function ReportList({ reports }: { reports: { id: string; firstName: string; lastName: string; title: string; status: string }[] }) {
  return (
    <ul className="divide-y divide-line text-sm">
      {reports.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 py-2">
          <PersonCell person={r} subtitle={r.title} size="sm" />
          <StatusBadge status={r.status} />
        </li>
      ))}
    </ul>
  );
}
