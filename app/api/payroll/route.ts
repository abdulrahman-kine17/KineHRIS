import { requireUser } from "@/lib/auth";
import { canViewPayroll } from "@/lib/permissions";
import { startOfMonth, today, utcDate } from "@/lib/dates";
import { toCsv } from "@/lib/money";
import { PAYROLL_COLUMNS, buildPayrollSheet, payrollFileName } from "@/lib/payroll";

export const dynamic = "force-dynamic";

/** GET /api/payroll?month=YYYY-MM — the monthly payroll input sheet as CSV. Admin only. */
export async function GET(req: Request): Promise<Response> {
  const user = await requireUser();
  if (!canViewPayroll(user)) return new Response("Forbidden", { status: 403 });
  const m = /^(\d{4})-(\d{2})$/.exec(new URL(req.url).searchParams.get("month") ?? "");
  const month = m ? utcDate(Number(m[1]), Number(m[2]), 1) : startOfMonth(today());
  const { rows } = await buildPayrollSheet(month);
  const csv = toCsv([...PAYROLL_COLUMNS], rows as unknown as Record<string, unknown>[]);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${payrollFileName(month)}"`,
    },
  });
}
