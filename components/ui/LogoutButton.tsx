"use client";
import { useRouter } from "next/navigation";

export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button onClick={handleLogout} className={className}>
      <span className="material-symbols-outlined text-[20px] align-middle mr-1">logout</span>
      Log out
    </button>
  );
}
