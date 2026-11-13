"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Field, FormError, inputClass } from "@/components/ui";
import { CHECKLIST_KINDS, label } from "@/lib/constants";
import type { FormState } from "@/lib/people";
import { addChecklistItem, createChecklist } from "@/app/(app)/checklists/actions";

type Opt = { id: string; name: string };

export function NewChecklistForm({ people, defaults, cancelHref }: { people: Opt[]; defaults: { employeeId: string; kind: string }; cancelHref: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createChecklist, null);
  return (
    <form action={action} className="max-w-xl space-y-6">
      <FormError message={state?.error} />
      <Field label="Person" htmlFor="employeeId">
        <select id="employeeId" name="employeeId" defaultValue={defaults.employeeId} className={inputClass} required>
          <option value="">Choose…</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Type" htmlFor="kind">
        <select id="kind" name="kind" defaultValue={defaults.kind} className={inputClass}>
          {CHECKLIST_KINDS.map((k) => (
            <option key={k} value={k}>
              {label(k)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Anchor date (optional)" htmlFor="anchorDate" hint="Defaults to the person's start date for onboarding, or their end date for offboarding. Due dates are set relative to it.">
        <input id="anchorDate" name="anchorDate" type="date" className={inputClass} />
      </Field>
      <div className="flex items-center gap-3 border-t border-line pt-6">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create checklist"}
        </Button>
        <Link href={cancelHref} className="rounded-full px-4 py-2 text-sm font-medium text-muted hover:bg-hover hover:text-ink">
          Cancel
        </Link>
      </div>
    </form>
  );
}

export function AddItemForm({ checklistId, people, defaultDue }: { checklistId: string; people: Opt[]; defaultDue: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addChecklistItem, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="checklistId" value={checklistId} />
      <FormError message={state?.error} />
      <div className="grid gap-3 sm:grid-cols-[1fr_200px_160px_auto] sm:items-end">
        <Field label="New step" htmlFor="title" error={fe.title}>
          <input id="title" name="title" className={inputClass} placeholder="e.g. Set up VPN access" required />
        </Field>
        <Field label="Owner" htmlFor="ownerId" error={fe.ownerId}>
          <select id="ownerId" name="ownerId" defaultValue="" className={inputClass} required>
            <option value="">Choose…</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Due" htmlFor="dueDate" error={fe.dueDate}>
          <input id="dueDate" name="dueDate" type="date" defaultValue={defaultDue} className={inputClass} required />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Adding…" : "Add step"}
        </Button>
      </div>
    </form>
  );
}
