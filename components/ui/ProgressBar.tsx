export function ProgressBar({ value, max, className = "" }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={`w-full h-2 rounded-full bg-surface-container-high overflow-hidden ${className}`}>
      <div className="h-full bg-tertiary-fixed-dim transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}
