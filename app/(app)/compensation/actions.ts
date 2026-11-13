"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BENEFIT_TYPES, SALARY_REASONS } from "@/lib/constants";
import { parseIsoDate } from "@/lib/dates";
import { PermissionError, canEditBenefits, canEditSalary } from "@/lib/permissions";
import type { FieldErrors, FormState } from "@/lib/people";

const NO = "You do not have permission to do that.";
const errorsOf = (e: z.ZodError): FieldErrors => {
  const out: FieldErrors = {};
  for (const i of e.issues) (out[String(i.path[0])] ??= []).push(i.message);
  return out;
};
const money = z.coerce.number({ error: "Enter an amount" }).positive("Must be more than zero").max(1_000_000_000);
const currency = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Three-letter code, e.g. EGP");
const revalidateAll = (employeeId: string) => {
  revalidatePath("/compensation");
  revalidatePath(`/people/${employeeId}/compensation`);
};

const salarySchema = z.object({ employeeId: z.string().min(1), amount: money, currency, effectiveDate: z.string().min(1, "Required"), reason: z.enum(SALARY_REASONS, { error: "Choose a reason" }) });

export async function addSalaryRecord(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canEditSalary(user)) return { error: NO };
  const parsed = salarySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Fix the highlighted fields.", fieldErrors: errorsOf(parsed.error) };
  const d = parsed.data;
  const effectiveDate = parseIsoDate(d.effectiveDate);
  if (!effectiveDate) return { error: "Fix the highlighted fields.", fieldErrors: { effectiveDate: ["Enter a date as YYYY-MM-DD"] } };
  const clash = await prisma.salaryRecord.findFirst({ where: { employeeId: d.employeeId, effectiveDate } });
  if (clash) return { error: "Fix the highlighted fields.", fieldErrors: { effectiveDate: ["There is already a record effective on that date"] } };
  await prisma.salaryRecord.create({ data: { employeeId: d.employeeId, amount: d.amount, currency: d.currency, effectiveDate, reason: d.reason, createdById: user.id } });
  revalidateAll(d.employeeId);
  redirect(`/people/${d.employeeId}/compensation?toast=saved`);
}

export async function deleteSalaryRecord(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!canEditSalary(user)) throw new PermissionError();
  const id = String(formData.get("id") ?? "");
  const r = await prisma.salaryRecord.findUnique({ where: { id }, select: { employeeId: true } });
  if (!r) throw new Error("Record not found.");
  const n = await prisma.salaryRecord.count({ where: { employeeId: r.employeeId } });
  if (n <= 1) redirect(`/people/${r.employeeId}/compensation?toast=keep_one`);
  await prisma.salaryRecord.delete({ where: { id } });
  revalidateAll(r.employeeId);
  redirect(`/people/${r.employeeId}/compensation?toast=deleted`);
}

const benefitSchema = z.object({
  employeeId: z.string().min(1, "Choose a person"),
  type: z.enum(BENEFIT_TYPES, { error: "Choose a type" }),
  description: z.string().trim().max(200).optional(),
  amount: z.string().optional(),
  currency: z.string().optional(),
  startDate: z.string().min(1, "Required"),
  endDate: z.string().optional(),
  back: z.string().optional(),
});

export async function addBenefit(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canEditBenefits(user)) return { error: NO };
  const parsed = benefitSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Fix the highlighted fields.", fieldErrors: errorsOf(parsed.error) };
  const d = parsed.data;
  const startDate = parseIsoDate(d.startDate);
  if (!startDate) return { error: "Fix the highlighted fields.", fieldErrors: { startDate: ["Enter a date as YYYY-MM-DD"] } };
  const endDate = d.endDate ? parseIsoDate(d.endDate) : null;
  if (d.endDate && !endDate) return { error: "Fix the highlighted fields.", fieldErrors: { endDate: ["Enter a date as YYYY-MM-DD"] } };
  const amount = d.amount?.trim() ? Number(d.amount) : null;
  if (amount !== null && (!Number.isFinite(amount) || amount < 0)) return { error: "Fix the highlighted fields.", fieldErrors: { amount: ["Enter a number"] } };
  const cur = d.currency?.trim().toUpperCase() || null;
  if (amount !== null && !cur) return { error: "Fix the highlighted fields.", fieldErrors: { currency: ["Needed when there is an amount"] } };
  await prisma.benefit.create({ data: { employeeId: d.employeeId, type: d.type, description: d.description || null, amount, currency: amount !== null ? cur : null, startDate, endDate } });
  revalidateAll(d.employeeId);
  redirect(`${d.back && d.back.startsWith("/") ? d.back : `/people/${d.employeeId}/compensation`}?toast=saved`);
}

export async function endBenefit(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!canEditBenefits(user)) throw new PermissionError();
  const id = String(formData.get("id") ?? "");
  const back = String(formData.get("back") ?? "");
  const b = await prisma.benefit.findUnique({ where: { id }, select: { employeeId: true, endDate: true } });
  if (!b) throw new Error("Benefit not found.");
  await prisma.benefit.update({ where: { id }, data: { endDate: b.endDate ? null : new Date(new Date().toISOString().slice(0, 10)) } });
  revalidateAll(b.employeeId);
  redirect(`${back.startsWith("/") ? back : `/people/${b.employeeId}/compensation`}?toast=saved`);
}

const advanceSchema = z.object({ employeeId: z.string().min(1), amount: money, currency, date: z.string().min(1, "Required"), note: z.string().trim().max(200).optional() });

export async function addAdvance(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canEditSalary(user)) return { error: NO };
  const parsed = advanceSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Fix the highlighted fields.", fieldErrors: errorsOf(parsed.error) };
  const d = parsed.data;
  const date = parseIsoDate(d.date);
  if (!date) return { error: "Fix the highlighted fields.", fieldErrors: { date: ["Enter a date as YYYY-MM-DD"] } };
  await prisma.salaryAdvance.create({ data: { employeeId: d.employeeId, amount: d.amount, currency: d.currency, date, note: d.note || null } });
  revalidateAll(d.employeeId);
  redirect(`/people/${d.employeeId}/compensation?toast=saved`);
}
