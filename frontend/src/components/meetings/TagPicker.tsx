"use client";

import { Check, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TagChip } from "@/components/ui/TagChip";
import { cn } from "@/lib/cn";
import type { Tag } from "@/lib/types";

interface TagPickerProps {
  inputId: string;
  tags: Tag[]; // every tag
  selected: number[]; // ids of the tags on this meeting
  onChange: (ids: number[]) => void;
  /** Creates a tag through the API; resolves to null if that failed (it shows its own toast). */
  onCreate: (name: string) => Promise<Tag | null>;
}

/** Every tag as a toggle (selected ones are solid, with a check), plus "create a new tag". */
export function TagPicker({ inputId, tags, selected, onChange, onCreate }: TagPickerProps) {
  const [draft, setDraft] = useState("");
  const [creating, setCreating] = useState(false);

  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter((other) => other !== id) : [...selected, id]);
  }

  async function create() {
    const name = draft.trim();
    if (!name) return;
    // A tag that already exists (names ignore case, like the API) is simply selected.
    const existing = tags.find((tag) => tag.name.toLowerCase() === name.toLowerCase());
    const tag = existing ?? (await createNew(name));
    if (!tag) return;
    if (!selected.includes(tag.id)) onChange([...selected, tag.id]);
    setDraft("");
  }

  async function createNew(name: string) {
    setCreating(true);
    const tag = await onCreate(name);
    setCreating(false);
    return tag;
  }

  return (
    <div>
      {tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => {
            const on = selected.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(tag.id)}
                className={cn(
                  "rounded-md transition-opacity focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none",
                  !on && "opacity-50 hover:opacity-80",
                )}
              >
                <TagChip name={tag.name} color={tag.color} icon={on ? Check : undefined} />
              </button>
            );
          })}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          id={inputId}
          value={draft}
          maxLength={40}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault(); // create the tag instead of submitting the form
              void create();
            }
          }}
          placeholder="New tag"
          className="w-48"
        />
        <Button
          variant="secondary"
          icon={Plus}
          onClick={() => void create()}
          disabled={!draft.trim() || creating}
        >
          {creating ? "Creating…" : "Create"}
        </Button>
      </div>
    </div>
  );
}
