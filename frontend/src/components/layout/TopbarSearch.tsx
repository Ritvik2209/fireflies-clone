"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";

import { replaceSearchParams } from "@/lib/url";

const LIBRARY = "/meetings";
const SEARCH = "/search";
const PLACEHOLDER = "Search meetings and transcripts";
const INPUT_CLASSES =
  "h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pr-3 pl-9 text-sm text-gray-900 " +
  "placeholder:text-gray-400 focus:border-brand-300 focus:bg-surface focus:ring-4 " +
  "focus:ring-brand-100 focus:outline-none";

/**
 * The search box. On the library (titles) and the search page (transcripts) it updates ?q= as
 * you type; Enter anywhere else, and on the library, opens the global search page.
 */
export function TopbarSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const live = pathname === LIBRARY || pathname === SEARCH; // pages that read ?q= themselves
  const urlQuery = live ? (searchParams.get("q") ?? "") : "";

  // While typing, the box shows what you type; otherwise it shows the URL's search, so it stays
  // in sync with "Clear filters", reloads and shared links.
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);

  function handleChange(value: string) {
    setDraft(value);
    if (live) replaceSearchParams({ q: value.trim() || null });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = draft.trim();
    if (query && pathname !== SEARCH) router.push(`${SEARCH}?q=${encodeURIComponent(query)}`);
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="relative w-full max-w-md">
      <label htmlFor="topbar-search" className="sr-only">
        {PLACEHOLDER}
      </label>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400"
      />
      <input
        id="topbar-search"
        type="search"
        placeholder={PLACEHOLDER}
        autoComplete="off"
        className={INPUT_CLASSES}
        value={focused ? draft : urlQuery}
        onFocus={() => {
          setDraft(urlQuery);
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        onChange={(event) => handleChange(event.target.value)}
      />
    </form>
  );
}

/** Shown in the prerendered HTML until the search box (which reads the URL) is ready. */
export function TopbarSearchPlaceholder() {
  return (
    <div className="relative w-full max-w-md">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400"
      />
      <input
        disabled
        aria-hidden
        tabIndex={-1}
        placeholder={PLACEHOLDER}
        className={INPUT_CLASSES}
      />
    </div>
  );
}
