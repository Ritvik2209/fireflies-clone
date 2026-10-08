"use client";

import { memo, useEffect, useRef } from "react";

import { TranscriptLine } from "@/components/meeting-detail/TranscriptLine";
import type { Participant, TranscriptSegment } from "@/lib/types";

interface TranscriptPanelProps {
  segments: TranscriptSegment[];
  people: Map<number, Participant>;
  activeIndex: number; // the line being played, or -1
  onSeek: (ms: number) => void;
}

/** The transcript column. Memoised: its props only change when the active line does. */
export const TranscriptPanel = memo(function TranscriptPanel({
  segments,
  people,
  activeIndex,
  onSeek,
}: TranscriptPanelProps) {
  const listRef = useRef<HTMLOListElement>(null);

  // Keep the line being played in view. This runs when the active line changes, not every frame.
  useEffect(() => {
    if (activeIndex >= 0) scrollToLine(listRef.current, activeIndex);
  }, [activeIndex]);

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
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <ol ref={listRef}>
          {segments.map((segment, index) => (
            <TranscriptLine
              key={segment.id}
              index={index}
              segment={segment}
              speaker={people.get(segment.speaker_id)}
              isActive={index === activeIndex}
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
