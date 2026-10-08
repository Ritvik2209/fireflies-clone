import type { Metadata } from "next";

import { MeetingView } from "@/components/meeting-detail/MeetingView";

export const metadata: Metadata = { title: "Meeting" };

export default async function MeetingPage({ params }: PageProps<"/meetings/[id]">) {
  const { id } = await params;
  // Like the library, the meeting loads in the browser (see MeetingView).
  return <MeetingView id={id} />;
}
