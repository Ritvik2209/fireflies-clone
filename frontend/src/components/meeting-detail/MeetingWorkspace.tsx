"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ExportDialog } from "@/components/meeting-detail/ExportDialog";
import { MediaPlayer } from "@/components/meeting-detail/MediaPlayer";
import { MeetingHeader } from "@/components/meeting-detail/MeetingHeader";
import { SoundbiteDialog, type SoundbiteDraft } from "@/components/meeting-detail/SoundbiteDialog";
import { SummaryPanel } from "@/components/meeting-detail/SummaryPanel";
import { TranscriptPanel } from "@/components/meeting-detail/TranscriptPanel";
import { useAnnotationActions } from "@/hooks/useAnnotationActions";
import { usePlayer } from "@/hooks/usePlayer";
import { formatTimestamp } from "@/lib/format";
import { findActiveIndex } from "@/lib/transcript";
import type {
  ActionItem,
  MeetingDetail,
  Participant,
  Soundbite,
  TranscriptSegment,
} from "@/lib/types";

interface MeetingWorkspaceProps {
  meeting: MeetingDetail;
  startAt?: number; // ms from a ?t= link: the player starts there
  /** Applies a change to the loaded meeting (after an edit or an action-item change). */
  onChange: (update: (meeting: MeetingDetail) => MeetingDetail) => void;
}

/**
 * A loaded meeting: AI notes on the left, the transcript on the right, the player along the bottom.
 * The player's clock is the single source of truth. Everything that seeks calls `seek`, and the
 * active transcript line and chapter are worked out from `currentMs` on every render.
 */
export function MeetingWorkspace({ meeting, startAt, onChange }: MeetingWorkspaceProps) {
  const player = usePlayer(meeting.duration_ms, startAt);
  const { seek, playRange, positionNow } = player;
  // Whether the transcript scrolls along with playback; scrolling it by hand turns this off.
  const [following, setFollowing] = useState(true);
  const [exporting, setExporting] = useState(false); // the download dialog is open
  const [soundbiteDraft, setSoundbiteDraft] = useState<SoundbiteDraft | null>(null);
  const { highlightLine, setCommentCount, addSoundbite, removeSoundbite } =
    useAnnotationActions(onChange);
  const highlightedLines = useMemo(
    () => meeting.segments.filter((line) => line.highlight_color !== null),
    [meeting.segments],
  );
  const people = useMemo(
    () => new Map<number, Participant>(meeting.participants.map((person) => [person.id, person])),
    [meeting.participants],
  );
  const activeLine = findActiveIndex(meeting.segments, player.currentMs);
  const activeChapter = findActiveIndex(meeting.chapters, player.currentMs);

  // Every seek (a line, a chapter, an action item, the seek bar) also brings the transcript back
  // in step. Stable (useCallback), so the memoised panels and lines don't re-render because of it.
  const seekAndFollow = useCallback(
    (ms: number) => {
      seek(ms);
      setFollowing(true);
    },
    [seek],
  );

  // Stable, so the memoised notes panel doesn't re-render because of it.
  const changeActionItems = useCallback(
    (update: (items: ActionItem[]) => ActionItem[]) =>
      onChange((current) => ({ ...current, action_items: update(current.action_items) })),
    [onChange],
  );

  // Bonus 5. A soundbite plays only its range (the player pauses at its end).
  const playSoundbite = useCallback(
    (clip: Soundbite) => {
      playRange(clip.start_ms, clip.end_ms);
      setFollowing(true);
    },
    [playRange],
  );
  // A new soundbite starts from a transcript line…
  const soundbiteFromLine = useCallback(
    (line: TranscriptSegment) =>
      setSoundbiteDraft({
        title: `Soundbite at ${formatTimestamp(line.start_ms)}`,
        startMs: line.start_ms,
        endMs: line.end_ms,
      }),
    [],
  );
  // …or from the player's current time (30 seconds, adjustable in the dialog).
  const soundbiteFromPlayer = useCallback(() => {
    const now = Math.floor(positionNow() / 1000) * 1000; // whole seconds, like the fields
    setSoundbiteDraft({
      title: `Soundbite at ${formatTimestamp(now)}`,
      startMs: now,
      endMs: Math.min(now + 30_000, meeting.duration_ms),
    });
  }, [positionNow, meeting.duration_ms]);

  // The browser tab shows the meeting's title once it has loaded.
  useEffect(() => {
    document.title = `${meeting.title} · Glowworm`;
  }, [meeting.title]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-[11] overflow-y-auto">
          <div className="mx-auto max-w-3xl px-10 py-8">
            <MeetingHeader meeting={meeting} onUpdated={(updated) => onChange(() => updated)} />
            <SummaryPanel
              summary={meeting.summary}
              chapters={meeting.chapters}
              meetingId={meeting.id}
              actionItems={meeting.action_items}
              onActionItemsChange={changeActionItems}
              people={people}
              durationMs={meeting.duration_ms}
              activeChapter={activeChapter}
              onSeek={seekAndFollow}
              highlights={highlightedLines}
              soundbites={meeting.soundbites}
              onPlaySoundbite={playSoundbite}
              onNewSoundbite={soundbiteFromPlayer}
              onDeleteSoundbite={removeSoundbite}
            />
          </div>
        </div>
        <TranscriptPanel
          segments={meeting.segments}
          people={people}
          activeIndex={activeLine}
          following={following}
          onFollowingChange={setFollowing}
          onSeek={seekAndFollow}
          onHighlight={highlightLine}
          onCommentCountChange={setCommentCount}
          onSoundbite={soundbiteFromLine}
        />
      </div>
      <MediaPlayer
        currentMs={player.currentMs}
        durationMs={meeting.duration_ms}
        isPlaying={player.isPlaying}
        rate={player.rate}
        onToggle={player.toggle}
        onSeek={seekAndFollow}
        onRateChange={player.setRate}
        onDownload={() => setExporting(true)}
      />
      {exporting && <ExportDialog meetingId={meeting.id} onClose={() => setExporting(false)} />}
      {soundbiteDraft && (
        <SoundbiteDialog
          meetingId={meeting.id}
          durationMs={meeting.duration_ms}
          currentMs={player.currentMs}
          initial={soundbiteDraft}
          onClose={() => setSoundbiteDraft(null)}
          onCreated={(clip) => {
            addSoundbite(clip);
            setSoundbiteDraft(null);
          }}
        />
      )}
    </div>
  );
}
