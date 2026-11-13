"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Field, FormError, inputClass } from "@/components/ui";
import { APP_ROLES, EMPLOYEE_STATUSES, EMPLOYMENT_TYPES, label } from "@/lib/constants";
import type { FormState } from "@/lib/people";
import { saveEmployee } from "@/app/(app)/people/actions";

export type EmployeeFormValues = {
  id?: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  title: string;
  teamId: string;
  officeId: string;
  managerId: string;
  startDate: string;
  endDate: string;
  probationEndDate: string;
  employmentType: string;
  status: string;
  appRole: string;
  personalEmail: string;
  phone: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

type Option = { id: string; name: string };

export function EmployeeForm({
  values,
  teams,
  offices,
  managers,
  canEditRecord,
  canEditContact,
  canEditRole,
  cancelHref,
}: {
  values: EmployeeFormValues;
  teams: Option[];
  offices: Option[];
  managers: Option[];
  canEditRecord: boolean;
  canEditContact: boolean;
  canEditRole: boolean;
  cancelHref: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveEmployee, null);
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={action} className="max-w-3xl space-y-8">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <FormError message={state?.error} />

      {canEditRecord ? (
        <fieldset className="space-y-4">
          <legend className="mb-3 text-base font-semibold">Record</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" htmlFor="firstName" error={fe.firstName}>
              <input id="firstName" name="firstName" defaultValue={values.firstName} className={inputClass} required />
            </Field>
            <Field label="Last name" htmlFor="lastName" error={fe.lastName}>
              <input id="lastName" name="lastName" defaultValue={values.lastName} className={inputClass} required />
            </Field>
            <Field label="Work email" htmlFor="workEmail" error={fe.workEmail}>
              <input id="workEmail" name="workEmail" type="email" defaultValue={values.workEmail} className={inputClass} required />
            </Field>
            <Field label="Job title" htmlFor="title" error={fe.title}>
              <input id="title" name="title" defaultValue={values.title} className={inputClass} required />
            </Field>
            <Field label="Team" htmlFor="teamId" error={fe.teamId}>
              <select id="teamId" name="teamId" defaultValue={values.teamId} className={inputClass} required>
                <option value="">Choose…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Office" htmlFor="officeId" error={fe.officeId}>
              <select id="officeId" name="officeId" defaultValue={values.officeId} className={inputClass} required>
                <option value="">Choose…</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Manager" htmlFor="managerId" error={fe.managerId} hint="Leave empty only for the top of the org chart.">
              <select id="managerId" name="managerId" defaultValue={values.managerId} className={inputClass}>
                <option value="">No manager</option>
                {managers
                  .filter((m) => m.id !== values.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Employment type" htmlFor="employmentType" error={fe.employmentType}>
              <select id="employmentType" name="employmentType" defaultValue={values.employmentType} className={inputClass} required>
                <option value="">Choose…</option>
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {label(t)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Start date" htmlFor="startDate" error={fe.startDate}>
              <input id="startDate" name="startDate" type="date" defaultValue={values.startDate} className={inputClass} required />
            </Field>
            <Field label="Probation end" htmlFor="probationEndDate" error={fe.probationEndDate}>
              <input id="probationEndDate" name="probationEndDate" type="date" defaultValue={values.probationEndDate} className={inputClass} />
            </Field>
            <Field label="Status" htmlFor="status" error={fe.status}>
              <select id="status" name="status" defaultValue={values.status} className={inputClass} required>
                <option value="">Choose…</option>
                {EMPLOYEE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="End date" htmlFor="endDate" error={fe.endDate} hint="Last working day, for people on notice, contractors, or leavers.">
              <input id="endDate" name="endDate" type="date" defaultValue={values.endDate} className={inputClass} />
            </Field>
            {canEditRole ? (
              <Field label="Access level" htmlFor="appRole" error={fe.appRole} hint="Admin: everything. Manager: their reports. Employee: themselves.">
                <select id="appRole" name="appRole" defaultValue={values.appRole} className={inputClass} required>
                  {APP_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {label(r)}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
          </div>
        </fieldset>
      ) : null}

      {canEditContact ? (
        <fieldset className="space-y-4">
          <legend className="mb-3 text-base font-semibold">Contact details</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Personal email" htmlFor="personalEmail" error={fe.personalEmail}>
              <input id="personalEmail" name="personalEmail" type="email" defaultValue={values.personalEmail} className={inputClass} />
            </Field>
            <Field label="Phone" htmlFor="phone" error={fe.phone}>
              <input id="phone" name="phone" defaultValue={values.phone} className={inputClass} />
            </Field>
            <Field label="Address" htmlFor="address" error={fe.address} className="sm:col-span-2">
              <input id="address" name="address" defaultValue={values.address} className={inputClass} />
            </Field>
            <Field label="Emergency contact name" htmlFor="emergencyContactName" error={fe.emergencyContactName}>
              <input id="emergencyContactName" name="emergencyContactName" defaultValue={values.emergencyContactName} className={inputClass} />
            </Field>
            <Field label="Emergency contact phone" htmlFor="emergencyContactPhone" error={fe.emergencyContactPhone}>
              <input id="emergencyContactPhone" name="emergencyContactPhone" defaultValue={values.emergencyContactPhone} className={inputClass} />
            </Field>
          </div>
        </fieldset>
      ) : null}

      <div className="flex items-center gap-3 border-t border-line pt-6">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Link href={cancelHref} className="rounded-full px-4 py-2 text-sm font-medium text-muted hover:bg-hover hover:text-ink">
          Cancel
        </Link>
      </div>
    </form>
  );
}
