import { useCallback } from "react";
import { toast } from "sonner";

import { clearHighlight, deleteSoundbite, errorMessage, setHighlight } from "@/lib/api";
import type { HighlightColor, MeetingDetail, Soundbite, TranscriptSegment } from "@/lib/types";

type MeetingChange = (update: (meeting: MeetingDetail) => MeetingDetail) => void;

/**
 * Bonus 5 handlers that save through the API and update the loaded meeting. They're stable
 * (useCallback), so the memoised transcript lines and notes panel don't re-render because of them.
 */
export function useAnnotationActions(onChange: MeetingChange) {
  const patchLine = useCallback(
    (segmentId: number, fields: Partial<TranscriptSegment>) =>
      onChange((meeting) => ({
        ...meeting,
        segments: meeting.segments.map((line) =>
          line.id === segmentId ? { ...line, ...fields } : line,
        ),
      })),
    [onChange],
  );

  /** Colours a line (or clears it with null). Optimistic: undone if saving fails. */
  const highlightLine = useCallback(
    async (line: TranscriptSegment, color: HighlightColor | null) => {
      patchLine(line.id, { highlight_color: color });
      try {
        if (color) await setHighlight(line.id, color);
        else await clearHighlight(line.id);
        toast.success(color ? "Line highlighted" : "Highlight removed");
      } catch (error) {
        patchLine(line.id, { highlight_color: line.highlight_color });
        toast.error(errorMessage(error));
      }
    },
    [patchLine],
  );

  /** The comment thread reports its new size, so the line's comment badge stays right. */
  const setCommentCount = useCallback(
    (segmentId: number, count: number) => patchLine(segmentId, { comment_count: count }),
    [patchLine],
  );

  const addSoundbite = useCallback(
    (soundbite: Soundbite) =>
      onChange((meeting) => ({
        ...meeting,
        soundbites: [...meeting.soundbites, soundbite].sort((a, b) => a.start_ms - b.start_ms),
      })),
    [onChange],
  );

  const removeSoundbite = useCallback(
    async (soundbite: Soundbite) => {
      try {
        await deleteSoundbite(soundbite.id);
        onChange((meeting) => ({
          ...meeting,
          soundbites: meeting.soundbites.filter((other) => other.id !== soundbite.id),
        }));
        toast.success(`Deleted “${soundbite.title}”`);
      } catch (error) {
        toast.error(errorMessage(error));
      }
    },
    [onChange],
  );

  return { highlightLine, setCommentCount, addSoundbite, removeSoundbite };
}
