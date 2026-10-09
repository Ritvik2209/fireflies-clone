"use client";

import { useTheme } from "next-themes";
import { Toaster } from "sonner";

/** Where toasts appear (sonner), drawn in the app's current light or dark theme. */
export function AppToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-right"
      richColors
      closeButton
    />
  );
}
