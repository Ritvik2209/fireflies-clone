import { AvatarStack } from "@/components/ui/AvatarStack";
import { formatDuration, formatLongDate, formatTimeOfDay } from "@/lib/format";
import type { MeetingDetail } from "@/lib/types";

/** Title, "Tue, Oct 6, 2026 · 10:00 AM · 17 min", and the participants. */
export function MeetingHeader({ meeting }: { meeting: MeetingDetail }) {
  const names = meeting.participants.map((person) => person.name);
  // "Priya Shah, Dev Patel +3", like Fireflies' "Sarah Watts, +3".
  const people =
    names.length > 3 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ");

  return (
    <header>
      <h2 className="text-2xl font-medium text-gray-900">{meeting.title}</h2>
      <p className="mt-2 text-sm text-gray-500">
        {formatLongDate(meeting.meeting_date)} · {formatTimeOfDay(meeting.meeting_date)} ·{" "}
        {formatDuration(meeting.duration_ms)}
      </p>
      <div className="mt-3 flex items-center gap-3 text-sm text-gray-600">
        <AvatarStack people={meeting.participants} />
        <span aria-hidden className="truncate">
          {people}
        </span>
      </div>
    </header>
  );
}
