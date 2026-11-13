"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CHECKLIST_KINDS, OFFBOARDING_TEMPLATE, ONBOARDING_TEMPLATE } from "@/lib/constants";
import { addDays, parseIsoDate } from "@/lib/dates";
import { PermissionError, canCompleteChecklistItem, canEditChecklist } from "@/lib/permissions";
import type { FormState } from "@/lib/people";

const revalidateAll = (employeeId: string) => {
  revalidatePath("/checklists");
  revalidatePath(`/people/${employeeId}/checklists`);
  revalidatePath("/");
};

const createSchema = z.object({ employeeId: z.string().min(1, "Choose a person"), kind: z.enum(CHECKLIST_KINDS), anchorDate: z.string().optional() });

/** Creates a checklist from the template. Owners: HR = first admin in People team (else the creator), manager = their manager, employee = the person. */
export async function createChecklist(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = createSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Choose a person and a type." };
  const { employeeId, kind } = parsed.data;
  if (!canEditChecklist(user, employeeId)) return { error: "You do not have permission to do that." };

  const person = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true, managerId: true, startDate: true, endDate: true } });
  if (!person) return { error: "Person not found." };
  const existing = await prisma.checklist.findFirst({ where: { employeeId, kind }, select: { id: true } });
  if (existing) redirect(`/checklists/${existing.id}`);

  const anchor = parsed.data.anchorDate ? parseIsoDate(parsed.data.anchorDate) : kind === "onboarding" ? person.startDate : person.endDate;
  if (!anchor) return { error: kind === "offboarding" ? "Set the person's end date first, or enter a last working day." : "Enter a start date." };

  const hr = (await prisma.employee.findFirst({ where: { appRole: "admin", team: { name: "People" }, status: { not: "left" } }, select: { id: true } }))?.id ?? user.id;
  const template = kind === "onboarding" ? ONBOARDING_TEMPLATE : OFFBOARDING_TEMPLATE;
  const owner = (role: string) => (role === "hr" ? hr : role === "manager" ? (person.managerId ?? hr) : person.id);
  const list = await prisma.checklist.create({
    data: {
      employeeId,
      kind,
      items: { create: template.map((t, i) => ({ title: t.title, ownerId: owner(t.ownerRole), dueDate: addDays(anchor, t.dueOffsetDays), sortOrder: i })) },
    },
    select: { id: true },
  });
  revalidateAll(employeeId);
  redirect(`/checklists/${list.id}?toast=created`);
}

const itemSchema = z.object({ checklistId: z.string().min(1), title: z.string().trim().min(1, "Required").max(200), ownerId: z.string().min(1, "Choose an owner"), dueDate: z.string().min(1, "Required") });

export async function addChecklistItem(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = itemSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const i of parsed.error.issues) (fieldErrors[String(i.path[0])] ??= []).push(i.message);
    return { error: "Fix the highlighted fields.", fieldErrors };
  }
  const d = parsed.data;
  const list = await prisma.checklist.findUnique({ where: { id: d.checklistId }, select: { employeeId: true, _count: { select: { items: true } } } });
  if (!list) return { error: "Checklist not found." };
  if (!canEditChecklist(user, list.employeeId)) return { error: "You do not have permission to do that." };
  const dueDate = parseIsoDate(d.dueDate);
  if (!dueDate) return { error: "Fix the highlighted fields.", fieldErrors: { dueDate: ["Enter a date as YYYY-MM-DD"] } };
  await prisma.checklistItem.create({ data: { checklistId: d.checklistId, title: d.title, ownerId: d.ownerId, dueDate, sortOrder: list._count.items } });
  revalidateAll(list.employeeId);
  redirect(`/checklists/${d.checklistId}?toast=saved`);
}

export async function toggleChecklistItem(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const back = String(formData.get("back") ?? "");
  const item = await prisma.checklistItem.findUnique({ where: { id }, select: { doneAt: true, ownerId: true, checklist: { select: { id: true, employeeId: true } } } });
  if (!item) throw new Error("Item not found.");
  if (!canCompleteChecklistItem(user, item)) throw new PermissionError();
  await prisma.checklistItem.update({ where: { id }, data: { doneAt: item.doneAt ? null : new Date() } });
  revalidateAll(item.checklist.employeeId);
  redirect(back.startsWith("/") ? back : `/checklists/${item.checklist.id}`);
}
