import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { canViewDashboard, canViewRecruiting, canViewReminders } from "@/lib/permissions";
import type { NavItem } from "@/components/nav";
import { AppShell } from "@/components/app-shell";
import { Avatar } from "@/components/ui";
import { Toast } from "@/components/toast";
import { label } from "@/lib/constants";
import { logout } from "@/app/login/actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const items: NavItem[] = [
    { href: "/", label: "Home" },
    ...(canViewDashboard(user) ? [{ href: "/dashboard", label: "Dashboard" }] : []),
    { href: "/people", label: "People" },
    { href: "/leave", label: "Leave" },
    { href: "/contracts", label: "Contracts" },
    ...(canViewReminders(user) ? [{ href: "/reminders", label: "Reminders" }] : []),
    ...(canViewRecruiting(user) ? [{ href: "/recruitment", label: "Recruitment" }] : []),
    { href: "/checklists", label: "Checklists" },
    { href: "/performance", label: "Performance" },
    { href: "/compensation", label: "Compensation" },
  ];

  const userCard = (
    <div className="flex items-center gap-3">
      <Avatar firstName={user.firstName} lastName={user.lastName} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={user.name}>
          {user.name}
        </p>
        <p className="truncate text-xs text-muted" title={user.title}>
          {label(user.appRole)} · {user.title}
        </p>
        <form action={logout}>
          <button type="submit" className="mt-0.5 text-xs text-muted underline-offset-2 hover:text-ink hover:underline">
            Switch user
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <AppShell items={items} userCard={userCard}>
      <Suspense fallback={null}>
        <Toast />
      </Suspense>
      {children}
    </AppShell>
  );
}
