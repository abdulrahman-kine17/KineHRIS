// People helpers: completeness, list filters and the form schemas.

import { z } from "zod";
import { APP_ROLES, EMPLOYEE_STATUSES, EMPLOYMENT_TYPES, MANDATORY_EMPLOYEE_FIELDS } from "./constants";
import { parseIsoDate } from "./dates";

export const FIELD_LABELS: Record<string, string> = {
  firstName: "First name",
  lastName: "Last name",
  workEmail: "Work email",
  personalEmail: "Personal email",
  phone: "Phone",
  address: "Address",
  emergencyContactName: "Emergency contact name",
  emergencyContactPhone: "Emergency contact phone",
  title: "Job title",
  teamId: "Team",
  managerId: "Manager",
  officeId: "Office",
  startDate: "Start date",
  employmentType: "Employment type",
};

export type CompletenessInput = Record<(typeof MANDATORY_EMPLOYEE_FIELDS)[number], unknown> & {
  /** The top of the org chart has no manager and is still complete. */
  isOrgRoot?: boolean;
};

export function completeness(e: CompletenessInput) {
  const missing: string[] = [];
  for (const f of MANDATORY_EMPLOYEE_FIELDS) {
    if (f === "managerId" && e.isOrgRoot) continue;
    const v = e[f];
    if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) missing.push(f);
  }
  const total = MANDATORY_EMPLOYEE_FIELDS.length - (e.isOrgRoot ? 1 : 0);
  return {
    total,
    filled: total - missing.length,
    missing,
    missingLabels: missing.map((m) => FIELD_LABELS[m] ?? m),
    percent: Math.round(((total - missing.length) / total) * 100),
    complete: missing.length === 0,
  };
}

export const fullName = (e: { firstName: string; lastName: string }) => `${e.firstName} ${e.lastName}`;

// ---------------------------------------------------------------- list filters

export type PeopleFilters = { q: string; office: string; team: string; status: "current" | "left" | "all"; joined: string; left: string };

export function parsePeopleFilters(sp: Record<string, string | string[] | undefined>): PeopleFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) ?? "";
  const status = one("status");
  return {
    q: one("q").trim(),
    office: one("office"),
    team: one("team"),
    status: status === "left" || status === "all" ? status : "current",
    joined: /^\d{4}(-\d{2})?$/.test(one("joined")) ? one("joined") : "",
    left: /^\d{4}(-\d{2})?$/.test(one("left")) ? one("left") : "",
  };
}

/** "2026" -> whole year, "2026-03" -> that month, as a Prisma date range. */
export function periodRange(p: string): { gte: Date; lt: Date } {
  const [y, m] = p.split("-").map(Number);
  return m ? { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) } : { gte: new Date(Date.UTC(y, 0, 1)), lt: new Date(Date.UTC(y + 1, 0, 1)) };
}

export function peopleWhere(f: PeopleFilters) {
  const and: Record<string, unknown>[] = [];
  if (f.status === "current") and.push({ status: { not: "left" } });
  if (f.status === "left") and.push({ status: "left" });
  if (f.joined) and.push({ startDate: periodRange(f.joined) });
  if (f.left) and.push({ endDate: periodRange(f.left) });
  if (f.office) and.push({ officeId: f.office });
  if (f.team) and.push({ teamId: f.team });
  if (f.q) {
    and.push({
      OR: [
        { firstName: { contains: f.q } },
        { lastName: { contains: f.q } },
        { workEmail: { contains: f.q } },
        { title: { contains: f.q } },
      ],
    });
  }
  return and.length ? { AND: and } : {};
}

// ---------------------------------------------------------------- form schemas

const optionalText = z
  .string()
  .trim()
  .max(200)
  .transform((s) => (s === "" ? null : s));

const optionalEmail = z
  .string()
  .trim()
  .transform((s) => (s === "" ? null : s))
  .refine((s) => s === null || z.email().safeParse(s).success, "Enter a valid email address");

const optionalDate = z
  .string()
  .trim()
  .transform((s, ctx) => {
    if (s === "") return null;
    const d = parseIsoDate(s);
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Enter a date as YYYY-MM-DD" });
      return z.NEVER;
    }
    return d;
  });

const requiredDate = z
  .string()
  .trim()
  .min(1, "Required")
  .transform((s, ctx) => {
    const d = parseIsoDate(s);
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Enter a date as YYYY-MM-DD" });
      return z.NEVER;
    }
    return d;
  });

export const contactSchema = z.object({
  personalEmail: optionalEmail,
  phone: optionalText,
  address: optionalText,
  emergencyContactName: optionalText,
  emergencyContactPhone: optionalText,
});

export const recordSchema = z.object({
  firstName: z.string().trim().min(1, "Required").max(80),
  lastName: z.string().trim().min(1, "Required").max(80),
  workEmail: z.email("Enter a valid email address").trim().toLowerCase(),
  title: z.string().trim().min(1, "Required").max(120),
  teamId: z.string().min(1, "Choose a team"),
  officeId: z.string().min(1, "Choose an office"),
  managerId: z.string().transform((s) => (s === "" ? null : s)),
  startDate: requiredDate,
  endDate: optionalDate,
  probationEndDate: optionalDate,
  employmentType: z.enum(EMPLOYMENT_TYPES, { error: "Choose an employment type" }),
  status: z.enum(EMPLOYEE_STATUSES, { error: "Choose a status" }),
});

export const appRoleSchema = z.object({ appRole: z.enum(APP_ROLES, { error: "Choose an access level" }) });

export type FieldErrors = Record<string, string[] | undefined>;
export type FormState = { error?: string | null; fieldErrors?: FieldErrors } | null;

/** Turn a Zod error into { field: [messages] }. */
export function fieldErrorsOf(err: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err.issues) {
    const k = String(issue.path[0] ?? "_");
    (out[k] ??= []).push(issue.message);
  }
  return out;
}

export function formValues(formData: FormData, keys: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = formData.get(k);
    out[k] = typeof v === "string" ? v : "";
  }
  return out;
}
