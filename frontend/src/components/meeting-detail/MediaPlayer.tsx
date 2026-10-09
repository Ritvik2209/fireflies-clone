import { Download, Pause, Play, RotateCcw, RotateCw } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";
import { formatTimestamp } from "@/lib/format";

/** The speed button cycles through these. */
const RATES = [1, 1.5, 2, 0.5];
const SKIP_MS = 15_000;

interface MediaPlayerProps {
  currentMs: number;
  durationMs: number;
  isPlaying: boolean;
  rate: number;
  onToggle: () => void;
  onSeek: (ms: number) => void;
  onRateChange: (rate: number) => void;
  onDownload: () => void; // opens the export dialog
}

/** The player bar: a seek bar along its top edge, the time on the left, controls in the middle. */
export function MediaPlayer({
  currentMs,
  durationMs,
  isPlaying,
  rate,
  onToggle,
  onSeek,
  onRateChange,
  onDownload,
}: MediaPlayerProps) {
  const nextRate = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
  const position = `${formatTimestamp(currentMs)} of ${formatTimestamp(durationMs)}`;

  return (
    <div className="shrink-0 border-t border-gray-200 bg-surface">
      {/* A native range input: keyboard (arrow keys move 1 s) and screen-reader support for free. */}
      <input
        type="range"
        min={0}
        max={durationMs}
        step={1000}
        value={currentMs}
        onChange={(event) => onSeek(Number(event.target.value))}
        aria-label="Seek"
        aria-valuetext={position}
        className="block h-1.5 w-full cursor-pointer accent-brand-600"
      />
      <div className="relative flex h-16 items-center px-6">
        <p className="text-sm text-gray-500 tabular-nums">
          <span className="text-gray-900">{formatTimestamp(currentMs)}</span> /{" "}
          {formatTimestamp(durationMs)}
        </p>
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-3">
          <button
            type="button"
            onClick={() => onRateChange(nextRate)}
            aria-label={`Playback speed ${rate}×, switch to ${nextRate}×`}
            title="Playback speed"
            className="w-12 rounded-lg py-1.5 text-sm font-medium text-gray-600 tabular-nums transition-colors hover:bg-gray-100 focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none"
          >
            {rate}x
          </button>
          <IconButton
            icon={RotateCcw}
            label="Back 15 seconds"
            iconClassName="size-5"
            className="size-9"
            onClick={() => onSeek(currentMs - SKIP_MS)}
          />
          <button
            type="button"
            onClick={onToggle}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="flex h-9 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-xs transition-colors hover:bg-brand-700 focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none"
          >
            {isPlaying ? (
              <Pause className="size-4 fill-current" aria-hidden />
            ) : (
              <Play className="size-4 fill-current" aria-hidden />
            )}
          </button>
          <IconButton
            icon={RotateCw}
            label="Forward 15 seconds"
            iconClassName="size-5"
            className="size-9"
            onClick={() => onSeek(currentMs + SKIP_MS)}
          />
          <IconButton
            icon={Download}
            label="Download transcript or notes"
            iconClassName="size-5"
            className="size-9"
            onClick={onDownload}
          />
        </div>
      </div>
    </div>
  );
}
