import { Plus } from "lucide-react";
import { LinkButton, PageHeader, Segmented } from "@/components/ui";
import type { CurrentUser } from "@/lib/auth";

export function LeaveHeader({ user, active, pendingCount, count }: { user: CurrentUser; active: string; pendingCount: number; count?: string }) {
  const tabs = [{ href: "/leave", label: "My leave" }];
  if (user.appRole !== "employee") tabs.push({ href: "/leave/approvals", label: pendingCount ? `Approvals · ${pendingCount}` : "Approvals" });
  tabs.push({ href: "/leave/calendar", label: "Calendar" });
  if (user.appRole !== "employee") tabs.push({ href: "/leave/history", label: "History" });
  return (
    <PageHeader
      title="Leave"
      count={count}
      actions={
        <>
          <Segmented items={tabs} active={active} />
          <LinkButton href="/leave/new" variant="primary">
            <Plus className="h-4 w-4" aria-hidden />
            Request leave
          </LinkButton>
        </>
      }
    />
  );
}
