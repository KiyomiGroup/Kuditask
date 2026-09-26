"use client";
import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/ui/LogoutButton";

// Tasker mobile bottom nav — exactly the five items the spec names, no more.
const TASKER_NAV = [
  { href: "/app", label: "Home", icon: "home" },
  { href: "/app/tasks", label: "Tasks", icon: "task_alt" },
  { href: "/app/wallet", label: "Wallet", icon: "account_balance_wallet" },
  { href: "/app/tier", label: "Tier", icon: "military_tech" },
  { href: "/app/profile", label: "Profile", icon: "person" },
];

export function TaskerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Desktop persistent sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-primary-container text-on-primary p-space-md gap-space-xs">
        <div className="flex items-center gap-space-sm px-space-sm py-space-sm mb-space-md">
          <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
          <span className="font-headline-sm text-headline-sm">KudiTask</span>
        </div>
        {TASKER_NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-space-sm rounded-md px-space-sm py-space-sm text-label-lg font-label-lg transition ${
                active ? "bg-secondary text-on-secondary" : "text-on-primary-container hover:bg-primary/40"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
        <LogoutButton className="mt-auto flex items-center rounded-md px-space-sm py-space-sm text-label-lg font-label-lg text-on-primary-container hover:bg-primary/40 text-left" />
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile compact header */}
        <header className="lg:hidden sticky top-0 z-40 h-14 flex items-center justify-between px-margin bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant">
          <span className="font-headline-sm text-headline-sm text-primary">KudiTask</span>
          <Link href="/app/notifications" className="text-on-surface-variant">
            <span className="material-symbols-outlined text-[22px]">notifications</span>
          </Link>
        </header>

        <main className="flex-1 p-margin lg:p-margin-desktop pb-24 lg:pb-space-lg">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-container-lowest border-t border-outline-variant flex">
          {TASKER_NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center gap-0.5 py-space-sm text-label-sm font-label-sm ${
                  active ? "text-secondary" : "text-on-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
