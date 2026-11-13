"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CANDIDATE_STAGES, HIRING_DECISIONS, INTERVIEW_KINDS, RECOMMENDATIONS, ROLE_STATUSES } from "@/lib/constants";
import { parseIsoDate } from "@/lib/dates";
import { decisionGate } from "@/lib/hiring";
import { PermissionError, canEditRecruiting, canRecordHiringDecision, canSubmitScorecard } from "@/lib/permissions";
import type { FieldErrors, FormState } from "@/lib/people";

const NO = "You do not have permission to do that.";
const errorsOf = (e: z.ZodError): FieldErrors => {
  const out: FieldErrors = {};
  for (const i of e.issues) (out[String(i.path[0])] ??= []).push(i.message);
  return out;
};
const revalidateAll = () => {
  revalidatePath("/recruitment");
  revalidatePath("/");
};

// ---------------------------------------------------------------- roles

const roleSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Required").max(120),
  teamId: z.string().min(1, "Choose a team"),
  officeId: z.string().min(1, "Choose an office"),
  hiringManagerId: z.string().min(1, "Choose a hiring manager"),
  status: z.enum(ROLE_STATUSES, { error: "Choose a status" }),
  openedAt: z.string().min(1, "Required"),
  description: z.string().trim().max(2000).optional(),
});

export async function saveRole(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canEditRecruiting(user)) return { error: NO };
  const parsed = roleSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Fix the highlighted fields.", fieldErrors: errorsOf(parsed.error) };
  const d = parsed.data;
  const openedAt = parseIsoDate(d.openedAt);
  if (!openedAt) return { error: "Fix the highlighted fields.", fieldErrors: { openedAt: ["Enter a date as YYYY-MM-DD"] } };
  const closed = d.status === "filled" || d.status === "closed";
  const data = { title: d.title, teamId: d.teamId, officeId: d.officeId, hiringManagerId: d.hiringManagerId, status: d.status, openedAt, description: d.description || null };
  let id = d.id;
  if (id) {
    const existing = await prisma.role.findUnique({ where: { id }, select: { closedAt: true } });
    if (!existing) return { error: "That role no longer exists." };
    await prisma.role.update({ where: { id }, data: { ...data, closedAt: closed ? (existing.closedAt ?? new Date()) : null } });
  } else {
    id = (await prisma.role.create({ data: { ...data, closedAt: closed ? new Date() : null }, select: { id: true } })).id;
  }
  revalidateAll();
  redirect(`/recruitment?toast=saved`);
}

// ---------------------------------------------------------------- candidates

const candidateSchema = z.object({
  id: z.string().optional(),
  roleId: z.string().min(1, "Choose a role"),
  name: z.string().trim().min(1, "Required").max(120),
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  phone: z.string().trim().max(40).optional(),
  source: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(4000).optional(),
});

export async function saveCandidate(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canEditRecruiting(user)) return { error: NO };
  const parsed = candidateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Fix the highlighted fields.", fieldErrors: errorsOf(parsed.error) };
  const d = parsed.data;
  const role = await prisma.role.findUnique({ where: { id: d.roleId }, select: { id: true } });
  if (!role) return { error: "Fix the highlighted fields.", fieldErrors: { roleId: ["Choose a role from the list"] } };
  const data = { roleId: d.roleId, name: d.name, email: d.email, phone: d.phone || null, source: d.source || null, notes: d.notes || null };
  let id = d.id;
  if (id) await prisma.candidate.update({ where: { id }, data });
  else {
    const now = new Date();
    id = (await prisma.candidate.create({ data: { ...data, stage: "applied", appliedAt: now, stageChangedAt: now }, select: { id: true } })).id;
  }
  revalidateAll();
  redirect(`/recruitment/candidates/${id}?toast=saved`);
}

const moveSchema = z.object({ id: z.string().min(1), stage: z.enum(CANDIDATE_STAGES), back: z.string().optional() });

/** Stage moves. "rejected" and "hired" come from a decision, not from here. */
export async function moveStage(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!canEditRecruiting(user)) throw new PermissionError();
  const { id, stage, back } = moveSchema.parse(Object.fromEntries(formData.entries()));
  const c = await prisma.candidate.findUnique({ where: { id }, select: { stage: true, decision: true } });
  if (!c) throw new Error("Candidate not found.");
  const target = back && back.startsWith("/") ? back : `/recruitment/candidates/${id}`;
  if (stage === c.stage) redirect(target);
  if (stage === "rejected" && c.decision !== "no_hire") redirect(`${target}?toast=need_decision`);
  if (stage === "hired" && c.decision !== "hire") redirect(`${target}?toast=need_decision`);
  await prisma.candidate.update({ where: { id }, data: { stage, stageChangedAt: new Date() } });
  revalidateAll();
  redirect(`${target}?toast=moved`);
}

// ---------------------------------------------------------------- interviews and scorecards

const interviewSchema = z.object({
  candidateId: z.string().min(1),
  interviewerId: z.string().min(1, "Choose an interviewer"),
  kind: z.enum(INTERVIEW_KINDS, { error: "Choose a type" }),
  scheduledAt: z.string().min(1, "Required"),
});

export async function scheduleInterview(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canEditRecruiting(user)) return { error: NO };
  const parsed = interviewSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Fix the highlighted fields.", fieldErrors: errorsOf(parsed.error) };
  const d = parsed.data;
  const scheduledAt = parseIsoDate(d.scheduledAt);
  if (!scheduledAt) return { error: "Fix the highlighted fields.", fieldErrors: { scheduledAt: ["Enter a date as YYYY-MM-DD"] } };
  const c = await prisma.candidate.findUnique({ where: { id: d.candidateId }, select: { decision: true } });
  if (!c) return { error: "Candidate not found." };
  if (c.decision) return { error: "A decision has already been recorded for this candidate." };
  await prisma.interview.create({ data: { candidateId: d.candidateId, interviewerId: d.interviewerId, kind: d.kind, scheduledAt } });
  revalidateAll();
  redirect(`/recruitment/candidates/${d.candidateId}?toast=scheduled`);
}

export async function submitScorecard(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const interviewId = String(formData.get("interviewId") ?? "");
  const interview = await prisma.interview.findUnique({ where: { id: interviewId }, select: { interviewerId: true, candidateId: true, candidate: { select: { decision: true } } } });
  if (!interview) return { error: "Interview not found." };
  if (!canSubmitScorecard(user, interview)) return { error: "Only the interviewer can fill in this scorecard." };
  if (interview.candidate.decision) return { error: "A decision has been recorded, so this scorecard is locked." };

  const criteria = await prisma.scorecardCriterion.findMany({ orderBy: { sortOrder: "asc" } });
  const fieldErrors: FieldErrors = {};
  const scores: { criterionId: string; weight: number; score: number; note: string | null }[] = [];
  for (const c of criteria) {
    const raw = Number(formData.get(`score_${c.id}`));
    if (!Number.isInteger(raw) || raw < 1 || raw > 5) fieldErrors[`score_${c.id}`] = ["Pick a score from 1 to 5"];
    const note = String(formData.get(`note_${c.id}`) ?? "").trim();
    scores.push({ criterionId: c.id, weight: c.weight, score: raw, note: note || null });
  }
  const rec = z.enum(RECOMMENDATIONS).safeParse(formData.get("recommendation"));
  if (!rec.success) fieldErrors.recommendation = ["Choose a recommendation"];
  const summary = String(formData.get("summary") ?? "").trim();
  if (summary.length > 2000) fieldErrors.summary = ["Keep it under 2000 characters"];
  if (Object.keys(fieldErrors).length) return { error: "Fix the highlighted fields.", fieldErrors };

  await prisma.$transaction(async (tx) => {
    const card = await tx.scorecard.upsert({
      where: { interviewId },
      create: { interviewId, recommendation: rec.data!, summary: summary || null, submittedAt: new Date() },
      update: { recommendation: rec.data!, summary: summary || null, submittedAt: new Date() },
    });
    await tx.scorecardScore.deleteMany({ where: { scorecardId: card.id } });
    await tx.scorecardScore.createMany({ data: scores.map((s) => ({ ...s, scorecardId: card.id })) });
  });
  revalidateAll();
  redirect(`/recruitment/candidates/${interview.candidateId}?toast=scorecard`);
}

// ---------------------------------------------------------------- decision and outcome

const decisionSchema = z.object({ candidateId: z.string().min(1), decision: z.enum(HIRING_DECISIONS) });

export async function recordDecision(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = decisionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Choose hire or no hire." };
  const { candidateId, decision } = parsed.data;
  const c = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { decision: true, role: { select: { hiringManagerId: true } }, interviews: { select: { id: true, interviewer: { select: { firstName: true, lastName: true } }, scorecard: { select: { submittedAt: true } } } } },
  });
  if (!c) return { error: "Candidate not found." };
  if (!canRecordHiringDecision(user, c.role)) return { error: "Only the hiring manager or an admin can record the decision." };
  if (c.decision) return { error: "A decision has already been recorded." };

  // The gate, enforced on the server.
  const gate = decisionGate(
    c.interviews.map((i) => ({ id: i.id, interviewerName: `${i.interviewer.firstName} ${i.interviewer.lastName}`, scorecardSubmitted: Boolean(i.scorecard?.submittedAt) })),
    decision,
  );
  if (!gate.allowed) return { error: gate.reason };

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { decision, decidedAt: new Date(), stage: decision === "hire" ? "offer" : "rejected", stageChangedAt: new Date() },
  });
  revalidateAll();
  redirect(`/recruitment/candidates/${candidateId}?toast=decided`);
}

export async function markOutcomeSent(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("candidateId") ?? "");
  const back = String(formData.get("back") ?? "");
  const c = await prisma.candidate.findUnique({ where: { id }, select: { decision: true, outcomeSentAt: true, role: { select: { hiringManagerId: true } } } });
  if (!c) throw new Error("Candidate not found.");
  if (!canRecordHiringDecision(user, c.role) && !canEditRecruiting(user)) throw new PermissionError();
  if (!c.decision) redirect(`/recruitment/candidates/${id}?toast=need_decision`);
  if (!c.outcomeSentAt) await prisma.candidate.update({ where: { id }, data: { outcomeSentAt: new Date() } });
  revalidateAll();
  redirect(`${back.startsWith("/") ? back : `/recruitment/candidates/${id}`}?toast=outcome`);
}
