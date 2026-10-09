import type { Metadata } from "next";

import { MeetingView } from "@/components/meeting-detail/MeetingView";

export const metadata: Metadata = { title: "Meeting" };

export default async function MeetingPage({ params, searchParams }: PageProps<"/meetings/[id]">) {
  const { id } = await params;
  const { t } = await searchParams;
  // ?t=<ms> (from a search result) starts the player at that moment.
  const startAt = typeof t === "string" && /^\d+$/.test(t) ? Number(t) : undefined;
  // Like the library, the meeting loads in the browser (see MeetingView).
  return <MeetingView id={id} startAt={startAt} />;
}
