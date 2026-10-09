import type { Metadata } from "next";
import { Suspense } from "react";

import { MeetingListSkeleton } from "@/components/meetings/MeetingList";
import { MeetingsLibrary } from "@/components/meetings/MeetingsLibrary";

export const metadata: Metadata = { title: "Meetings" };

export default function MeetingsPage() {
  // The library reads the URL (useSearchParams), so it renders in the browser; the skeleton is
  // what the prerendered HTML shows until then.
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-8 sm:py-6">
          <MeetingListSkeleton />
        </div>
      }
    >
      <MeetingsLibrary />
    </Suspense>
  );
}
