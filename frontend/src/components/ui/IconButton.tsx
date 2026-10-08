import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  /** The accessible name, also shown as a tooltip (the button has no visible text). */
  label: string;
  iconClassName?: string;
}

/** A small square button that shows only an icon. */
export function IconButton({
  icon: Icon,
  label,
  iconClassName = "size-4",
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors",
        "hover:bg-gray-100 hover:text-gray-700",
        "focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <Icon className={iconClassName} aria-hidden />
    </button>
  );
}
