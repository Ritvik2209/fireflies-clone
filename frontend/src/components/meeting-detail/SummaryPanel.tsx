import { Sparkles } from "lucide-react";
import { memo } from "react";

import { ActionItemsList } from "@/components/meeting-detail/ActionItemsList";
import { ChaptersList } from "@/components/meeting-detail/ChaptersList";
import type { ActionItem, Chapter, Participant, Summary } from "@/lib/types";

interface SummaryPanelProps {
  summary: Summary | null;
  chapters: Chapter[];
  meetingId: number;
  actionItems: ActionItem[];
  onActionItemsChange: (update: (items: ActionItem[]) => ActionItem[]) => void;
  people: Map<number, Participant>;
  durationMs: number;
  activeChapter: number;
  onSeek: (ms: number) => void;
}

/**
 * The AI notes: keywords, overview, chapters and action items.
 * Memoised: its props only change when the active chapter does, not on every player tick.
 */
export const SummaryPanel = memo(function SummaryPanel({
  summary,
  chapters,
  meetingId,
  actionItems,
  onActionItemsChange,
  people,
  durationMs,
  activeChapter,
  onSeek,
}: SummaryPanelProps) {
  return (
    <div className="mt-8">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-brand-600" aria-hidden />
        <h3 className="text-[15px] font-medium text-brand-700 dark:text-brand-300">AI notes</h3>
        {summary && (
          <span className="text-xs text-gray-400">
            {summary.generated_by === "rule_based"
              ? "Generated from the transcript"
              : "Hand-written sample notes"}
          </span>
        )}
      </div>

      {summary ? (
        <>
          {summary.keywords.length > 0 && (
            <ul aria-label="Keywords" className="mt-4 flex flex-wrap gap-2">
              {summary.keywords.map((keyword) => (
                <li
                  key={keyword}
                  className="rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-700"
                >
                  {keyword}
                </li>
              ))}
            </ul>
          )}
          <section className="mt-6">
            <h3 className="text-[15px] font-semibold text-gray-900">Overview</h3>
            <p className="mt-2 text-[15px] leading-7 whitespace-pre-line text-gray-700">
              {summary.overview}
            </p>
          </section>
        </>
      ) : (
        <p className="mt-4 text-sm text-gray-500">No notes for this meeting.</p>
      )}

      <ChaptersList
        chapters={chapters}
        durationMs={durationMs}
        activeIndex={activeChapter}
        onSeek={onSeek}
      />
      <ActionItemsList
        meetingId={meetingId}
        items={actionItems}
        people={people}
        onSeek={onSeek}
        onItemsChange={onActionItemsChange}
      />
    </div>
  );
});
