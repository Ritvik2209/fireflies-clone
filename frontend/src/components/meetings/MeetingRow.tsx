"use client";

import { ChevronRight, LoaderCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DeleteMeetingDialog } from "@/components/meetings/DeleteMeetingDialog";
import { announceProcessed } from "@/components/meetings/ProcessingWatcher";
import { Avatar } from "@/components/ui/Avatar";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { Button } from "@/components/ui/Button";
import { TagChip } from "@/components/ui/TagChip";
import { useMeetingStatus } from "@/hooks/useMeetingStatus";
import { CURRENT_USER } from "@/lib/currentUser";
import { formatDuration, formatShortDate, formatTimeOfDay } from "@/lib/format";
import type { MeetingListItem } from "@/lib/types";

/** One meeting in the library: owner's avatar, title, "Oct 6 · 10:00 AM · 17 min", participants. */
export function MeetingRow({ meeting: listed }: { meeting: MeetingListItem }) {
  // A new upload is still "processing": this keeps the row up to date until it's ready (Extra 3).
  const { meeting, timedOut } = useMeetingStatus(listed, announceProcessed);

  if (meeting.status === "failed") return <FailedRow meeting={meeting} />;
  const processing = meeting.status === "processing";
  return (
    <Link
      href={`/meetings/${meeting.id}`}
      className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-surface px-4 py-3 transition-colors hover:border-gray-300 hover:bg-gray-25 sm:gap-4 sm:px-5 sm:py-4"
    >
      {/* Like Fireflies, the row shows the meeting owner (every meeting here is the user's).
          Phones skip it: it's the same on every row, and the title needs the room. */}
      <span className="hidden sm:block">
        <Avatar name={CURRENT_USER.name} color={CURRENT_USER.avatarColor} size="lg" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-[15px] font-medium text-gray-900">
          <span className="truncate">{meeting.title}</span>
          <ChevronRight
            aria-hidden
            className="size-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5"
          />
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-sm text-gray-500">
            {formatShortDate(meeting.meeting_date)} · {formatTimeOfDay(meeting.meeting_date)}
            {!processing && ` · ${formatDuration(meeting.duration_ms)}`}
          </p>
          {processing && (
            <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:text-brand-300">
              <LoaderCircle aria-hidden className="size-3 animate-spin" />
              {timedOut ? "Still processing: reload to check" : "Processing"}
            </span>
          )}
          {meeting.tags.map((tag) => (
            <TagChip key={tag.id} name={tag.name} color={tag.color} />
          ))}
        </div>
      </div>
      <AvatarStack people={meeting.participants} />
    </Link>
  );
}

/** A meeting whose transcript couldn't be processed: the reason, and a way to delete it. */
function FailedRow({ meeting }: { meeting: MeetingListItem }) {
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-error-400/40 bg-surface px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
      <span className="hidden sm:block">
        <Avatar name={CURRENT_USER.name} color={CURRENT_USER.avatarColor} size="lg" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[15px] font-medium text-gray-900">
          <span className="truncate">{meeting.title}</span>
          <span className="rounded-md bg-error-500/10 px-2 py-0.5 text-xs font-medium text-error-500 dark:text-error-400">
            Failed
          </span>
        </p>
        <p className="mt-1 text-sm text-gray-500">{meeting.error_message}</p>
      </div>
      <Button variant="secondary" icon={Trash2} onClick={() => setDeleting(true)}>
        Delete
      </Button>
      {deleting && <DeleteMeetingDialog meeting={meeting} onClose={() => setDeleting(false)} />}
    </div>
  );
}
