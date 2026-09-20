"use client";
import { createContext, useCallback, useContext, useState, ReactNode } from "react";

type ToastTone = "settled" | "warning" | "error" | "info";
interface ToastItem { id: string; tone: ToastTone; message: string; }
interface ToastContextValue { push: (tone: ToastTone, message: string) => void; }

const ToastContext = createContext<ToastContextValue | null>(null);

const toneClasses: Record<ToastTone, string> = {
  settled: "bg-status-settled-fg text-white",
  warning: "bg-status-warning-fg text-white",
  error: "bg-status-error-fg text-white",
  info: "bg-status-info-fg text-white",
};

// Provider wraps the app root (app/layout.tsx). Call useToast().push(...)
// from anywhere in a client component to surface a transient message.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-space-sm">
        {toasts.map((t) => (
          <div key={t.id} className={`rounded-md px-space-md py-space-sm text-label-md font-label-md shadow-lg ${toneClasses[t.tone]}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
