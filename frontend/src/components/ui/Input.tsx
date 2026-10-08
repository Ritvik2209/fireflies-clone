import { ChevronDown } from "lucide-react";
import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

const FIELD =
  "h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 shadow-xs " +
  "focus:border-brand-300 focus:ring-4 focus:ring-brand-100 focus:outline-none " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD, className)} {...props} />;
}

/** A native <select> (accessible and keyboard-friendly for free), styled like the inputs. */
export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn("relative", className)}>
      <select className={cn(FIELD, "w-full appearance-none pr-9")} {...props}>
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-gray-500"
      />
    </div>
  );
}
