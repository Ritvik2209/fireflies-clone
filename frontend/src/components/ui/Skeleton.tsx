import { cn } from "@/lib/cn";

/** A grey placeholder block shown while content loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-gray-100", className)} />;
}
