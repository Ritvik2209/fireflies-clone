import { cn } from "@/lib/cn";
import { formatTimestamp } from "@/lib/format";
import type { Chapter } from "@/lib/types";

interface ChaptersListProps {
  chapters: Chapter[];
  durationMs: number;
  activeIndex: number; // the chapter being played, or -1
  onSeek: (ms: number) => void;
}

/** Chapters with their time ranges ("Pain points 02:25 – 06:10"); clicking one plays it. */
export function ChaptersList({ chapters, durationMs, activeIndex, onSeek }: ChaptersListProps) {
  if (chapters.length === 0) return null;

  return (
    <section className="mt-8">
      <h3 className="text-[15px] font-semibold text-gray-900">Chapters</h3>
      <ol className="mt-2 -mx-3 space-y-0.5">
        {chapters.map((chapter, index) => {
          // A chapter runs until the next one starts (the last one until the end).
          const endMs = chapters[index + 1]?.start_ms ?? durationMs;
          const active = index === activeIndex;
          return (
            <li key={chapter.id}>
              <button
                type="button"
                onClick={() => onSeek(chapter.start_ms)}
                aria-current={active || undefined}
                className={cn(
                  "flex w-full items-baseline gap-3 rounded-lg px-3 py-2 text-left text-[15px] transition-colors",
                  active ? "bg-brand-50" : "hover:bg-gray-50",
                )}
              >
                <span
                  className={cn(
                    "flex-1",
                    active ? "font-medium text-brand-700 dark:text-brand-300" : "text-gray-800",
                  )}
                >
                  {chapter.title}
                </span>
                <span className="shrink-0 text-sm text-link tabular-nums">
                  {formatTimestamp(chapter.start_ms)} – {formatTimestamp(endMs)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
