// Performance helpers: quarters, tones, and review coverage maths.

import type { Tone } from "@/components/ui";
import { quarterOf, today } from "./dates";

export const GOAL_TONE: Record<string, Tone> = { not_started: "neutral", on_track: "success", at_risk: "warning", done: "accent", dropped: "neutral" };
export const REVIEW_STATUS_TONE: Record<string, Tone> = { draft: "warning", submitted: "success" };
export const CYCLE_TONE: Record<string, Tone> = { open: "success", closed: "neutral" };

export type Quarter = { year: number; quarter: number };

export function parseQuarter(s: string | undefined): Quarter {
  const m = /^(\d{4})-Q([1-4])$/.exec(s ?? "");
  return m ? { year: Number(m[1]), quarter: Number(m[2]) } : quarterOf(today());
}
export const quarterKey = (q: Quarter) => `${q.year}-Q${q.quarter}`;
export const quarterLabel = (q: Quarter) => `Q${q.quarter} ${q.year}`;
export const prevQuarter = (q: Quarter): Quarter => (q.quarter === 1 ? { year: q.year - 1, quarter: 4 } : { year: q.year, quarter: q.quarter - 1 });
export const nextQuarter = (q: Quarter): Quarter => (q.quarter === 4 ? { year: q.year + 1, quarter: 1 } : { year: q.year, quarter: q.quarter + 1 });

/** How a person's goal count compares with the 3–5 rule. */
export function goalCoverage(n: number): { tone: Tone; label: string } {
  if (n === 0) return { tone: "danger", label: "No goals" };
  if (n < 3) return { tone: "warning", label: `${n} of 3 minimum` };
  if (n > 5) return { tone: "warning", label: `${n}, over the limit` };
  return { tone: "success", label: `${n} goal${n === 1 ? "" : "s"}` };
}

export type ReviewLite = { kind: string; status: string; reviewerId: string; employeeId: string };

/** Per-person summary of a cycle. */
export function reviewSummary(reviews: ReviewLite[]) {
  const self = reviews.find((r) => r.kind === "self");
  const manager = reviews.find((r) => r.kind === "manager");
  const peers = reviews.filter((r) => r.kind === "peer");
  return {
    self: self?.status ?? "missing",
    manager: manager?.status ?? "missing",
    peersSubmitted: peers.filter((p) => p.status === "submitted").length,
    peersTotal: peers.length,
    complete: self?.status === "submitted" && manager?.status === "submitted",
  };
}
