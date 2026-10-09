"use client";

import { Compass } from "lucide-react";

import { Button } from "@/components/ui/Button";

/** First visit only: a small, non-blocking offer of the tour. */
export function TourWelcome({
  onStart,
  onDismiss,
}: {
  onStart: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-labelledby="tour-welcome-title"
      className="fixed right-4 bottom-24 left-4 z-50 rounded-2xl border border-gray-200 bg-surface p-5 shadow-xl sm:left-auto sm:w-80"
    >
      <div className="flex items-center gap-2">
        <Compass className="size-5 text-brand-600" aria-hidden />
        <h2 id="tour-welcome-title" className="text-base font-semibold text-gray-900">
          New here?
        </h2>
      </div>
      <p className="mt-1.5 text-sm leading-6 text-gray-600">
        Take a two-minute tour of Glowworm: the library, AI notes, the synced transcript, the AI
        chat and more.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onDismiss}>
          No thanks
        </Button>
        <Button onClick={onStart}>Start the tour</Button>
      </div>
    </div>
  );
}
