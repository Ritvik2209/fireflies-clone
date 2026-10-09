"use client";

import { AudioLines } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AVATAR_BG, Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { errorMessage, getAnalytics } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatTimestamp } from "@/lib/format";
import type { MeetingAnalytics, SpeakerAnalytics } from "@/lib/types";

/**
 * Speaker talk time (Extra 2), like Fireflies' analytics: one bar per speaker in their avatar
 * colour, plus words per minute, questions asked and longest monologue.
 */
export function SpeakerTalkTime({ meetingId }: { meetingId: number }) {
  const [analytics, setAnalytics] = useState<MeetingAnalytics | null>(null); // null while loading
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getAnalytics(meetingId, controller.signal)
      .then(setAnalytics)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        toast.error(errorMessage(error));
        setFailed(true);
      });
    return () => controller.abort();
  }, [meetingId]);

  return (
    <section className="mt-8">
      <h3 className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
        <AudioLines className="size-4 text-gray-500" aria-hidden />
        Speaker talk time
      </h3>
      {failed ? (
        <p className="mt-2 text-sm text-gray-500">Talk time couldn&apos;t be loaded.</p>
      ) : analytics === null ? (
        <div className="mt-3 space-y-3" aria-label="Loading speaker talk time">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-4/5" />
        </div>
      ) : analytics.speakers.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">There&apos;s no transcript to analyse yet.</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-gray-500">
            {analytics.dominant_speaker} talked the most · {analytics.speaker_count}{" "}
            {analytics.speaker_count === 1 ? "speaker" : "speakers"} ·{" "}
            {formatTimestamp(analytics.total_talk_time_ms)} of talk
          </p>
          <ul className="mt-3 space-y-4">
            {analytics.speakers.map((speaker) => (
              <SpeakerBar key={speaker.participant_id} speaker={speaker} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function SpeakerBar({ speaker }: { speaker: SpeakerAnalytics }) {
  const questions = speaker.question_count === 1 ? "question" : "questions";
  return (
    <li>
      <div className="flex items-center gap-3">
        <Avatar name={speaker.name} color={speaker.avatar_color} size="sm" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
          {speaker.name}
        </span>
        <span className="text-sm font-medium text-gray-700 tabular-nums">
          {Math.round(speaker.talk_percent)}%
        </span>
      </div>
      {/* The width is data, so it's an inline style: Tailwind can't generate a class per value. */}
      <div aria-hidden className="mt-1.5 ml-9 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn("h-full rounded-full", AVATAR_BG[speaker.avatar_color])}
          style={{ width: `${speaker.talk_percent}%` }}
        />
      </div>
      <p className="mt-1.5 ml-9 text-xs text-gray-500 tabular-nums">
        {formatTimestamp(speaker.talk_time_ms)} talking · {speaker.words_per_minute} words/min ·{" "}
        {speaker.question_count} {questions} · longest{" "}
        {formatTimestamp(speaker.longest_monologue_ms)}
      </p>
    </li>
  );
}
