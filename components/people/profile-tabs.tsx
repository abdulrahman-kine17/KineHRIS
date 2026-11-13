"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type Tab = { href: string; label: string };

export function ProfileTabs({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();
  const base = tabs[0]?.href ?? "";
  return (
    <nav className="flex flex-wrap gap-1 border-b border-line" aria-label="Profile sections">
      {tabs.map((t) => {
        const active = t.href === base ? pathname === base || pathname === `${base}/edit` : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium ${active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
