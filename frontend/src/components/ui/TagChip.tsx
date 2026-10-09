import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";
import type { TagColor } from "@/lib/types";

// Complete class names, so Tailwind finds them in the source. The coloured tints need dark:
// variants: unlike the grey tokens, they don't switch with the theme on their own.
const COLORS: Record<TagColor, string> = {
  gray: "bg-gray-100 text-gray-700 ring-gray-500/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/30",
  green:
    "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-400/10 dark:text-green-300 dark:ring-green-400/30",
  yellow:
    "bg-yellow-50 text-yellow-800 ring-yellow-600/20 dark:bg-yellow-400/10 dark:text-yellow-300 dark:ring-yellow-400/30",
  orange:
    "bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-400/10 dark:text-orange-300 dark:ring-orange-400/30",
  red: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/30",
  pink: "bg-pink-50 text-pink-700 ring-pink-600/20 dark:bg-pink-400/10 dark:text-pink-300 dark:ring-pink-400/30",
  purple:
    "bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-400/10 dark:text-purple-300 dark:ring-purple-400/30",
};

interface TagChipProps {
  name: string;
  color: TagColor;
  icon?: LucideIcon; // e.g. a check mark when the tag is selected
  className?: string;
}

/** A coloured tag label. */
export function TagChip({ name, color, icon: Icon, className }: TagChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        COLORS[color],
        className,
      )}
    >
      {Icon && <Icon className="size-3" aria-hidden />}
      {name}
    </span>
  );
}
