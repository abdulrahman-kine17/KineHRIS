"use client";

// Search + office + team filters, kept in the URL so lists are linkable.
// Changes apply straight away: selects on change, search after a short pause.
import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { inputClass } from "./ui";

export type Option = { id: string; name: string };

export function FilterBar({
  basePath,
  q,
  office,
  team,
  offices,
  teams,
  extra,
}: {
  basePath: string;
  q: string;
  office: string;
  team: string;
  offices: Option[];
  teams: Option[];
  /** Extra controls rendered in the same row; they apply on change too. */
  extra?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apply = () => {
    if (!form.current) return;
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of new FormData(form.current).entries()) {
      if (typeof v !== "string") continue;
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const hasFilters = Boolean(q || office || team);

  return (
    <form
      ref={form}
      method="get"
      action={basePath}
      role="search"
      className="mb-5 flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      onChange={(e) => {
        const el = e.target as unknown as HTMLInputElement;
        if (el.tagName === "INPUT" && el.type === "search") {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(apply, 250);
        } else apply();
      }}
    >
      <label className="relative">
        <span className="sr-only">Search</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <input type="search" name="q" defaultValue={q} placeholder="Search people" className={`${inputClass} w-72 pl-9`} />
      </label>
      <label>
        <span className="sr-only">Office</span>
        <select name="office" defaultValue={office} className={`${inputClass} w-40`}>
          <option value="">All offices</option>
          {offices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Team</span>
        <select name="team" defaultValue={team} className={`${inputClass} w-40`}>
          <option value="">All teams</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      {extra}
      {hasFilters ? (
        <Link href={basePath} className="inline-flex h-10 items-center gap-1 rounded-full px-3 text-sm text-muted hover:bg-hover hover:text-ink">
          <X className="h-3.5 w-3.5" aria-hidden />
          Clear
        </Link>
      ) : null}
    </form>
  );
}
