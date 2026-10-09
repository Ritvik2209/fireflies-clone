"use client";

import { toast } from "sonner";

import { useMeetingStatus } from "@/hooks/useMeetingStatus";
import { announceMeetingsChanged } from "@/lib/events";
import type { MeetingDetail, MeetingListItem } from "@/lib/types";

/**
 * Follows a meeting this tab just created until its transcript is processed (Extra 3), on
 * whatever page the user is. It lives in the top bar, so it outlasts the page that showed it.
 */
export function ProcessingWatcher({ meeting }: { meeting: MeetingListItem }) {
  useMeetingStatus(meeting, (settled) => {
    announceProcessed(settled);
    announceMeetingsChanged(); // an open library shows the finished row
  });
  return null;
}

/** "Ready" or "couldn't be processed". One toast per meeting, however many places noticed. */
export function announceProcessed(meeting: MeetingDetail): void {
  const id = `processed-${meeting.id}`;
  if (meeting.status === "ready") toast.success(`“${meeting.title}” is ready`, { id });
  else toast.error(`“${meeting.title}” couldn't be processed: ${meeting.error_message}`, { id });
}
