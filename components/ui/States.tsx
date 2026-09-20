import { ReactNode } from "react";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-space-xl text-on-surface-variant text-body-md font-body-md gap-space-sm">
      <span className="w-4 h-4 rounded-full border-2 border-secondary border-t-transparent animate-spin" />
      {label}
    </div>
  );
}

export function SkeletonRow({ className = "" }: { className?: string }) {
  return <div className={`h-4 rounded bg-surface-container-high animate-pulse ${className}`} />;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-space-xl gap-space-sm">
      {icon}
      <p className="font-title-sm text-title-sm text-on-surface">{title}</p>
      {description && <p className="text-body-sm font-body-sm text-on-surface-variant max-w-sm">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, action }: { title?: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-space-xl gap-space-sm">
      <p className="font-title-sm text-title-sm text-status-error-fg">{title}</p>
      {description && <p className="text-body-sm font-body-sm text-on-surface-variant max-w-sm">{description}</p>}
      {action}
    </div>
  );
}
