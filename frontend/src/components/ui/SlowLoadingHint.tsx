"use client";

import { useEffect, useState } from "react";

/** After a few seconds of loading, explain the wait: Render's free tier sleeps when idle. */
export function SlowLoadingHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return (
    <p className="mt-6 text-center text-sm text-gray-500">
      Waking up the server… the free hosting tier sleeps when idle, so this can take up to a minute.
    </p>
  );
}
