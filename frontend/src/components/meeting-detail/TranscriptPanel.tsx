"use client";

import { LocateFixed } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";

import { TranscriptLine } from "@/components/meeting-detail/TranscriptLine";
import { TranscriptSearch } from "@/components/meeting-detail/TranscriptSearch";
import { findMatches, groupMatchesByLine, type TranscriptMatch } from "@/lib/transcript";
import type { Participant, TranscriptSegment } from "@/lib/types";

interface TranscriptPanelProps {
  segments: TranscriptSegment[];
  people: Map<number, Participant>;
  activeIndex: number; // the line being played, or -1
  following: boolean; // whether the view follows playback (false after scrolling by hand)
  onFollowingChange: (following: boolean) => void;
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
  following,
  onFollowingChange,
  onSeek,
}: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null); // the scrolling list of lines
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(0); // the selected match
  const lines = useMemo(() => segments.map((segment) => segment.text), [segments]);
  const matches = useMemo(() => findMatches(lines, query), [lines, query]);
  const matchesByLine = useMemo(() => groupMatchesByLine(matches), [matches]);
  const currentMatch: TranscriptMatch | undefined = matches[current];
  const searching = query.trim() !== "";

  // Keep the line being played in view. This runs when the active line changes, not every frame.
  // It pauses while the user reads elsewhere (scrolled away, or searching), so it never fights them.
  useEffect(() => {
    if (following && !searching && activeIndex >= 0) scrollToLine(scrollRef.current, activeIndex);
  }, [activeIndex, following, searching]);

  // Bring the selected search match into view.
  useEffect(() => {
    if (currentMatch) scrollToLine(scrollRef.current, currentMatch.line);
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

  // Wheel and touch scrolling come only from the user; our own scrollTo doesn't fire them.
  function stopFollowing() {
    if (following) onFollowingChange(false);
  }

  return (
    <section
      aria-label="Transcript"
      className="relative flex min-w-0 flex-[9] flex-col border-l border-gray-200"
    >
      <div className="shrink-0 border-b border-gray-200 px-6">
        <h2 className="-mb-px inline-block border-b-2 border-brand-600 py-3 text-sm font-medium text-brand-700 dark:text-brand-300">
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
      <div
        ref={scrollRef}
        onWheel={stopFollowing}
        onTouchMove={stopFollowing}
        className="relative flex-1 overflow-y-auto px-3 pb-3"
      >
        <ol>
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
      {!following && !searching && (
        <button
          type="button"
          onClick={() => onFollowingChange(true)}
          className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-gray-200 bg-surface px-4 py-2 text-sm font-medium text-gray-700 shadow-md transition-colors hover:bg-gray-50 focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none"
        >
          <LocateFixed className="size-4 text-brand-600" aria-hidden />
          Sync with player
        </button>
      )}
    </section>
  );
});

/**
 * Smoothly scrolls line `index` to the middle of the transcript. It scrolls only the transcript:
 * element.scrollIntoView() would also scroll every scrollable ancestor, including the page.
 */
function scrollToLine(container: HTMLElement | null, index: number) {
  const line = container?.querySelector<HTMLElement>(`[data-index="${index}"]`);
  if (!container || !line) return;
  // offsetTop is measured from the container, because the container is `relative`.
  const top = line.offsetTop - (container.clientHeight - line.offsetHeight) / 2;
  container.scrollTo({ top, behavior: "smooth" });
}
