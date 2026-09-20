import { ReactNode } from "react";

type Tone = "settled" | "warning" | "error" | "info";

const toneClasses: Record<Tone, string> = {
  settled: "bg-status-settled-bg text-status-settled-fg border-status-settled-fg/20",
  warning: "bg-status-warning-bg text-status-warning-fg border-status-warning-fg/20",
  error: "bg-status-error-bg text-status-error-fg border-status-error-fg/20",
  info: "bg-status-info-bg text-status-info-fg border-status-info-fg/20",
};

export function Alert({ tone = "info", title, children }: { tone?: Tone; title?: string; children: ReactNode }) {
  return (
    <div className={`rounded-md border px-space-md py-space-sm text-body-sm font-body-sm ${toneClasses[tone]}`} role="alert">
      {title && <p className="font-title-sm text-title-sm mb-1">{title}</p>}
      {children}
    </div>
  );
}
