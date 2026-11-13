"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Field, FormError, inputClass, textareaClass } from "@/components/ui";
import { CANDIDATE_STAGES, INTERVIEW_KINDS, RECOMMENDATIONS, ROLE_STATUSES, label } from "@/lib/constants";
import type { FormState } from "@/lib/people";
import { moveStage, recordDecision, saveCandidate, saveRole, scheduleInterview, submitScorecard } from "@/app/(app)/recruitment/actions";

type Opt = { id: string; name: string };

const CancelLink = ({ href }: { href: string }) => (
  <Link href={href} className="rounded-full px-4 py-2 text-sm font-medium text-muted hover:bg-hover hover:text-ink">
    Cancel
  </Link>
);

export function RoleForm({ values, teams, offices, managers, cancelHref }: { values: { id?: string; title: string; teamId: string; officeId: string; hiringManagerId: string; status: string; openedAt: string; description: string }; teams: Opt[]; offices: Opt[]; managers: Opt[]; cancelHref: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveRole, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="max-w-2xl space-y-6">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <FormError message={state?.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor="title" error={fe.title} className="sm:col-span-2">
          <input id="title" name="title" defaultValue={values.title} className={inputClass} required />
        </Field>
        <Field label="Team" htmlFor="teamId" error={fe.teamId}>
          <select id="teamId" name="teamId" defaultValue={values.teamId} className={inputClass} required>
            <option value="">Choose…</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Office" htmlFor="officeId" error={fe.officeId}>
          <select id="officeId" name="officeId" defaultValue={values.officeId} className={inputClass} required>
            <option value="">Choose…</option>
            {offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </Field>
        <Field label="Hiring manager" htmlFor="hiringManagerId" error={fe.hiringManagerId} hint="Records the hire / no-hire decision.">
          <select id="hiringManagerId" name="hiringManagerId" defaultValue={values.hiringManagerId} className={inputClass} required>
            <option value="">Choose…</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
        <Field label="Status" htmlFor="status" error={fe.status}>
          <select id="status" name="status" defaultValue={values.status} className={inputClass} required>
            {ROLE_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </Field>
        <Field label="Opened on" htmlFor="openedAt" error={fe.openedAt}>
          <input id="openedAt" name="openedAt" type="date" defaultValue={values.openedAt} className={inputClass} required />
        </Field>
        <Field label="Description" htmlFor="description" error={fe.description} className="sm:col-span-2">
          <textarea id="description" name="description" rows={4} defaultValue={values.description} className={textareaClass} />
        </Field>
      </div>
      <div className="flex items-center gap-3 border-t border-line pt-6">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save role"}</Button>
        <CancelLink href={cancelHref} />
      </div>
    </form>
  );
}

export function CandidateForm({ values, roles, cancelHref }: { values: { id?: string; roleId: string; name: string; email: string; phone: string; source: string; notes: string }; roles: Opt[]; cancelHref: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCandidate, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="max-w-2xl space-y-6">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <FormError message={state?.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role" htmlFor="roleId" error={fe.roleId} className="sm:col-span-2">
          <select id="roleId" name="roleId" defaultValue={values.roleId} className={inputClass} required>
            <option value="">Choose…</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="Name" htmlFor="name" error={fe.name}>
          <input id="name" name="name" defaultValue={values.name} className={inputClass} required />
        </Field>
        <Field label="Email" htmlFor="email" error={fe.email}>
          <input id="email" name="email" type="email" defaultValue={values.email} className={inputClass} required />
        </Field>
        <Field label="Phone" htmlFor="phone" error={fe.phone}>
          <input id="phone" name="phone" defaultValue={values.phone} className={inputClass} />
        </Field>
        <Field label="Source" htmlFor="source" error={fe.source} hint="LinkedIn, referral, job board…">
          <input id="source" name="source" defaultValue={values.source} className={inputClass} />
        </Field>
        <Field label="Notes" htmlFor="notes" error={fe.notes} className="sm:col-span-2">
          <textarea id="notes" name="notes" rows={4} defaultValue={values.notes} className={textareaClass} />
        </Field>
      </div>
      <div className="flex items-center gap-3 border-t border-line pt-6">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save candidate"}</Button>
        <CancelLink href={cancelHref} />
      </div>
    </form>
  );
}

/** Stage dropdown that submits on change. Hired and rejected are set by the decision. */
export function StageSelect({ candidateId, stage, back }: { candidateId: string; stage: string; back?: string }) {
  return (
    <form action={moveStage} onChange={(e) => e.currentTarget.requestSubmit()}>
      <input type="hidden" name="id" value={candidateId} />
      {back ? <input type="hidden" name="back" value={back} /> : null}
      <label className="sr-only" htmlFor={`stage-${candidateId}`}>Stage</label>
      <select id={`stage-${candidateId}`} name="stage" defaultValue={stage} className={`${inputClass} h-8 w-36 rounded-full py-0 text-[13px]`}>
        {CANDIDATE_STAGES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
      </select>
    </form>
  );
}

export function InterviewForm({ candidateId, interviewers, defaultDate }: { candidateId: string; interviewers: Opt[]; defaultDate: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(scheduleInterview, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="candidateId" value={candidateId} />
      <FormError message={state?.error} />
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <Field label="Interviewer" htmlFor="interviewerId" error={fe.interviewerId}>
          <select id="interviewerId" name="interviewerId" defaultValue="" className={inputClass} required>
            <option value="">Choose…</option>
            {interviewers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </Field>
        <Field label="Type" htmlFor="kind" error={fe.kind}>
          <select id="kind" name="kind" defaultValue="technical" className={inputClass}>
            {INTERVIEW_KINDS.map((k) => <option key={k} value={k}>{label(k)}</option>)}
          </select>
        </Field>
        <Field label="Date" htmlFor="scheduledAt" error={fe.scheduledAt}>
          <input id="scheduledAt" name="scheduledAt" type="date" defaultValue={defaultDate} className={`${inputClass} w-40`} required />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Adding…" : "Add interview"}</Button>
      </div>
      <p className="text-xs text-muted">Calendar invites would go here.</p>
    </form>
  );
}

export function ScorecardForm({ interviewId, criteria, existing, cancelHref }: { interviewId: string; criteria: { id: string; name: string; weight: number }[]; existing: { recommendation: string; summary: string; scores: Record<string, { score: number; note: string }> } | null; cancelHref: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitScorecard, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="max-w-3xl space-y-6">
      <input type="hidden" name="interviewId" value={interviewId} />
      <FormError message={state?.error} />
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        {criteria.map((c, idx) => (
          <fieldset key={c.id} className={`grid gap-3 p-4 sm:grid-cols-[220px_1fr] ${idx ? "border-t border-line" : ""}`}>
            <legend className="sr-only">{c.name}</legend>
            <div>
              <p className="text-sm font-medium">{c.name}</p>
              <p className="text-xs text-muted">weight {c.weight}%</p>
              {fe[`score_${c.id}`] ? <p role="alert" className="mt-1 text-xs font-medium text-danger-ink">{fe[`score_${c.id}`]![0]}</p> : null}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`${c.name} score`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="cursor-pointer">
                    <input type="radio" name={`score_${c.id}`} value={n} defaultChecked={existing?.scores[c.id]?.score === n} className="peer sr-only" required />
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-sm font-medium transition-colors peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 hover:bg-hover">
                      {n}
                    </span>
                  </label>
                ))}
                <span className="self-center text-xs text-muted">1 poor · 3 meets the bar · 5 exceptional</span>
              </div>
              <input name={`note_${c.id}`} defaultValue={existing?.scores[c.id]?.note ?? ""} placeholder="Evidence (optional)" className={inputClass} />
            </div>
          </fieldset>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Recommendation" htmlFor="recommendation" error={fe.recommendation}>
          <select id="recommendation" name="recommendation" defaultValue={existing?.recommendation ?? ""} className={inputClass} required>
            <option value="">Choose…</option>
            {RECOMMENDATIONS.map((r) => <option key={r} value={r}>{label(r)}</option>)}
          </select>
        </Field>
        <Field label="Summary" htmlFor="summary" error={fe.summary} className="sm:col-span-2">
          <textarea id="summary" name="summary" rows={4} defaultValue={existing?.summary ?? ""} className={textareaClass} placeholder="What stood out, what worried you." />
        </Field>
      </div>
      <div className="flex items-center gap-3 border-t border-line pt-6">
        <Button type="submit" disabled={pending}>{pending ? "Submitting…" : existing ? "Update scorecard" : "Submit scorecard"}</Button>
        <CancelLink href={cancelHref} />
      </div>
    </form>
  );
}

export function DecisionForm({ candidateId, allowed, reason }: { candidateId: string; allowed: boolean; reason?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(recordDecision, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="candidateId" value={candidateId} />
      <FormError message={state?.error} />
      {!allowed && reason ? <p className="rounded-card bg-warning-soft px-4 py-3 text-sm text-warning-ink">{reason}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="decision" value="hire" disabled={!allowed || pending}>Record hire</Button>
        <Button type="submit" name="decision" value="no_hire" variant="secondary" disabled={pending}>Record no hire</Button>
      </div>
      <p className="text-xs text-muted">A hire needs every scorecard in. A no-hire needs every scorecard in too, except for screening rejections with no interviews.</p>
    </form>
  );
}
