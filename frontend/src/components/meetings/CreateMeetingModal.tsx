"use client";

import { FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { ParticipantsInput } from "@/components/meetings/ParticipantsInput";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { createMeeting, errorMessage, listParticipants } from "@/lib/api";
import { cn } from "@/lib/cn";
import { toDateTimeLocal } from "@/lib/format";
import type { TranscriptFormat } from "@/lib/types";

const MAX_FILE_BYTES = 1_000_000; // the API accepts up to 1,000,000 characters
const FORMATS: Record<TranscriptFormat, string> = {
  txt: "Text: [00:01:05] Name: what they said",
  vtt: "WebVTT subtitles (.vtt)",
  json: 'JSON: [{"speaker", "start", "end", "text"}]',
};

/** A transcript file the browser has read: its name, text, and format (from the extension). */
interface ChosenFile {
  name: string;
  text: string;
  format: TranscriptFormat;
}

/**
 * "New meeting": title, date, participants, and a transcript uploaded as a file or pasted.
 * The browser reads the file; the backend parses it and writes the AI notes.
 */
export function CreateMeetingModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => toDateTimeLocal(new Date()));
  const [names, setNames] = useState<string[]>([]);
  const [source, setSource] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<ChosenFile | null>(null);
  const [pasted, setPasted] = useState("");
  const [pastedFormat, setPastedFormat] = useState<TranscriptFormat>("txt");
  const [saving, setSaving] = useState(false);
  const [knownPeople, setKnownPeople] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    listParticipants(controller.signal)
      .then((people) => setKnownPeople(people.map((person) => person.name)))
      .catch(() => {}); // suggestions are optional
    return () => controller.abort();
  }, []);

  async function chooseFile(chosen: File | undefined) {
    if (!chosen) return;
    const format = formatFromFileName(chosen.name);
    if (!format) {
      toast.error("Choose a .txt, .vtt or .json file.");
      return;
    }
    if (chosen.size > MAX_FILE_BYTES) {
      toast.error("That file is too large: the limit is 1 MB.");
      return;
    }
    setFile({ name: chosen.name, text: await chosen.text(), format });
    if (!title.trim()) setTitle(titleFromFileName(chosen.name));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const transcript = source === "upload" ? file : { text: pasted, format: pastedFormat };
    if (!transcript || !transcript.text.trim()) {
      toast.error(source === "upload" ? "Choose a transcript file first." : "Paste a transcript.");
      return;
    }
    setSaving(true);
    try {
      const meeting = await createMeeting({
        title: title.trim(),
        meeting_date: new Date(date).toISOString(), // the input is local time; the API wants UTC
        participant_names: names,
        transcript_text: transcript.text,
        format: transcript.format,
        source,
      });
      toast.success(`Created “${meeting.title}”`);
      onClose();
      router.push(`/meetings/${meeting.id}`);
    } catch (error) {
      toast.error(errorMessage(error)); // e.g. "Line 4: expected '[HH:MM:SS] Speaker: text'"
      setSaving(false);
    }
  }

  return (
    <Modal title="New meeting" onClose={() => !saving && onClose()} className="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Title" htmlFor="new-meeting-title">
          <Input
            id="new-meeting-title"
            data-autofocus
            required
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Weekly product sync"
            className="w-full"
          />
        </Field>
        <Field label="Date and time" htmlFor="new-meeting-date">
          <Input
            id="new-meeting-date"
            type="datetime-local"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        <Field
          label="Participants"
          htmlFor="new-meeting-participants"
          hint="Optional: everyone who speaks in the transcript is added automatically."
        >
          <ParticipantsInput
            id="new-meeting-participants"
            names={names}
            onChange={setNames}
            suggestions={knownPeople}
          />
        </Field>

        <div>
          <p className="mb-1.5 text-sm font-medium text-gray-700">Transcript</p>
          <div
            role="group"
            aria-label="Transcript source"
            className="flex gap-1 rounded-lg bg-gray-100 p-1"
          >
            {(["upload", "paste"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={source === value}
                onClick={() => setSource(value)}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  source === value
                    ? "bg-surface text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-700",
                )}
              >
                {value === "upload" ? "Upload file" : "Paste text"}
              </button>
            ))}
          </div>

          {source === "upload" ? (
            <label
              htmlFor="new-meeting-file"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void chooseFile(event.dataTransfer.files[0]);
              }}
              className="mt-3 flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center transition-colors hover:border-brand-300 hover:bg-gray-25"
            >
              <FileUp className="size-6 text-gray-400" aria-hidden />
              {file ? (
                <span className="text-sm font-medium text-gray-900">{file.name}</span>
              ) : (
                <span className="text-sm text-gray-700">
                  <span className="font-medium text-brand-600">Choose a file</span> or drag it here
                </span>
              )}
              <span className="text-xs text-gray-500">.txt, .vtt or .json, up to 1 MB</span>
              <input
                id="new-meeting-file"
                type="file"
                accept=".txt,.vtt,.json"
                className="sr-only"
                onChange={(event) => void chooseFile(event.target.files?.[0])}
              />
            </label>
          ) : (
            <div className="mt-3 space-y-3">
              <Textarea
                aria-label="Transcript text"
                rows={8}
                value={pasted}
                onChange={(event) => setPasted(event.target.value)}
                placeholder={
                  "[00:00:05] Priya Shah: Let's get started.\n[00:00:12] Dev Patel: Sounds good."
                }
                className="w-full font-mono text-xs"
              />
              <Field label="Format" htmlFor="new-meeting-format">
                <Select
                  id="new-meeting-format"
                  value={pastedFormat}
                  onChange={(event) => setPastedFormat(event.target.value as TranscriptFormat)}
                >
                  {Object.entries(FORMATS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create meeting"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function formatFromFileName(name: string): TranscriptFormat | null {
  const extension = name.split(".").pop()?.toLowerCase();
  return extension === "txt" || extension === "vtt" || extension === "json" ? extension : null;
}

/** "offline-launch_plan.txt" → "Offline launch plan" */
function titleFromFileName(name: string): string {
  const base = name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
}
