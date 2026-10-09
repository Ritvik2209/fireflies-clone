"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

import { TOUR_STEPS } from "@/components/tour/steps";
import { TourOverlay } from "@/components/tour/TourOverlay";
import { TourWelcome } from "@/components/tour/TourWelcome";

// Whether this browser has started, finished or declined the tour, so the welcome card shows
// once. localStorage is an external store, so it's read with useSyncExternalStore: the server
// render assumes "seen" (no card), and the browser then shows the card without a mismatch.
const SEEN_KEY = "glowworm:tour-seen";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function readSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) !== null;
  } catch {
    return true; // storage blocked: don't nag
  }
}
function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // storage blocked: the card simply shows again next time
  }
  listeners.forEach((listener) => listener());
}

const MEETING_PAGE = /^\/meetings\/\d+$/;

const TourContext = createContext<{ start: () => void }>({ start: () => {} });

/** The top bar's tour button starts the tour through this. */
export function useTour() {
  return useContext(TourContext);
}

/** The optional intro tour: a welcome card on a first visit, and the tour itself, across pages. */
export function TourProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const seen = useSyncExternalStore(subscribe, readSeen, () => true);
  const [index, setIndex] = useState<number | null>(null); // null: not touring
  const [meetingPath, setMeetingPath] = useState<string | null>(null); // opened during the tour
  const step = index === null ? null : TOUR_STEPS[index];

  // Each step lives on a page: if the user isn't there (Back from the meeting, or a start from
  // another page), go there.
  useEffect(() => {
    if (step?.page === "library" && pathname !== "/meetings") router.push("/meetings");
    if (step?.page === "meeting" && !MEETING_PAGE.test(pathname) && meetingPath) {
      router.push(meetingPath);
    }
  }, [step, pathname, meetingPath, router]);

  const start = useCallback(() => {
    markSeen();
    setIndex(0);
  }, []);
  const stop = useCallback(() => {
    markSeen();
    setIndex(null);
  }, []);
  const next = useCallback(() => {
    setIndex((current) =>
      current === null || current + 1 >= TOUR_STEPS.length ? null : current + 1,
    );
  }, []);
  const back = useCallback(() => {
    setIndex((current) => (current === null ? null : Math.max(0, current - 1)));
  }, []);
  // The "open a meeting" step: the user clicked the meeting's link, which navigates there.
  const openedMeeting = useCallback(
    (href: string | null) => {
      if (href) setMeetingPath(href);
      next();
    },
    [next],
  );

  return (
    <TourContext.Provider value={{ start }}>
      {children}
      {step && index !== null && (
        <TourOverlay
          key={index}
          step={step}
          index={index}
          total={TOUR_STEPS.length}
          onNext={next}
          onBack={back}
          onClose={stop}
          onClickTarget={openedMeeting}
        />
      )}
      {/* Offered on the library only, so it never covers a meeting opened from a shared link. */}
      {!seen && index === null && pathname === "/meetings" && (
        <TourWelcome onStart={start} onDismiss={markSeen} />
      )}
    </TourContext.Provider>
  );
}
