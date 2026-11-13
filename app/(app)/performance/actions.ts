"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GOALS_PER_QUARTER, GOAL_STATUSES, REVIEW_CRITERIA, REVIEW_HALVES } from "@/lib/constants";
import { parseIsoDate } from "@/lib/dates";
import {
  PermissionError,
  canCreateOneOnOne,
  canEditGoals,
  canEditOneOnOne,
  canManageReviewCycles,
  canRequestReview,
  canViewOneOnOne,
  canWriteReview,
} from "@/lib/permissions";
import type { FieldErrors, FormState } from "@/lib/people";

const NO = "You do not have permission to do that.";
const errorsOf = (e: z.ZodError): FieldErrors => {
  const out: FieldErrors = {};
  for (const i of e.issues) (out[String(i.path[0])] ??= []).push(i.message);
  return out;
};
const back = (s: FormDataEntryValue | null, fallback: string) => (typeof s === "string" && s.startsWith("/") ? s : fallback);

// ---------------------------------------------------------------- goals

const goalSchema = z.object({
  id: z.string().optional(),
  employeeId: z.string().min(1),
  year: z.coerce.number().int().min(2020).max(2100),
  quarter: z.coerce.number().int().min(1).max(4),
  title: z.string().trim().min(1, "Required").max(160),
  description: z.string().trim().max(1000).optional(),
  status: z.enum(GOAL_STATUSES).default("not_started"),
});

export async function saveGoal(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = goalSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Fix the highlighted fields.", fieldErrors: errorsOf(parsed.error) };
  const d = parsed.data;
  if (!canEditGoals(user, d.employeeId)) return { error: NO };
  if (!d.id) {
    const n = await prisma.goal.count({ where: { employeeId: d.employeeId, year: d.year, quarter: d.quarter, status: { not: "dropped" } } });
    if (n >= GOALS_PER_QUARTER.max) return { error: `That is already ${GOALS_PER_QUARTER.max} goals this quarter. Drop or finish one first.` };
    await prisma.goal.create({ data: { employeeId: d.employeeId, year: d.year, quarter: d.quarter, title: d.title, description: d.description || null, status: d.status } });
  } else {
    await prisma.goal.update({ where: { id: d.id }, data: { title: d.title, description: d.description || null, status: d.status } });
  }
  revalidatePath("/performance");
  revalidatePath(`/people/${d.employeeId}/goals`);
  redirect(`/people/${d.employeeId}/goals?q=${d.year}-Q${d.quarter}&toast=saved`);
}

export async function updateGoalStatus(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const status = z.enum(GOAL_STATUSES).parse(formData.get("status"));
  const g = await prisma.goal.findUnique({ where: { id }, select: { employeeId: true, year: true, quarter: true } });
  if (!g) throw new Error("Goal not found.");
  if (!canEditGoals(user, g.employeeId)) throw new PermissionError();
  await prisma.goal.update({ where: { id }, data: { status } });
  revalidatePath("/performance");
  revalidatePath(`/people/${g.employeeId}/goals`);
  redirect(back(formData.get("back"), `/people/${g.employeeId}/goals?q=${g.year}-Q${g.quarter}`));
}

export async function deleteGoal(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const g = await prisma.goal.findUnique({ where: { id }, select: { employeeId: true, year: true, quarter: true } });
  if (!g) throw new Error("Goal not found.");
  if (!canEditGoals(user, g.employeeId)) throw new PermissionError();
  await prisma.goal.delete({ where: { id } });
  revalidatePath("/performance");
  revalidatePath(`/people/${g.employeeId}/goals`);
  redirect(`/people/${g.employeeId}/goals?q=${g.year}-Q${g.quarter}&toast=deleted`);
}

// ---------------------------------------------------------------- 1:1s

const oneSchema = z.object({ employeeId: z.string().min(1, "Choose a person"), date: z.string().min(1, "Required"), notes: z.string().trim().max(10000).optional() });

export async function createOneOnOne(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = oneSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Fix the highlighted fields.", fieldErrors: errorsOf(parsed.error) };
  const d = parsed.data;
  if (!canCreateOneOnOne(user, { employeeId: d.employeeId, managerId: user.id })) return { error: "You can only log 1:1s with people who report to you." };
  const date = parseIsoDate(d.date);
  if (!date) return { error: "Fix the highlighted fields.", fieldErrors: { date: ["Enter a date as YYYY-MM-DD"] } };
  const o = await prisma.oneOnOne.create({ data: { employeeId: d.employeeId, managerId: user.id, date, notes: d.notes || null }, select: { id: true } });
  revalidatePath("/performance");
  redirect(`/performance/one-on-ones/${o.id}?toast=created`);
}

export async function saveOneOnOneNotes(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (notes.length > 10000) return { error: "Notes are too long." };
  const o = await prisma.oneOnOne.findUnique({ where: { id }, select: { employeeId: true, managerId: true } });
  if (!o) return { error: "1:1 not found." };
  if (!canEditOneOnOne(user, o)) return { error: NO };
  await prisma.oneOnOne.update({ where: { id }, data: { notes: notes || null } });
  revalidatePath(`/performance/one-on-ones/${id}`);
  redirect(`/performance/one-on-ones/${id}?toast=saved`);
}

const itemSchema = z.object({ oneOnOneId: z.string().min(1), title: z.string().trim().min(1, "Required").max(200), ownerId: z.string().min(1, "Choose an owner"), dueDate: z.string().optional() });

export async function addActionItem(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = itemSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Fix the highlighted fields.", fieldErrors: errorsOf(parsed.error) };
  const d = parsed.data;
  const o = await prisma.oneOnOne.findUnique({ where: { id: d.oneOnOneId }, select: { employeeId: true, managerId: true } });
  if (!o) return { error: "1:1 not found." };
  if (!canEditOneOnOne(user, o)) return { error: NO };
  if (d.ownerId !== o.employeeId && d.ownerId !== o.managerId) return { error: "Fix the highlighted fields.", fieldErrors: { ownerId: ["Owner must be one of the two people in the 1:1"] } };
  const dueDate = d.dueDate ? parseIsoDate(d.dueDate) : null;
  if (d.dueDate && !dueDate) return { error: "Fix the highlighted fields.", fieldErrors: { dueDate: ["Enter a date as YYYY-MM-DD"] } };
  await prisma.actionItem.create({ data: { oneOnOneId: d.oneOnOneId, title: d.title, ownerId: d.ownerId, dueDate } });
  revalidatePath(`/performance/one-on-ones/${d.oneOnOneId}`);
  redirect(`/performance/one-on-ones/${d.oneOnOneId}?toast=saved`);
}

export async function toggleActionItem(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const item = await prisma.actionItem.findUnique({ where: { id }, select: { doneAt: true, oneOnOne: { select: { id: true, employeeId: true, managerId: true } } } });
  if (!item) throw new Error("Action item not found.");
  if (!canViewOneOnOne(user, item.oneOnOne)) throw new PermissionError();
  await prisma.actionItem.update({ where: { id }, data: { doneAt: item.doneAt ? null : new Date() } });
  revalidatePath("/performance");
  redirect(back(formData.get("back"), `/performance/one-on-ones/${item.oneOnOne.id}`));
}

// ---------------------------------------------------------------- review cycles

const cycleSchema = z.object({ year: z.coerce.number().int().min(2020).max(2100), half: z.enum(REVIEW_HALVES), selfDueDate: z.string().min(1, "Required"), managerDueDate: z.string().min(1, "Required") });

/** Creates the cycle and a self + manager draft for every current person who has a manager. */
export async function createCycle(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canManageReviewCycles(user)) return { error: NO };
  const parsed = cycleSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Fix the highlighted fields.", fieldErrors: errorsOf(parsed.error) };
  const d = parsed.data;
  const selfDue = parseIsoDate(d.selfDueDate);
  const managerDue = parseIsoDate(d.managerDueDate);
  if (!selfDue || !managerDue) return { error: "Enter both due dates as YYYY-MM-DD." };
  if (managerDue < selfDue) return { error: "Fix the highlighted fields.", fieldErrors: { managerDueDate: ["Manager reviews are due after self reviews"] } };
  if (await prisma.reviewCycle.findUnique({ where: { year_half: { year: d.year, half: d.half } } })) return { error: `${d.year} ${d.half} already exists.` };

  const people = await prisma.employee.findMany({ where: { status: { not: "left" }, managerId: { not: null } }, select: { id: true, managerId: true } });
  const cycle = await prisma.reviewCycle.create({
    data: {
      name: `${d.year} ${d.half}`,
      year: d.year,
      half: d.half,
      selfDueDate: selfDue,
      managerDueDate: managerDue,
      status: "open",
      reviews: {
        create: people.flatMap((p) => [
          { employeeId: p.id, reviewerId: p.id, kind: "self", status: "draft" },
          { employeeId: p.id, reviewerId: p.managerId!, kind: "manager", status: "draft" },
        ]),
      },
    },
    select: { id: true },
  });
  revalidatePath("/performance");
  redirect(`/performance/reviews/cycle/${cycle.id}?toast=created`);
}

export async function setCycleStatus(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!canManageReviewCycles(user)) throw new PermissionError();
  const id = String(formData.get("id") ?? "");
  const status = z.enum(["open", "closed"]).parse(formData.get("status"));
  await prisma.reviewCycle.update({ where: { id }, data: { status } });
  revalidatePath("/performance");
  redirect(`/performance/reviews/cycle/${id}?toast=saved`);
}

const peerSchema = z.object({ cycleId: z.string().min(1), employeeId: z.string().min(1), reviewerId: z.string().min(1, "Choose a peer") });

export async function requestPeerReview(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = peerSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Choose a peer." };
  const d = parsed.data;
  if (!canRequestReview(user, d.employeeId)) return { error: NO };
  if (d.reviewerId === d.employeeId) return { error: "A peer review has to come from someone else." };
  const cycle = await prisma.reviewCycle.findUnique({ where: { id: d.cycleId }, select: { status: true } });
  if (!cycle || cycle.status !== "open") return { error: "That cycle is closed." };
  const exists = await prisma.review.findFirst({ where: { cycleId: d.cycleId, employeeId: d.employeeId, reviewerId: d.reviewerId, kind: "peer" } });
  if (exists) return { error: "That person has already been asked." };
  await prisma.review.create({ data: { cycleId: d.cycleId, employeeId: d.employeeId, reviewerId: d.reviewerId, kind: "peer", status: "draft" } });
  revalidatePath("/performance");
  redirect(`/performance/reviews/cycle/${d.cycleId}?toast=requested_peer`);
}

export async function saveReview(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const intent = formData.get("intent") === "submit" ? "submit" : "draft";
  const r = await prisma.review.findUnique({ where: { id }, select: { reviewerId: true, employeeId: true, status: true, cycle: { select: { status: true } } } });
  if (!r) return { error: "Review not found." };
  if (!canWriteReview(user, r)) return { error: "Only the named reviewer can write this, and only while it is a draft." };
  if (r.cycle.status !== "open") return { error: "This cycle is closed." };

  const fieldErrors: FieldErrors = {};
  const ratings: { criterion: string; rating: number; comment: string | null }[] = [];
  for (const c of REVIEW_CRITERIA) {
    const raw = formData.get(`rating_${c}`);
    const n = raw === null || raw === "" ? null : Number(raw);
    if (n !== null && (!Number.isInteger(n) || n < 1 || n > 5)) fieldErrors[`rating_${c}`] = ["Pick 1 to 5"];
    if (intent === "submit" && n === null) fieldErrors[`rating_${c}`] = ["Required to submit"];
    const comment = String(formData.get(`comment_${c}`) ?? "").trim();
    if (n !== null) ratings.push({ criterion: c, rating: n, comment: comment || null });
  }
  const summary = String(formData.get("summary") ?? "").trim();
  if (intent === "submit" && summary.length < 20) fieldErrors.summary = ["Write at least a couple of sentences before submitting"];
  if (summary.length > 5000) fieldErrors.summary = ["Keep it under 5000 characters"];
  if (Object.keys(fieldErrors).length) return { error: "Fix the highlighted fields.", fieldErrors };

  await prisma.$transaction(async (tx) => {
    await tx.review.update({ where: { id }, data: { summary: summary || null, status: intent === "submit" ? "submitted" : "draft", submittedAt: intent === "submit" ? new Date() : null } });
    await tx.reviewRating.deleteMany({ where: { reviewId: id } });
    await tx.reviewRating.createMany({ data: ratings.map((x) => ({ ...x, reviewId: id })) });
  });
  revalidatePath("/performance");
  revalidatePath(`/people/${r.employeeId}/reviews`);
  redirect(intent === "submit" ? `/performance/reviews?toast=submitted` : `/performance/reviews/${id}?toast=saved`);
}
