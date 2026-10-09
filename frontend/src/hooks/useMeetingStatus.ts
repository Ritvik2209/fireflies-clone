import { useEffect, useRef, useState } from "react";

import { getMeeting } from "@/lib/api";
import type { MeetingDetail, MeetingListItem } from "@/lib/types";

const POLL_MS = 1500;
const GIVE_UP_MS = 2 * 60_000; // a job this slow has most likely died with a server restart

/**
 * Keeps a meeting up to date while its transcript is processed in the background (Extra 3).
 *
 * While the meeting is "processing", it asks the API again every 1.5 s, one request at a time.
 * It stops once the meeting is ready or failed (and calls `onSettled`), when the component
 * unmounts, or after two minutes (`timedOut`). Returns the latest version of the meeting.
 */
export function useMeetingStatus<T extends MeetingListItem>(
  meeting: T,
  onSettled?: (settled: MeetingDetail) => void,
): { meeting: T | MeetingDetail; timedOut: boolean } {
  const [settled, setSettled] = useState<MeetingDetail | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  // The newest callback, without restarting the polling when the parent re-renders.
  const onSettledRef = useRef(onSettled);
  useEffect(() => {
    onSettledRef.current = onSettled;
  });

  const processing = meeting.status === "processing";
  useEffect(() => {
    if (!processing) return;
    const controller = new AbortController();
    const startedAt = Date.now();
    let timer = 0;

    function scheduleNext() {
      if (Date.now() - startedAt > GIVE_UP_MS) setTimedOut(true);
      else timer = window.setTimeout(poll, POLL_MS);
    }
    function poll() {
      getMeeting(meeting.id, controller.signal)
        .then((fresh) => {
          if (fresh.status === "processing") return scheduleNext();
          setSettled(fresh);
          onSettledRef.current?.(fresh);
        })
        .catch(() => {
          if (!controller.signal.aborted) scheduleNext(); // a failed request: just try again
        });
    }

    timer = window.setTimeout(poll, POLL_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [meeting.id, processing]);

  return { meeting: settled?.id === meeting.id ? settled : meeting, timedOut };
}
