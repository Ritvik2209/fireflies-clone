"use client";

import { CircleAlert, VideoOff } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { MeetingWorkspace } from "@/components/meeting-detail/MeetingWorkspace";
import { UnprocessedMeeting } from "@/components/meeting-detail/UnprocessedMeeting";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { SlowLoadingHint } from "@/components/ui/SlowLoadingHint";
import { ApiError, errorMessage, getMeeting } from "@/lib/api";
import type { MeetingDetail } from "@/lib/types";

/** The result of one request, tagged with the request it answers (the library does the same). */
interface Loaded {
  key: string;
  meeting?: MeetingDetail;
  notFound?: boolean;
  error?: string;
}

/** Loads one meeting and shows it, or a skeleton, "Meeting not found", or an error. */
export function MeetingView({ id, startAt }: { id: string; startAt?: number }) {
  const meetingId = /^\d+$/.test(id) ? Number(id) : null; // "/meetings/abc" is simply not found
  const [attempt, setAttempt] = useState(0); // "Try again" bumps this to refetch
  const [loaded, setLoaded] = useState<Loaded>();
  const requestKey = JSON.stringify([meetingId, attempt]);

  useEffect(() => {
    if (meetingId === null) return;
    const controller = new AbortController();
    getMeeting(meetingId, controller.signal)
      .then((meeting) => setLoaded({ key: requestKey, meeting }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 404) {
          setLoaded({ key: requestKey, notFound: true });
        } else {
          setLoaded({ key: requestKey, error: errorMessage(error) });
        }
      });
    return () => controller.abort();
  }, [meetingId, requestKey]);

  // Edits and action-item changes update the loaded meeting in place, without refetching it.
  const changeMeeting = useCallback((update: (meeting: MeetingDetail) => MeetingDetail) => {
    setLoaded((current) =>
      current?.meeting ? { ...current, meeting: update(current.meeting) } : current,
    );
  }, []);

  if (meetingId === null) return <MeetingNotFound />;
  if (loaded?.key !== requestKey) return <MeetingSkeleton />;
  if (loaded.notFound) return <MeetingNotFound />;
  if (!loaded.meeting) {
    return (
      <EmptyState
        icon={CircleAlert}
        title="Couldn't load this meeting"
        description={loaded.error ?? "Something went wrong."}
      >
        <Button variant="secondary" onClick={() => setAttempt((current) => current + 1)}>
          Try again
        </Button>
      </EmptyState>
    );
  }
  if (loaded.meeting.status !== "ready") {
    // Extra 3: still processing (it's polled, then shown here) or failed.
    return (
      <UnprocessedMeeting
        meeting={loaded.meeting}
        onSettled={(meeting) => setLoaded({ key: requestKey, meeting })}
      />
    );
  }
  // The key gives each meeting (and each ?t= start) a fresh player when the URL changes.
  return (
    <MeetingWorkspace
      key={`${loaded.meeting.id}:${startAt ?? 0}`}
      meeting={loaded.meeting}
      startAt={startAt}
      onChange={changeMeeting}
    />
  );
}

function MeetingNotFound() {
  return (
    <EmptyState
      icon={VideoOff}
      title="Meeting not found"
      description="It may have been deleted, or the link is wrong."
    >
      <Link href="/meetings" className={buttonClasses("secondary")}>
        Back to meetings
      </Link>
    </EmptyState>
  );
}

/** The page's shape while it loads: notes on the left, transcript lines on the right. */
function MeetingSkeleton() {
  return (
    <div role="status" aria-label="Loading meeting" className="flex h-full">
      <div className="flex-[11] px-10 py-8">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="mt-3 h-4 w-1/3" />
        <div className="mt-10 space-y-3">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <SlowLoadingHint />
      </div>
      <div className="flex-[9] space-y-6 border-l border-gray-200 px-6 py-8">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
