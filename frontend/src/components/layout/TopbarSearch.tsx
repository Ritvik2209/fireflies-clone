"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";

import { replaceSearchParams } from "@/lib/url";

const LIBRARY = "/meetings";
const INPUT_CLASSES =
  "h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pr-3 pl-9 text-sm text-gray-900 " +
  "placeholder:text-gray-400 focus:border-brand-300 focus:bg-white focus:ring-4 " +
  "focus:ring-brand-100 focus:outline-none";

/**
 * The title search. On the library it filters as you type (by updating ?q= in the URL);
 * elsewhere, Enter opens the library with the search applied.
 */
export function TopbarSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onLibrary = pathname === LIBRARY;
  const urlQuery = onLibrary ? (searchParams.get("q") ?? "") : "";

  // While typing, the box shows what you type; otherwise it shows the URL's search, so it stays
  // in sync with "Clear filters", reloads and shared links.
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);

  function handleChange(value: string) {
    setDraft(value);
    if (onLibrary) replaceSearchParams({ q: value.trim() || null });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = draft.trim();
    if (!onLibrary) router.push(query ? `${LIBRARY}?q=${encodeURIComponent(query)}` : LIBRARY);
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="relative w-full max-w-md">
      <label htmlFor="topbar-search" className="sr-only">
        Search meetings by title
      </label>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400"
      />
      <input
        id="topbar-search"
        type="search"
        placeholder="Search meetings by title"
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
        placeholder="Search meetings by title"
        className={INPUT_CLASSES}
      />
    </div>
  );
}
