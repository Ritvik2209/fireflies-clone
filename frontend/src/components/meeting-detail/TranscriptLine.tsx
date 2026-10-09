"use client";

import { Eraser, Highlighter, MessageSquare, Scissors, X } from "lucide-react";
import { memo, type ReactNode, useState } from "react";

import { CommentThread } from "@/components/meeting-detail/CommentThread";
import {
  HIGHLIGHT_BACKGROUND,
  HIGHLIGHT_BORDER,
  HIGHLIGHT_COLORS,
  HIGHLIGHT_SWATCH,
} from "@/components/meeting-detail/highlightStyles";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";
import { formatTimestamp } from "@/lib/format";
import type { TextRange } from "@/lib/transcript";
import type { HighlightColor, Participant, TranscriptSegment } from "@/lib/types";

interface TranscriptLineProps {
  index: number;
  segment: TranscriptSegment;
  speaker: Participant | undefined;
  isActive: boolean;
  matches: TextRange[] | undefined; // search matches in this line
  currentMatchStart: number; // where the selected match starts, or -1 if it's not in this line
  commentsOpen: boolean; // this line's comment thread is shown
  onSeek: (ms: number) => void;
  onHighlight: (segment: TranscriptSegment, color: HighlightColor | null) => void;
  onToggleComments: (segmentId: number) => void;
  onCommentCountChange: (segmentId: number, count: number) => void;
  onSoundbite: (segment: TranscriptSegment) => void;
}

/**
 * One transcript line: avatar, name, timestamp and text. Clicking it plays from its start.
 * On hover it offers highlight, comment and soundbite actions (bonus 5).
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
  commentsOpen,
  onSeek,
  onHighlight,
  onToggleComments,
  onCommentCountChange,
  onSoundbite,
}: TranscriptLineProps) {
  const [picking, setPicking] = useState(false); // the colour picker is open
  const timestamp = formatTimestamp(segment.start_ms);
  const color = segment.highlight_color;

  function handleClick() {
    // Selecting text (to copy it, say) shouldn't move playback.
    if (window.getSelection()?.toString()) return;
    onSeek(segment.start_ms);
  }

  function pick(next: HighlightColor | null) {
    onHighlight(segment, next);
    setPicking(false);
  }

  return (
    <li
      data-line={index}
      aria-current={isActive || undefined}
      onClick={handleClick}
      className={cn(
        "group cursor-pointer rounded-lg border-l-4 px-3 py-3 transition-colors",
        color ? HIGHLIGHT_BORDER[color] : "border-transparent",
        // The playing line's background wins over a highlight's; the border keeps the colour.
        isActive ? "bg-active-line" : color ? HIGHLIGHT_BACKGROUND[color] : "hover:bg-gray-50",
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

        {/* Line actions. Clicks here mustn't reach the line (which would seek). */}
        <div
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "ml-auto flex items-center gap-0.5",
            !picking &&
              "opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100",
          )}
        >
          {picking ? (
            <>
              {HIGHLIGHT_COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-label={`Highlight ${option}`}
                  aria-pressed={color === option}
                  onClick={() => pick(option)}
                  className={cn(
                    "mx-0.5 size-5 rounded-full ring-2 ring-offset-1 ring-offset-surface",
                    HIGHLIGHT_SWATCH[option],
                    color === option ? "ring-gray-400" : "ring-transparent",
                  )}
                />
              ))}
              {color && (
                <ActionButton icon={Eraser} label="Remove highlight" onClick={() => pick(null)} />
              )}
              <ActionButton icon={X} label="Close colours" onClick={() => setPicking(false)} />
            </>
          ) : (
            <>
              <ActionButton
                icon={Highlighter}
                label="Highlight line"
                onClick={() => setPicking(true)}
              />
              <ActionButton
                icon={Scissors}
                label="Make a soundbite from this line"
                onClick={() => onSoundbite(segment)}
              />
            </>
          )}
        </div>
        <button
          type="button"
          aria-expanded={commentsOpen}
          aria-label={`Comments (${segment.comment_count})`}
          title="Comments"
          onClick={(event) => {
            event.stopPropagation();
            onToggleComments(segment.id);
          }}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-lg px-1.5 text-xs text-gray-500 hover:bg-gray-100",
            // Always visible once there are comments; otherwise on hover, like the other actions.
            segment.comment_count === 0 &&
              !commentsOpen &&
              "opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100",
          )}
        >
          <MessageSquare className="size-4" aria-hidden />
          {segment.comment_count > 0 && segment.comment_count}
        </button>
      </div>
      <p className="mt-1.5 pl-8 text-[15px] leading-7 text-gray-700">
        {highlight(segment.text, matches, currentMatchStart)}
      </p>
      {commentsOpen && (
        <CommentThread segmentId={segment.id} onCountChange={onCommentCountChange} />
      )}
    </li>
  );
});

function ActionButton(props: { icon: typeof X; label: string; onClick: () => void }) {
  return <IconButton {...props} className="size-7" />;
}

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
