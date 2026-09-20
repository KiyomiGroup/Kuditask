"use client";
import { ReactNode, useEffect } from "react";

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-margin">
      <div className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-lg bg-surface-container-lowest border border-outline shadow-2xl p-space-lg">
        {title && <h2 className="font-headline-sm text-headline-sm text-on-surface mb-space-md">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
