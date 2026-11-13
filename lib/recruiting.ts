// Recruiting helpers: stage/decision tones, calendars per office, and the
// flags shown on candidates (waiting scorecards, outcome overdue).

import type { Tone } from "@/components/ui";
import { prisma } from "./db";
import { makeCalendar, type WorkCalendar } from "./workdays";
import { decisionGate, isOutcomeOverdue, outcomeWaitingDays, weightedScore } from "./hiring";

export const STAGE_TONE: Record<string, Tone> = {
  applied: "neutral",
  screening: "neutral",
  interview: "accent",
  offer: "warning",
  hired: "success",
  rejected: "danger",
};
export const DECISION_TONE: Record<string, Tone> = { hire: "success", no_hire: "danger" };
export const ROLE_TONE: Record<string, Tone> = { open: "success", on_hold: "warning", filled: "accent", closed: "neutral" };
export const RECOMMENDATION_TONE: Record<string, Tone> = { strong_yes: "success", yes: "success", no: "danger", strong_no: "danger" };

export async function officeCalendars(): Promise<Map<string, WorkCalendar>> {
  const offices = await prisma.office.findMany({ include: { holidays: { select: { date: true } } } });
  return new Map(offices.map((o) => [o.id, makeCalendar(o.weekendDays, o.holidays.map((h) => h.date))]));
}

export type CandidateFlags = {
  gate: ReturnType<typeof decisionGate>;
  overdue: boolean;
  waitingDays: number;
  score: number | null;
};

export function candidateFlags(
  c: {
    decidedAt: Date | null;
    outcomeSentAt: Date | null;
    interviews: { id: string; interviewer: { firstName: string; lastName: string }; scorecard: { submittedAt: Date | null; scores: { weight: number; score: number }[] } | null }[];
  },
  cal: WorkCalendar,
  now: Date,
): CandidateFlags {
  const gate = decisionGate(
    c.interviews.map((i) => ({ id: i.id, interviewerName: `${i.interviewer.firstName} ${i.interviewer.lastName}`, scorecardSubmitted: Boolean(i.scorecard?.submittedAt) })),
  );
  const submitted = c.interviews.filter((i) => i.scorecard?.submittedAt);
  const scores = submitted.map((i) => weightedScore(i.scorecard!.scores)).filter((x): x is number => x !== null);
  const score = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : null;
  return {
    gate,
    overdue: isOutcomeOverdue(c, now, cal),
    waitingDays: outcomeWaitingDays(c, now, cal),
    score,
  };
}

/** Days from application to hire decision, for filled roles. */
export function daysToHire(c: { appliedAt: Date; decidedAt: Date | null }): number | null {
  if (!c.decidedAt) return null;
  return Math.round((c.decidedAt.getTime() - c.appliedAt.getTime()) / 86_400_000);
}
