import { TextareaHTMLAttributes, forwardRef } from "react";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => (
    <textarea
      ref={ref}
      className={`w-full min-h-[96px] rounded-md border-[1.5px] border-outline-variant bg-surface-container-lowest px-space-sm py-space-sm text-body-md font-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-secondary focus:ring-[3px] focus:ring-secondary/15 ${className}`}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
