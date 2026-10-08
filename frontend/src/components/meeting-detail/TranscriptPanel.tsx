"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";

import { TranscriptLine } from "@/components/meeting-detail/TranscriptLine";
import { TranscriptSearch } from "@/components/meeting-detail/TranscriptSearch";
import { findMatches, groupMatchesByLine, type TranscriptMatch } from "@/lib/transcript";
import type { Participant, TranscriptSegment } from "@/lib/types";

interface TranscriptPanelProps {
  segments: TranscriptSegment[];
  people: Map<number, Participant>;
  activeIndex: number; // the line being played, or -1
  onSeek: (ms: number) => void;
}

/**
 * The transcript column, with its search. Searching happens in the browser, over the transcript
 * that's already loaded. Memoised: its props only change when the active line does.
 */
export const TranscriptPanel = memo(function TranscriptPanel({
  segments,
  people,
  activeIndex,
  onSeek,
}: TranscriptPanelProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(0); // the selected match
  const lines = useMemo(() => segments.map((segment) => segment.text), [segments]);
  const matches = useMemo(() => findMatches(lines, query), [lines, query]);
  const matchesByLine = useMemo(() => groupMatchesByLine(matches), [matches]);
  const currentMatch: TranscriptMatch | undefined = matches[current];
  const searching = query.trim() !== "";

  // Keep the line being played in view. This runs when the active line changes, not every frame,
  // and pauses while searching, so it doesn't pull the view away from the search results.
  useEffect(() => {
    if (!searching && activeIndex >= 0) scrollToLine(listRef.current, activeIndex);
  }, [activeIndex, searching]);

  // Bring the selected search match into view.
  useEffect(() => {
    if (currentMatch) scrollToLine(listRef.current, currentMatch.line);
  }, [currentMatch]);

  function changeQuery(value: string) {
    setQuery(value);
    setCurrent(0); // a new query starts from its first match
  }

  function step(direction: 1 | -1) {
    if (matches.length === 0) return;
    // Wrap around: after the last match comes the first, and before the first, the last.
    setCurrent((index) => (index + direction + matches.length) % matches.length);
  }

  return (
    <section
      aria-label="Transcript"
      className="relative flex min-w-0 flex-[9] flex-col border-l border-gray-200"
    >
      <div className="shrink-0 border-b border-gray-200 px-6">
        <h2 className="-mb-px inline-block border-b-2 border-brand-600 py-3 text-sm font-medium text-brand-700">
          Transcript
        </h2>
      </div>
      <div className="shrink-0 px-6 pt-4 pb-2">
        <TranscriptSearch
          query={query}
          onQueryChange={changeQuery}
          total={matches.length}
          current={current}
          onStep={step}
        />
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <ol ref={listRef}>
          {segments.map((segment, index) => (
            <TranscriptLine
              key={segment.id}
              index={index}
              segment={segment}
              speaker={people.get(segment.speaker_id)}
              isActive={index === activeIndex}
              matches={matchesByLine.get(index)}
              currentMatchStart={currentMatch?.line === index ? currentMatch.start : -1}
              onSeek={onSeek}
            />
          ))}
        </ol>
      </div>
    </section>
  );
});

/** Smoothly scrolls line `index` to the middle of the transcript. */
function scrollToLine(list: HTMLElement | null, index: number) {
  list
    ?.querySelector(`[data-index="${index}"]`)
    ?.scrollIntoView({ block: "center", behavior: "smooth" });
}
