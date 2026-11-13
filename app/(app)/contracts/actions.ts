"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CONTRACT_STATUSES, CONTRACT_TYPES } from "@/lib/constants";
import { parseIsoDate } from "@/lib/dates";
import { nextStatus } from "@/lib/contracts";
import { PermissionError, canEditContract } from "@/lib/permissions";
import type { FieldErrors, FormState } from "@/lib/people";

const schema = z.object({
  id: z.string().optional(),
  employeeId: z.string().min(1, "Choose a person"),
  title: z.string().trim().min(1, "Required").max(160),
  type: z.enum(CONTRACT_TYPES, { error: "Choose a type" }),
  startDate: z.string().min(1, "Required"),
  endDate: z.string().optional(),
  status: z.enum(CONTRACT_STATUSES, { error: "Choose a status" }),
  fileRef: z.string().trim().max(300).optional(),
});

export async function saveContract(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canEditContract(user)) return { error: "You do not have permission to do that." };
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: FieldErrors = {};
    for (const i of parsed.error.issues) (fieldErrors[String(i.path[0])] ??= []).push(i.message);
    return { error: "Fix the highlighted fields.", fieldErrors };
  }
  const d = parsed.data;
  const startDate = parseIsoDate(d.startDate);
  const endDate = d.endDate ? parseIsoDate(d.endDate) : null;
  if (!startDate) return { error: "Fix the highlighted fields.", fieldErrors: { startDate: ["Enter a date as YYYY-MM-DD"] } };
  if (d.endDate && !endDate) return { error: "Fix the highlighted fields.", fieldErrors: { endDate: ["Enter a date as YYYY-MM-DD"] } };
  if (endDate && endDate < startDate) return { error: "Fix the highlighted fields.", fieldErrors: { endDate: ["End date is before the start date"] } };
  const person = await prisma.employee.findUnique({ where: { id: d.employeeId }, select: { id: true } });
  if (!person) return { error: "Fix the highlighted fields.", fieldErrors: { employeeId: ["Choose a person from the list"] } };

  const now = new Date();
  const order = CONTRACT_STATUSES.indexOf(d.status);
  const data = {
    employeeId: d.employeeId,
    title: d.title,
    type: d.type,
    startDate,
    endDate,
    status: d.status,
    fileRef: d.fileRef || null,
  };
  if (d.id) {
    const existing = await prisma.contract.findUnique({ where: { id: d.id } });
    if (!existing) return { error: "That contract no longer exists." };
    await prisma.contract.update({
      where: { id: d.id },
      data: {
        ...data,
        // Keep timestamps consistent with the chosen status.
        signedByEmployeeAt: order >= 1 ? (existing.signedByEmployeeAt ?? now) : null,
        countersignedAt: order >= 2 ? (existing.countersignedAt ?? now) : null,
        filedAt: order >= 3 ? (existing.filedAt ?? now) : null,
      },
    });
  } else {
    await prisma.contract.create({
      data: { ...data, signedByEmployeeAt: order >= 1 ? now : null, countersignedAt: order >= 2 ? now : null, filedAt: order >= 3 ? now : null },
    });
  }
  revalidatePath("/contracts");
  revalidatePath(`/people/${d.employeeId}/contracts`);
  redirect(`/contracts?toast=saved`);
}

export async function advanceContract(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!canEditContract(user)) throw new PermissionError();
  const id = String(formData.get("id") ?? "");
  const back = String(formData.get("back") ?? "/contracts");
  const c = await prisma.contract.findUnique({ where: { id }, select: { status: true, employeeId: true } });
  if (!c) throw new Error("Contract not found.");
  const next = nextStatus(c.status);
  if (!next) redirect(back);
  const now = new Date();
  await prisma.contract.update({
    where: { id },
    data: {
      status: next,
      ...(next === "signed_by_employee" ? { signedByEmployeeAt: now } : {}),
      ...(next === "countersigned" ? { countersignedAt: now } : {}),
      ...(next === "filed" ? { filedAt: now } : {}),
    },
  });
  revalidatePath("/contracts");
  revalidatePath(`/people/${c.employeeId}/contracts`);
  redirect(`${back.startsWith("/") ? back : "/contracts"}?toast=advanced`);
}
