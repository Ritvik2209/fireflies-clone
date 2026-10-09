"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { type LibraryFilters, MeetingFilters } from "@/components/meetings/MeetingFilters";
import { MeetingList } from "@/components/meetings/MeetingList";
import { useDebounce } from "@/hooks/useDebounce";
import { errorMessage, listMeetings, listParticipants, listTags } from "@/lib/api";
import { endOfLocalDayIso, startOfLocalDayIso } from "@/lib/format";
import type { MeetingListItem, Participant, Tag } from "@/lib/types";
import { replaceSearchParams } from "@/lib/url";

const NO_FILTERS: LibraryFilters = {
  participantId: "",
  tagId: "",
  from: "",
  to: "",
  sort: "recent",
};

/** The result of one request, tagged with the filters it was for. */
interface Loaded {
  key: string;
  meetings?: MeetingListItem[];
  error?: string;
}

/**
 * The meetings library. Every filter is mirrored in the URL (?q=&participant=&tag=&from=&to=&sort=),
 * so a filtered view survives a reload and can be shared. The title search `q` is typed in the
 * top bar; this component only reads it.
 */
export function MeetingsLibrary() {
  const searchParams = useSearchParams();
  const query = useDebounce(searchParams.get("q") ?? "", 300); // wait until typing pauses
  const [filters, setFilters] = useState<LibraryFilters>(() => ({
    participantId: searchParams.get("participant") ?? "",
    tagId: searchParams.get("tag") ?? "",
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    sort: searchParams.get("sort") === "oldest" ? "oldest" : "recent",
  }));
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [attempt, setAttempt] = useState(0); // "Try again" bumps this to refetch
  const [loaded, setLoaded] = useState<Loaded>();

  // Identifies the current request; while the latest result is for another key, we're loading.
  const requestKey = JSON.stringify([query, filters, attempt]);
  const loading = loaded?.key !== requestKey;

  useEffect(() => {
    const controller = new AbortController();
    listParticipants(controller.signal)
      .then(setParticipants)
      .catch(() => {}); // the dropdown then only offers "All participants"
    listTags(controller.signal)
      .then(setTags)
      .catch(() => {}); // likewise "All tags"
    return () => controller.abort();
  }, []);

  useEffect(() => {
    // Aborting makes sure a slow, outdated response can never replace a newer one.
    const controller = new AbortController();
    const { participantId, tagId, from, to, sort } = filters;
    listMeetings(
      {
        q: query.trim(),
        participantId,
        tagId,
        dateFrom: from ? startOfLocalDayIso(from) : undefined,
        dateTo: to ? endOfLocalDayIso(to) : undefined,
        sort,
      },
      controller.signal,
    )
      .then((meetings) => setLoaded({ key: requestKey, meetings }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoaded({ key: requestKey, error: errorMessage(error) });
      });
    return () => controller.abort();
  }, [query, filters, requestKey]);

  function updateFilters(changes: Partial<LibraryFilters>) {
    setFilters((current) => ({ ...current, ...changes }));
    replaceSearchParams({
      ...("participantId" in changes && { participant: changes.participantId || null }),
      ...("tagId" in changes && { tag: changes.tagId || null }),
      ...("from" in changes && { from: changes.from || null }),
      ...("to" in changes && { to: changes.to || null }),
      ...("sort" in changes && { sort: changes.sort === "oldest" ? "oldest" : null }),
    });
  }

  function clearFilters() {
    setFilters({ ...NO_FILTERS, sort: filters.sort }); // keep the sort order
    replaceSearchParams({ q: null, participant: null, tag: null, from: null, to: null });
  }

  const filtered = Boolean(
    query.trim() || filters.participantId || filters.tagId || filters.from || filters.to,
  );
  const count = loaded?.meetings?.length ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-8 py-6">
      <MeetingFilters
        participants={participants}
        tags={tags}
        filters={filters}
        onChange={updateFilters}
        canClear={filtered}
        onClear={clearFilters}
      />
      {!loading && count > 0 && (
        <p className="mt-5 text-sm text-gray-500">
          {count} {count === 1 ? "meeting" : "meetings"}
          {query.trim() && ` matching “${query.trim()}”`}
        </p>
      )}
      <div className="mt-4">
        <MeetingList
          meetings={loaded?.meetings}
          loading={loading}
          error={loaded?.error}
          filtered={filtered}
          onRetry={() => setAttempt((current) => current + 1)}
          onClearFilters={clearFilters}
        />
      </div>
    </div>
  );
}
