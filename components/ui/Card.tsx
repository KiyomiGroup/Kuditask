import { HTMLAttributes } from "react";

// Level 1 surface per DESIGN.md: white, 1px outline, soft ambient shadow.
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-surface-container-lowest border border-outline-variant rounded-lg shadow-[0_1px_3px_rgba(15,23,42,0.05)] ${className}`}
      {...props}
    />
  );
}
