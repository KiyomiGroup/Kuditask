"use client";
import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { LogoutButton } from "@/components/ui/LogoutButton";

// Desktop sidebar — the full 11-item nav from the spec, in order.
const ADMIN_NAV_FULL = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/taskers", label: "Taskers", icon: "groups" },
  { href: "/admin/tasks", label: "Tasks", icon: "task_alt" },
  { href: "/admin/verification", label: "Verification", icon: "verified" },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: "payments" },
  { href: "/admin/clients", label: "Clients", icon: "handshake" },
  { href: "/admin/transactions", label: "Transactions", icon: "receipt_long" },
  { href: "/admin/tiers", label: "Tier Management", icon: "military_tech" },
  { href: "/admin/announcements", label: "Announcements", icon: "campaign" },
  { href: "/admin/reports", label: "Reports", icon: "monitoring" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

// Mobile bottom nav — first four items plus a "More" sheet holding the rest.
const ADMIN_NAV_MOBILE_PRIMARY = ADMIN_NAV_FULL.slice(0, 4);
const ADMIN_NAV_MOBILE_MORE = ADMIN_NAV_FULL.slice(4);

export function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-surface">
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-primary-container text-on-primary p-space-md gap-space-xs overflow-y-auto">
        <div className="flex items-center gap-space-sm px-space-sm py-space-sm mb-space-md">
          <span className="material-symbols-outlined text-[22px]">shield_person</span>
          <span className="font-headline-sm text-headline-sm">KudiTask Admin</span>
        </div>
        {ADMIN_NAV_FULL.map((item) => {
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
        <header className="lg:hidden sticky top-0 z-40 h-14 flex items-center justify-between px-margin bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant">
          <span className="font-headline-sm text-headline-sm text-primary">KudiTask Admin</span>
        </header>

        <main className="flex-1 p-margin lg:p-margin-desktop pb-24 lg:pb-space-lg">{children}</main>

        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-container-lowest border-t border-outline-variant flex">
          {ADMIN_NAV_MOBILE_PRIMARY.map((item) => {
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
          <button
            onClick={() => setMoreOpen(true)}
            className="flex-1 flex flex-col items-center gap-0.5 py-space-sm text-label-sm font-label-sm text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[22px]">more_horiz</span>
            More
          </button>
        </nav>

        <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
          <div className="grid grid-cols-2 gap-space-sm">
            {ADMIN_NAV_MOBILE_MORE.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-space-sm rounded-md px-space-sm py-space-sm bg-surface-container-low text-on-surface text-label-lg font-label-lg"
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </Modal>
      </div>
    </div>
  );
}
