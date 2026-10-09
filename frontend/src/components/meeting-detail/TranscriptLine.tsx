import { memo, type ReactNode } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { formatTimestamp } from "@/lib/format";
import type { TextRange } from "@/lib/transcript";
import type { Participant, TranscriptSegment } from "@/lib/types";

interface TranscriptLineProps {
  index: number;
  segment: TranscriptSegment;
  speaker: Participant | undefined;
  isActive: boolean;
  matches: TextRange[] | undefined; // search matches in this line
  currentMatchStart: number; // where the selected match starts, or -1 if it's not in this line
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
  matches,
  currentMatchStart,
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
      data-line={index}
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
      <p className="mt-1.5 pl-8 text-[15px] leading-7 text-gray-700">
        {highlight(segment.text, matches, currentMatchStart)}
      </p>
    </li>
  );
});

/**
 * The text with every search match wrapped in <mark>. It's built from strings and elements, never
 * from HTML: React escapes the strings, so a transcript can't inject markup (XSS-safe).
 */
function highlight(
  text: string,
  matches: TextRange[] | undefined,
  currentStart: number,
): ReactNode {
  if (!matches) return text;
  const parts: ReactNode[] = [];
  let position = 0;
  for (const { start, end } of matches) {
    parts.push(text.slice(position, start));
    parts.push(
      <mark
        key={start}
        className={cn(
          "rounded-sm text-black", // dark text on yellow in both themes
          start === currentStart ? "bg-amber-300" : "bg-yellow-100",
        )}
      >
        {text.slice(start, end)}
      </mark>,
    );
    position = end;
  }
  parts.push(text.slice(position));
  return parts;
}
