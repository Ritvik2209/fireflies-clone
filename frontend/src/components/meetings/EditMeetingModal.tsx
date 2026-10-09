"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ParticipantsInput } from "@/components/meetings/ParticipantsInput";
import { TagPicker } from "@/components/meetings/TagPicker";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { createTag, errorMessage, listParticipants, listTags, updateMeeting } from "@/lib/api";
import type { MeetingDetail, MeetingUpdateInput, Tag } from "@/lib/types";

interface EditMeetingModalProps {
  meeting: MeetingDetail;
  onClose: () => void;
  onSaved: (meeting: MeetingDetail) => void;
}

/** Edit a meeting's title, participants and tags. Only the fields that changed are sent. */
export function EditMeetingModal({ meeting, onClose, onSaved }: EditMeetingModalProps) {
  const [title, setTitle] = useState(meeting.title);
  const [names, setNames] = useState(() => meeting.participants.map((person) => person.name));
  const [saving, setSaving] = useState(false);
  const [knownPeople, setKnownPeople] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState(() => meeting.tags.map((tag) => tag.id));
  const [allTags, setAllTags] = useState<Tag[]>(meeting.tags); // every tag, once loaded

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
    listTags(controller.signal)
      .then(setAllTags)
      .catch(() => {}); // the meeting's own tags are still shown
    return () => controller.abort();
  }, []);

  /** Creates a tag for the picker; the meeting itself changes only when the form is saved. */
  async function addTag(name: string): Promise<Tag | null> {
    try {
      const tag = await createTag(name);
      setAllTags((current) => [...current, tag].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success(`Created tag “${tag.name}”`);
      return tag;
    } catch (error) {
      toast.error(errorMessage(error));
      return null;
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const changes: MeetingUpdateInput = {};
    if (title.trim() !== meeting.title) changes.title = title.trim();
    const before = meeting.participants.map((person) => person.name);
    if (names.join("\n") !== before.join("\n")) changes.participant_names = names;
    const byId = (a: number, b: number) => a - b;
    const tagsBefore = meeting.tags.map((tag) => tag.id).sort(byId);
    if ([...tagIds].sort(byId).join() !== tagsBefore.join()) changes.tag_ids = tagIds;
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
        <Field
          label="Tags"
          htmlFor="edit-meeting-new-tag"
          hint="Click a tag to add it to this meeting or take it off."
        >
          <TagPicker
            inputId="edit-meeting-new-tag"
            tags={allTags}
            selected={tagIds}
            onChange={setTagIds}
            onCreate={addTag}
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
