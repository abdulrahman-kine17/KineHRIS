// Every permission rule in one place. These are pure functions over a Viewer
// so they can be unit-tested and called from any server action or page.
//
// Roles:
//   admin    – HR and the founder. Everything.
//   manager  – their direct and indirect reports (the org chart), except salaries.
//   employee – themselves only.
//
// Manager scope is the org chart (managerId chain), not team membership.

import type { AppRole } from "./constants";

export type Viewer = {
  id: string;
  appRole: AppRole;
  /** Ids of every direct and indirect report. Empty for employees. */
  reportIds: string[];
};

export class PermissionError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "PermissionError";
  }
}

export function assert(ok: boolean, message?: string): asserts ok {
  if (!ok) throw new PermissionError(message);
}

export const isAdmin = (v: Viewer) => v.appRole === "admin";
export const isSelf = (v: Viewer, employeeId: string) => v.id === employeeId;
export const isManagerOf = (v: Viewer, employeeId: string) =>
  v.id !== employeeId && v.reportIds.includes(employeeId);

/** Admin, the person, or someone above them in the org chart. */
const selfOrChain = (v: Viewer, employeeId: string) =>
  isAdmin(v) || isSelf(v, employeeId) || isManagerOf(v, employeeId);

/**
 * Compute direct and indirect reports for a user from the full employee list.
 * Thirty rows, so this runs once per request without any caching.
 */
export function computeReportIds(
  userId: string,
  employees: { id: string; managerId: string | null }[],
): string[] {
  const byManager = new Map<string, string[]>();
  for (const e of employees) {
    if (!e.managerId) continue;
    const list = byManager.get(e.managerId) ?? [];
    list.push(e.id);
    byManager.set(e.managerId, list);
  }
  const out: string[] = [];
  const stack = [userId];
  const seen = new Set<string>([userId]);
  while (stack.length) {
    const cur = stack.pop()!;
    for (const child of byManager.get(cur) ?? []) {
      if (seen.has(child)) continue;
      seen.add(child);
      out.push(child);
      stack.push(child);
    }
  }
  return out;
}

// ---------------------------------------------------------------- People

/** The directory (name, title, team, office, manager) is visible to everyone. */
export const canViewDirectory = () => true;

/** Full profile: contact details, dates, status. */
export const canViewEmployeeDetails = (v: Viewer, employeeId: string) => selfOrChain(v, employeeId);

/** Core record: title, team, manager, office, dates, type, status, role. */
export const canEditEmployeeRecord = (v: Viewer, employeeId: string) =>
  isAdmin(v) || isManagerOf(v, employeeId);

/** Contact details and emergency contact. People can keep their own current. */
export const canEditContactDetails = (v: Viewer, employeeId: string) => selfOrChain(v, employeeId);

export const canCreateEmployee = (v: Viewer) => isAdmin(v);

/** Prisma `where` fragment that limits Employee queries to what the viewer may see in detail. */
export function employeeDetailScope(v: Viewer): { id?: { in: string[] } } {
  if (isAdmin(v)) return {};
  return { id: { in: [v.id, ...v.reportIds] } };
}

/** Ids whose records the viewer may see in detail, or null for "everyone". */
export function visibleEmployeeIds(v: Viewer): string[] | null {
  return isAdmin(v) ? null : [v.id, ...v.reportIds];
}

// ---------------------------------------------------------------- Leave

export const canViewLeave = (v: Viewer, employeeId: string) => selfOrChain(v, employeeId);
export const canRequestLeaveFor = (v: Viewer, employeeId: string) => isAdmin(v) || isSelf(v, employeeId);
export const canCancelLeave = (v: Viewer, req: { employeeId: string; status: string }) =>
  (isAdmin(v) || isSelf(v, req.employeeId)) && req.status === "pending";

/** Managers approve their reports' leave; nobody approves their own. */
export const canDecideLeave = (v: Viewer, req: { employeeId: string; status: string }) =>
  req.status === "pending" &&
  !isSelf(v, req.employeeId) &&
  (isAdmin(v) || isManagerOf(v, req.employeeId));

export const canEditLeaveBalances = (v: Viewer) => isAdmin(v);

// ---------------------------------------------------------------- Contracts and reminders

export const canViewContract = (v: Viewer, employeeId: string) => selfOrChain(v, employeeId);
export const canEditContract = (v: Viewer) => isAdmin(v);
export const canViewReminders = (v: Viewer) => isAdmin(v) || v.appRole === "manager";

// ---------------------------------------------------------------- Recruitment and onboarding

export const canViewRecruiting = (v: Viewer) => isAdmin(v) || v.appRole === "manager";
export const canEditRecruiting = (v: Viewer) => isAdmin(v) || v.appRole === "manager";

/** Only the interviewer fills in their own scorecard. */
export const canSubmitScorecard = (v: Viewer, interview: { interviewerId: string }) =>
  isSelf(v, interview.interviewerId);

/** Everyone's scorecards are visible to recruiting staff; interviewers see only their own. */
export const canViewScorecards = (v: Viewer) => canViewRecruiting(v);

/** Recruiting staff, or anyone interviewing this candidate. */
export const canViewCandidate = (v: Viewer, c: { interviewerIds: string[] }) =>
  canViewRecruiting(v) || c.interviewerIds.includes(v.id);

/** Admin or the role's hiring manager records the decision and the outcome. */
export const canRecordHiringDecision = (v: Viewer, role: { hiringManagerId: string }) =>
  isAdmin(v) || isSelf(v, role.hiringManagerId);

export const canViewChecklist = (v: Viewer, employeeId: string) => selfOrChain(v, employeeId);
export const canEditChecklist = (v: Viewer, employeeId: string) =>
  isAdmin(v) || isManagerOf(v, employeeId);
/** Anyone can tick off an item they own. */
export const canCompleteChecklistItem = (
  v: Viewer,
  item: { ownerId: string; checklist: { employeeId: string } },
) => isSelf(v, item.ownerId) || canEditChecklist(v, item.checklist.employeeId);

// ---------------------------------------------------------------- Performance

export const canViewGoals = (v: Viewer, employeeId: string) => selfOrChain(v, employeeId);
export const canEditGoals = (v: Viewer, employeeId: string) => selfOrChain(v, employeeId);

/** 1:1 notes are private to the two people in them. Admin is not a participant. */
export const canViewOneOnOne = (v: Viewer, o: { employeeId: string; managerId: string }) =>
  isSelf(v, o.employeeId) || isSelf(v, o.managerId);
export const canCreateOneOnOne = (v: Viewer, o: { employeeId: string; managerId: string }) =>
  isSelf(v, o.managerId) && isManagerOf(v, o.employeeId);
export const canEditOneOnOne = canViewOneOnOne;

export const canManageReviewCycles = (v: Viewer) => isAdmin(v);

/** The subject, the author, the subject's manager chain, and admin. */
export const canViewReview = (
  v: Viewer,
  r: { employeeId: string; reviewerId: string; kind: string; status: string },
) => {
  if (isAdmin(v) || isSelf(v, r.reviewerId) || isManagerOf(v, r.employeeId)) return true;
  // The subject sees their own self review always, others once submitted.
  if (isSelf(v, r.employeeId)) return r.kind === "self" || r.status === "submitted";
  return false;
};

/** Only the named reviewer writes a review. */
export const canWriteReview = (v: Viewer, r: { reviewerId: string; status: string }) =>
  isSelf(v, r.reviewerId) && r.status === "draft";

/** Who may be asked to write a review for someone. */
export const canRequestReview = (v: Viewer, employeeId: string) =>
  isAdmin(v) || isManagerOf(v, employeeId);

// ---------------------------------------------------------------- Compensation

/** Salary: admin, and the person for their own. Managers never. */
export const canViewSalary = (v: Viewer, employeeId: string) => isAdmin(v) || isSelf(v, employeeId);
export const canEditSalary = (v: Viewer) => isAdmin(v);
export const canViewBenefits = canViewSalary;
export const canEditBenefits = (v: Viewer) => isAdmin(v);
export const canViewPayroll = (v: Viewer) => isAdmin(v);

// ---------------------------------------------------------------- Analytics

export const canViewDashboard = (v: Viewer) => isAdmin(v) || v.appRole === "manager";

/**
 * Who appears on someone's team calendar (dates and leave type only, no reasons).
 * Admin: everyone. Manager: themselves and their reports. Employee: their own team.
 */
export function leaveCalendarWhere(v: Viewer & { teamId?: string }): Record<string, unknown> {
  if (isAdmin(v)) return {};
  if (v.appRole === "manager") return { id: { in: [v.id, ...v.reportIds] } };
  return { teamId: v.teamId ?? "" };
}
