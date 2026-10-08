import { Avatar } from "@/components/ui/Avatar";
import type { Participant } from "@/lib/types";

interface AvatarStackProps {
  people: Pick<Participant, "id" | "name" | "avatar_color">[];
  max?: number;
}

/** A row of small initials avatars, e.g. a meeting's participants: "[P][D][M][S] +1". */
export function AvatarStack({ people, max = 4 }: AvatarStackProps) {
  const shown = people.slice(0, max);
  const hidden = people.length - shown.length;
  const names = people.map((person) => person.name).join(", ");

  return (
    <div className="flex shrink-0 items-center gap-1" title={names}>
      <span className="sr-only">Participants: {names}</span>
      {shown.map((person) => (
        <Avatar key={person.id} name={person.name} color={person.avatar_color} size="sm" />
      ))}
      {hidden > 0 && (
        <span
          aria-hidden
          className="flex size-6 items-center justify-center rounded-md bg-gray-100 text-[11px] font-medium text-gray-600"
        >
          +{hidden}
        </span>
      )}
    </div>
  );
}
