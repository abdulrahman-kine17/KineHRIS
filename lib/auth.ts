// Seeded login for the prototype: pick an employee, get a signed cookie.
// The cookie only carries the employee id plus an HMAC, so it cannot be
// forged or edited in the browser. Every server read and write starts with
// requireUser(), and the permission rules in lib/permissions.ts decide the rest.

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { computeReportIds, type Viewer } from "./permissions";
import type { AppRole } from "./constants";

const COOKIE = "hris_session";
const SECRET = process.env.SESSION_SECRET ?? "dev-only-secret-change-me-before-any-real-use";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("base64url");
}

function encode(employeeId: string): string {
  return `${employeeId}.${sign(employeeId)}`;
}

function decode(token: string | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(id);
  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return id;
}

export type CurrentUser = Viewer & {
  firstName: string;
  lastName: string;
  name: string;
  title: string;
  officeId: string;
  teamId: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const id = decode(store.get(COOKIE)?.value);
  if (!id) return null;

  const [me, all] = await Promise.all([
    prisma.employee.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true, title: true, appRole: true, officeId: true, teamId: true, status: true },
    }),
    prisma.employee.findMany({ select: { id: true, managerId: true } }),
  ]);
  if (!me || me.status === "left") return null;

  return {
    id: me.id,
    appRole: me.appRole as AppRole,
    reportIds: computeReportIds(me.id, all),
    firstName: me.firstName,
    lastName: me.lastName,
    name: `${me.firstName} ${me.lastName}`,
    title: me.title,
    officeId: me.officeId,
    teamId: me.teamId,
  };
}

/** Use at the top of every page and server action. Redirects to /login when signed out. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function setSession(employeeId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, encode(employeeId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
