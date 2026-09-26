import { ReactNode } from "react";
import Link from "next/link";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full bg-surface-container-lowest/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] sticky top-0 z-50">
        <div className="w-full max-w-7xl mx-auto px-margin lg:px-margin-desktop h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-space-sm">
            <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center text-on-primary shadow-sm">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm tracking-tight text-primary leading-none">
                KudiTask
              </span>
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-widest">
                Earn • Verify • Settle
              </span>
            </div>
          </Link>
          <nav className="flex items-center gap-space-md text-label-lg font-label-lg text-on-surface-variant">
            <Link href="/how-it-works" className="hover:text-on-surface">How it works</Link>
            <Link href="/register" className="hover:text-on-surface">Become a Tasker</Link>
            <Link href="/client" className="hover:text-on-surface">For Clients</Link>
            <Link href="/login" className="hover:text-on-surface">Log in</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 w-full">{children}</main>
      <footer className="w-full border-t border-outline-variant bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto px-margin lg:px-margin-desktop py-space-lg text-body-sm font-body-sm text-on-surface-variant">
          © {new Date().getFullYear()} KudiTask. Nigeria-first micro-task marketplace.
        </div>
      </footer>
    </div>
  );
}
