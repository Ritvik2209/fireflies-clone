"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { createSoundbite, errorMessage } from "@/lib/api";
import { formatTimestamp, parseTimestamp } from "@/lib/format";
import type { Soundbite } from "@/lib/types";

/** What the dialog opens with: from a transcript line, or from the player's current time. */
export interface SoundbiteDraft {
  title: string;
  startMs: number;
  endMs: number;
}

interface SoundbiteDialogProps {
  meetingId: number;
  durationMs: number;
  currentMs: number; // the player's time, for the "Now" buttons
  initial: SoundbiteDraft;
  onClose: () => void;
  onCreated: (soundbite: Soundbite) => void;
}

/** "New soundbite": a title and a start and end time (typed, or taken from the player). */
export function SoundbiteDialog({
  meetingId,
  durationMs,
  currentMs,
  initial,
  onClose,
  onCreated,
}: SoundbiteDialogProps) {
  const [title, setTitle] = useState(initial.title);
  const [start, setStart] = useState(formatTimestamp(initial.startMs));
  const [end, setEnd] = useState(formatTimestamp(initial.endMs));
  const [saving, setSaving] = useState(false);

  const startMs = parseTimestamp(start);
  const endMs = parseTimestamp(end);
  // The same rules as the API, checked as you type.
  const problem =
    startMs === null || endMs === null
      ? "Write times like 04:05 or 1:02:03."
      : endMs <= startMs
        ? "The end must be after the start."
        : endMs > durationMs
          ? `The meeting ends at ${formatTimestamp(durationMs)}.`
          : null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (problem !== null || startMs === null || endMs === null) return;
    setSaving(true);
    try {
      const soundbite = await createSoundbite(meetingId, {
        title: title.trim(),
        start_ms: startMs,
        end_ms: endMs,
      });
      toast.success(`Created soundbite “${soundbite.title}”`);
      onCreated(soundbite);
    } catch (error) {
      toast.error(errorMessage(error));
      setSaving(false);
    }
  }

  return (
    <Modal title="New soundbite" onClose={() => !saving && onClose()}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Title" htmlFor="soundbite-title">
          <Input
            id="soundbite-title"
            data-autofocus
            required
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <TimeField id="soundbite-start" label="Start" value={start} onChange={setStart}>
            <Button variant="secondary" onClick={() => setStart(formatTimestamp(currentMs))}>
              Now
            </Button>
          </TimeField>
          <TimeField id="soundbite-end" label="End" value={end} onChange={setEnd}>
            <Button variant="secondary" onClick={() => setEnd(formatTimestamp(currentMs))}>
              Now
            </Button>
          </TimeField>
        </div>
        <p aria-live="polite" className="text-sm text-gray-500">
          {problem ??
            `Plays ${formatTimestamp(startMs ?? 0)} – ${formatTimestamp(endMs ?? 0)}, then stops.`}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || problem !== null}>
            {saving ? "Creating…" : "Create soundbite"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface TimeFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode; // the "Now" button
}

function TimeField({ id, label, value, onChange, children }: TimeFieldProps) {
  return (
    <Field label={label} htmlFor={id}>
      <div className="flex gap-2">
        <Input
          id={id}
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-24 tabular-nums"
        />
        {children}
      </div>
    </Field>
  );
}
