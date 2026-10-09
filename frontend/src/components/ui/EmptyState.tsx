import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconClassName?: string; // e.g. "animate-spin" for a loading state
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  iconClassName,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:text-brand-400">
        <Icon className={cn("size-6", iconClassName)} aria-hidden />
      </div>
      <h2 className="mt-4 text-base font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
