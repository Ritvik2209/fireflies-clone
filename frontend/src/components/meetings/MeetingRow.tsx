import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/ui/Avatar";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { CURRENT_USER } from "@/lib/currentUser";
import { formatDuration, formatShortDate, formatTimeOfDay } from "@/lib/format";
import type { MeetingListItem } from "@/lib/types";

/** One meeting in the library: owner's avatar, title, "Oct 6 · 10:00 AM · 17 min", participants. */
export function MeetingRow({ meeting }: { meeting: MeetingListItem }) {
  return (
    <Link
      href={`/meetings/${meeting.id}`}
      className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-25"
    >
      {/* Like Fireflies, the row shows the meeting owner (every meeting here is the user's). */}
      <Avatar name={CURRENT_USER.name} color={CURRENT_USER.avatarColor} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-[15px] font-medium text-gray-900">
          <span className="truncate">{meeting.title}</span>
          <ChevronRight
            aria-hidden
            className="size-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5"
          />
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {formatShortDate(meeting.meeting_date)} · {formatTimeOfDay(meeting.meeting_date)} ·{" "}
          {formatDuration(meeting.duration_ms)}
        </p>
      </div>
      <AvatarStack people={meeting.participants} />
    </Link>
  );
}
