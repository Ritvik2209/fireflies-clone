import { memo } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { formatTimestamp } from "@/lib/format";
import type { Participant, TranscriptSegment } from "@/lib/types";

interface TranscriptLineProps {
  index: number;
  segment: TranscriptSegment;
  speaker: Participant | undefined;
  isActive: boolean;
  onSeek: (ms: number) => void;
}

/**
 * One transcript line: avatar, name, timestamp and text. Clicking it plays from its start.
 * Memoised, with only stable or primitive props, so while the player runs only the line that
 * stops being active and the line that becomes active re-render.
 */
export const TranscriptLine = memo(function TranscriptLine({
  index,
  segment,
  speaker,
  isActive,
  onSeek,
}: TranscriptLineProps) {
  const timestamp = formatTimestamp(segment.start_ms);

  function handleClick() {
    // Selecting text (to copy it, say) shouldn't move playback.
    if (window.getSelection()?.toString()) return;
    onSeek(segment.start_ms);
  }

  return (
    <li
      data-index={index}
      aria-current={isActive || undefined}
      onClick={handleClick}
      className={cn(
        "cursor-pointer rounded-lg px-3 py-3 transition-colors",
        isActive ? "bg-active-line" : "hover:bg-gray-50",
      )}
    >
      <div className="flex items-center gap-2 text-sm">
        <Avatar name={speaker?.name ?? "?"} color={speaker?.avatar_color ?? "indigo"} size="sm" />
        <span className="font-medium text-gray-900">{speaker?.name ?? "Unknown speaker"}</span>
        <span aria-hidden className="text-gray-400">
          ·
        </span>
        {/* For keyboard and screen-reader users; its click bubbles up to the line's handler. */}
        <button
          type="button"
          aria-label={`Play from ${timestamp}`}
          className="text-link tabular-nums underline underline-offset-2"
        >
          {timestamp}
        </button>
      </div>
      <p className="mt-1.5 pl-8 text-[15px] leading-7 text-gray-700">{segment.text}</p>
    </li>
  );
});
