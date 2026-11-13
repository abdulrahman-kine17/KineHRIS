import Link from "next/link";
import { Badge } from "@/components/ui";
import { label } from "@/lib/constants";
import { DECISION_TONE, RECOMMENDATION_TONE, ROLE_TONE, STAGE_TONE } from "@/lib/recruiting";

export function StageBadge({ stage }: { stage: string }) {
  return <Badge tone={STAGE_TONE[stage] ?? "neutral"}>{label(stage)}</Badge>;
}
export function DecisionBadge({ decision }: { decision: string | null }) {
  if (!decision) return <Badge>No decision</Badge>;
  return <Badge tone={DECISION_TONE[decision]}>{decision === "hire" ? "Hire" : "No hire"}</Badge>;
}
export function RoleStatusBadge({ status }: { status: string }) {
  return <Badge tone={ROLE_TONE[status] ?? "neutral"}>{label(status)}</Badge>;
}
export function RecommendationBadge({ value }: { value: string }) {
  return <Badge tone={RECOMMENDATION_TONE[value] ?? "neutral"}>{label(value)}</Badge>;
}

export function RecruitingHeaderTabs() {
  return [
    { href: "/recruitment", label: "Roles" },
    { href: "/recruitment/pipeline", label: "Pipeline" },
    { href: "/recruitment/outcomes", label: "Outcomes" },
  ];
}

export function CandidateLink({ id, name, className = "" }: { id: string; name: string; className?: string }) {
  return (
    <Link href={`/recruitment/candidates/${id}`} className={`font-medium underline-offset-2 hover:underline ${className}`}>
      {name}
    </Link>
  );
}

/** Score 1–5 shown as filled dots. */
export function Dots({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`h-2 w-2 rounded-full ${i <= value ? "bg-accent" : "bg-neutral-soft"}`} />
      ))}
    </span>
  );
}
