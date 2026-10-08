import { Users } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Team" };

export default function TeamPage() {
  return (
    <ComingSoon
      icon={Users}
      title="Team"
      description="Invite teammates, share meetings and manage who can see what in your workspace."
    />
  );
}
