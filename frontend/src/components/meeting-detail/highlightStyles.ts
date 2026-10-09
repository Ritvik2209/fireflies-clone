import type { HighlightColor } from "@/lib/types";

/** The highlight colours, in the order the colour picker shows them. */
export const HIGHLIGHT_COLORS: HighlightColor[] = ["yellow", "green", "blue", "pink"];

// Complete class names (Tailwind only generates classes it finds written out). The tinted
// backgrounds need dark: variants; the grey tokens are the only colours that switch on their own.
export const HIGHLIGHT_BORDER: Record<HighlightColor, string> = {
  yellow: "border-yellow-400",
  green: "border-green-400",
  blue: "border-blue-400",
  pink: "border-pink-400",
};

export const HIGHLIGHT_BACKGROUND: Record<HighlightColor, string> = {
  yellow: "bg-yellow-50 dark:bg-yellow-400/10",
  green: "bg-green-50 dark:bg-green-400/10",
  blue: "bg-blue-50 dark:bg-blue-400/10",
  pink: "bg-pink-50 dark:bg-pink-400/10",
};

export const HIGHLIGHT_SWATCH: Record<HighlightColor, string> = {
  yellow: "bg-yellow-300",
  green: "bg-green-300",
  blue: "bg-blue-300",
  pink: "bg-pink-300",
};
