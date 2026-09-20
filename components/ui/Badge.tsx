type Tone = "settled" | "warning" | "error" | "info" | "neutral";

const toneClasses: Record<Tone, string> = {
  settled: "bg-status-settled-bg text-status-settled-fg",
  warning: "bg-status-warning-bg text-status-warning-fg",
  error: "bg-status-error-bg text-status-error-fg",
  info: "bg-status-info-bg text-status-info-fg",
  neutral: "bg-surface-container text-on-surface-variant",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 px-space-sm py-1 rounded-full text-label-sm font-label-sm ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
