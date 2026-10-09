"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

import { SidebarContent } from "@/components/layout/Sidebar";
import { IconButton } from "@/components/ui/IconButton";

/** The sidebar as a drawer, for screens too narrow for it (below lg). Opened from the top bar. */
export function MobileNav({ onClose }: { onClose: () => void }) {
  // Escape closes it, like the dialogs.
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      {/* The dimmed page behind the drawer: tapping it closes the menu. */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <aside className="relative flex h-full w-64 max-w-[80%] flex-col bg-gray-25 px-3 pb-4 shadow-xl">
        <IconButton
          icon={X}
          label="Close menu"
          onClick={onClose}
          className="absolute top-3 right-2 size-9"
        />
        <SidebarContent onNavigate={onClose} />
      </aside>
    </div>
  );
}
