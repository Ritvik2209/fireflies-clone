import type { Metadata } from "next";
import { Suspense } from "react";

import { MeetingListSkeleton } from "@/components/meetings/MeetingList";
import { SearchResults } from "@/components/search/SearchResults";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage() {
  // The results read the URL (useSearchParams), so they render in the browser; the skeleton is
  // what the prerendered HTML shows until then.
  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:px-8 sm:py-6">
      <Suspense fallback={<MeetingListSkeleton />}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
