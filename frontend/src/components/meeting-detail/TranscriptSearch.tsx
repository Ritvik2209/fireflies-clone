import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import type { KeyboardEvent } from "react";

import { IconButton } from "@/components/ui/IconButton";

interface TranscriptSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  total: number; // how many matches
  current: number; // which match is selected (0-based)
  onStep: (direction: 1 | -1) => void;
}

/** "Find in transcript", with "n of m" and previous/next. Enter, Shift+Enter and Escape work too. */
export function TranscriptSearch({
  query,
  onQueryChange,
  total,
  current,
  onStep,
}: TranscriptSearchProps) {
  const searching = query.trim() !== "";

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onStep(event.shiftKey ? -1 : 1);
    } else if (event.key === "Escape") {
      onQueryChange("");
    }
  }

  return (
    <div className="flex h-10 items-center gap-1 rounded-lg border border-transparent bg-gray-50 pr-1 pl-3 focus-within:border-brand-300 focus-within:bg-surface focus-within:ring-4 focus-within:ring-brand-100">
      <Search className="size-4 shrink-0 text-gray-400" aria-hidden />
      <input
        type="text"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Find in transcript"
        aria-label="Find in transcript"
        className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
      />
      {searching && (
        <>
          <span aria-live="polite" className="shrink-0 px-1 text-xs text-gray-500 tabular-nums">
            {total === 0 ? "No matches" : `${current + 1} of ${total}`}
          </span>
          <IconButton
            icon={ChevronUp}
            label="Previous match"
            disabled={total === 0}
            onClick={() => onStep(-1)}
          />
          <IconButton
            icon={ChevronDown}
            label="Next match"
            disabled={total === 0}
            onClick={() => onStep(1)}
          />
          <IconButton icon={X} label="Clear search" onClick={() => onQueryChange("")} />
        </>
      )}
    </div>
  );
}
