import { describe, expect, it } from "vitest";
import { utcDate } from "./dates";
import { overlaps, summarizeBalance, validateLeaveRequest } from "./leave-rules";

const d = (m: number, day: number) => utcDate(2026, m, day);

describe("summarizeBalance", () => {
  it("counts approved as used and pending separately", () => {
    const b = summarizeBalance("annual", 21, [
      { type: "annual", status: "approved", workingDays: 5, startDate: d(1, 5), endDate: d(1, 9) },
      { type: "annual", status: "pending", workingDays: 2, startDate: d(3, 1), endDate: d(3, 2) },
      { type: "annual", status: "rejected", workingDays: 3, startDate: d(4, 1), endDate: d(4, 3) },
      { type: "remote", status: "approved", workingDays: 1, startDate: d(5, 1), endDate: d(5, 1) },
    ]);
    expect(b).toEqual({ type: "annual", allowance: 21, used: 5, pending: 2, remaining: 14 });
  });
  it("has no remaining for types without allowance", () => {
    expect(summarizeBalance("unpaid", null, []).remaining).toBeNull();
  });
});

describe("overlaps", () => {
  it("is inclusive on both ends", () => {
    expect(overlaps({ startDate: d(1, 1), endDate: d(1, 5) }, { startDate: d(1, 5), endDate: d(1, 9) })).toBe(true);
    expect(overlaps({ startDate: d(1, 1), endDate: d(1, 5) }, { startDate: d(1, 6), endDate: d(1, 9) })).toBe(false);
  });
});

describe("validateLeaveRequest", () => {
  const base = { type: "annual", startDate: d(6, 1), endDate: d(6, 3), workingDays: 3, existing: [] as { startDate: Date; endDate: Date; status: string }[] };
  const balance = { type: "annual", allowance: 21, used: 18, pending: 1, remaining: 2 };

  it("rejects reversed dates and empty ranges", () => {
    expect(validateLeaveRequest({ ...base, endDate: d(5, 30), balance })).toMatch(/before the start/);
    expect(validateLeaveRequest({ ...base, workingDays: 0, balance })).toMatch(/no working days/);
  });
  it("rejects overlaps with pending or approved requests only", () => {
    const existing = [{ startDate: d(6, 3), endDate: d(6, 4), status: "approved" }];
    expect(validateLeaveRequest({ ...base, existing, balance: undefined })).toMatch(/overlaps/);
    expect(validateLeaveRequest({ ...base, existing: [{ ...existing[0], status: "rejected" }], balance: undefined })).toBeNull();
  });
  it("rejects when the balance would go negative, counting pending", () => {
    expect(validateLeaveRequest({ ...base, balance })).toMatch(/Only 2 annual days left/);
    expect(validateLeaveRequest({ ...base, workingDays: 2, balance })).toBeNull();
  });
  it("ignores balance for unpaid leave", () => {
    expect(validateLeaveRequest({ ...base, type: "unpaid", balance: { type: "unpaid", allowance: null, used: 0, pending: 0, remaining: null } })).toBeNull();
  });
});
