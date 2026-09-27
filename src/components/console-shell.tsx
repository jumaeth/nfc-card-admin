"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Package,
  ShoppingBag,
  Tags,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useSignOut, useStaff } from "@/lib/staff";
import { initials, PLATFORM_ROLE_LABEL, PLATFORM_ROLE_TONE } from "@/lib/format";
import type { Capabilities } from "@/lib/types";
import { Badge } from "@/components/ui";
import { Wordmark } from "@/components/wordmark";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  visible?: (c: Capabilities) => boolean;
}

const NAV: NavItem[] = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Customers", href: "/customers", icon: Building2 },
  { label: "Users", href: "/users", icon: Users, visible: (c) => c.viewsUsers },
  { label: "Plans", href: "/plans", icon: Tags },
  { label: "Products", href: "/products", icon: Package },
  { label: "Orders", href: "/orders", icon: ShoppingBag },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { capabilities } = useStaff();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.filter((item) => !item.visible || item.visible(capabilities)).map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors",
              active
                ? "bg-accent-soft text-accent-ink"
                : "text-ink-soft hover:bg-paper-2 hover:text-ink",
            )}
          >
            <Icon className="size-4.5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ScopeNote() {
  const { user, capabilities } = useStaff();
  return (
    <div className="rounded-2xl bg-paper-2 p-4 text-xs leading-relaxed text-muted">
      <Badge tone={PLATFORM_ROLE_TONE[user.platformRole]}>
        {PLATFORM_ROLE_LABEL[user.platformRole]}
      </Badge>
      <p className="mt-2">
        {capabilities.seesAllCustomers
          ? capabilities.managesAllCustomers
            ? "You can view and change every customer."
            : "You can view every customer. Changes are read-only."
          : "You see the customers assigned to you."}
      </p>
    </div>
  );
}

function UserMenu() {
  const { user } = useStaff();
  const signOutAndClear = useSignOut();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await signOutAndClear();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper transition hover:bg-ink-2"
        aria-label="Account menu"
      >
        {initials(user.name || user.email)}
      </button>

      {open && (
        <>
          <button
            className="fixed inset-0 z-10 cursor-default"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)]">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
            <div className="my-1 h-px bg-line" />
            <button
              onClick={signOut}
              disabled={signingOut}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-ink hover:bg-paper-2 disabled:opacity-50"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Sidebar({ onNavigate, header }: { onNavigate?: () => void; header?: ReactNode }) {
  return (
    <>
      <div className="flex items-center justify-between px-2">
        <Link href="/" onClick={onNavigate}>
          <Wordmark />
        </Link>
        {header}
      </div>
      <div className="mt-8 flex-1">
        <NavLinks onNavigate={onNavigate} />
      </div>
      <ScopeNote />
    </>
  );
}

export function ConsoleShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-paper">
      <aside className="fixed inset-y-0 left-0 hidden w-[250px] flex-col border-r border-line bg-white px-4 py-6 lg:flex">
        <Sidebar />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40"
            aria-hidden
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[250px] flex-col border-r border-line bg-white px-4 py-6">
            <Sidebar
              onNavigate={() => setDrawerOpen(false)}
              header={
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="text-muted hover:text-ink"
                  aria-label="Close menu"
                >
                  <X className="size-5" />
                </button>
              }
            />
          </aside>
        </div>
      )}

      <div className="lg:pl-[250px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-paper/80 px-4 backdrop-blur-md sm:px-6">
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-ink lg:hidden"
            aria-label="Open menu"
          >
            <MenuIcon className="size-5" />
          </button>
          <div className="flex-1" />
          <UserMenu />
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
