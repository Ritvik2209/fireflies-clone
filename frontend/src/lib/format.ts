/** First letter of a name, upper-cased, for initials avatars ("priya shah" → "P"). */
export function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}
