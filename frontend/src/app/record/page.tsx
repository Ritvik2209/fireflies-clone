import { Mic } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Record" };

export default function RecordPage() {
  return (
    <ComingSoon
      icon={Mic}
      title="Record a live meeting"
      description="Invite the Glowworm notetaker to your Zoom, Google Meet or Microsoft Teams calls to record and transcribe them live."
    />
  );
}
