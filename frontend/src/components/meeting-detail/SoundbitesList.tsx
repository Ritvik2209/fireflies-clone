import { Play, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { formatTimestamp } from "@/lib/format";
import type { Soundbite } from "@/lib/types";

interface SoundbitesListProps {
  soundbites: Soundbite[];
  onPlay: (soundbite: Soundbite) => void;
  onNew: () => void;
  onDelete: (soundbite: Soundbite) => void;
}

/** Titled clips of the meeting. Play runs only that range, then the player pauses by itself. */
export function SoundbitesList({ soundbites, onPlay, onNew, onDelete }: SoundbitesListProps) {
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-gray-900">
          Soundbites <span className="font-normal text-gray-400">{soundbites.length}</span>
        </h3>
        <Button variant="ghost" icon={Plus} onClick={onNew}>
          New
        </Button>
      </div>
      {soundbites.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">
          No soundbites yet. Make one from a transcript line, or from the player&apos;s time.
        </p>
      ) : (
        <ul className="-mx-3 mt-2 space-y-0.5">
          {soundbites.map((clip) => (
            <li
              key={clip.id}
              className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50"
            >
              <IconButton
                icon={Play}
                label={`Play “${clip.title}”`}
                onClick={() => onPlay(clip)}
                className="bg-brand-50 text-brand-600 hover:bg-brand-100 hover:text-brand-700 dark:text-brand-300"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-gray-900">{clip.title}</p>
                <p className="text-sm text-link tabular-nums">
                  {formatTimestamp(clip.start_ms)} – {formatTimestamp(clip.end_ms)}
                </p>
              </div>
              <IconButton
                icon={Trash2}
                label={`Delete “${clip.title}”`}
                onClick={() => onDelete(clip)}
                className="opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
