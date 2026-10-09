"use client";

import { CircleAlert, FileSearch, SearchX } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useEffect, useState } from "react";

import { MeetingListSkeleton } from "@/components/meetings/MeetingList";
import { MeetingRow } from "@/components/meetings/MeetingRow";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDebounce } from "@/hooks/useDebounce";
import { errorMessage, listMeetings, searchTranscripts } from "@/lib/api";
import { formatShortDate, formatTimestamp } from "@/lib/format";
import type { MeetingListItem, SearchResult } from "@/lib/types";

const MAX_HITS = 50; // the API's limit

/** The result of one search, tagged with the request it answers (as in the library). */
interface Loaded {
  key: string;
  meetings?: MeetingListItem[];
  hits?: SearchResult[];
  error?: string;
}

/** Global search: meetings whose title matches, then every matching transcript line, best first. */
export function SearchResults() {
  const searchParams = useSearchParams();
  const query = useDebounce((searchParams.get("q") ?? "").trim(), 300); // typed in the top bar
  const [attempt, setAttempt] = useState(0); // "Try again" bumps this to refetch
  const [loaded, setLoaded] = useState<Loaded>();
  const requestKey = JSON.stringify([query, attempt]);
  const loading = query !== "" && loaded?.key !== requestKey;

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    Promise.all([
      listMeetings({ q: query }, controller.signal),
      searchTranscripts(query, controller.signal),
    ])
      .then(([meetings, hits]) => setLoaded({ key: requestKey, meetings, hits }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoaded({ key: requestKey, error: errorMessage(error) });
      });
    return () => controller.abort();
  }, [query, requestKey]);

  if (!query) {
    return (
      <EmptyState
        icon={FileSearch}
        title="Search your meetings"
        description="Type in the search box above and press Enter to find words in any transcript."
      />
    );
  }
  if (loading) return <MeetingListSkeleton />;
  if (loaded?.error) {
    return (
      <EmptyState icon={CircleAlert} title="Search failed" description={loaded.error}>
        <Button variant="secondary" onClick={() => setAttempt((current) => current + 1)}>
          Try again
        </Button>
      </EmptyState>
    );
  }
  const meetings = loaded?.meetings ?? [];
  const hits = loaded?.hits ?? [];
  if (meetings.length === 0 && hits.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title={`No results for “${query}”`}
        description="Try other words. Every word you type has to appear in the same line."
      />
    );
  }

  return (
    <div className="space-y-8">
      {meetings.length > 0 && (
        <section>
          <SectionHeading title="Meeting titles" count={String(meetings.length)} />
          <ul className="mt-3 space-y-3">
            {meetings.map((meeting) => (
              <li key={meeting.id}>
                <MeetingRow meeting={meeting} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {hits.length > 0 && (
        <section>
          <SectionHeading
            title="In transcripts"
            count={hits.length === MAX_HITS ? `${MAX_HITS}+` : String(hits.length)}
          />
          {groupByMeeting(hits).map((group) => (
            <div
              key={group.meetingId}
              className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-surface"
            >
              <div className="flex items-baseline gap-3 border-b border-gray-200 px-5 py-3">
                <Link
                  href={`/meetings/${group.meetingId}`}
                  className="font-medium text-gray-900 hover:underline"
                >
                  {group.title}
                </Link>
                <span className="text-sm text-gray-500">{formatShortDate(group.date)}</span>
              </div>
              <ul className="divide-y divide-gray-100">
                {group.hits.map((hit) => (
                  <li key={hit.segment_id}>
                    {/* Opens the meeting with the player at this line (?t=). */}
                    <Link
                      href={`/meetings/${hit.meeting_id}?t=${hit.start_ms}`}
                      className="flex gap-3 px-5 py-3 transition-colors hover:bg-gray-25"
                    >
                      <Avatar name={hit.speaker_name} color={hit.speaker_color} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm">
                          <span className="font-medium text-gray-900">{hit.speaker_name}</span>
                          <span className="text-gray-400"> · </span>
                          <span className="text-link tabular-nums">
                            {formatTimestamp(hit.start_ms)}
                          </span>
                        </p>
                        <p className="mt-0.5 text-[15px] leading-6 text-gray-700">
                          <Snippet text={hit.snippet} />
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function SectionHeading({ title, count }: { title: string; count: string }) {
  return (
    <h2 className="text-sm font-medium text-gray-500">
      {title} <span className="text-gray-400">{count}</span>
    </h2>
  );
}

/**
 * The search marks each match with the control characters \u0002 … \u0003, not with HTML.
 * Splitting on them and rendering <mark> elements means the text itself is never parsed as HTML.
 */
function Snippet({ text }: { text: string }) {
  const [before, ...chunks] = text.split("\u0002");
  return (
    <>
      {before}
      {chunks.map((chunk, index) => {
        const [match, after] = chunk.split("\u0003");
        return (
          <Fragment key={index}>
            <mark className="rounded-sm bg-yellow-100 text-black">{match}</mark>
            {after}
          </Fragment>
        );
      })}
    </>
  );
}

interface MeetingGroup {
  meetingId: number;
  title: string;
  date: string;
  hits: SearchResult[];
}

/** Hits grouped by meeting; the groups keep the ranking (the best hit's meeting comes first). */
function groupByMeeting(hits: SearchResult[]): MeetingGroup[] {
  const groups = new Map<number, MeetingGroup>();
  for (const hit of hits) {
    const group = groups.get(hit.meeting_id);
    if (group) group.hits.push(hit);
    else {
      groups.set(hit.meeting_id, {
        meetingId: hit.meeting_id,
        title: hit.meeting_title,
        date: hit.meeting_date,
        hits: [hit],
      });
    }
  }
  return [...groups.values()];
}
