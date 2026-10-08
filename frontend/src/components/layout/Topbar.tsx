"use client";

import { Search, Settings, Upload } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { sectionTitle } from "@/components/layout/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { CURRENT_USER } from "@/lib/currentUser";

export function Topbar() {
  const pathname = usePathname();

  return (
    <header className="flex h-[60px] shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-6">
      <h1 className="w-40 shrink-0 truncate text-base text-gray-900">{sectionTitle(pathname)}</h1>

      <div className="flex flex-1 justify-center">
        <label className="relative w-full max-w-md">
          <span className="sr-only">Search meetings</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search by title or keyword"
            className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pr-3 pl-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-100 focus:outline-none"
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/settings"
          aria-label="Settings"
          className="flex size-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <Settings className="size-5" aria-hidden />
        </Link>
        <Button icon={Upload}>New meeting</Button>
        <Link
          href="/settings"
          aria-label={`Profile: ${CURRENT_USER.name}`}
          title={`${CURRENT_USER.name} · ${CURRENT_USER.email}`}
          className="ml-1 rounded-md focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none"
        >
          <Avatar name={CURRENT_USER.name} color={CURRENT_USER.avatarColor} />
        </Link>
      </div>
    </header>
  );
}
