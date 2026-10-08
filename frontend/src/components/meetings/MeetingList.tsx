"use client";

import { CircleAlert, SearchX, Video } from "lucide-react";
import { useEffect, useState } from "react";

import { MeetingRow } from "@/components/meetings/MeetingRow";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDayHeading, localDateKey } from "@/lib/format";
import type { MeetingListItem } from "@/lib/types";

interface MeetingListProps {
  meetings: MeetingListItem[] | undefined;
  loading: boolean;
  error: string | undefined;
  filtered: boolean;
  onRetry: () => void;
  onClearFilters: () => void;
}

/** The meetings, grouped by day, or the right loading / error / empty state. */
export function MeetingList({
  meetings,
  loading,
  error,
  filtered,
  onRetry,
  onClearFilters,
}: MeetingListProps) {
  if (loading) return <MeetingListSkeleton />;

  if (error) {
    return (
      <EmptyState icon={CircleAlert} title="Couldn't load meetings" description={error}>
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      </EmptyState>
    );
  }

  if (!meetings || meetings.length === 0) {
    return filtered ? (
      <EmptyState
        icon={SearchX}
        title="No meetings match these filters"
        description="Try a different title, person or date range."
      >
        <Button variant="secondary" onClick={onClearFilters}>
          Clear filters
        </Button>
      </EmptyState>
    ) : (
      <EmptyState
        icon={Video}
        title="No meetings yet"
        description="Use New meeting to upload or paste a transcript."
      />
    );
  }

  return (
    <div className="space-y-6">
      {groupByDay(meetings).map((group) => (
        <section key={group.key} aria-label={group.heading}>
          <h2 className="mb-2 text-sm font-medium text-gray-500">{group.heading}</h2>
          <ul className="space-y-3">
            {group.meetings.map((meeting) => (
              <li key={meeting.id}>
                <MeetingRow meeting={meeting} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Consecutive meetings on the same local day share a heading (the list is already sorted). */
function groupByDay(meetings: MeetingListItem[]) {
  const groups: { key: string; heading: string; meetings: MeetingListItem[] }[] = [];
  for (const meeting of meetings) {
    const key = localDateKey(meeting.meeting_date);
    const last = groups.at(-1);
    if (last?.key === key) last.meetings.push(meeting);
    else groups.push({ key, heading: formatDayHeading(meeting.meeting_date), meetings: [meeting] });
  }
  return groups;
}

export function MeetingListSkeleton() {
  return (
    <div role="status" aria-label="Loading meetings">
      <Skeleton className="mb-3 h-4 w-24" />
      <div className="space-y-3">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4"
          >
            <Skeleton className="size-12" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
      <SlowLoadingHint />
    </div>
  );
}

/** After a few seconds of loading, explain the wait: Render's free tier sleeps when idle. */
function SlowLoadingHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return (
    <p className="mt-6 text-center text-sm text-gray-500">
      Waking up the server… the free hosting tier sleeps when idle, so this can take up to a minute.
    </p>
  );
}
