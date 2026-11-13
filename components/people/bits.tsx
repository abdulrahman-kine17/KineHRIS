import Link from "next/link";
import { Avatar, Badge, Progress, type Tone } from "@/components/ui";
import { label } from "@/lib/constants";

const STATUS_TONE: Record<string, Tone> = { active: "success", probation: "warning", notice: "danger", left: "neutral" };

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{label(status)}</Badge>;
}

export function CompletenessBar({ filled, total, percent }: { filled: number; total: number; percent: number }) {
  return <Progress percent={percent} label={`${filled} of ${total} mandatory fields`} />;
}

type P = { id: string; firstName: string; lastName: string };

/** Plain name link. */
export function PersonLink({ id, firstName, lastName, className = "" }: P & { className?: string }) {
  return (
    <Link href={`/people/${id}`} className={`underline-offset-2 hover:underline ${className}`}>
      {firstName} {lastName}
    </Link>
  );
}

/** Avatar + name, optional second line. Truncates with a tooltip. */
export function PersonCell({ person, subtitle, size = "md" }: { person: P; subtitle?: string | null; size?: "sm" | "md" | "lg" }) {
  const name = `${person.firstName} ${person.lastName}`;
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar firstName={person.firstName} lastName={person.lastName} size={size} />
      <span className="min-w-0">
        <Link href={`/people/${person.id}`} className="block truncate font-medium text-ink underline-offset-2 hover:underline" title={name}>
          {name}
        </Link>
        {subtitle ? (
          <span className="block truncate text-xs text-muted" title={subtitle}>
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
