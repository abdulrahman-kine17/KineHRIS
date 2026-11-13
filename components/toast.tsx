"use client";

// Shows a short confirmation when the URL carries ?saved=1 (or ?toast=...),
// then removes the flag from the URL so a refresh does not repeat it.
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";

const MESSAGES: Record<string, string> = {
  saved: "Saved",
  created: "Created",
  deleted: "Deleted",
  requested: "Leave requested",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Request cancelled",
  advanced: "Contract updated",
  moved: "Stage updated",
  scheduled: "Interview scheduled",
  scorecard: "Scorecard submitted",
  decided: "Decision recorded",
  outcome: "Outcome marked as sent",
  need_decision: "Record a decision first",
  submitted: "Review submitted",
  requested_peer: "Peer feedback requested",
  keep_one: "Keep at least one salary record",
};

export function Toast() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [msg, setMsg] = useState<string | null>(null);

  // Pick up the flag, show the message on the next tick, and clean the URL.
  useEffect(() => {
    const key = sp.get("saved") ? "saved" : sp.get("toast");
    if (!key) return;
    const show = setTimeout(() => setMsg(MESSAGES[key] ?? key), 0);
    const next = new URLSearchParams(sp.toString());
    next.delete("saved");
    next.delete("toast");
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
    return () => clearTimeout(show);
  }, [sp, router, pathname]);

  // Hide after a moment.
  useEffect(() => {
    if (!msg) return;
    const hide = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(hide);
  }, [msg]);

  if (!msg) return null;
  return (
    <div role="status" className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg">
      <Check className="h-4 w-4" aria-hidden />
      {msg}
    </div>
  );
}
