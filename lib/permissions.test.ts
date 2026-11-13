import { describe, expect, it } from "vitest";
import {
  canDecideLeave,
  canEditContactDetails,
  canEditEmployeeRecord,
  canEditSalary,
  canRecordHiringDecision,
  canSubmitScorecard,
  canViewCandidate,
  canViewDashboard,
  canViewEmployeeDetails,
  canViewOneOnOne,
  canViewReview,
  canViewSalary,
  canWriteReview,
  computeReportIds,
  employeeDetailScope,
  isManagerOf,
  type Viewer,
} from "./permissions";

// Org chart used by the tests:
//   founder
//   ├── product_lead ── apm1
//   ├── hr
//   └── ai_lead ── eng1, eng2
const org = [
  { id: "founder", managerId: null },
  { id: "product_lead", managerId: "founder" },
  { id: "hr", managerId: "founder" },
  { id: "ai_lead", managerId: "founder" },
  { id: "apm1", managerId: "product_lead" },
  { id: "eng1", managerId: "ai_lead" },
  { id: "eng2", managerId: "ai_lead" },
];

const viewer = (id: string, appRole: Viewer["appRole"]): Viewer => ({
  id,
  appRole,
  reportIds: computeReportIds(id, org),
});

const founder = viewer("founder", "admin");
const hr = viewer("hr", "admin");
const aiLead = viewer("ai_lead", "manager");
const productLead = viewer("product_lead", "manager");
const eng1 = viewer("eng1", "employee");
const eng2 = viewer("eng2", "employee");

describe("computeReportIds", () => {
  it("returns direct and indirect reports", () => {
    expect(computeReportIds("founder", org).sort()).toEqual(
      ["ai_lead", "apm1", "eng1", "eng2", "hr", "product_lead"].sort(),
    );
    expect(computeReportIds("ai_lead", org).sort()).toEqual(["eng1", "eng2"]);
    expect(computeReportIds("eng1", org)).toEqual([]);
  });

  it("does not loop on a cycle", () => {
    const cyclic = [
      { id: "a", managerId: "b" },
      { id: "b", managerId: "a" },
    ];
    expect(computeReportIds("a", cyclic)).toEqual(["b"]);
  });
});

describe("manager scope follows the org chart", () => {
  it("ai_lead manages eng1 but not apm1", () => {
    expect(isManagerOf(aiLead, "eng1")).toBe(true);
    expect(isManagerOf(aiLead, "apm1")).toBe(false);
    expect(isManagerOf(aiLead, "ai_lead")).toBe(false);
  });

  it("limits detail queries to self plus reports", () => {
    expect(employeeDetailScope(founder)).toEqual({});
    expect(employeeDetailScope(aiLead)).toEqual({ id: { in: ["ai_lead", "eng1", "eng2"] } });
    expect(employeeDetailScope(eng1)).toEqual({ id: { in: ["eng1"] } });
  });
});

describe("people", () => {
  it("admin sees and edits everyone", () => {
    expect(canViewEmployeeDetails(hr, "eng1")).toBe(true);
    expect(canEditEmployeeRecord(hr, "eng1")).toBe(true);
  });
  it("manager sees and edits own reports only", () => {
    expect(canViewEmployeeDetails(aiLead, "eng1")).toBe(true);
    expect(canEditEmployeeRecord(aiLead, "eng1")).toBe(true);
    expect(canViewEmployeeDetails(aiLead, "apm1")).toBe(false);
    expect(canEditEmployeeRecord(aiLead, "apm1")).toBe(false);
  });
  it("employee sees own profile and may edit own contact details, not the record", () => {
    expect(canViewEmployeeDetails(eng1, "eng1")).toBe(true);
    expect(canViewEmployeeDetails(eng1, "eng2")).toBe(false);
    expect(canEditContactDetails(eng1, "eng1")).toBe(true);
    expect(canEditEmployeeRecord(eng1, "eng1")).toBe(false);
  });
});

describe("salary", () => {
  it("is visible to admin and to the person, never to the manager", () => {
    expect(canViewSalary(founder, "eng1")).toBe(true);
    expect(canViewSalary(eng1, "eng1")).toBe(true);
    expect(canViewSalary(aiLead, "eng1")).toBe(false);
    expect(canViewSalary(eng2, "eng1")).toBe(false);
  });
  it("is edited by admin only", () => {
    expect(canEditSalary(hr)).toBe(true);
    expect(canEditSalary(aiLead)).toBe(false);
    expect(canEditSalary(eng1)).toBe(false);
  });
});

describe("leave approvals", () => {
  const pending = { employeeId: "eng1", status: "pending" };
  it("manager approves reports, not peers, not self", () => {
    expect(canDecideLeave(aiLead, pending)).toBe(true);
    expect(canDecideLeave(productLead, pending)).toBe(false);
    expect(canDecideLeave(eng2, pending)).toBe(false);
    expect(canDecideLeave(aiLead, { employeeId: "ai_lead", status: "pending" })).toBe(false);
  });
  it("admin can approve but not their own", () => {
    expect(canDecideLeave(hr, pending)).toBe(true);
    expect(canDecideLeave(hr, { employeeId: "hr", status: "pending" })).toBe(false);
  });
  it("only pending requests can be decided", () => {
    expect(canDecideLeave(aiLead, { employeeId: "eng1", status: "approved" })).toBe(false);
  });
});

describe("1:1 notes", () => {
  const o = { employeeId: "eng1", managerId: "ai_lead" };
  it("are private to the two participants, admin excluded", () => {
    expect(canViewOneOnOne(eng1, o)).toBe(true);
    expect(canViewOneOnOne(aiLead, o)).toBe(true);
    expect(canViewOneOnOne(founder, o)).toBe(false);
    expect(canViewOneOnOne(eng2, o)).toBe(false);
  });
});

describe("reviews", () => {
  const managerDraft = { employeeId: "eng1", reviewerId: "ai_lead", kind: "manager", status: "draft" };
  const managerDone = { ...managerDraft, status: "submitted" };
  it("subject sees the manager review once submitted", () => {
    expect(canViewReview(eng1, managerDraft)).toBe(false);
    expect(canViewReview(eng1, managerDone)).toBe(true);
  });
  it("only the named reviewer writes it, and only while draft", () => {
    expect(canWriteReview(aiLead, managerDraft)).toBe(true);
    expect(canWriteReview(founder, managerDraft)).toBe(false);
    expect(canWriteReview(aiLead, managerDone)).toBe(false);
  });
});

describe("recruitment", () => {
  it("only the interviewer submits their scorecard", () => {
    expect(canSubmitScorecard(eng1, { interviewerId: "eng1" })).toBe(true);
    expect(canSubmitScorecard(aiLead, { interviewerId: "eng1" })).toBe(false);
    expect(canSubmitScorecard(founder, { interviewerId: "eng1" })).toBe(false);
  });
  it("interviewers can open the candidates they interview", () => {
    const c = { interviewerIds: ["eng1"] };
    expect(canViewCandidate(eng1, c)).toBe(true);
    expect(canViewCandidate(eng2, c)).toBe(false);
    expect(canViewCandidate(aiLead, c)).toBe(true);
    expect(canViewCandidate(hr, c)).toBe(true);
  });
  it("admin or the hiring manager records the decision", () => {
    const role = { hiringManagerId: "ai_lead" };
    expect(canRecordHiringDecision(aiLead, role)).toBe(true);
    expect(canRecordHiringDecision(founder, role)).toBe(true);
    expect(canRecordHiringDecision(productLead, role)).toBe(false);
    expect(canRecordHiringDecision(eng1, role)).toBe(false);
  });
});

describe("dashboard", () => {
  it("is for admins and managers", () => {
    expect(canViewDashboard(founder)).toBe(true);
    expect(canViewDashboard(aiLead)).toBe(true);
    expect(canViewDashboard(eng1)).toBe(false);
  });
});
