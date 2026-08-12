"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  CircleHelp,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { LunaLogo } from "../logo";
import { Avatar, cx } from "../ui";
import { NAV_MAIN, NAV_SECONDARY, pageTitle, type NavItem } from "./nav-items";
import { ROL_ETIKETLERI } from "@/lib/domain";

type ShellUser = { name: string; email: string; role: string };

function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const pathname = usePathname();
  const active =
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href ||
        (pathname.startsWith(item.href + "/") &&
          // /adaylar, /adaylar/olumlu ayrımı: en uzun eşleşme kazanır
          ![...NAV_MAIN, ...NAV_SECONDARY].some(
            (o) =>
              o.href.length > item.href.length &&
              (pathname === o.href || pathname.startsWith(o.href + "/"))
          ));
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cx(
        "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium transition",
        active
          ? "bg-indigo-50 text-brand"
          : "text-slate-500 hover:bg-slate-50 hover:text-foreground"
      )}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
      <span>{item.label}</span>
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-4">
        <Link href="/" onClick={onNavigate}>
          <LunaLogo />
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {NAV_MAIN.map((i) => (
          <NavLink key={i.href} item={i} onClick={onNavigate} />
        ))}
        <div className="my-3 border-t border-line" />
        {NAV_SECONDARY.map((i) => (
          <NavLink key={i.href} item={i} onClick={onNavigate} />
        ))}
      </nav>
      <div className="border-t border-line px-5 py-4">
        <LunaLogo size="sm" />
        <p className="mt-1 text-[11px] text-muted">
          © {new Date().getFullYear()} Luna İK Platformu
        </p>
      </div>
    </div>
  );
}

export function AppShell({
  user,
  notifCount = 0,
  children,
}: {
  user: ShellUser;
  notifCount?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      {/* Masaüstü kenar çubuğu */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-line bg-card lg:block">
        <SidebarContent />
      </aside>

      {/* Mobil çekmece */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-card shadow-xl">
            <button
              className="absolute top-4 right-3 rounded-lg p-1.5 text-muted hover:bg-slate-100"
              onClick={() => setDrawerOpen(false)}
              aria-label="Menüyü kapat"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        {/* Üst çubuk */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-card px-4 sm:px-6">
          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Menüyü aç"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:block"
            aria-label="Menü"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="truncate text-lg font-semibold">{pageTitle(pathname)}</h1>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <button
              className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Bildirimler"
            >
              <Bell className="h-5 w-5" />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {notifCount}
                </span>
              )}
            </button>
            <button
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Yardım"
            >
              <CircleHelp className="h-5 w-5" />
            </button>

            <div className="relative">
              <button
                className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-slate-100"
                onClick={() => setMenuOpen((v) => !v)}
              >
                <Avatar name={user.name} />
                <span className="hidden text-left sm:block">
                  <span className="block text-[13px] font-semibold leading-tight">
                    {user.name}
                  </span>
                  <span className="block text-[11px] text-muted">
                    {ROL_ETIKETLERI[user.role] ?? user.role}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 text-muted" />
              </button>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-line bg-card p-1.5 shadow-lg">
                    <div className="border-b border-line px-3 py-2">
                      <p className="text-[13px] font-semibold">{user.name}</p>
                      <p className="truncate text-xs text-muted">{user.email}</p>
                    </div>
                    <form action="/api/cikis" method="POST">
                      <button
                        type="submit"
                        className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" /> Oturumu Kapat
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
