import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "outline";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  // Primary (Action) — DESIGN.md §Components 1
  primary:
    "bg-primary-container text-on-primary hover:bg-secondary focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2",
  // Secondary (Mint Accent / Fast Claim) — used for reservations, payout claims
  secondary:
    "bg-secondary-container text-on-secondary-container font-bold hover:brightness-95",
  // Outline (Admin / Filtering)
  outline:
    "bg-transparent border-[1.5px] border-outline-variant text-on-surface hover:bg-surface-container-low",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-space-sm text-label-md",
  md: "h-12 px-space-md text-label-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-space-xs rounded font-headline-sm transition disabled:opacity-50 disabled:pointer-events-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  )
);
Button.displayName = "Button";
