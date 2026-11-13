// Pure leave rules: balances, overlaps and request validation. No database.

import type { Tone } from "@/components/ui";

export type LeaveReqLite = { type: string; status: string; workingDays: number; startDate: Date; endDate: Date };

export type Balance = {
  type: string;
  /** null for types without an allowance (unpaid). */
  allowance: number | null;
  used: number;
  pending: number;
  remaining: number | null;
};

export function summarizeBalance(type: string, allowance: number | null, requests: LeaveReqLite[]): Balance {
  const mine = requests.filter((r) => r.type === type);
  const used = mine.filter((r) => r.status === "approved").reduce((s, r) => s + r.workingDays, 0);
  const pending = mine.filter((r) => r.status === "pending").reduce((s, r) => s + r.workingDays, 0);
  return { type, allowance, used, pending, remaining: allowance === null ? null : allowance - used - pending };
}

export function overlaps(a: { startDate: Date; endDate: Date }, b: { startDate: Date; endDate: Date }): boolean {
  return a.startDate.getTime() <= b.endDate.getTime() && b.startDate.getTime() <= a.endDate.getTime();
}

/** Returns an error message, or null when the request is fine. */
export function validateLeaveRequest(input: {
  type: string;
  startDate: Date;
  endDate: Date;
  workingDays: number;
  balance: Balance | undefined;
  existing: { startDate: Date; endDate: Date; status: string }[];
}): string | null {
  if (input.endDate.getTime() < input.startDate.getTime()) return "The end date is before the start date.";
  if (input.workingDays <= 0) return "There are no working days in that range (weekend or public holiday).";
  if (input.workingDays > 60) return "Requests are limited to 60 working days. Split it into two.";
  const clash = input.existing.find((e) => (e.status === "pending" || e.status === "approved") && overlaps(e, input));
  if (clash) return "This overlaps another request that is pending or approved.";
  if (input.balance && input.balance.remaining !== null && input.workingDays > input.balance.remaining) {
    return `Only ${input.balance.remaining} ${input.balance.type} day${input.balance.remaining === 1 ? "" : "s"} left this year (after pending requests).`;
  }
  return null;
}

export const LEAVE_TONE: Record<string, Tone> = { pending: "warning", approved: "success", rejected: "danger", cancelled: "neutral" };
export const LEAVE_TYPE_TONE: Record<string, Tone> = { annual: "accent", remote: "neutral", unpaid: "warning" };
