"use client";

import { useActionState } from "react";
import { Button, Field, FormError, inputClass } from "@/components/ui";
import { BENEFIT_TYPES, SALARY_REASONS, label } from "@/lib/constants";
import type { FormState } from "@/lib/people";
import { addAdvance, addBenefit, addSalaryRecord } from "@/app/(app)/compensation/actions";

export function SalaryForm({ employeeId, currency, defaultDate }: { employeeId: string; currency: string; defaultDate: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addSalaryRecord, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="employeeId" value={employeeId} />
      <FormError message={state?.error} />
      <div className="grid gap-3 sm:grid-cols-[1fr_110px_170px_1fr_auto] sm:items-end">
        <Field label="Monthly gross" htmlFor="amount" error={fe.amount}>
          <input id="amount" name="amount" type="number" min={1} step="1" className={inputClass} required />
        </Field>
        <Field label="Currency" htmlFor="currency" error={fe.currency}>
          <input id="currency" name="currency" defaultValue={currency} maxLength={3} className={`${inputClass} uppercase`} required />
        </Field>
        <Field label="Effective from" htmlFor="effectiveDate" error={fe.effectiveDate}>
          <input id="effectiveDate" name="effectiveDate" type="date" defaultValue={defaultDate} className={inputClass} required />
        </Field>
        <Field label="Reason" htmlFor="reason" error={fe.reason}>
          <select id="reason" name="reason" defaultValue="adjustment" className={inputClass}>
            {SALARY_REASONS.map((r) => <option key={r} value={r}>{label(r)}</option>)}
          </select>
        </Field>
        <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Saving…" : "Add change"}</Button>
      </div>
      <p className="text-xs text-muted">History is never overwritten. Add a new record with the date the new amount applies from.</p>
    </form>
  );
}

export function BenefitForm({ employeeId, people, currency, defaultDate, back }: { employeeId?: string; people?: { id: string; name: string }[]; currency: string; defaultDate: string; back?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addBenefit, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3">
      {employeeId ? <input type="hidden" name="employeeId" value={employeeId} /> : null}
      {back ? <input type="hidden" name="back" value={back} /> : null}
      <FormError message={state?.error} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_120px_100px_150px_150px_auto] lg:items-end">
        {people ? (
          <Field label="Person" htmlFor="b_employeeId" error={fe.employeeId}>
            <select id="b_employeeId" name="employeeId" defaultValue="" className={inputClass} required>
              <option value="">Choose…</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        ) : null}
        <Field label="Type" htmlFor="b_type" error={fe.type}>
          <select id="b_type" name="type" defaultValue="medical_insurance" className={inputClass}>
            {BENEFIT_TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
          </select>
        </Field>
        <Field label="Description" htmlFor="b_description" error={fe.description}>
          <input id="b_description" name="description" className={inputClass} placeholder="e.g. Family plan" />
        </Field>
        <Field label="Monthly amount" htmlFor="b_amount" error={fe.amount} hint="Leave empty for non-cash benefits.">
          <input id="b_amount" name="amount" type="number" min={0} step="1" className={inputClass} />
        </Field>
        <Field label="Currency" htmlFor="b_currency" error={fe.currency}>
          <input id="b_currency" name="currency" defaultValue={currency} maxLength={3} className={`${inputClass} uppercase`} />
        </Field>
        <Field label="From" htmlFor="b_startDate" error={fe.startDate}>
          <input id="b_startDate" name="startDate" type="date" defaultValue={defaultDate} className={inputClass} required />
        </Field>
        <Field label="Until (optional)" htmlFor="b_endDate" error={fe.endDate}>
          <input id="b_endDate" name="endDate" type="date" className={inputClass} />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Saving…" : "Add benefit"}</Button>
      </div>
    </form>
  );
}

export function AdvanceForm({ employeeId, currency, defaultDate }: { employeeId: string; currency: string; defaultDate: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addAdvance, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="employeeId" value={employeeId} />
      <FormError message={state?.error} />
      <div className="grid gap-3 sm:grid-cols-[1fr_110px_170px_1fr_auto] sm:items-end">
        <Field label="Amount" htmlFor="a_amount" error={fe.amount}>
          <input id="a_amount" name="amount" type="number" min={1} step="1" className={inputClass} required />
        </Field>
        <Field label="Currency" htmlFor="a_currency" error={fe.currency}>
          <input id="a_currency" name="currency" defaultValue={currency} maxLength={3} className={`${inputClass} uppercase`} required />
        </Field>
        <Field label="Paid on" htmlFor="a_date" error={fe.date}>
          <input id="a_date" name="date" type="date" defaultValue={defaultDate} className={inputClass} required />
        </Field>
        <Field label="Note" htmlFor="a_note" error={fe.note}>
          <input id="a_note" name="note" className={inputClass} placeholder="e.g. Repay over 3 months" />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Saving…" : "Record advance"}</Button>
      </div>
    </form>
  );
}
