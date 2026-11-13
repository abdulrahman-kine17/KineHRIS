"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Field, FormError, inputClass } from "@/components/ui";
import { CONTRACT_STATUSES, CONTRACT_TYPES, label } from "@/lib/constants";
import type { FormState } from "@/lib/people";
import { saveContract } from "@/app/(app)/contracts/actions";

export type ContractFormValues = { id?: string; employeeId: string; title: string; type: string; startDate: string; endDate: string; status: string; fileRef: string };

export function ContractForm({ values, people, lockPerson = false, cancelHref }: { values: ContractFormValues; people: { id: string; name: string }[]; lockPerson?: boolean; cancelHref: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveContract, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="max-w-2xl space-y-6">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <FormError message={state?.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Person" htmlFor="employeeId" error={fe.employeeId} className="sm:col-span-2">
          {lockPerson ? (
            <>
              <input type="hidden" name="employeeId" value={values.employeeId} />
              <input id="employeeId" value={people.find((p) => p.id === values.employeeId)?.name ?? ""} disabled className={inputClass} />
            </>
          ) : (
            <select id="employeeId" name="employeeId" defaultValue={values.employeeId} className={inputClass} required>
              <option value="">Choose…</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Title" htmlFor="title" error={fe.title} className="sm:col-span-2">
          <input id="title" name="title" defaultValue={values.title} className={inputClass} placeholder="Employment contract – Software Engineer" required />
        </Field>
        <Field label="Type" htmlFor="type" error={fe.type}>
          <select id="type" name="type" defaultValue={values.type} className={inputClass} required>
            {CONTRACT_TYPES.map((t) => (
              <option key={t} value={t}>
                {label(t)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status" htmlFor="status" error={fe.status} hint="Use the Mark… buttons on the list for the normal flow; this is for corrections.">
          <select id="status" name="status" defaultValue={values.status} className={inputClass} required>
            {CONTRACT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Start date" htmlFor="startDate" error={fe.startDate}>
          <input id="startDate" name="startDate" type="date" defaultValue={values.startDate} className={inputClass} required />
        </Field>
        <Field label="End date" htmlFor="endDate" error={fe.endDate} hint="Leave empty for open-ended. Renewals are reminded 90 days ahead.">
          <input id="endDate" name="endDate" type="date" defaultValue={values.endDate} className={inputClass} />
        </Field>
        <Field label="File reference" htmlFor="fileRef" error={fe.fileRef} className="sm:col-span-2" hint="Where the signed document lives (a path or link). Uploads are not part of the prototype.">
          <input id="fileRef" name="fileRef" defaultValue={values.fileRef} className={inputClass} placeholder="contracts/2026/name.pdf" />
        </Field>
      </div>
      <div className="flex items-center gap-3 border-t border-line pt-6">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save contract"}
        </Button>
        <Link href={cancelHref} className="rounded-full px-4 py-2 text-sm font-medium text-muted hover:bg-hover hover:text-ink">
          Cancel
        </Link>
      </div>
    </form>
  );
}
