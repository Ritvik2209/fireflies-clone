/** Joins class names, skipping falsy values: cn("a", isActive && "b") → "a b" or "a". */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
