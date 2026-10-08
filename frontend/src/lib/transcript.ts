// Pure helpers for the meeting page: which line is playing, and where a search query matches.

/**
 * Binary search: the index of the last item whose start_ms ≤ ms, or -1 if none has started yet.
 * `items` must be sorted by start_ms (the API returns segments and chapters in that order).
 * O(log n): about 6 comparisons for 60 lines, so it's cheap to run on every animation frame.
 */
export function findActiveIndex(items: readonly { start_ms: number }[], ms: number): number {
  let low = 0;
  let high = items.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (items[middle].start_ms <= ms) {
      found = middle; // this one has started; a later one may have too
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}

/** Where a search query occurs inside one line: character offsets [start, end). */
export interface TextRange {
  start: number;
  end: number;
}

/** One search match in the transcript: the line it's in, and where in that line. */
export interface TranscriptMatch extends TextRange {
  line: number;
}

/** Every case-insensitive occurrence of `query` in `lines`, in reading order. */
export function findMatches(lines: readonly string[], query: string): TranscriptMatch[] {
  const needle = query.trim();
  if (!needle) return [];
  // Escaped, so characters such as "+" or "(" are searched for literally.
  const pattern = new RegExp(escapeRegExp(needle), "gi");
  const matches: TranscriptMatch[] = [];
  lines.forEach((text, line) => {
    for (const match of text.matchAll(pattern)) {
      matches.push({ line, start: match.index, end: match.index + match[0].length });
    }
  });
  return matches;
}

/** The matches of each line, keyed by line index (lines without matches are absent). */
export function groupMatchesByLine(matches: readonly TranscriptMatch[]): Map<number, TextRange[]> {
  const byLine = new Map<number, TextRange[]>();
  for (const match of matches) {
    const ranges = byLine.get(match.line);
    if (ranges) ranges.push(match);
    else byLine.set(match.line, [match]);
  }
  return byLine;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
