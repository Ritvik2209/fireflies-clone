"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { MediaPlayer } from "@/components/meeting-detail/MediaPlayer";
import { MeetingHeader } from "@/components/meeting-detail/MeetingHeader";
import { SummaryPanel } from "@/components/meeting-detail/SummaryPanel";
import { TranscriptPanel } from "@/components/meeting-detail/TranscriptPanel";
import { usePlayer } from "@/hooks/usePlayer";
import { findActiveIndex } from "@/lib/transcript";
import type { ActionItem, MeetingDetail, Participant } from "@/lib/types";

interface MeetingWorkspaceProps {
  meeting: MeetingDetail;
  /** Applies a change to the loaded meeting (after an edit or an action-item change). */
  onChange: (update: (meeting: MeetingDetail) => MeetingDetail) => void;
}

/**
 * A loaded meeting: AI notes on the left, the transcript on the right, the player along the bottom.
 * The player's clock is the single source of truth. Everything that seeks calls `seek`, and the
 * active transcript line and chapter are worked out from `currentMs` on every render.
 */
export function MeetingWorkspace({ meeting, onChange }: MeetingWorkspaceProps) {
  const player = usePlayer(meeting.duration_ms);
  const { seek } = player;
  // Whether the transcript scrolls along with playback; scrolling it by hand turns this off.
  const [following, setFollowing] = useState(true);
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
      />
    </div>
  );
}
