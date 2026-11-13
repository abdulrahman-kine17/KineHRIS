"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Briefcase,
  CalendarDays,
  FileSignature,
  Home,
  LayoutDashboard,
  ListChecks,
  Target,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string };

const ICONS: Record<string, LucideIcon> = {
  "/": Home,
  "/dashboard": LayoutDashboard,
  "/people": Users,
  "/leave": CalendarDays,
  "/contracts": FileSignature,
  "/reminders": Bell,
  "/recruitment": Briefcase,
  "/checklists": ListChecks,
  "/performance": Target,
  "/compensation": Wallet,
};

export function Nav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5 px-3" aria-label="Main">
      {items.map((it) => {
        const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
        const Icon = ICONS[it.href];
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-accent-soft text-accent-ink" : "text-muted hover:bg-hover hover:text-ink"
            }`}
          >
            {Icon ? <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden /> : null}
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
