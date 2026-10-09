// The New meeting dialog lives in the top bar, outside the library page. This browser event
// tells an open library that its list changed (a meeting was created or deleted), so it reloads.
const MEETINGS_CHANGED = "glowworm:meetings-changed";

export function announceMeetingsChanged(): void {
  window.dispatchEvent(new Event(MEETINGS_CHANGED));
}

/** Calls `listener` on every change; returns the function that stops listening. */
export function onMeetingsChanged(listener: () => void): () => void {
  window.addEventListener(MEETINGS_CHANGED, listener);
  return () => window.removeEventListener(MEETINGS_CHANGED, listener);
}
