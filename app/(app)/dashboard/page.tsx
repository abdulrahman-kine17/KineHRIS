import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { canViewDashboard } from "@/lib/permissions";
import { buildDashboard, type Bar, type Stat } from "@/lib/dashboard";
import { label } from "@/lib/constants";
import { Card, PageHeader } from "@/components/ui";
import { Forbidden } from "@/components/forbidden";

export default async function DashboardPage() {
  const user = await requireUser();
  if (!canViewDashboard(user)) return <Forbidden what="the dashboard" />;
  const d = await buildDashboard(user);

  return (
    <>
      <PageHeader title="Dashboard" count={d.scoped ? "your reports" : "whole company"} description="Every number opens the list behind it." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {d.stats.map((s) => <StatTile key={s.label} s={s} />)}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Headcount by team" actions={<Link href="/people/org" className="text-xs font-medium text-accent-ink hover:underline">Org view</Link>}>
          <Bars bars={d.byTeam} />
        </Card>
        <Card title="Headcount by office" actions={<Link href="/people/org?by=office" className="text-xs font-medium text-accent-ink hover:underline">By office</Link>}>
          <Bars bars={d.byOffice} />
        </Card>
        <Card title="Joiners and leavers · last 12 months">
          <MonthlyChart months={d.monthly} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Coverage">
          <Coverage label={`Goals this quarter · 3 or more`} covered={d.goals.covered} total={d.goals.total} href={d.goals.href} />
          <div className="mt-5">
            <Coverage label={d.reviews.name ? `Reviews · ${d.reviews.name} · self and manager submitted` : "Reviews · no open cycle"} covered={d.reviews.covered} total={d.reviews.total} href={d.reviews.href} />
          </div>
        </Card>
        <Card title={`Leave taken in ${d.year}`} actions={<Link href={`/leave/history?year=${d.year}`} className="text-xs font-medium text-accent-ink hover:underline">All</Link>}>
          <Bars bars={d.leaveByType.map((x) => ({ label: label(x.type), value: x.days, href: x.href }))} unit="days" />
        </Card>
        <Card title="Needs attention">
          <ul className="divide-y divide-line">
            {d.attention.map((a) => (
              <li key={a.label}>
                <Link href={a.href} className="group flex items-center justify-between gap-3 py-2 text-sm">
                  <span className={a.value === "0" ? "text-muted" : ""}>{a.label}</span>
                  <span className={`inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${a.value === "0" ? "bg-neutral-soft text-muted" : "bg-warning-soft text-warning-ink"}`}>{a.value}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

function StatTile({ s }: { s: Stat }) {
  return (
    <Link href={s.href} className="group rounded-card border border-line bg-surface p-5 transition-colors hover:border-accent">
      <p className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted">
        {s.label}
        <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{s.value}</p>
      {s.hint ? <p className="mt-1 text-sm text-muted">{s.hint}</p> : null}
    </Link>
  );
}

function Bars({ bars, unit = "" }: { bars: Bar[]; unit?: string }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  if (bars.length === 0) return <p className="text-sm text-muted">Nothing to show.</p>;
  return (
    <ul className="space-y-2.5">
      {bars.map((b) => (
        <li key={b.label}>
          <Link href={b.href} className="group block">
            <span className="flex items-center justify-between text-sm">
              <span className="group-hover:underline">{b.label}</span>
              <span className="tabular-nums text-muted">{b.value}{unit ? ` ${unit}` : ""}</span>
            </span>
            <span className="mt-1 block h-2 overflow-hidden rounded-full bg-neutral-soft">
              <span className="block h-full rounded-full bg-accent" style={{ width: `${(b.value / max) * 100}%` }} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function MonthlyChart({ months }: { months: { key: string; label: string; joiners: number; leavers: number; joinHref: string; leaveHref: string }[] }) {
  const max = Math.max(1, ...months.map((m) => Math.max(m.joiners, m.leavers)));
  const h = 72;
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height: h + 8 }} role="img" aria-label="Joiners and leavers per month">
        {months.map((m) => (
          <div key={m.key} className="flex flex-1 items-end justify-center gap-0.5" title={`${m.label}: ${m.joiners} joined, ${m.leavers} left`}>
            <Link href={m.joinHref} className="w-1/2 rounded-t bg-accent transition-opacity hover:opacity-80" style={{ height: Math.max(2, (m.joiners / max) * h) }} aria-label={`${m.joiners} joined in ${m.label}`} />
            <Link href={m.leaveHref} className="w-1/2 rounded-t bg-danger-ink/70 transition-opacity hover:opacity-80" style={{ height: Math.max(2, (m.leavers / max) * h) }} aria-label={`${m.leavers} left in ${m.label}`} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {months.map((m) => <span key={m.key} className="flex-1 text-center text-[10px] text-muted">{m.label}</span>)}
      </div>
      <p className="mt-3 flex gap-4 text-xs text-muted">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-accent align-middle" />Joined</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-danger-ink/70 align-middle" />Left</span>
      </p>
    </div>
  );
}

function Coverage({ label, covered, total, href }: { label: string; covered: number; total: number; href: string }) {
  const pct = total ? Math.round((covered / total) * 100) : 0;
  return (
    <Link href={href} className="group block">
      <span className="flex items-center justify-between text-sm">
        <span className="group-hover:underline">{label}</span>
        <span className="tabular-nums text-muted">{covered}/{total} · {pct}%</span>
      </span>
      <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-neutral-soft">
        <span className={`block h-full rounded-full ${pct >= 80 ? "bg-success-ink" : pct >= 50 ? "bg-accent" : "bg-warning-ink"}`} style={{ width: `${pct}%` }} />
      </span>
    </Link>
  );
}
