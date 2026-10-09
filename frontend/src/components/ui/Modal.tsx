"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";

import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string; // e.g. a wider max-w-*
}

/**
 * A modal dialog on the native <dialog> element. showModal() gives a backdrop, a focus trap,
 * Escape to close and correct stacking for free. Render it only while it's open; the parent
 * decides when it closes (onClose), so it can refuse while a request is running.
 * Clicking the backdrop doesn't close it, so a half-filled form isn't lost by accident.
 */
export function Modal({ title, onClose, children, className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    // Start on the field (or button) marked data-autofocus instead of the close button.
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault(); // Escape: let the parent close it
        onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-gray-200 bg-surface p-0 text-gray-900 shadow-xl backdrop:bg-black/50",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-6 py-4">
        <h2 id={titleId} className="truncate text-lg font-semibold">
          {title}
        </h2>
        <IconButton icon={X} label="Close" onClick={onClose} />
      </div>
      <div className="px-6 py-5">{children}</div>
    </dialog>
  );
}
