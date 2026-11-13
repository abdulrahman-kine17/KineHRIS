// Allowed values for every string "enum" in the schema, plus the lists that
// live in code rather than the database (mandatory fields, review criteria,
// checklist templates).

export const APP_ROLES = ["admin", "manager", "employee"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const EMPLOYMENT_TYPES = ["full_time", "part_time", "contractor"] as const;
export const EMPLOYEE_STATUSES = ["probation", "active", "notice", "left"] as const;

export const LEAVE_TYPES = ["annual", "remote", "unpaid"] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];
export const LEAVE_TYPES_WITH_ALLOWANCE = ["annual", "remote"] as const;
export const LEAVE_STATUSES = ["pending", "approved", "rejected", "cancelled"] as const;

export const CONTRACT_TYPES = ["permanent", "fixed_term", "contractor"] as const;
export const CONTRACT_STATUSES = ["draft", "signed_by_employee", "countersigned", "filed"] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const ROLE_STATUSES = ["open", "on_hold", "filled", "closed"] as const;
export const CANDIDATE_STAGES = ["applied", "screening", "interview", "offer", "hired", "rejected"] as const;
export type CandidateStage = (typeof CANDIDATE_STAGES)[number];
export const HIRING_DECISIONS = ["hire", "no_hire"] as const;
export const INTERVIEW_KINDS = ["screening", "technical", "system_design", "culture", "founder"] as const;
export const RECOMMENDATIONS = ["strong_yes", "yes", "no", "strong_no"] as const;

/** Working days a candidate may wait for their outcome after a decision. */
export const OUTCOME_SLA_WORKING_DAYS = 5;

export const CHECKLIST_KINDS = ["onboarding", "offboarding"] as const;

export const GOAL_STATUSES = ["not_started", "on_track", "at_risk", "done", "dropped"] as const;
export const GOALS_PER_QUARTER = { min: 3, max: 5 } as const;

export const REVIEW_KINDS = ["self", "manager", "peer"] as const;
export const REVIEW_STATUSES = ["draft", "submitted"] as const;
export const REVIEW_HALVES = ["H1", "H2"] as const;

export const SALARY_REASONS = ["hire", "annual_review", "promotion", "adjustment"] as const;
export const BENEFIT_TYPES = [
  "medical_insurance",
  "transport_allowance",
  "internet_allowance",
  "equipment",
  "other",
] as const;

/** Fields an employee record must have for it to count as complete. */
export const MANDATORY_EMPLOYEE_FIELDS = [
  "firstName",
  "lastName",
  "workEmail",
  "personalEmail",
  "phone",
  "address",
  "emergencyContactName",
  "emergencyContactPhone",
  "title",
  "teamId",
  "managerId",
  "officeId",
  "startDate",
  "employmentType",
] as const;

export const REVIEW_CRITERIA = [
  "Impact",
  "Quality of work",
  "Collaboration",
  "Ownership",
  "Growth",
] as const;

/** Templates. ownerRole picks who gets the item when a checklist is created. */
export type ChecklistTemplateItem = {
  title: string;
  ownerRole: "hr" | "manager" | "employee";
  dueOffsetDays: number; // relative to start date (onboarding) or end date (offboarding)
};

export const ONBOARDING_TEMPLATE: ChecklistTemplateItem[] = [
  { title: "Send signed contract to filing", ownerRole: "hr", dueOffsetDays: -3 },
  { title: "Create work email and accounts", ownerRole: "hr", dueOffsetDays: -2 },
  { title: "Order laptop and equipment", ownerRole: "hr", dueOffsetDays: -5 },
  { title: "Add to payroll and benefits", ownerRole: "hr", dueOffsetDays: 3 },
  { title: "First-day welcome and office tour", ownerRole: "manager", dueOffsetDays: 0 },
  { title: "Share team goals and first project", ownerRole: "manager", dueOffsetDays: 2 },
  { title: "Book 30-day check-in", ownerRole: "manager", dueOffsetDays: 30 },
  { title: "Complete profile and emergency contact", ownerRole: "employee", dueOffsetDays: 5 },
  { title: "Read handbook and security policy", ownerRole: "employee", dueOffsetDays: 7 },
];

export const OFFBOARDING_TEMPLATE: ChecklistTemplateItem[] = [
  { title: "Confirm last working day in writing", ownerRole: "hr", dueOffsetDays: -14 },
  { title: "Calculate final pay and unused leave", ownerRole: "hr", dueOffsetDays: -3 },
  { title: "Revoke accounts and access", ownerRole: "hr", dueOffsetDays: 0 },
  { title: "Collect laptop and equipment", ownerRole: "hr", dueOffsetDays: 0 },
  { title: "Handover document for open work", ownerRole: "employee", dueOffsetDays: -5 },
  { title: "Exit conversation", ownerRole: "manager", dueOffsetDays: -2 },
  { title: "Reassign goals and action items", ownerRole: "manager", dueOffsetDays: -1 },
];

/** Human labels for any constant value: "signed_by_employee" -> "Signed by employee". */
export function label(value: string | null | undefined): string {
  if (!value) return "";
  const s = value.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
