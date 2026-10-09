"use client";

import { CircleAlert, LoaderCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DeleteMeetingDialog } from "@/components/meetings/DeleteMeetingDialog";
import { announceProcessed } from "@/components/meetings/ProcessingWatcher";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useMeetingStatus } from "@/hooks/useMeetingStatus";
import type { MeetingDetail } from "@/lib/types";

interface UnprocessedMeetingProps {
  meeting: MeetingDetail; // "processing" or "failed"
  onSettled: (meeting: MeetingDetail) => void; // processing finished: show the new version
}

/**
 * Extra 3: a meeting whose transcript is still being processed in the background (polled until
 * it's ready), or couldn't be processed (the reason, and Delete). Never an empty transcript.
 */
export function UnprocessedMeeting({ meeting, onSettled }: UnprocessedMeetingProps) {
  const { timedOut } = useMeetingStatus(meeting, (settled) => {
    announceProcessed(settled);
    onSettled(settled);
  });
  const [deleting, setDeleting] = useState(false);

  if (meeting.status === "processing") {
    return (
      <EmptyState
        icon={LoaderCircle}
        iconClassName="animate-spin"
        title="Processing your transcript…"
        description={
          timedOut
            ? "This is taking longer than expected. Reload the page to check again."
            : "Reading the transcript and writing the notes. The meeting opens here when it's ready."
        }
      >
        <Link href="/meetings" className={buttonClasses("secondary")}>
          Back to meetings
        </Link>
      </EmptyState>
    );
  }
  return (
    <EmptyState
      icon={CircleAlert}
      title="This transcript couldn't be processed"
      description={meeting.error_message ?? "Something went wrong."}
    >
      <div className="flex gap-3">
        <Link href="/meetings" className={buttonClasses("secondary")}>
          Back to meetings
        </Link>
        <Button variant="danger" icon={Trash2} onClick={() => setDeleting(true)}>
          Delete
        </Button>
      </div>
      {deleting && <DeleteMeetingDialog meeting={meeting} onClose={() => setDeleting(false)} />}
    </EmptyState>
  );
}
