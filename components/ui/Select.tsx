import { SelectHTMLAttributes, forwardRef } from "react";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", children, ...props }, ref) => (
    <select
      ref={ref}
      className={`h-12 w-full rounded-md border-[1.5px] border-outline-variant bg-surface-container-lowest px-space-sm text-body-md font-body-md text-on-surface focus:outline-none focus:border-secondary focus:ring-[3px] focus:ring-secondary/15 ${className}`}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
