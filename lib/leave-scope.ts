import { prisma } from "./db";
import type { CurrentUser } from "./auth";
import { visibleEmployeeIds } from "./permissions";

/** Pending requests the viewer may decide on (their reports, never their own). */
export async function pendingForApprover(user: CurrentUser) {
  if (user.appRole === "employee") return 0;
  const ids = visibleEmployeeIds(user);
  return prisma.leaveRequest.count({
    where: { status: "pending", employeeId: { not: user.id, ...(ids ? { in: ids } : {}) } },
  });
}
