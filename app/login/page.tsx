import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Avatar, Badge, Button, FormError, inputClass } from "@/components/ui";
import { label } from "@/lib/constants";
import { login } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const { error } = await searchParams;

  const people = await prisma.employee.findMany({
    where: { status: { not: "left" } },
    orderBy: [{ appRole: "asc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true, title: true, appRole: true, office: { select: { name: true } } },
  });
  const groups = ["admin", "manager", "employee"].map((role) => ({ role, people: people.filter((p) => p.appRole === role) }));
  const quick = [
    people.find((p) => p.appRole === "admin" && p.title.includes("Founder")),
    people.find((p) => p.appRole === "admin" && !p.title.includes("Founder")),
    people.find((p) => p.appRole === "manager" && p.title.includes("AI")),
    people.find((p) => p.appRole === "employee" && p.title.startsWith("Senior")) ?? people.find((p) => p.appRole === "employee"),
  ].filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-modal border border-line bg-surface p-8">
        <h1 className="text-2xl font-semibold tracking-tight">HRIS</h1>
        <p className="mt-1 text-sm text-muted">Prototype login. Pick who you are; what you can see and do is enforced on the server for that person.</p>

        <form action={login} className="mt-6 space-y-3">
          <FormError message={error === "pick" ? "Choose a person to continue." : error === "unknown" ? "That person cannot sign in." : null} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Sign in as</span>
            <select name="employeeId" defaultValue="" required className={inputClass}>
              <option value="" disabled>
                Choose a person…
              </option>
              {groups.map((g) => (
                <optgroup key={g.role} label={label(g.role)}>
                  {g.people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} — {p.title} ({p.office.name})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>

        {people.length === 0 ? (
          <p className="mt-6 text-sm text-muted">
            No people in the database. Run <code className="rounded bg-neutral-soft px-1">npm run db:reset</code> and reload.
          </p>
        ) : (
          <div className="mt-8">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">Quick picks</p>
            <ul className="divide-y divide-line overflow-hidden rounded-card border border-line">
              {quick.map((p) => (
                <li key={p.id}>
                  <form action={login}>
                    <input type="hidden" name="employeeId" value={p.id} />
                    <button type="submit" className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-hover">
                      <Avatar firstName={p.firstName} lastName={p.lastName} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {p.firstName} {p.lastName}
                        </span>
                        <span className="block truncate text-xs text-muted">{p.title}</span>
                      </span>
                      <Badge tone={p.appRole === "admin" ? "accent" : "neutral"}>{label(p.appRole)}</Badge>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
