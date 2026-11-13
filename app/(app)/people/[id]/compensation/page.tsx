import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canViewSalary } from "@/lib/permissions";
import { Forbidden } from "@/components/forbidden";
import { CompensationView } from "@/components/compensation/view";

export default async function ProfileCompensation({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!canViewSalary(user, id)) return <Forbidden what="salary data. Only HR, the founder and the person themselves can see it" />;
  const exists = await prisma.employee.findUnique({ where: { id }, select: { id: true } });
  if (!exists) notFound();
  return <CompensationView user={user} employeeId={id} />;
}
