"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { DeleteMeetingDialog } from "@/components/meetings/DeleteMeetingDialog";
import { EditMeetingModal } from "@/components/meetings/EditMeetingModal";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { Button } from "@/components/ui/Button";
import { formatDuration, formatLongDate, formatTimeOfDay } from "@/lib/format";
import type { MeetingDetail } from "@/lib/types";

interface MeetingHeaderProps {
  meeting: MeetingDetail;
  onUpdated: (meeting: MeetingDetail) => void;
}

/** Title, "Tue, Oct 6, 2026 · 10:00 AM · 17 min", the participants, and Edit / Delete. */
export function MeetingHeader({ meeting, onUpdated }: MeetingHeaderProps) {
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const names = meeting.participants.map((person) => person.name);
  // "Priya Shah, Dev Patel +3", like Fireflies' "Sarah Watts, +3".
  const people =
    names.length > 3 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ");

  return (
    <header>
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-2xl font-medium text-gray-900">{meeting.title}</h2>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" icon={Pencil} onClick={() => setDialog("edit")}>
            Edit
          </Button>
          <Button variant="ghost" icon={Trash2} onClick={() => setDialog("delete")}>
            Delete
          </Button>
        </div>
      </div>
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

      {dialog === "edit" && (
        <EditMeetingModal
          meeting={meeting}
          onClose={() => setDialog(null)}
          onSaved={(updated) => {
            onUpdated(updated);
            setDialog(null);
          }}
        />
      )}
      {dialog === "delete" && (
        <DeleteMeetingDialog meeting={meeting} onClose={() => setDialog(null)} />
      )}
    </header>
  );
}
