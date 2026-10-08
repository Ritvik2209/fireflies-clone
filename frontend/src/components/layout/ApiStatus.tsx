"use client";

import { useEffect, useState } from "react";

import { API_URL, ApiError, getHealth } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { HealthResponse } from "@/lib/types";

type Status =
  | { state: "loading" }
  | { state: "ok"; health: HealthResponse }
  | { state: "error"; message: string };

/** Shows whether the browser can reach the backend (and wakes it up on Render's free tier). */
export function ApiStatus() {
  const [status, setStatus] = useState<Status>({ state: "loading" });

  useEffect(() => {
    // Aborting on unmount means a late response can't update a component that's gone.
    const controller = new AbortController();
    getHealth(controller.signal)
      .then((health) => setStatus({ state: "ok", health }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof ApiError ? error.message : "Unexpected error";
        setStatus({ state: "error", message });
      });
    return () => controller.abort();
  }, []);

  const dot = {
    loading: "animate-pulse bg-amber-400",
    ok: "bg-emerald-500",
    error: "bg-red-500",
  }[status.state];

  return (
    <p
      role="status"
      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600"
    >
      <span className={cn("size-2 rounded-full", dot)} aria-hidden />
      {status.state === "loading" && "Connecting to the API… (a sleeping server can take a minute)"}
      {status.state === "ok" &&
        `API connected · SQLite ${status.health.sqlite_version} · full-text search ${
          status.health.fts5 ? "ready" : "unavailable"
        }`}
      {status.state === "error" && `Can't reach the API at ${API_URL}: ${status.message}`}
    </p>
  );
}
