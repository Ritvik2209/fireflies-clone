import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-600 text-white shadow-xs hover:bg-brand-700",
  secondary: "border border-gray-300 bg-surface text-gray-700 shadow-xs hover:bg-gray-50",
  ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: LucideIcon;
}

/** The button look as a class string, also used for links that act as buttons. */
export function buttonClasses(variant: Variant = "primary", className?: string): string {
  return cn(
    "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors",
    "focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    className,
  );
}

export function Button({
  variant = "primary",
  icon: Icon,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, className)} {...props}>
      {Icon && <Icon className="size-4" aria-hidden />}
      {children}
    </button>
  );
}
