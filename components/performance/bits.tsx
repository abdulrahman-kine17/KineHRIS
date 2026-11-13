import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge, Segmented } from "@/components/ui";
import { label } from "@/lib/constants";
import { CYCLE_TONE, GOAL_TONE, REVIEW_STATUS_TONE, nextQuarter, prevQuarter, quarterKey, quarterLabel, type Quarter } from "@/lib/performance";

export function GoalStatusBadge({ status }: { status: string }) {
  return <Badge tone={GOAL_TONE[status] ?? "neutral"}>{label(status)}</Badge>;
}
export function ReviewStatusBadge({ status }: { status: string }) {
  if (status === "missing") return <Badge tone="danger">Not started</Badge>;
  return <Badge tone={REVIEW_STATUS_TONE[status] ?? "neutral"}>{label(status)}</Badge>;
}
export function CycleStatusBadge({ status }: { status: string }) {
  return <Badge tone={CYCLE_TONE[status] ?? "neutral"}>{label(status)}</Badge>;
}

export const PERFORMANCE_TABS = [
  { href: "/performance", label: "Goals" },
  { href: "/performance/one-on-ones", label: "1:1s" },
  { href: "/performance/reviews", label: "Reviews" },
];

export function PerformanceTabs({ active }: { active: string }) {
  return <Segmented items={PERFORMANCE_TABS} active={active} />;
}

/** ‹ Q4 2026 › navigation that keeps the rest of the URL. */
export function QuarterNav({ q, hrefFor }: { q: Quarter; hrefFor: (q: Quarter) => string }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-surface p-0.5">
      <Link href={hrefFor(prevQuarter(q))} className="rounded-full p-2 hover:bg-hover" aria-label="Previous quarter">
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="min-w-24 text-center text-sm font-medium">{quarterLabel(q)}</span>
      <Link href={hrefFor(nextQuarter(q))} className="rounded-full p-2 hover:bg-hover" aria-label="Next quarter">
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export { quarterKey };
