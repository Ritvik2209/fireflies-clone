"use client";

import { Compass, Menu, Settings, Upload } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";

import { NavDrawer } from "@/components/layout/NavDrawer";
import { sectionTitle } from "@/components/layout/navigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { TopbarSearch, TopbarSearchPlaceholder } from "@/components/layout/TopbarSearch";
import { CreateMeetingModal } from "@/components/meetings/CreateMeetingModal";
import { ProcessingWatcher } from "@/components/meetings/ProcessingWatcher";
import { useTour } from "@/components/tour/TourProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { CURRENT_USER } from "@/lib/currentUser";
import type { MeetingListItem } from "@/lib/types";

export function Topbar() {
  const pathname = usePathname();
  const [creating, setCreating] = useState(false); // the New meeting modal is open
  const [created, setCreated] = useState<MeetingListItem[]>([]); // being processed (Extra 3)
  const [menuOpen, setMenuOpen] = useState(false); // the navigation drawer, on phones
  const tour = useTour();

  return (
    <header className="flex h-[60px] shrink-0 items-center gap-2 border-b border-gray-200 bg-surface px-3 sm:gap-4 sm:px-6">
      {/* Phones have no icon rail: this opens the sidebar as a drawer. */}
      <IconButton
        icon={Menu}
        label="Open menu"
        iconClassName="size-5"
        className="size-9 md:hidden"
        onClick={() => setMenuOpen(true)}
      />
      <h1 className="hidden w-40 shrink-0 truncate text-base text-gray-900 md:block">
        {sectionTitle(pathname)}
      </h1>

      <div className="flex flex-1 justify-center">
        {/* The search box reads the URL, so it renders in the browser (see TopbarSearch). */}
        <Suspense fallback={<TopbarSearchPlaceholder />}>
          <TopbarSearch />
        </Suspense>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <ThemeToggle />
        <IconButton
          icon={Compass}
          label="Take the tour"
          iconClassName="size-5"
          className="size-9"
          data-tour="tour-button"
          onClick={tour.start}
        />
        <Link
          href="/settings"
          aria-label="Settings"
          className="hidden size-9 items-center justify-center rounded-lg text-gray-500 sm:flex transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <Settings className="size-5" aria-hidden />
        </Link>
        {/* On phones only the icon shows; the label stays for screen readers. */}
        <Button
          icon={Upload}
          onClick={() => setCreating(true)}
          aria-label="New meeting"
          data-tour="new-meeting"
        >
          <span className="hidden sm:inline">New meeting</span>
        </Button>
        <Link
          href="/settings"
          aria-label={`Profile: ${CURRENT_USER.name}`}
          title={`${CURRENT_USER.name} · ${CURRENT_USER.email}`}
          className="ml-1 rounded-md focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none"
        >
          <Avatar name={CURRENT_USER.name} color={CURRENT_USER.avatarColor} />
        </Link>
      </div>
      {creating && (
        <CreateMeetingModal
          onClose={() => setCreating(false)}
          onCreated={(meeting) => setCreated((current) => [...current, meeting])}
        />
      )}
      {menuOpen && <NavDrawer onClose={() => setMenuOpen(false)} />}
      {created.map((meeting) => (
        <ProcessingWatcher key={meeting.id} meeting={meeting} />
      ))}
    </header>
  );
}
