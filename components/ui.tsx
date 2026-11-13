// Shared building blocks. Soft, rounded, light. Tokens live in app/globals.css.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// ---------------------------------------------------------------- text bits

/** Em dash for a truly empty value. */
export function Dash() {
  return (
    <span className="text-faint" aria-label="none">
      —
    </span>
  );
}

/** Value or a dash. */
export function Val({ children }: { children: ReactNode }) {
  return children === null || children === undefined || children === "" ? <Dash /> : <>{children}</>;
}

// ---------------------------------------------------------------- page header

export function PageHeader({
  title,
  count,
  description,
  actions,
}: {
  title: string;
  /** Subtle label next to the title, e.g. "30 people". */
  count?: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {count ? <span className="text-sm text-muted">{count}</span> : null}
        </div>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------- buttons

const buttonBase =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const buttonVariants = {
  primary: "bg-accent text-white hover:bg-accent-strong",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-hover",
  ghost: "text-ink hover:bg-hover",
  danger: "bg-danger-soft text-danger-ink hover:bg-[#fecaca]",
} as const;
export type ButtonVariant = keyof typeof buttonVariants;

const sizes = { md: "", sm: "h-8 px-3 text-[13px]" } as const;

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: keyof typeof sizes }) {
  return <button className={`${buttonBase} ${buttonVariants[variant]} ${sizes[size]} ${className}`} {...props} />;
}

export function LinkButton({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: keyof typeof sizes }) {
  return <Link className={`${buttonBase} ${buttonVariants[variant]} ${sizes[size]} ${className}`} {...props} />;
}

/** Segmented control: a row of links, the active one filled. */
export function Segmented({ items, active }: { items: { href: string; label: string }[]; active: string }) {
  return (
    <div className="inline-flex rounded-full border border-line-strong bg-surface p-0.5" role="tablist">
      {items.map((it) => {
        const on = it.href === active;
        return (
          <Link
            key={it.href}
            href={it.href}
            role="tab"
            aria-selected={on}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              on ? "bg-ink text-white" : "text-muted hover:text-ink"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- badges and avatars

export type Tone = "success" | "warning" | "danger" | "neutral" | "accent";
const tones: Record<Tone, string> = {
  success: "bg-success-soft text-success-ink",
  warning: "bg-warning-soft text-warning-ink",
  danger: "bg-danger-soft text-danger-ink",
  neutral: "bg-neutral-soft text-neutral-ink",
  accent: "bg-accent-soft text-accent-ink",
};

export function Badge({
  children,
  tone = "neutral",
  filled,
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  /** Older call sites: filled maps to the accent tone. */
  filled?: boolean;
  className?: string;
}) {
  const t = filled ? "accent" : tone;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-5 ${tones[t]} ${className}`}>
      {children}
    </span>
  );
}

const avatarSizes = { sm: "h-7 w-7 text-[11px]", md: "h-8 w-8 text-xs", lg: "h-10 w-10 text-sm", xl: "h-14 w-14 text-lg" } as const;

export function Avatar({ firstName, lastName, size = "md", className = "" }: { firstName: string; lastName: string; size?: keyof typeof avatarSizes; className?: string }) {
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full bg-accent-soft font-semibold text-accent-ink ${avatarSizes[size]} ${className}`}
    >
      {initials}
    </span>
  );
}

// ---------------------------------------------------------------- surfaces

export function Card({ title, children, className = "", actions, padded = true }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode; padded?: boolean }) {
  return (
    <section className={`rounded-card border border-line bg-surface ${className}`}>
      {title ? (
        <header className="flex items-center justify-between px-6 pt-5">
          <h2 className="text-sm font-semibold">{title}</h2>
          {actions}
        </header>
      ) : null}
      <div className={padded ? `px-6 pb-6 ${title ? "pt-4" : "pt-6"}` : ""}>{children}</div>
    </section>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
      <p className="text-base font-semibold">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-neutral-soft ${className}`} />;
}

export function Notice({ children, tone = "accent" }: { children: ReactNode; tone?: Tone }) {
  return <p className={`mb-4 rounded-card px-4 py-3 text-sm ${tones[tone]}`}>{children}</p>;
}

// ---------------------------------------------------------------- tables

export function Table({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto rounded-card border border-line bg-surface lg:overflow-visible ${className}`}>
      <table className="w-full border-collapse text-table">{children}</table>
    </div>
  );
}

export function Th({ children, className = "", ...props }: ComponentProps<"th">) {
  return (
    <th
      className={`sticky top-0 z-10 border-b border-line bg-surface px-3 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted first:rounded-tl-card last:rounded-tr-card ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function Tr({ className = "", ...props }: ComponentProps<"tr">) {
  return <tr className={`group transition-colors hover:bg-hover ${className}`} {...props} />;
}

export function Td({ children, className = "", ...props }: ComponentProps<"td">) {
  return (
    <td className={`h-14 border-b border-line px-3 align-middle group-last:border-b-0 ${className}`} {...props}>
      {children}
    </td>
  );
}

export function Progress({ percent, label }: { percent: number; label?: string }) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <span className="inline-flex items-center gap-2" role="img" aria-label={label ?? `${p}%`}>
      <span className="inline-block h-1.5 w-16 overflow-hidden rounded-full bg-neutral-soft">
        <span className={`block h-full rounded-full ${p === 100 ? "bg-success-ink" : "bg-accent"}`} style={{ width: `${p}%` }} />
      </span>
      <span className="text-xs tabular-nums text-muted">{p}%</span>
    </span>
  );
}

export function Dl({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-8 gap-y-3 text-sm">
      {items.map((it) => (
        <div key={it.label} className="contents">
          <dt className="text-muted">{it.label}</dt>
          <dd className="min-w-0">
            <Val>{it.value}</Val>
          </dd>
        </div>
      ))}
    </dl>
  );
}

// ---------------------------------------------------------------- forms

export const inputClass =
  "h-10 w-full rounded-card border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-faint transition-colors hover:border-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:bg-neutral-soft disabled:text-muted";
export const textareaClass =
  "w-full rounded-card border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint transition-colors hover:border-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className = "",
}: {
  label: string;
  htmlFor?: string;
  error?: string[] | string | null;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  const msg = Array.isArray(error) ? error[0] : error;
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !msg ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
      {msg ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-danger-ink">
          {msg}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-card bg-danger-soft px-4 py-3 text-sm text-danger-ink">
      {message}
    </p>
  );
}
