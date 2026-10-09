"use client";

import { X } from "lucide-react";
import { type KeyboardEvent, useState } from "react";

interface ParticipantsInputProps {
  id: string;
  names: string[];
  onChange: (names: string[]) => void;
  /** Lower-cased names that can't be removed (people who speak in the transcript). */
  locked?: ReadonlySet<string>;
  /** Known people, offered by the browser as you type (a native <datalist>). */
  suggestions?: string[];
}

/** People as chips plus a text box: Enter or a comma adds a name, × or Backspace removes one. */
export function ParticipantsInput({
  id,
  names,
  onChange,
  locked,
  suggestions = [],
}: ParticipantsInputProps) {
  const [draft, setDraft] = useState("");
  const isLocked = (name: string) => locked?.has(name.toLowerCase()) ?? false;

  /** Adds the names that aren't there yet (names match case-insensitively, like the API). */
  function add(raw: string[]) {
    const next = [...names];
    for (const part of raw) {
      const name = part.trim().replace(/\s+/g, " ");
      if (name && !next.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
        next.push(name);
      }
    }
    if (next.length !== names.length) onChange(next);
  }

  function handleChange(value: string) {
    // Typing or pasting a comma completes every name before it.
    const parts = value.split(",");
    if (parts.length > 1) add(parts.slice(0, -1));
    setDraft(parts[parts.length - 1]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault(); // add the name instead of submitting the form
      add([draft]);
      setDraft("");
    } else if (event.key === "Backspace" && draft === "" && names.length > 0) {
      const last = names[names.length - 1];
      if (!isLocked(last)) onChange(names.slice(0, -1));
    }
  }

  const listId = `${id}-suggestions`;
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-surface px-2 py-1.5 shadow-xs focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-100">
      {names.map((name) => (
        <span
          key={name}
          title={isLocked(name) ? "Speaks in the transcript, so stays a participant" : undefined}
          className="inline-flex items-center gap-1 rounded-md bg-gray-100 py-0.5 pr-1 pl-2 text-sm text-gray-700"
        >
          {name}
          {!isLocked(name) && (
            <button
              type="button"
              aria-label={`Remove ${name}`}
              onClick={() => onChange(names.filter((existing) => existing !== name))}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          )}
        </span>
      ))}
      <input
        id={id}
        list={listId}
        value={draft}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // A name typed but not confirmed still counts when the user moves on (e.g. to Save).
          add([draft]);
          setDraft("");
        }}
        placeholder={names.length > 0 ? "Add someone…" : "Type a name and press Enter"}
        className="h-7 min-w-36 flex-1 bg-transparent px-1 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
      />
      <datalist id={listId}>
        {suggestions
          .filter(
            (name) => !names.some((existing) => existing.toLowerCase() === name.toLowerCase()),
          )
          .map((name) => (
            <option key={name} value={name} />
          ))}
      </datalist>
    </div>
  );
}
