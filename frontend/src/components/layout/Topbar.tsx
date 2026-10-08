"use client";

import { Settings, Upload } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { sectionTitle } from "@/components/layout/navigation";
import { TopbarSearch, TopbarSearchPlaceholder } from "@/components/layout/TopbarSearch";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { CURRENT_USER } from "@/lib/currentUser";

export function Topbar() {
  const pathname = usePathname();

  return (
    <header className="flex h-[60px] shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-6">
      <h1 className="w-40 shrink-0 truncate text-base text-gray-900">{sectionTitle(pathname)}</h1>

      <div className="flex flex-1 justify-center">
        {/* The search box reads the URL, so it renders in the browser (see TopbarSearch). */}
        <Suspense fallback={<TopbarSearchPlaceholder />}>
          <TopbarSearch />
        </Suspense>
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
