"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button, Field, FormError, inputClass, textareaClass } from "@/components/ui";
import { GOAL_STATUSES, REVIEW_CRITERIA, REVIEW_HALVES, label } from "@/lib/constants";
import type { FormState } from "@/lib/people";
import { addActionItem, createCycle, createOneOnOne, requestPeerReview, saveGoal, saveOneOnOneNotes, saveReview, updateGoalStatus } from "@/app/(app)/performance/actions";

type Opt = { id: string; name: string };
const Cancel = ({ href }: { href: string }) => (
  <Link href={href} className="rounded-full px-4 py-2 text-sm font-medium text-muted hover:bg-hover hover:text-ink">
    Cancel
  </Link>
);

export function GoalForm({ employeeId, year, quarter, goal, cancelHref }: { employeeId: string; year: number; quarter: number; goal?: { id: string; title: string; description: string; status: string }; cancelHref: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveGoal, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="employeeId" value={employeeId} />
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="quarter" value={quarter} />
      {goal ? <input type="hidden" name="id" value={goal.id} /> : null}
      <FormError message={state?.error} />
      <Field label="Goal" htmlFor="title" error={fe.title}>
        <input id="title" name="title" defaultValue={goal?.title ?? ""} className={inputClass} placeholder="Outcome, not activity: e.g. Cut p95 latency under 200 ms" required />
      </Field>
      <Field label="Details (optional)" htmlFor="description" error={fe.description}>
        <textarea id="description" name="description" rows={3} defaultValue={goal?.description ?? ""} className={textareaClass} />
      </Field>
      {goal ? (
        <Field label="Status" htmlFor="status" error={fe.status}>
          <select id="status" name="status" defaultValue={goal.status} className={inputClass}>
            {GOAL_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </Field>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : goal ? "Save goal" : "Add goal"}</Button>
        <Cancel href={cancelHref} />
      </div>
    </form>
  );
}

export function GoalStatusSelect({ goalId, status, back }: { goalId: string; status: string; back: string }) {
  return (
    <form action={updateGoalStatus} onChange={(e) => e.currentTarget.requestSubmit()}>
      <input type="hidden" name="id" value={goalId} />
      <input type="hidden" name="back" value={back} />
      <label className="sr-only" htmlFor={`status-${goalId}`}>Status</label>
      <select id={`status-${goalId}`} name="status" defaultValue={status} className={`${inputClass} h-8 w-36 rounded-full py-0 text-[13px]`}>
        {GOAL_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
      </select>
    </form>
  );
}

export function OneOnOneForm({ reports, defaultEmployeeId, defaultDate, cancelHref }: { reports: Opt[]; defaultEmployeeId: string; defaultDate: string; cancelHref: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createOneOnOne, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="max-w-2xl space-y-4">
      <FormError message={state?.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="With" htmlFor="employeeId" error={fe.employeeId}>
          <select id="employeeId" name="employeeId" defaultValue={defaultEmployeeId} className={inputClass} required>
            <option value="">Choose…</option>
            {reports.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="Date" htmlFor="date" error={fe.date}>
          <input id="date" name="date" type="date" defaultValue={defaultDate} className={inputClass} required />
        </Field>
      </div>
      <Field label="Notes" htmlFor="notes" error={fe.notes} hint="Private to the two of you. Nobody else, including admins, can read these.">
        <textarea id="notes" name="notes" rows={8} className={textareaClass} placeholder="What we talked about, decisions, how things are going." />
      </Field>
      <div className="flex items-center gap-3 border-t border-line pt-6">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save 1:1"}</Button>
        <Cancel href={cancelHref} />
      </div>
    </form>
  );
}

export function NotesForm({ id, notes }: { id: string; notes: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveOneOnOneNotes, null);
  const [dirty, setDirty] = useState(false);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <FormError message={state?.error} />
      <textarea name="notes" rows={10} defaultValue={notes} onChange={() => setDirty(true)} className={textareaClass} placeholder="Notes…" aria-label="Notes" />
      <div className="flex items-center gap-3">
        <Button type="submit" variant={dirty ? "primary" : "secondary"} disabled={pending}>{pending ? "Saving…" : "Save notes"}</Button>
        {dirty ? <span className="text-xs text-muted">Unsaved changes</span> : null}
      </div>
    </form>
  );
}

export function ActionItemForm({ oneOnOneId, people, defaultOwnerId }: { oneOnOneId: string; people: Opt[]; defaultOwnerId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addActionItem, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="oneOnOneId" value={oneOnOneId} />
      <FormError message={state?.error} />
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_150px_auto] sm:items-end">
        <Field label="Action item" htmlFor="title" error={fe.title}>
          <input id="title" name="title" className={inputClass} placeholder="e.g. Draft the promotion case" required />
        </Field>
        <Field label="Owner" htmlFor="ownerId" error={fe.ownerId}>
          <select id="ownerId" name="ownerId" defaultValue={defaultOwnerId} className={inputClass}>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Due (optional)" htmlFor="dueDate" error={fe.dueDate}>
          <input id="dueDate" name="dueDate" type="date" className={inputClass} />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Adding…" : "Add"}</Button>
      </div>
    </form>
  );
}

export function CycleForm({ defaultYear, cancelHref }: { defaultYear: number; cancelHref: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createCycle, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Year" htmlFor="year" error={fe.year}>
          <input id="year" name="year" type="number" defaultValue={defaultYear} min={2020} max={2100} className={inputClass} required />
        </Field>
        <Field label="Half" htmlFor="half" error={fe.half}>
          <select id="half" name="half" defaultValue="H1" className={inputClass}>
            {REVIEW_HALVES.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </Field>
        <Field label="Self reviews due" htmlFor="selfDueDate" error={fe.selfDueDate}>
          <input id="selfDueDate" name="selfDueDate" type="date" className={inputClass} required />
        </Field>
        <Field label="Manager reviews due" htmlFor="managerDueDate" error={fe.managerDueDate}>
          <input id="managerDueDate" name="managerDueDate" type="date" className={inputClass} required />
        </Field>
      </div>
      <p className="text-xs text-muted">Opens the cycle and creates a self review and a manager review draft for every current person with a manager. Peer feedback is requested per person afterwards.</p>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Launching…" : "Launch cycle"}</Button>
        <Cancel href={cancelHref} />
      </div>
    </form>
  );
}

export function PeerRequestForm({ cycleId, employeeId, peers }: { cycleId: string; employeeId: string; peers: Opt[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(requestPeerReview, null);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="cycleId" value={cycleId} />
      <input type="hidden" name="employeeId" value={employeeId} />
      <label className="sr-only" htmlFor={`peer-${employeeId}`}>Peer</label>
      <select id={`peer-${employeeId}`} name="reviewerId" defaultValue="" className={`${inputClass} h-8 w-44 rounded-full py-0 text-[13px]`} required>
        <option value="">Ask a peer…</option>
        {peers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>Ask</Button>
      {state?.error ? <span className="text-xs text-danger-ink">{state.error}</span> : null}
    </form>
  );
}

export function ReviewForm({ id, existing, cancelHref }: { id: string; existing: { summary: string; ratings: Record<string, { rating: number; comment: string }> }; cancelHref: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveReview, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="max-w-3xl space-y-6">
      <input type="hidden" name="id" value={id} />
      <FormError message={state?.error} />
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        {REVIEW_CRITERIA.map((c, idx) => (
          <fieldset key={c} className={`grid gap-3 p-4 sm:grid-cols-[200px_1fr] ${idx ? "border-t border-line" : ""}`}>
            <legend className="sr-only">{c}</legend>
            <div>
              <p className="text-sm font-medium">{c}</p>
              {fe[`rating_${c}`] ? <p role="alert" className="mt-1 text-xs font-medium text-danger-ink">{fe[`rating_${c}`]![0]}</p> : null}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`${c} rating`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="cursor-pointer">
                    <input type="radio" name={`rating_${c}`} value={n} defaultChecked={existing.ratings[c]?.rating === n} className="peer sr-only" />
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-sm font-medium transition-colors peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 hover:bg-hover">{n}</span>
                  </label>
                ))}
                <span className="self-center text-xs text-muted">1 below · 3 meets · 5 far exceeds expectations</span>
              </div>
              <input name={`comment_${c}`} defaultValue={existing.ratings[c]?.comment ?? ""} placeholder="Example or context (optional)" className={inputClass} />
            </div>
          </fieldset>
        ))}
      </div>
      <Field label="Summary" htmlFor="summary" error={fe.summary} hint="Strengths, what to work on next, and anything the reader should know.">
        <textarea id="summary" name="summary" rows={6} defaultValue={existing.summary} className={textareaClass} />
      </Field>
      <div className="flex items-center gap-3 border-t border-line pt-6">
        <Button type="submit" name="intent" value="submit" disabled={pending}>Submit review</Button>
        <Button type="submit" name="intent" value="draft" variant="secondary" disabled={pending}>Save draft</Button>
        <Cancel href={cancelHref} />
      </div>
    </form>
  );
}
