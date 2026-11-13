import { describe, expect, it } from "vitest";
import { utcDate } from "./dates";
import { decisionGate, isOutcomeOverdue, outcomeWaitingDays, weightedScore } from "./hiring";
import { makeCalendar } from "./workdays";

describe("decisionGate", () => {
  it("blocks a hire when there are no interviews, but allows a screening rejection", () => {
    const r = decisionGate([]);
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toMatch(/No interviews/);
    expect(decisionGate([], "no_hire").allowed).toBe(true);
  });

  it("blocks a no-hire too while scorecards are missing", () => {
    expect(decisionGate([{ id: "i1", scorecardSubmitted: false }], "no_hire").allowed).toBe(false);
  });

  it("blocks while any scorecard is missing and names the interviewer", () => {
    const r = decisionGate([
      { id: "i1", interviewerName: "Karim", scorecardSubmitted: true },
      { id: "i2", interviewerName: "Sami", scorecardSubmitted: false },
    ]);
    expect(r.allowed).toBe(false);
    if (!r.allowed) {
      expect(r.missing.map((m) => m.id)).toEqual(["i2"]);
      expect(r.reason).toContain("Sami");
    }
  });

  it("allows once every scorecard is in", () => {
    const r = decisionGate([
      { id: "i1", scorecardSubmitted: true },
      { id: "i2", scorecardSubmitted: true },
    ]);
    expect(r.allowed).toBe(true);
  });
});

describe("outcome SLA (5 working days, Fri–Sat weekend)", () => {
  // Sunday 1 Nov 2026 is the first working day of that week in Cairo.
  const cal = makeCalendar("5,6", [utcDate(2026, 11, 5)]); // Thursday 5 Nov is a holiday
  const decided = utcDate(2026, 11, 1); // Sunday

  it("is not overdue without a decision or once the outcome is sent", () => {
    expect(isOutcomeOverdue({ decidedAt: null, outcomeSentAt: null }, utcDate(2026, 12, 1), cal)).toBe(false);
    expect(
      isOutcomeOverdue({ decidedAt: decided, outcomeSentAt: utcDate(2026, 11, 2) }, utcDate(2026, 12, 1), cal),
    ).toBe(false);
  });

  it("counts only working days", () => {
    // Mon 2, Tue 3, Wed 4 = 3 (Thu 5 holiday, Fri 6 and Sat 7 weekend), Sun 8 = 4, Mon 9 = 5
    expect(outcomeWaitingDays({ decidedAt: decided, outcomeSentAt: null }, utcDate(2026, 11, 9), cal)).toBe(5);
    expect(isOutcomeOverdue({ decidedAt: decided, outcomeSentAt: null }, utcDate(2026, 11, 9), cal)).toBe(false);
    // Tue 10 = 6 working days -> overdue
    expect(isOutcomeOverdue({ decidedAt: decided, outcomeSentAt: null }, utcDate(2026, 11, 10), cal)).toBe(true);
  });
});

describe("weightedScore", () => {
  it("weights scores and rounds to two decimals", () => {
    expect(
      weightedScore([
        { weight: 30, score: 5 },
        { weight: 25, score: 3 },
        { weight: 15, score: 4 },
        { weight: 15, score: 4 },
        { weight: 15, score: 2 },
      ]),
    ).toBe(3.75);
  });
  it("returns null with no scores", () => {
    expect(weightedScore([])).toBeNull();
  });
});
