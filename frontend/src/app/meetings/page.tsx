import { Video } from "lucide-react";
import type { Metadata } from "next";

import { ApiStatus } from "@/components/layout/ApiStatus";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Meetings" };

export default function MeetingsPage() {
  return (
    <div className="px-8 py-6">
      <EmptyState
        icon={Video}
        title="No meetings yet"
        description="Meetings you upload or paste in will appear here, newest first."
      >
        <ApiStatus />
      </EmptyState>
    </div>
  );
}
