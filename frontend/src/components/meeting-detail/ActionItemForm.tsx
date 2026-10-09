"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import type { ActionItem, Participant } from "@/lib/types";

/** What the form produces. */
export interface ActionItemDraft {
  text: string;
  assigneeId: number | null;
}

interface ActionItemFormProps {
  initial?: ActionItem; // editing this item; absent when adding a new one
  assignees: Participant[]; // the meeting's participants (the API requires that)
  onSave: (draft: ActionItemDraft) => Promise<boolean>; // false: it failed, keep the form open
  onCancel: () => void;
}

/** An action item's text and assignee: used both to add an item and to edit one. */
export function ActionItemForm({ initial, assignees, onSave, onCancel }: ActionItemFormProps) {
  const [text, setText] = useState(initial?.text ?? "");
  const [assignee, setAssignee] = useState(initial?.assignee_id ? String(initial.assignee_id) : "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    const saved = await onSave({
      text: text.trim(),
      assigneeId: assignee ? Number(assignee) : null,
    });
    if (!saved) setSaving(false); // on success the form closes
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(event) => event.key === "Escape" && onCancel()}
      className="space-y-2 rounded-lg border border-gray-200 p-3"
    >
      <Input
        autoFocus
        aria-label="Action item"
        required
        maxLength={500}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="What needs to happen?"
        className="w-full"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Assignee"
          value={assignee}
          onChange={(event) => setAssignee(event.target.value)}
          className="w-52"
        >
          <option value="">Unassigned</option>
          {assignees.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : initial ? "Save" : "Add item"}
          </Button>
        </div>
      </div>
    </form>
  );
}
