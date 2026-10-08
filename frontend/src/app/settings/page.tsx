import { Settings } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/ui/ComingSoon";
import { CURRENT_USER } from "@/lib/currentUser";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <ComingSoon
      icon={Settings}
      title="Settings"
      description={`Manage your profile, notetaker preferences and email recaps. You're signed in as ${CURRENT_USER.name} (${CURRENT_USER.email}).`}
    />
  );
}
