// Pure rules for the recruitment module: the scorecard gate, the outcome SLA
// and the weighted score.

import { OUTCOME_SLA_WORKING_DAYS } from "./constants";
import { workingDaysElapsed, type WorkCalendar } from "./workdays";

export type InterviewForGate = {
  id: string;
  interviewerName?: string;
  scorecardSubmitted: boolean;
};

export type GateResult =
  | { allowed: true }
  | { allowed: false; reason: string; missing: InterviewForGate[] };

/**
 * A hiring decision may only be recorded once every interview on the
 * candidate has a submitted scorecard. A "hire" also needs at least one
 * interview; a "no_hire" with no interviews is a screening rejection.
 */
export function decisionGate(interviews: InterviewForGate[], decision: "hire" | "no_hire" = "hire"): GateResult {
  if (interviews.length === 0 && decision === "hire") {
    return { allowed: false, reason: "No interviews have been held yet.", missing: [] };
  }
  const missing = interviews.filter((i) => !i.scorecardSubmitted);
  if (missing.length > 0) {
    const who = missing.map((m) => m.interviewerName ?? m.id).join(", ");
    return {
      allowed: false,
      reason: `Waiting on ${missing.length} scorecard${missing.length === 1 ? "" : "s"}: ${who}.`,
      missing,
    };
  }
  return { allowed: true };
}

export type OutcomeState = {
  decidedAt: Date | null;
  outcomeSentAt: Date | null;
};

/**
 * True when a decision exists, no outcome has been sent, and more than
 * OUTCOME_SLA_WORKING_DAYS working days have passed since the decision.
 */
export function isOutcomeOverdue(c: OutcomeState, now: Date, cal: WorkCalendar): boolean {
  if (!c.decidedAt || c.outcomeSentAt) return false;
  return workingDaysElapsed(c.decidedAt, now, cal) > OUTCOME_SLA_WORKING_DAYS;
}

/** Working days the outcome has been waiting, for display. */
export function outcomeWaitingDays(c: OutcomeState, now: Date, cal: WorkCalendar): number {
  if (!c.decidedAt || c.outcomeSentAt) return 0;
  return workingDaysElapsed(c.decidedAt, now, cal);
}

/** Weighted average on the 1–5 scale. Returns null when there are no scores. */
export function weightedScore(scores: { weight: number; score: number }[]): number | null {
  const totalWeight = scores.reduce((s, x) => s + x.weight, 0);
  if (totalWeight === 0) return null;
  const sum = scores.reduce((s, x) => s + x.weight * x.score, 0);
  return Math.round((sum / totalWeight) * 100) / 100;
}
