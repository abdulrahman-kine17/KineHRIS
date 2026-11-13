"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clearSession, setSession } from "@/lib/auth";

const schema = z.object({ employeeId: z.string().min(1) });

export async function login(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({ employeeId: formData.get("employeeId") });
  if (!parsed.success) redirect("/login?error=pick");

  const employee = await prisma.employee.findUnique({
    where: { id: parsed.data.employeeId },
    select: { id: true, status: true },
  });
  if (!employee || employee.status === "left") redirect("/login?error=unknown");

  await setSession(employee.id);
  redirect("/");
}

export async function logout(): Promise<void> {
  await clearSession();
  redirect("/login");
}
