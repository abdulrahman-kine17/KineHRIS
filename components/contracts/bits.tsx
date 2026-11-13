import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge, Button, Dash, EmptyState, Table, Td, Th, Tr } from "@/components/ui";
import { label } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { ADVANCE_LABEL, CONTRACT_TONE, NEXT_STEP } from "@/lib/contracts";
import { PersonCell } from "@/components/people/bits";
import { advanceContract } from "@/app/(app)/contracts/actions";

export function ContractStatusBadge({ status }: { status: string }) {
  return <Badge tone={CONTRACT_TONE[status] ?? "neutral"}>{label(status)}</Badge>;
}

export type ContractRow = {
  id: string;
  title: string;
  type: string;
  startDate: Date;
  endDate: Date | null;
  status: string;
  fileRef: string | null;
  employee?: { id: string; firstName: string; lastName: string; title?: string };
};

export function ContractTable({ rows, showPerson = true, canEdit = false, back = "/contracts", emptyTitle = "No contracts", emptyDescription = "Contracts will show up here." }: { rows: ContractRow[]; showPerson?: boolean; canEdit?: boolean; back?: string; emptyTitle?: string; emptyDescription?: string }) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return (
    <Table>
      <thead>
        <tr>
          {showPerson ? <Th>Person</Th> : null}
          <Th>Contract</Th>
          <Th>Start</Th>
          <Th>End</Th>
          <Th>Status</Th>
          <Th>Next step</Th>
          {canEdit ? <Th className="text-right">&nbsp;</Th> : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <Tr key={c.id}>
            {showPerson && c.employee ? (
              <Td className="max-w-[240px]">
                <PersonCell person={c.employee} subtitle={c.employee.title} size="sm" />
              </Td>
            ) : null}
            <Td className="max-w-[260px]">
              <span className="block truncate font-medium" title={c.title}>
                {c.title}
              </span>
              <span className="block text-xs text-muted">
                {label(c.type)}
                {c.fileRef ? ` · ${c.fileRef}` : ""}
              </span>
            </Td>
            <Td className="whitespace-nowrap tabular-nums">{formatDate(c.startDate)}</Td>
            <Td className="whitespace-nowrap tabular-nums">{c.endDate ? formatDate(c.endDate) : <Dash />}</Td>
            <Td>
              <ContractStatusBadge status={c.status} />
            </Td>
            <Td className="text-muted">{NEXT_STEP[c.status]}</Td>
            {canEdit ? (
              <Td className="text-right">
                <span className="inline-flex items-center gap-1">
                  {ADVANCE_LABEL[c.status] ? (
                    <form action={advanceContract}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="back" value={back} />
                      <Button type="submit" variant="secondary" size="sm">
                        {ADVANCE_LABEL[c.status]}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </form>
                  ) : null}
                  <Link href={`/contracts/${c.id}/edit`} className="rounded-full px-3 py-1.5 text-[13px] font-medium text-muted hover:bg-hover hover:text-ink">
                    Edit
                  </Link>
                </span>
              </Td>
            ) : null}
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
