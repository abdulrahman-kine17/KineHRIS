"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  canCreateEmployee,
  canEditContactDetails,
  canEditEmployeeRecord,
  computeReportIds,
  isAdmin,
} from "@/lib/permissions";
import { appRoleSchema, contactSchema, fieldErrorsOf, recordSchema, type FieldErrors, type FormState } from "@/lib/people";

const NO_PERMISSION = "You do not have permission to do that.";

/** Manager must exist, be current, not be the person, and not be one of their reports (no cycles). */
async function validateManager(employeeId: string | null, managerId: string | null): Promise<string | null> {
  if (!managerId) return null;
  if (employeeId && managerId === employeeId) return "Someone cannot be their own manager.";
  const manager = await prisma.employee.findUnique({ where: { id: managerId }, select: { id: true, status: true } });
  if (!manager) return "Choose a manager from the list.";
  if (manager.status === "left") return "That person has left and cannot be a manager.";
  if (employeeId) {
    const all = await prisma.employee.findMany({ select: { id: true, managerId: true } });
    if (computeReportIds(employeeId, all).includes(managerId)) return "That would create a loop in the org chart.";
  }
  return null;
}

export async function saveEmployee(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const raw = Object.fromEntries(formData.entries());

  // ---- create
  if (!id) {
    if (!canCreateEmployee(user)) return { error: NO_PERMISSION };
    const rec = recordSchema.safeParse(raw);
    const con = contactSchema.safeParse(raw);
    const role = appRoleSchema.safeParse(raw);
    const fieldErrors: FieldErrors = {
      ...(rec.success ? {} : fieldErrorsOf(rec.error)),
      ...(con.success ? {} : fieldErrorsOf(con.error)),
      ...(role.success ? {} : fieldErrorsOf(role.error)),
    };
    if (!rec.success || !con.success || !role.success) return { error: "Fix the highlighted fields.", fieldErrors };
    const managerError = await validateManager(null, rec.data.managerId);
    if (managerError) return { error: "Fix the highlighted fields.", fieldErrors: { managerId: [managerError] } };

    let created: { id: string };
    try {
      created = await prisma.employee.create({
        data: { ...rec.data, ...con.data, appRole: role.data.appRole },
        select: { id: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
        return { error: "Fix the highlighted fields.", fieldErrors: { workEmail: ["That work email is already in use."] } };
      throw e;
    }
    revalidatePath("/people");
    redirect(`/people/${created.id}?saved=1`);
  }

  // ---- update
  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) return { error: "That person no longer exists." };
  const editRecord = canEditEmployeeRecord(user, id);
  const editContact = canEditContactDetails(user, id);
  if (!editRecord && !editContact) return { error: NO_PERMISSION };

  const data: Prisma.EmployeeUpdateInput = {};
  const fieldErrors: FieldErrors = {};

  if (editContact) {
    const con = contactSchema.safeParse(raw);
    if (con.success) Object.assign(data, con.data);
    else Object.assign(fieldErrors, fieldErrorsOf(con.error));
  }
  if (editRecord) {
    const rec = recordSchema.safeParse(raw);
    if (rec.success) {
      const { teamId, officeId, managerId, ...rest } = rec.data;
      Object.assign(data, rest, {
        team: { connect: { id: teamId } },
        office: { connect: { id: officeId } },
        manager: managerId ? { connect: { id: managerId } } : { disconnect: true },
      });
      const managerError = await validateManager(id, managerId);
      if (managerError) fieldErrors.managerId = [managerError];
    } else Object.assign(fieldErrors, fieldErrorsOf(rec.error));

    // Only admins change access levels, and nobody removes their own admin access.
    if (isAdmin(user)) {
      const role = appRoleSchema.safeParse(raw);
      if (role.success) {
        if (id === user.id && role.data.appRole !== "admin") fieldErrors.appRole = ["You cannot remove your own admin access."];
        else data.appRole = role.data.appRole;
      } else Object.assign(fieldErrors, fieldErrorsOf(role.error));
    }
  }
  if (Object.keys(fieldErrors).length) return { error: "Fix the highlighted fields.", fieldErrors };

  try {
    await prisma.employee.update({ where: { id }, data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { error: "Fix the highlighted fields.", fieldErrors: { workEmail: ["That work email is already in use."] } };
    throw e;
  }
  revalidatePath("/people");
  revalidatePath(`/people/${id}`);
  redirect(`/people/${id}?saved=1`);
}
