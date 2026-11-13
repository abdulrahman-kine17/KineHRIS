import Link from "next/link";
import { Badge, Progress } from "@/components/ui";
import { label } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { PersonCell } from "@/components/people/bits";
import { toggleChecklistItem } from "@/app/(app)/checklists/actions";

export type ItemRow = { id: string; title: string; dueDate: Date; doneAt: Date | null; owner: { id: string; firstName: string; lastName: string; title?: string } };

export function progressOf(items: { doneAt: Date | null; dueDate: Date }[], today: Date) {
  const done = items.filter((i) => i.doneAt).length;
  const overdue = items.filter((i) => !i.doneAt && i.dueDate < today).length;
  return { done, total: items.length, overdue, percent: items.length ? Math.round((done / items.length) * 100) : 0 };
}

export function KindBadge({ kind }: { kind: string }) {
  return <Badge tone={kind === "onboarding" ? "accent" : "neutral"}>{label(kind)}</Badge>;
}

export function ChecklistProgress({ items, today }: { items: { doneAt: Date | null; dueDate: Date }[]; today: Date }) {
  const p = progressOf(items, today);
  return (
    <span className="inline-flex items-center gap-2">
      <Progress percent={p.percent} label={`${p.done} of ${p.total} done`} />
      <span className="text-xs text-muted">
        {p.done}/{p.total}
      </span>
      {p.overdue ? <Badge tone="danger">{p.overdue} overdue</Badge> : null}
    </span>
  );
}

/** One checklist item with a tick box. `canTick` is decided by the caller per item. */
export function ChecklistItemRow({ item, today, canTick, back, showChecklist }: { item: ItemRow & { checklist?: { id: string; kind: string; employee: { firstName: string; lastName: string } } }; today: Date; canTick: boolean; back: string; showChecklist?: boolean }) {
  const overdue = !item.doneAt && item.dueDate < today;
  return (
    <li className="flex items-center gap-3 py-2.5">
      <form action={toggleChecklistItem}>
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="back" value={back} />
        <button
          type="submit"
          disabled={!canTick}
          aria-label={item.doneAt ? `Mark "${item.title}" as not done` : `Mark "${item.title}" as done`}
          className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
            item.doneAt ? "border-accent bg-accent text-white" : "border-line-strong bg-surface hover:border-accent"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {item.doneAt ? (
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M3.5 8.5l3 3 6-6" />
            </svg>
          ) : null}
        </button>
      </form>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${item.doneAt ? "text-muted line-through" : ""}`} title={item.title}>
          {item.title}
        </p>
        {showChecklist && item.checklist ? (
          <p className="truncate text-xs text-muted">
            <Link href={`/checklists/${item.checklist.id}`} className="hover:underline">
              {label(item.checklist.kind)} · {item.checklist.employee.firstName} {item.checklist.employee.lastName}
            </Link>
          </p>
        ) : null}
      </div>
      <div className="hidden w-44 sm:block">
        <PersonCell person={item.owner} size="sm" />
      </div>
      <div className="w-28 text-right text-xs tabular-nums">
        {item.doneAt ? <span className="text-muted">done {formatDate(item.doneAt)}</span> : overdue ? <Badge tone="danger">{formatDate(item.dueDate)}</Badge> : <span className="text-muted">{formatDate(item.dueDate)}</span>}
      </div>
    </li>
  );
}
