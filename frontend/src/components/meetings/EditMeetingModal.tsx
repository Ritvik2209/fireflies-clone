"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ParticipantsInput } from "@/components/meetings/ParticipantsInput";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { errorMessage, listParticipants, updateMeeting } from "@/lib/api";
import type { MeetingDetail, MeetingUpdateInput } from "@/lib/types";

interface EditMeetingModalProps {
  meeting: MeetingDetail;
  onClose: () => void;
  onSaved: (meeting: MeetingDetail) => void;
}

/** Edit a meeting's title and participants. Only the fields that changed are sent (PATCH). */
export function EditMeetingModal({ meeting, onClose, onSaved }: EditMeetingModalProps) {
  const [title, setTitle] = useState(meeting.title);
  const [names, setNames] = useState(() => meeting.participants.map((person) => person.name));
  const [saving, setSaving] = useState(false);
  const [knownPeople, setKnownPeople] = useState<string[]>([]);

  // People who speak in the transcript must stay participants (the API answers 409 otherwise),
  // so their chips have no remove button.
  const speakers = useMemo(() => {
    const speakerIds = new Set(meeting.segments.map((segment) => segment.speaker_id));
    return new Set(
      meeting.participants
        .filter((person) => speakerIds.has(person.id))
        .map((person) => person.name.toLowerCase()),
    );
  }, [meeting]);

  useEffect(() => {
    const controller = new AbortController();
    listParticipants(controller.signal)
      .then((people) => setKnownPeople(people.map((person) => person.name)))
      .catch(() => {}); // suggestions are optional
    return () => controller.abort();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const changes: MeetingUpdateInput = {};
    if (title.trim() !== meeting.title) changes.title = title.trim();
    const before = meeting.participants.map((person) => person.name);
    if (names.join("\n") !== before.join("\n")) changes.participant_names = names;
    if (Object.keys(changes).length === 0) {
      onClose(); // nothing changed
      return;
    }
    setSaving(true);
    try {
      const updated = await updateMeeting(meeting.id, changes);
      toast.success("Meeting updated");
      onSaved(updated);
    } catch (error) {
      toast.error(errorMessage(error));
      setSaving(false);
    }
  }

  return (
    <Modal title="Edit meeting" onClose={() => !saving && onClose()}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Title" htmlFor="edit-meeting-title">
          <Input
            id="edit-meeting-title"
            data-autofocus
            required
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full"
          />
        </Field>
        <Field
          label="Participants"
          htmlFor="edit-meeting-participants"
          hint="People who speak in the transcript can't be removed."
        >
          <ParticipantsInput
            id="edit-meeting-participants"
            names={names}
            onChange={setNames}
            locked={speakers}
            suggestions={knownPeople}
          />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
