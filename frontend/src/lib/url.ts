/**
 * Set or remove query-string parameters without navigating. Next.js picks up history.replaceState,
 * so useSearchParams() sees the change, but no request is made and nothing re-mounts.
 */
export function replaceSearchParams(changes: Record<string, string | null>): void {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(changes)) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}
