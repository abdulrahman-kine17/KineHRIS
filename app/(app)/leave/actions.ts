"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LEAVE_TYPES } from "@/lib/constants";
import { parseIsoDate } from "@/lib/dates";
import { countWorkingDays } from "@/lib/workdays";
import { getBalances, officeCalendar } from "@/lib/leave";
import { validateLeaveRequest } from "@/lib/leave-rules";
import { PermissionError, canCancelLeave, canDecideLeave, canRequestLeaveFor } from "@/lib/permissions";
import type { FormState } from "@/lib/people";

const requestSchema = z.object({
  employeeId: z.string().min(1),
  type: z.enum(LEAVE_TYPES, { error: "Choose a leave type" }),
  startDate: z.string().min(1, "Required"),
  endDate: z.string().min(1, "Required"),
  reason: z.string().trim().max(500).optional(),
});

export async function createLeaveRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = requestSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const i of parsed.error.issues) (fieldErrors[String(i.path[0])] ??= []).push(i.message);
    return { error: "Fix the highlighted fields.", fieldErrors };
  }
  const { employeeId, type, reason } = parsed.data;
  if (!canRequestLeaveFor(user, employeeId)) return { error: "You do not have permission to do that." };

  const startDate = parseIsoDate(parsed.data.startDate);
  const endDate = parseIsoDate(parsed.data.endDate);
  if (!startDate || !endDate) return { error: "Fix the highlighted fields.", fieldErrors: { startDate: ["Enter a date as YYYY-MM-DD"] } };

  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { officeId: true, status: true } });
  if (!employee || employee.status === "left") return { error: "That person cannot request leave." };

  const cal = await officeCalendar(employee.officeId);
  const workingDays = countWorkingDays(startDate, endDate, cal);
  const [balances, existing] = await Promise.all([
    getBalances(employeeId, startDate.getUTCFullYear()),
    prisma.leaveRequest.findMany({ where: { employeeId, status: { in: ["pending", "approved"] } }, select: { startDate: true, endDate: true, status: true } }),
  ]);
  const problem = validateLeaveRequest({ type, startDate, endDate, workingDays, balance: balances.find((b) => b.type === type), existing });
  if (problem) return { error: problem };

  await prisma.leaveRequest.create({
    data: { employeeId, type, startDate, endDate, workingDays, reason: reason || null, status: "pending" },
  });
  revalidatePath("/leave");
  revalidatePath(`/people/${employeeId}/leave`);
  redirect(employeeId === user.id ? "/leave?toast=requested" : `/people/${employeeId}/leave?toast=requested`);
}

const decideSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().max(300).optional(),
  back: z.string().optional(),
});

export async function decideLeave(formData: FormData): Promise<void> {
  const user = await requireUser();
  const { id, decision, note, back } = decideSchema.parse(Object.fromEntries(formData.entries()));
  const req = await prisma.leaveRequest.findUnique({ where: { id }, select: { employeeId: true, status: true } });
  if (!req) throw new Error("Request not found.");
  if (!canDecideLeave(user, req)) throw new PermissionError();

  await prisma.leaveRequest.update({
    where: { id },
    data: { status: decision === "approve" ? "approved" : "rejected", approverId: user.id, decidedAt: new Date(), decisionNote: note || null },
  });
  revalidatePath("/leave");
  revalidatePath(`/people/${req.employeeId}/leave`);
  redirect(`${back && back.startsWith("/") ? back : "/leave/approvals"}?toast=${decision === "approve" ? "approved" : "rejected"}`);
}

export async function cancelLeave(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const back = String(formData.get("back") ?? "/leave");
  const req = await prisma.leaveRequest.findUnique({ where: { id }, select: { employeeId: true, status: true } });
  if (!req) throw new Error("Request not found.");
  if (!canCancelLeave(user, req)) throw new PermissionError();
  await prisma.leaveRequest.update({ where: { id }, data: { status: "cancelled" } });
  revalidatePath("/leave");
  revalidatePath(`/people/${req.employeeId}/leave`);
  redirect(`${back.startsWith("/") ? back : "/leave"}?toast=cancelled`);
}
