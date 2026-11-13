"use client";

// Sidebar layout. Fixed sidebar from 1024px up; a top bar with a drawer below that.
import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { Nav, type NavItem } from "./nav";

export function AppShell({ items, userCard, children }: { items: NavItem[]; userCard: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-6">
        <span className="text-base font-semibold tracking-tight">HRIS</span>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1.5 text-muted hover:bg-hover lg:hidden" aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        <Nav items={items} onNavigate={() => setOpen(false)} />
      </div>
      <div className="border-t border-line p-4">{userCard}</div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-line bg-surface lg:fixed lg:inset-y-0 lg:block lg:w-[248px]">{sidebar}</aside>
      <div className="hidden lg:block" aria-hidden />

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface px-4 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="rounded-full p-1.5 text-ink hover:bg-hover" aria-label="Open menu" aria-expanded={open}>
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-base font-semibold tracking-tight">HRIS</span>
      </header>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-ink/30" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] bg-surface shadow-xl">{sidebar}</aside>
        </div>
      ) : null}

      <main className="min-w-0">
        <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">{children}</div>
      </main>
    </div>
  );
}
