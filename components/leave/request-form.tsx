"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Field, FormError, inputClass, textareaClass } from "@/components/ui";
import { LEAVE_TYPES, label } from "@/lib/constants";
import { parseIsoDate } from "@/lib/dates";
import { countWorkingDays, makeCalendar } from "@/lib/workdays";
import type { Balance } from "@/lib/leave-rules";
import type { FormState } from "@/lib/people";
import { createLeaveRequest } from "@/app/(app)/leave/actions";

export function LeaveRequestForm({
  employeeId,
  forName,
  weekendDays,
  holidays,
  balances,
  defaultStart,
  cancelHref,
}: {
  employeeId: string;
  /** Shown when requesting on someone else's behalf. */
  forName?: string;
  weekendDays: string;
  /** Public holidays as YYYY-MM-DD. */
  holidays: string[];
  balances: Balance[];
  defaultStart: string;
  cancelHref: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createLeaveRequest, null);
  const fe = state?.fieldErrors ?? {};
  const [type, setType] = useState("annual");
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultStart);

  const cal = useMemo(() => makeCalendar(weekendDays, holidays.map((h) => parseIsoDate(h)!).filter(Boolean)), [weekendDays, holidays]);
  const days = useMemo(() => {
    const s = parseIsoDate(start);
    const e = parseIsoDate(end);
    if (!s || !e || e < s) return null;
    return countWorkingDays(s, e, cal);
  }, [start, end, cal]);
  const balance = balances.find((b) => b.type === type);
  const after = balance && balance.remaining !== null && days !== null ? balance.remaining - days : null;

  return (
    <form action={action} className="max-w-xl space-y-6">
      <input type="hidden" name="employeeId" value={employeeId} />
      <FormError message={state?.error} />
      {forName ? <p className="rounded-card bg-accent-soft px-4 py-3 text-sm text-accent-ink">Requesting on behalf of {forName}.</p> : null}

      <Field label="Type" htmlFor="type" error={fe.type}>
        <select id="type" name="type" value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
          {LEAVE_TYPES.map((t) => (
            <option key={t} value={t}>
              {label(t)}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First day" htmlFor="startDate" error={fe.startDate}>
          <input id="startDate" name="startDate" type="date" value={start} onChange={(e) => { setStart(e.target.value); if (e.target.value > end) setEnd(e.target.value); }} className={inputClass} required />
        </Field>
        <Field label="Last day" htmlFor="endDate" error={fe.endDate}>
          <input id="endDate" name="endDate" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className={inputClass} required />
        </Field>
      </div>

      <div className="rounded-card border border-line bg-page px-4 py-3 text-sm" aria-live="polite">
        {days === null ? (
          <span className="text-muted">Pick the dates to see how many working days this is.</span>
        ) : (
          <>
            <span className="font-medium">
              {days} working day{days === 1 ? "" : "s"}
            </span>
            <span className="text-muted"> (weekends and public holidays are skipped)</span>
            {balance && balance.remaining !== null ? (
              <span className={`block ${after !== null && after < 0 ? "text-danger-ink" : "text-muted"}`}>
                {balance.remaining} {label(type).toLowerCase()} day{balance.remaining === 1 ? "" : "s"} left this year
                {after !== null ? ` → ${after} after this request` : ""}
              </span>
            ) : null}
          </>
        )}
      </div>

      <Field label="Reason (optional)" htmlFor="reason" error={fe.reason}>
        <textarea id="reason" name="reason" rows={3} className={textareaClass} placeholder="Only your manager and HR see this." />
      </Field>

      <div className="flex items-center gap-3 border-t border-line pt-6">
        <Button type="submit" disabled={pending || days === null || days === 0}>
          {pending ? "Sending…" : "Send request"}
        </Button>
        <Link href={cancelHref} className="rounded-full px-4 py-2 text-sm font-medium text-muted hover:bg-hover hover:text-ink">
          Cancel
        </Link>
      </div>
    </form>
  );
}
