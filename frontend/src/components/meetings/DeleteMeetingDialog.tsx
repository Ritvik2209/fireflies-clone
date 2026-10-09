"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { deleteMeeting, errorMessage } from "@/lib/api";
import { announceMeetingsChanged } from "@/lib/events";
import type { MeetingDetail } from "@/lib/types";

interface DeleteMeetingDialogProps {
  meeting: Pick<MeetingDetail, "id" | "title">;
  onClose: () => void;
}

/** "Delete '<title>'?" with Keep it / Delete, like Fireflies. On success, back to the library. */
export function DeleteMeetingDialog({ meeting, onClose }: DeleteMeetingDialogProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function confirm() {
    setDeleting(true);
    try {
      await deleteMeeting(meeting.id);
      toast.success(`Deleted “${meeting.title}”`);
      router.push("/meetings");
      announceMeetingsChanged(); // when deleting from the library itself, it reloads
    } catch (error) {
      toast.error(errorMessage(error));
      setDeleting(false);
    }
  }

  return (
    <Modal title={`Delete “${meeting.title}”?`} onClose={() => !deleting && onClose()}>
      <p className="text-sm leading-6 text-gray-600">
        This permanently deletes the meeting with its transcript, notes and action items. It
        can&apos;t be undone.
      </p>
      <div className="mt-6 flex justify-end gap-3">
        {/* The safe choice gets the focus, so pressing Enter by reflex keeps the meeting. */}
        <Button variant="secondary" data-autofocus onClick={onClose} disabled={deleting}>
          Keep it
        </Button>
        <Button variant="danger" onClick={confirm} disabled={deleting}>
          {deleting ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </Modal>
  );
}
