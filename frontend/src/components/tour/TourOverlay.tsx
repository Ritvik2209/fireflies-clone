"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";

import type { TourStep } from "@/components/tour/steps";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const PAD = 8; // space between the feature and the edge of the spotlight
const CARD_WIDTH = 340;
const CARD_ROOM = 280; // the most height a card needs (long text wraps more on phones)
const GIVE_UP_MS = 6000; // a feature that never appears (e.g. no soundbites) is skipped

interface Hole {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourOverlayProps {
  step: TourStep;
  index: number;
  total: number;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
  onClickTarget: (href: string | null) => void; // the "open a meeting" step
}

/**
 * One step of the tour: the page is dimmed except for the feature (four dark panels around a
 * "hole"), which separates it from the rest and blocks clicks elsewhere, plus a card that says
 * what it does. The feature is found with its `data-tour` attribute and re-measured every
 * 150 ms, because it can move while the page loads or scrolls.
 */
export function TourOverlay({
  step,
  index,
  total,
  onNext,
  onBack,
  onClose,
  onClickTarget,
}: TourOverlayProps) {
  const [hole, setHole] = useState<Hole | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const startedAt = Date.now();
    let scrolled = false;
    let skipped = false;
    function update() {
      if (step.pane) showPane(step.pane);
      const element = findTarget(step);
      if (!element) {
        setHole(null);
        if (
          step.target &&
          !step.clickToContinue &&
          !skipped &&
          Date.now() - startedAt > GIVE_UP_MS
        ) {
          skipped = true;
          onNext();
        }
        return;
      }
      if (!scrolled) {
        element.scrollIntoView({ block: "center" });
        scrolled = true;
      }
      const r = element.getBoundingClientRect();
      setHole({
        top: r.top - PAD,
        left: r.left - PAD,
        width: r.width + 2 * PAD,
        height: r.height + 2 * PAD,
      });
    }
    const first = requestAnimationFrame(update);
    const timer = window.setInterval(update, 150);
    return () => {
      cancelAnimationFrame(first);
      window.clearInterval(timer);
    };
  }, [step, onNext]);

  // The click step: notice the click on the feature (capture phase, before the link navigates).
  useEffect(() => {
    if (!step.clickToContinue) return;
    function onClick(event: MouseEvent) {
      const element = findTarget(step);
      if (element && event.target instanceof Node && element.contains(event.target)) {
        onClickTarget(element.closest("a")?.getAttribute("href") ?? null);
      }
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [step, onClickTarget]);

  // Escape ends the tour; the Next button gets the focus, for keyboard users.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    cardRef.current
      ?.querySelector<HTMLButtonElement>("[data-tour-next]")
      ?.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const last = index === total - 1;
  return (
    // The wrapper lets clicks through; the dark panels and the card catch them.
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {hole ? (
        <>
          <div
            className={DIM}
            style={{ top: 0, left: 0, right: 0, height: Math.max(0, hole.top) }}
          />
          <div
            className={DIM}
            style={{ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }}
          />
          <div
            className={DIM}
            style={{ top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height }}
          />
          <div
            className={DIM}
            style={{ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }}
          />
          {/* The ring around the feature. It also blocks clicks on it, except on the click step. */}
          <div
            className={cn(
              "fixed rounded-xl ring-4 ring-brand-400",
              step.clickToContinue ? "animate-pulse" : "pointer-events-auto",
            )}
            style={hole}
          />
        </>
      ) : (
        <div className={cn(DIM, "inset-0")} />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-labelledby="tour-step-title"
        className="pointer-events-auto fixed rounded-2xl border border-gray-200 bg-surface p-5 shadow-xl"
        style={cardPosition(hole)}
      >
        <p className="text-xs font-medium text-brand-700 dark:text-brand-300">
          Step {index + 1} of {total}
        </p>
        <h2 id="tour-step-title" className="mt-1 text-base font-semibold text-gray-900">
          {step.title}
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-gray-600">{step.body}</p>
        {step.clickToContinue && (
          <p className="mt-3 text-sm font-medium text-brand-700 dark:text-brand-300">
            Click the highlighted meeting to continue.
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          {last ? (
            <span />
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-500 transition-colors hover:text-gray-700"
            >
              Skip tour
            </button>
          )}
          <div className="flex gap-2">
            {index > 0 && (
              <Button variant="secondary" onClick={onBack}>
                Back
              </Button>
            )}
            {!step.clickToContinue && (
              <Button data-tour-next onClick={onNext}>
                {last ? "Finish" : "Next"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const DIM = "pointer-events-auto fixed bg-black/60";

/** The step's feature, if it's on the page and visible (not inside a hidden pane). */
function findTarget(step: TourStep): HTMLElement | null {
  if (!step.target) return null;
  const candidates = [...document.querySelectorAll<HTMLElement>(step.target)];
  return (
    candidates.find(
      (element) =>
        element.getClientRects().length > 0 &&
        (!step.targetText || element.textContent?.includes(step.targetText)),
    ) ?? null
  );
}

/** Narrow screens show the meeting's notes or transcript one at a time: switch to `pane`. */
function showPane(pane: "notes" | "transcript") {
  const tab = document.querySelector<HTMLButtonElement>(`[role="tab"][data-pane="${pane}"]`);
  if (tab && tab.getClientRects().length > 0 && tab.getAttribute("aria-selected") !== "true") {
    tab.click();
  }
}

/** Below the feature if there's room, else above, else beside it, else at the bottom. */
function cardPosition(hole: Hole | null): CSSProperties {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(CARD_WIDTH, viewportWidth - 32);
  const centred = (viewportWidth - width) / 2;
  if (!hole) return { width, left: centred, top: Math.max(16, viewportHeight / 2 - 110) };

  const left = Math.min(Math.max(16, hole.left), viewportWidth - width - 16);
  const below = hole.top + hole.height + 12;
  if (viewportHeight - below >= CARD_ROOM) return { width, left, top: below };
  if (hole.top >= CARD_ROOM) return { width, left, bottom: viewportHeight - hole.top + 12 };
  const top = Math.min(Math.max(16, hole.top), viewportHeight - CARD_ROOM - 16);
  if (hole.left >= width + 28) return { width, left: hole.left - width - 12, top };
  if (viewportWidth - (hole.left + hole.width) >= width + 28) {
    return { width, left: hole.left + hole.width + 12, top };
  }
  return { width, left: centred, bottom: 16 }; // a feature as tall as the screen: card over it
}
