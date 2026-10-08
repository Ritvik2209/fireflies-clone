import { Layers } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Integrations" };

export default function IntegrationsPage() {
  return (
    <ComingSoon
      icon={Layers}
      title="Integrations"
      description="Connect your calendar, video conferencing apps, Slack and your CRM so meeting notes go where your team already works."
    />
  );
}
