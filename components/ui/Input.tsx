import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`h-12 w-full rounded-md border-[1.5px] border-outline-variant bg-surface-container-lowest px-space-sm text-body-md font-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-secondary focus:ring-[3px] focus:ring-secondary/15 ${className}`}
      {...props}
    />
  )
);
Input.displayName = "Input";
