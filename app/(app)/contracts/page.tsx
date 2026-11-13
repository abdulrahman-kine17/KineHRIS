import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditContract, visibleEmployeeIds } from "@/lib/permissions";
import { CONTRACT_STATUSES, label } from "@/lib/constants";
import { parsePeopleFilters } from "@/lib/people";
import { NEXT_STEP } from "@/lib/contracts";
import { Card, LinkButton, PageHeader, inputClass } from "@/components/ui";
import { FilterBar } from "@/components/filter-bar";
import { ContractTable } from "@/components/contracts/bits";

export default async function ContractsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const f = parsePeopleFilters(sp);
  const status = typeof sp.status === "string" && ((CONTRACT_STATUSES as readonly string[]).includes(sp.status) || sp.status === "not_filed") ? sp.status : "";
  const statusWhere = status === "not_filed" ? { status: { not: "filed" } } : status ? { status } : {};
  const ids = visibleEmployeeIds(user);

  const employeeWhere = {
    ...(ids ? { id: { in: ids } } : {}),
    ...(f.office ? { officeId: f.office } : {}),
    ...(f.team ? { teamId: f.team } : {}),
    ...(f.q ? { OR: [{ firstName: { contains: f.q } }, { lastName: { contains: f.q } }, { title: { contains: f.q } }] } : {}),
  };

  const [contracts, offices, teams, counts] = await Promise.all([
    prisma.contract.findMany({
      where: { employee: employeeWhere, ...statusWhere },
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
      include: { employee: { select: { id: true, firstName: true, lastName: true, title: true } } },
    }),
    prisma.office.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.contract.groupBy({ by: ["status"], where: { employee: ids ? { id: { in: ids } } : {} }, _count: { _all: true } }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const waiting = [
    { status: "draft", n: count("draft") },
    { status: "signed_by_employee", n: count("signed_by_employee") },
    { status: "countersigned", n: count("countersigned") },
  ];
  const canEdit = canEditContract(user);

  return (
    <>
      <PageHeader
        title="Contracts"
        count={`${contracts.length} shown`}
        actions={
          canEdit ? (
            <LinkButton href="/contracts/new" variant="primary">
              <Plus className="h-4 w-4" aria-hidden />
              New contract
            </LinkButton>
          ) : null
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {waiting.map((w) => (
          <Link key={w.status} href={`/contracts?status=${w.status}`} className="block rounded-card transition-colors hover:bg-hover">
            <Card className={status === w.status ? "border-accent" : ""}>
              <p className="text-xs font-medium uppercase tracking-wider text-muted">{NEXT_STEP[w.status]}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{w.n}</p>
              <p className="mt-1 text-sm text-muted">{label(w.status)}</p>
            </Card>
          </Link>
        ))}
      </div>

      <FilterBar
        basePath="/contracts"
        q={f.q}
        office={f.office}
        team={f.team}
        offices={offices}
        teams={teams}
        extra={
          <label>
            <span className="sr-only">Status</span>
            <select name="status" defaultValue={status} className={`${inputClass} w-48`}>
              <option value="">All statuses</option>
              <option value="not_filed">Not fully signed</option>
              {CONTRACT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </label>
        }
      />

      <ContractTable rows={contracts} canEdit={canEdit} emptyTitle="No contracts match" emptyDescription="Try another status or clear the filters." />
      <p className="mt-3 text-xs text-muted">E-signature integration would go here. For now, mark each step as it happens.</p>
    </>
  );
}
