import { HIGHLIGHT_SWATCH } from "@/components/meeting-detail/highlightStyles";
import { cn } from "@/lib/cn";
import { formatTimestamp } from "@/lib/format";
import type { Participant, TranscriptSegment } from "@/lib/types";

interface HighlightsListProps {
  lines: TranscriptSegment[]; // the highlighted lines, in transcript order
  people: Map<number, Participant>;
  onSeek: (ms: number) => void;
}

/** Every highlighted line, with its colour; clicking one plays from it. */
export function HighlightsList({ lines, people, onSeek }: HighlightsListProps) {
  if (lines.length === 0) return null;

  return (
    <section className="mt-8">
      <h3 className="text-[15px] font-semibold text-gray-900">
        Highlights <span className="font-normal text-gray-400">{lines.length}</span>
      </h3>
      <ul className="-mx-3 mt-2 space-y-0.5">
        {lines.map((line) => (
          <li key={line.id}>
            <button
              type="button"
              onClick={() => onSeek(line.start_ms)}
              className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-50"
            >
              <span
                aria-hidden
                className={cn(
                  "mt-2 size-2.5 shrink-0 rounded-full",
                  HIGHLIGHT_SWATCH[line.highlight_color ?? "yellow"],
                )}
              />
              <span className="min-w-0 text-[15px] leading-6">
                <span className="font-medium text-gray-900">
                  {people.get(line.speaker_id)?.name ?? "Unknown speaker"}
                </span>{" "}
                <span className="text-sm text-link tabular-nums">
                  {formatTimestamp(line.start_ms)}
                </span>
                <span className="line-clamp-2 text-gray-700">{line.text}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
