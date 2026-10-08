// Formatting helpers. Dates arrive from the API in UTC and are shown in the browser's time zone.

const DAY_HEADING = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const SHORT_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const TIME_OF_DAY = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

/** First letter of a name, upper-cased, for initials avatars ("priya shah" → "P"). */
export function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

/** "Tue, Oct 6": the heading of a day's group in the meetings list. */
export function formatDayHeading(iso: string): string {
  return DAY_HEADING.format(new Date(iso));
}

/** "Oct 6" */
export function formatShortDate(iso: string): string {
  return SHORT_DATE.format(new Date(iso));
}

/** "10:00 AM" */
export function formatTimeOfDay(iso: string): string {
  return TIME_OF_DAY.format(new Date(iso));
}

/** A meeting's length: "17 min", "1 h 5 min". */
export function formatDuration(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** The local calendar day of an instant, "2026-10-06", used to group meetings by day. */
export function localDateKey(iso: string): string {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Start of a local calendar day ("2026-10-06", from a date input) as a UTC ISO string. */
export function startOfLocalDayIso(day: string): string {
  // A date-time without an offset is read as local time.
  return new Date(`${day}T00:00:00`).toISOString();
}

/** End of a local calendar day as a UTC ISO string. */
export function endOfLocalDayIso(day: string): string {
  return new Date(`${day}T23:59:59.999`).toISOString();
}
